"use client";

import { useEffect, useRef, useState } from "react";

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** A podcast episode as a text control: Listen, then the time, in the letter's own voice. */
export function Listen({ src, title }: { src: string; title: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const tick = () => setTime(el.currentTime);
    const meta = () => setLength(el.duration);
    const start = () => setPlaying(true);
    const stop = () => setPlaying(false);
    el.addEventListener("timeupdate", tick);
    el.addEventListener("durationchange", meta);
    el.addEventListener("play", start);
    el.addEventListener("ended", stop);
    el.addEventListener("pause", stop);
    return () => {
      el.removeEventListener("timeupdate", tick);
      el.removeEventListener("durationchange", meta);
      el.removeEventListener("play", start);
      el.removeEventListener("ended", stop);
      el.removeEventListener("pause", stop);
    };
  }, []);
  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    // The word changes when the audio really starts or stops, not on the click.
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };
  return (
    <p className="listen sans">
      <button
        type="button"
        className="textbutton"
        onClick={toggle}
        aria-label={`${playing ? "Pause" : "Listen to"} ${title}`}
      >
        {playing ? "Pause" : "Listen"}
      </button>
      {(time > 0 || length > 0) && (
        <span className="listen-time">
          {clock(time)}
          {length > 0 && ` / ${clock(length)}`}
        </span>
      )}
      <audio ref={audio} src={src} preload="none" />
    </p>
  );
}
