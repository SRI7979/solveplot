"use client";

import { useEffect } from "react";

/** Enhance already-visible page content; loading or disabling JS never hides it. */
export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".solveplot-landing.landing-relaunch");
    if (!root || !("IntersectionObserver" in window)) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    const sections = root.querySelectorAll<HTMLElement>(
      "#preview > header, #tutor > header, #experience > header, " +
      "[data-product-scene], section[aria-labelledby='planned-features-title'] article, " +
      ".faq-intro, .faq-questions, .quiet-cta, .footer-top",
    );
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        if (!motion.matches) element.dataset.landingReveal = "visible";
        observer.unobserve(element);
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });

    sections.forEach((section) => {
      // A scene already inside an animated feature card should move only once.
      if (section.hasAttribute("data-product-scene") && section.closest("article")) return;
      observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
