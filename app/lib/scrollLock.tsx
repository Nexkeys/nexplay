import { useEffect } from 'react';

let locks = 0;

/**
 * Stops the page behind a sheet, drawer or results card from scrolling while it is open, so a
 * swipe moves the panel and not the page. Render it inside the overlay; it unlocks on unmount.
 */
export function ScrollLock() {
  useEffect(() => {
    const root = document.documentElement;
    if (locks++ === 0) root.classList.add('scroll-locked');
    return () => {
      if (--locks === 0) root.classList.remove('scroll-locked');
    };
  }, []);
  return null;
}
