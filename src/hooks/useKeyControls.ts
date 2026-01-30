
import { useEffect } from 'react';

export function useKeyControls(handlers: {
  onToggle: ()=>void;
  onBack: ()=>void;
  onFwd: ()=>void;
  onWpmDelta: (d:number)=>void;
  onPreset: (n:number)=>void; // 1..10
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      switch (e.key) {
        case ' ': e.preventDefault(); handlers.onToggle(); break;
        case 'ArrowLeft': handlers.onBack(); break;
        case 'ArrowRight': handlers.onFwd(); break;
        case 'ArrowUp': handlers.onWpmDelta(+25); break;
        case 'ArrowDown': handlers.onWpmDelta(-25); break;
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8': case '9': case '0':
          const n = e.key === '0' ? 10 : parseInt(e.key,10);
          handlers.onPreset(n);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
