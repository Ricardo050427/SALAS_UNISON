import { useState, useEffect } from 'react';

/**
 * Drag & drop is a desktop-only enhancement. On touch / small screens it only
 * half-works (the browser's native touch-scroll cancels @dnd-kit's tracking, so
 * the dragged ghost doesn't follow and drops don't register). Rather than ship
 * that broken state we disable DnD there and keep tap-to-open working.
 *
 * Returns true only for a fine pointer (mouse/trackpad) on a wide viewport.
 */
export default function useDragEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      const finePointer = window.matchMedia('(pointer: fine)').matches;
      setEnabled(finePointer && window.innerWidth > 768);
    };
    evaluate();
    window.addEventListener('resize', evaluate);
    return () => window.removeEventListener('resize', evaluate);
  }, []);

  return enabled;
}
