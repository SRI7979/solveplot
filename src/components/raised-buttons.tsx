"use client";

import { useEffect } from "react";

const CONTROLS =
  ".outlinedControl, .secondaryButton, .primaryButton, .copyButton, .pointButton, .wsNewProblem, .wsMobileMenu, .appearanceAmountChoice, .appearancePaletteChoice, .iconControl, .choiceControl";

export default function RaisedButtonFeedback() {
  useEffect(() => {
    let held: { control: HTMLElement; pointerId: number | null } | null = null;

    function release() {
      held?.control.removeAttribute("data-pressing");
      held = null;
    }

    function available(control: HTMLElement | null): control is HTMLElement {
      return Boolean(
        control?.isConnected &&
        control.closest(".solveplot-shell") &&
        !control.matches(":disabled, [aria-disabled=true], :has(input:disabled)"),
      );
    }

    function start(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0) return;
      release();
      const control =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(CONTROLS)
          : null;
      if (!available(control)) return;
      held = { control, pointerId: event.pointerId };
      control.setAttribute("data-pressing", "");
    }

    function move(event: PointerEvent) {
      if (!held || event.pointerId !== held.pointerId) return;
      if (!available(held.control)) return release();
      const bounds = held.control.getBoundingClientRect();
      held.control.toggleAttribute(
        "data-pressing",
        event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom,
      );
    }

    function keyDown(event: KeyboardEvent) {
      if (event.key === "Escape") return release();
      if (event.defaultPrevented || event.repeat || ![" ", "Enter"].includes(event.key)) return;
      const control =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(CONTROLS)
          : null;
      if (!available(control)) return;
      // Space scrolls a link; it is not an activation key for that element.
      if (event.key === " " && control.matches("a[href]")) return;
      release();
      held = { control, pointerId: null };
      control.setAttribute("data-pressing", "");
    }
    function keyUp(event: KeyboardEvent) {
      if (held?.pointerId === null && [" ", "Enter"].includes(event.key))
        release();
    }

    function end(event: PointerEvent) {
      if (event.pointerId === held?.pointerId) release();
    }

    function focusOut(event: FocusEvent) {
      if (held?.pointerId === null && event.target instanceof Node && held.control.contains(event.target)) release();
    }

    function leaveWindow(event: PointerEvent) {
      if (!event.relatedTarget && event.pointerId === held?.pointerId) release();
    }

    function visibilityChange() {
      if (document.hidden) release();
    }

    // Pointer events give touch the same immediate feedback as mouse input.
    // Keep native click, keyboard, and scrolling behavior intact.
    document.addEventListener("pointerdown", start, { passive: true });
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerup", end, { passive: true });
    document.addEventListener("pointercancel", end, { passive: true });
    document.addEventListener("pointerout", leaveWindow, { passive: true });
    document.addEventListener("keydown", keyDown);
    document.addEventListener("keyup", keyUp);
    document.addEventListener("focusout", focusOut);
    document.addEventListener("visibilitychange", visibilityChange);
    document.addEventListener("scroll", release, { capture: true, passive: true });
    window.addEventListener("blur", release);
    return () => {
      release();
      document.removeEventListener("pointerdown", start);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", end);
      document.removeEventListener("pointercancel", end);
      document.removeEventListener("pointerout", leaveWindow);
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("keyup", keyUp);
      document.removeEventListener("focusout", focusOut);
      document.removeEventListener("visibilitychange", visibilityChange);
      document.removeEventListener("scroll", release, true);
      window.removeEventListener("blur", release);
    };
  }, []);

  return null;
}
