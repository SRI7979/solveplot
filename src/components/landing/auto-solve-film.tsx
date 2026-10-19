"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** The hero plays a recording of the real upload and solution components.
 * No calculator or paid solve request is started by this player. */
export function AutoSolveFilm() {
  const host = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const player = video.current;
    const frame = host.current;
    if (!player || !frame) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 600px)");
    let visible = false;
    const syncPlayback = () => {
      if (motion.matches || !visible || document.hidden) player.pause();
      else void player.play().catch(() => {});
    };
    const selectRecording = () => {
      player.pause();
      player.poster = phone.matches ? "/demo/auto-solve-phone.webp?v=6" : "/demo/auto-solve-desktop.webp?v=6";
      if (motion.matches) {
        player.removeAttribute("src");
        player.load();
        return;
      }
      player.src = phone.matches ? "/demo/auto-solve-phone.webm?v=6" : "/demo/auto-solve-desktop.webm?v=6";
      player.load();
      syncPlayback();
    };
    selectRecording();
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.12 });
    observer.observe(frame);
    phone.addEventListener("change", selectRecording);
    motion.addEventListener("change", selectRecording);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      observer.disconnect();
      phone.removeEventListener("change", selectRecording);
      motion.removeEventListener("change", selectRecording);
      document.removeEventListener("visibilitychange", syncPlayback);
      player.pause();
    };
  }, []);

  return <figure className="auto-solve-film" ref={host} aria-label="Desmo product demonstration">
    <div className="auto-solve-media">
      <picture className="auto-solve-poster">
        <source media="(max-width: 600px)" srcSet="/demo/auto-solve-phone.webp?v=6" />
        <Image src="/demo/auto-solve-desktop.webp?v=6" alt="Desmo showing the uploaded quadratic question and explanation on the left, with Desmos data lists, a fitted parabola, and answer 143 on the right" width={3600} height={2250} priority unoptimized />
      </picture>
      <video ref={video} width={3600} height={2250} autoPlay muted loop playsInline preload="none" aria-describedby="auto-solve-description" onError={() => setFailed(true)} style={failed ? { opacity: 0 } : undefined}>
        Your browser can show the completed example in the poster above.
      </video>
    </div>
    <figcaption id="auto-solve-description" className="auto-solve-description">A problem image is dragged into Desmo. After a brief loading indicator, Desmo displays the question and recommended regression method beside its automatically populated Desmos calculator. Data lists supply the points (1, 8), (2, 15), and (4, 35). The regression y₁ ~ ax₁² + bx₁ + c gives a = 1, b = 4, c = 3. Define f(x) = ax² + bx + c, then enter f(10) to get 143.</figcaption>
  </figure>;
}
