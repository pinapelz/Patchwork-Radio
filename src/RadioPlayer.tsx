import { useEffect, useRef, useState } from "react";
import Visualizer from "./Visualizer";
import History from "./History";
import Footer from "./Footer";
import type { NowPlayingResponse, HistoryItem } from "../types";

interface Props {
  streamUrl: string;
  nowPlayingUrl: string;
  m3uUrl?: string;
}

const TARGET_DELAY = 1.5;
const VOLUME_KEY = "yt_radio_volume";

export default function RadioPlayer({
  streamUrl,
  nowPlayingUrl,
  m3uUrl,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [started, setStarted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [latency, setLatency] = useState<number | null>(null);
  const [listened, setListened] = useState<number>(0);

  const [title, setTitle] = useState<string>("Nothing");
  const [artist, setArtist] = useState<string>("Unknown");
  const [currentVideoId, setCurrentVideoId] = useState<string | undefined>(undefined);
  const [listeners, setListeners] = useState<number | { total: number; unique?: number; current?: number }>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  /* ---------------- AUDIO ---------------- */

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    isPlaying ? audio.play().catch(() => {}) : audio.pause();
  }, [isPlaying]);

  useEffect(() => {
    const saved = localStorage.getItem(VOLUME_KEY);
    if (saved) setVolume(Number(saved));
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    localStorage.setItem(VOLUME_KEY, volume.toString());
  }, [volume]);

  /* ---------------- LISTEN TIMER ---------------- */

  useEffect(() => {
    let interval: number | undefined;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setListened((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  /* ---------------- LATENCY ---------------- */

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const interval = window.setInterval(() => {
      try {
        const buf = audio.buffered;
        if (buf.length) {
          const end = buf.end(buf.length - 1);
          const lat = Math.max(0, end - audio.currentTime);
          setLatency(Math.round(lat * 1000));
        }
      } catch {
        setLatency(null);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  /* ---------------- RESYNC ---------------- */

  const resync = (): void => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const buf = audio.buffered;
      if (buf.length) {
        const end = buf.end(buf.length - 1);
        audio.currentTime = Math.max(0, end - TARGET_DELAY);
        return;
      }
    } catch {}

    audio.src = `${streamUrl}?rs=${Date.now()}`;
    audio.load();
  };

  /* ---------------- NOW PLAYING ---------------- */

  useEffect(() => {

    const fetchNowPlaying = async (): Promise<void> => {
      try {
        const res = await fetch(nowPlayingUrl);
        const json: any = await res.json();
        const songTitle = json.now_playing?.song?.title ?? json.title ?? "";
        const songArtist = json.now_playing?.song?.artist ?? json.artist ?? "";

        setTitle(songTitle);
        setArtist(songArtist);
        setListeners(json.listeners ?? 0);
        let videoId: string | undefined = undefined;
        try {
          const form = new URLSearchParams();
          form.append("title", songTitle);
          form.append("channel_name", songArtist);

          const r2 = await fetch("https://archive.pinapelz.moe/api/exact_match", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
          });

          if (r2.ok) {
            const j2 = await r2.json();
            if (j2 && j2.video_id) videoId = String(j2.video_id);
          }
        } catch (e) {
        }

        // remember the current video's id so we can show the thumbnail in the player
        setCurrentVideoId(videoId);

        setHistory((prev) => {
          if (prev[0]?.title === songTitle) return prev;
          return [
            {
              title: songTitle,
              artist: songArtist,
              time: new Date().toLocaleTimeString(),
              videoId,
            },
            ...prev.slice(0, 9),
          ];
        });
      } catch {}
    };

    fetchNowPlaying();
    const interval = window.setInterval(fetchNowPlaying, 15000);
    return () => clearInterval(interval);
  }, [nowPlayingUrl]);


  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: "YouTube Radio",
    });

    navigator.mediaSession.setActionHandler("play", () =>
      setIsPlaying(true)
    );
    navigator.mediaSession.setActionHandler("pause", () =>
      setIsPlaying(false)
    );
  }, [title, artist]);

  return (
    <>
      <main className="center">
        <div className="player">

          {currentVideoId ? (
            <div className="player-thumb-wrap" style={{ textAlign: "center", marginBottom: 10 }}>
              <a href={`https://patchwork.moekyun.me/watch?v=${currentVideoId}`} target="_blank" rel="noopener noreferrer">
                <img
                  className="player-thumb"
                  src={`https://content.pinapelz.com/file/vtuber-rabbit-hole-archive/VTuber+Covers+Archive/thumbnails/${currentVideoId}.jpg`}
                  alt="current track thumbnail"
                  style={{ width: 560, height: 315, objectFit: "cover", borderRadius: 8, display: "inline-block", border: "1px solid rgba(255,255,255,0.03)" }}
                />
              </a>
            </div>
          ) : null}
          <h1>{title}</h1>
          <div className="artist">{artist}</div>
          <div className="artist">
            Listeners: {typeof listeners === "number"
              ? listeners
              : `total: ${listeners.total}${listeners.unique !== undefined ? `, unique: ${listeners.unique}` : ""}${listeners.current !== undefined ? `, current: ${listeners.current}` : ""}`}
          </div>

          <div className="viz-wrap">
            <Visualizer audioRef={audioRef} />
            <div className="viz-overlay viz-top-left">
              Listened: {formatTime(listened)}
            </div>
            <div className="viz-overlay viz-top-right">
              Vol
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>
          </div>

          <audio ref={audioRef} src={streamUrl} crossOrigin="anonymous" hidden />

          <div className="controls-row">
            <div className="control-group">
              <button className="btn" onClick={resync}>
                Resync
              </button>
              <div className="latency-display">
                Latency: {latency !== null ? `${latency}ms` : "—"}
              </div>
            </div>

            <button
              className="btn"
              onClick={async () => {
                const audio = audioRef.current;
                if (!started) {
                  try {
                    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
                    if (AudioCtx) {
                      const tmp = new AudioCtx();
                      if (tmp && typeof tmp.resume === "function") {
                        await tmp.resume();
                        try { await tmp.close(); } catch {}
                      }
                    }
                  } catch {}
                  if (audio) {
                    try { audio.crossOrigin = "anonymous"; } catch {}
                    try { await audio.play(); } catch {}
                  }
                  setStarted(true);
                  setIsPlaying(true);
                  return;
                }
                setIsPlaying((p) => !p);
              }}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>
        </div>
      </main>

      <History history={history} />
      <Footer m3uUrl={m3uUrl} />
    </>
  );
}
