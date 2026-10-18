'use client';

import { useEffect } from 'react';

const CONTROLS = '.outlinedControl, .secondaryButton, .primaryButton, .copyButton, .pointButton, .wsNewProblem, .wsMobileMenu, .appearanceAmountChoice, .appearancePaletteChoice';

export default function RaisedButtonFeedback() {
  useEffect(() => {
    let held: { control: HTMLElement; pointerId: number } | null = null;

    function release() {
      held?.control.removeAttribute('data-pressing');
      held = null;
    }

    function start(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0) return;
      release();
      const control = event.target instanceof Element ? event.target.closest<HTMLElement>(CONTROLS) : null;
      if (!control || control.matches(':disabled, [aria-disabled=true], :has(input:disabled)')) return;
      held = { control, pointerId: event.pointerId };
      control.setAttribute('data-pressing', '');
    }

    function move(event: PointerEvent) {
      if (!held || event.pointerId !== held.pointerId) return;
      const bounds = held.control.getBoundingClientRect();
      held.control.toggleAttribute('data-pressing', event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom);
    }

    function end(event: PointerEvent) {
      if (event.pointerId === held?.pointerId) release();
    }

    // Pointer events give touch the same immediate feedback as mouse input.
    // Keep native click, keyboard, and scrolling behavior intact.
    document.addEventListener('pointerdown', start, { passive: true });
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerup', end, { passive: true });
    document.addEventListener('pointercancel', end, { passive: true });
    window.addEventListener('blur', release);
    return () => {
      release();
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', release);
    };
  }, []);

  return null;
}
