"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import SimplePeer from "simple-peer";
import { Socket } from "socket.io-client";

type CallState = "idle" | "outgoing" | "incoming" | "connected";

interface IncomingCallData {
  callerId: string;
  callerName: string;
  callerPhone: string;
  offer: any;
}

function startOutgoingRing(): { stop: () => void } {
  let intervalId: NodeJS.Timeout | null = null;
  let ctx: AudioContext | null = null;

  function playBurst() {
    try {
      ctx = new AudioContext();
      for (let r = 0; r < 2; r++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.08, ctx.currentTime + r * 0.45);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + r * 0.45 + 0.38);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + r * 0.45);
        osc.stop(ctx.currentTime + r * 0.45 + 0.38);
      }
    } catch { /* audio not available */ }
  }

  playBurst();
  intervalId = setInterval(playBurst, 3200);

  return {
    stop() {
      if (intervalId) clearInterval(intervalId);
      try { ctx?.close(); } catch { /* ignore */ }
    },
  };
}

export function useWebRTC(socket: Socket | null, currentUserId: string) {
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [remoteUser, setRemoteUser] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pendingOfferRef = useRef<any>(null);
  const outgoingRingRef = useRef<{ stop: () => void } | null>(null);
  const callStateRef = useRef<CallState>("idle");

  // Keep callStateRef in sync so callbacks can read current value without stale closure
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Outgoing ring: play while state is "outgoing", stop otherwise
  useEffect(() => {
    if (callState === "outgoing") {
      outgoingRingRef.current = startOutgoingRing();
    } else {
      outgoingRingRef.current?.stop();
      outgoingRingRef.current = null;
    }
    return () => {
      outgoingRingRef.current?.stop();
      outgoingRingRef.current = null;
    };
  }, [callState]);

  function destroyPeer() {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallState("idle");
    setRemoteUser(null);
  }

  // Cancel without emitting call:end (for busy/reject scenarios)
  const cancelCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallState("idle");
    setRemoteUser(null);
  }, [localStream]);

  async function fetchIceServers() {
    try {
      const res = await fetch("/api/turn");
      if (res.ok) {
        const data = await res.json();
        if (data.iceServers?.length) return data.iceServers;
      }
    } catch { /* fall through */ }
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
  }

  const initiateCall = useCallback(async (targetUser: { id: string; name: string; phone: string }, line?: string) => {
    if (!socket) return;
    try {
      const [stream, iceServers] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
        fetchIceServers(),
      ]);
      setLocalStream(stream);
      setRemoteUser(targetUser);
      setCallState("outgoing");

      const peer = new SimplePeer({
        initiator: true,
        stream,
        trickle: false,
        config: { iceServers, iceTransportPolicy: "relay" },
      });
      peerRef.current = peer;

      console.log("[WebRTC] initiateCall start");

      // Auto-cancel after ~45s if no answer (gives ICE + TURN relay time to connect)
      const ringTimeout = setTimeout(() => {
        console.warn("[WebRTC] ring timeout — no answer");
        socket.off("call:answered");
        socket.off("call:rejected");
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setCallState("idle");
        setRemoteUser(null);
      }, 45000);

      peer.on("signal", (offer) => {
        socket.emit("call:initiate", {
          receiverId: targetUser.id,
          offer,
          callerId: currentUserId,
          callerName: "",
          callerPhone: "",
          callerLine: line ?? null,
        });
      });

      peer.on("stream", (remStream) => {
        clearTimeout(ringTimeout);
        setRemoteStream(remStream);
        setCallState("connected");
      });

      peer.on("error", (err) => { console.error("[WebRTC] initiator error", err); clearTimeout(ringTimeout); destroyPeer(); });
      peer.on("close", () => { clearTimeout(ringTimeout); destroyPeer(); });

      socket.once("call:answered", ({ answer }: { answer: any }) => {
        clearTimeout(ringTimeout);
        if (peerRef.current) peer.signal(answer);
      });

      socket.once("call:rejected", () => { clearTimeout(ringTimeout); destroyPeer(); });

    } catch (err) {
      console.error("getUserMedia failed", err);
      destroyPeer();
    }
  }, [socket, currentUserId]);

  const handleIncomingCall = useCallback((data: IncomingCallData) => {
    // If already in a call, send busy signal and ignore
    if (callStateRef.current !== "idle") {
      socket?.emit("call:busy", { callerId: data.callerId });
      return;
    }
    pendingOfferRef.current = data.offer;
    setRemoteUser({ id: data.callerId, name: data.callerName, phone: data.callerPhone });
    setCallState("incoming");
  }, [socket]);

  const acceptCall = useCallback(async () => {
    if (!socket || !pendingOfferRef.current) return;
    try {
      const [stream, iceServers] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
        fetchIceServers(),
      ]);
      setLocalStream(stream);

      const peer = new SimplePeer({
        initiator: false,
        stream,
        trickle: false,
        config: { iceServers, iceTransportPolicy: "relay" },
      });
      peerRef.current = peer;

      peer.signal(pendingOfferRef.current);

      peer.on("signal", (answer) => {
        socket.emit("call:answer", { callerId: remoteUser?.id, answer });
      });

      peer.on("stream", (remStream) => {
        setRemoteStream(remStream);
        setCallState("connected");
      });

      peer.on("error", (err) => { console.error("[WebRTC] callee error", err); destroyPeer(); });
      peer.on("close", destroyPeer);

    } catch (err) {
      console.error("getUserMedia failed", err);
      rejectCall();
    }
  }, [socket, remoteUser]);

  const rejectCall = useCallback(() => {
    if (!socket || !remoteUser) return;
    socket.emit("call:reject", { callerId: remoteUser.id });
    destroyPeer();
  }, [socket, remoteUser]);

  const hangup = useCallback(() => {
    if (!socket || !remoteUser) return;
    socket.emit("call:end", { targetId: remoteUser.id });
    destroyPeer();
  }, [socket, remoteUser]);

  return {
    callState,
    remoteUser,
    localStream,
    remoteStream,
    initiateCall,
    handleIncomingCall,
    acceptCall,
    rejectCall,
    hangup,
    cancelCall,
  };
}
