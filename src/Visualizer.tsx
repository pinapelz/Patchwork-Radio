import { useEffect, useRef } from "react";

interface Props {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying?: boolean;
}

export default function Visualizer({ audioRef, isPlaying }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const srcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const startedRef = useRef<boolean>(false);

  const createAndConnect = async (): Promise<void> => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;

    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      audio.crossOrigin = "anonymous";
    } catch {}

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const actx = audioCtxRef.current;

    if (actx.state === "suspended" && typeof actx.resume === "function") {
      try {
        await actx.resume();
      } catch {}
    }

    if (!srcRef.current) {
      try {
        srcRef.current = actx.createMediaElementSource(audio);
      } catch {
        // createMediaElementSource throws if called twice for same element & context; ignore
      }
    }

    if (!analyserRef.current) {
      analyserRef.current = actx.createAnalyser();
      analyserRef.current.fftSize = 2048;
    }

    // connect if not already connected
    try {
      if (srcRef.current && analyserRef.current) {
        srcRef.current.connect(analyserRef.current);
        analyserRef.current.connect(actx.destination);
      }
    } catch {}

    dataRef.current = new Uint8Array(analyserRef.current!.frequencyBinCount);
  };

  const draw = (): void => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = dataRef.current ?? new Uint8Array(analyser.frequencyBinCount);
    dataRef.current = data;

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(data);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bars = 64;
      const step = Math.max(1, Math.floor(data.length / bars));
      const barWidth = canvas.width / bars;

      let x = 0;
      for (let i = 0; i < data.length; i += step) {
        const v = data[i];
        const h = (v / 255) * canvas.height;

        ctx.fillStyle = `hsl(270,78%,${28 + (v / 255) * 52}%)`;
        ctx.fillRect(x, canvas.height - h, barWidth * 0.9, h);
        x += barWidth;
      }
    };

    render();
  };

  const startVisualizer = async (): Promise<void> => {
    if (startedRef.current) return;
    await createAndConnect();
    startedRef.current = true;
    draw();
  };

  useEffect(() => {
    // Start on first user interaction (some browsers require a gesture to create/resume audio)
    const onInteract = async () => {
      await startVisualizer();
      try {
        // also try to resume AudioContext if present
        if (audioCtxRef.current && typeof audioCtxRef.current.resume === "function") {
          await audioCtxRef.current.resume();
        }
      } catch {}
    };

    document.addEventListener("click", onInteract, { once: true });
    document.addEventListener("touchstart", onInteract, { once: true });

    // Also attempt to start if isPlaying prop turns true (user already interacted with play button)
    if (isPlaying) {
      startVisualizer().catch(() => {});
    }

    return () => {
      document.removeEventListener("click", onInteract);
      document.removeEventListener("touchstart", onInteract);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // If play toggles on after mount, try to start/resume visualizer
    if (isPlaying) {
      startVisualizer().catch(() => {});
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        if (srcRef.current) {
          try {
            srcRef.current.disconnect();
          } catch {}
          srcRef.current = null;
        }
        if (analyserRef.current) {
          try {
            analyserRef.current.disconnect();
          } catch {}
          analyserRef.current = null;
        }
        if (audioCtxRef.current) {
          try {
            // try to close the context (may be no-op on some browsers)
            if (typeof audioCtxRef.current.close === "function") {
              audioCtxRef.current.close().catch(() => {});
            }
          } catch {}
          audioCtxRef.current = null;
        }
      } catch {}
      startedRef.current = false;
      dataRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} width={900} height={84} />;
}
