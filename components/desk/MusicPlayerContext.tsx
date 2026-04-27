"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface Track {
  title: string;
  src: string;
}

interface MusicPlayerState {
  tracks: Track[];
  track: Track | undefined;
  trackIndex: number;
  playing: boolean;
  volume: number;
  progress: number;
  duration: number;
  noFile: boolean;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
  selectTrack: (i: number) => void;
}

const Ctx = createContext<MusicPlayerState | null>(null);

export function useMusicPlayer(): MusicPlayerState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMusicPlayer must be used inside MusicPlayerProvider");
  return v;
}

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.6);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [noFile, setNoFile] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const track = tracks[trackIndex];

  useEffect(() => {
    fetch("/api/music")
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setTracks(data); })
      .catch(() => { /* leave empty */ });
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    const onEnded = () => setTrackIndex(i => tracks.length ? (i + 1) % tracks.length : 0);
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMeta = () => { setDuration(audio.duration); setNoFile(false); };
    const onError = () => { setNoFile(true); setPlaying(false); };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMeta);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
      audio.removeEventListener("error", onError);
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.src = track.src;
    audio.load();
    setProgress(0);
    setNoFile(false);
    if (playing) audio.play().catch(() => { setNoFile(true); setPlaying(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex, track]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => { setPlaying(true); setNoFile(false); })
        .catch(() => { setNoFile(true); setPlaying(false); });
    }
  }, [playing, track]);

  const next = useCallback(() => {
    setTrackIndex(i => tracks.length ? (i + 1) % tracks.length : 0);
  }, [tracks.length]);

  const prev = useCallback(() => {
    setTrackIndex(i => tracks.length ? (i - 1 + tracks.length) % tracks.length : 0);
  }, [tracks.length]);

  const seek = useCallback((s: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = s;
    setProgress(s);
  }, []);

  const selectTrack = useCallback((i: number) => {
    setTrackIndex(i);
    setPlaying(false);
    setTimeout(() => {
      audioRef.current?.play().then(() => setPlaying(true)).catch(() => setNoFile(true));
    }, 80);
  }, []);

  const setVolume = useCallback((v: number) => setVolumeState(v), []);

  return (
    <Ctx.Provider value={{
      tracks, track, trackIndex, playing, volume, progress, duration, noFile,
      modalOpen, setModalOpen, togglePlay, next, prev, seek, setVolume, selectTrack,
    }}>
      {children}
    </Ctx.Provider>
  );
}
