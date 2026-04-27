import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// GET /api/music — list audio files in /public/music/.
// File name (minus extension) becomes the displayed title — drop new mp3s
// into the folder and they appear automatically, no rename needed.
export async function GET() {
  const dir = path.join(process.cwd(), "public", "music");
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(dir)
      .filter(f => /\.(mp3|ogg|wav|m4a|aac|flac)$/i.test(f));
  } catch {
    return NextResponse.json([]);
  }

  const tracks = files.sort((a, b) => a.localeCompare(b, "ru")).map(f => ({
    src: `/music/${encodeURIComponent(f)}`,
    title: f.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || f,
  }));

  return NextResponse.json(tracks);
}
