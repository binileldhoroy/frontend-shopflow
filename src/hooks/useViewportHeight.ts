import { useEffect } from 'react';

export function useViewportHeight(): void {
  useEffect(() => {
    const set = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--viewport-height', `${h}px`);
    };
    set();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', set);
      vv.addEventListener('scroll', set);
    } else {
      window.addEventListener('resize', set);
    }
    return () => {
      if (vv) {
        vv.removeEventListener('resize', set);
        vv.removeEventListener('scroll', set);
      } else {
        window.removeEventListener('resize', set);
      }
    };
  }, []);
}
