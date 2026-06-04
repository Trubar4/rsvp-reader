import React, { useMemo, useState } from 'react';
import CalibrationPanel from './CalibrationPanel';

type Token = { text: string; type: 'word' | 'punct' | 'paragraph_break' };

function buildParagraphs(tokens: Token[]): string[] {
  const paragraphs: string[] = [];
  const pending: string[] = [];

  function flush() {
    const s = pending.join('').trim();
    if (s) paragraphs.push(s);
    pending.length = 0;
  }

  const isPunct = (t: string) => /^[.,;:!?…'"()\[\]{}\-–—]+$/.test(t);

  for (const tok of tokens) {
    if (tok.type === 'paragraph_break') {
      flush();
    } else if (pending.length === 0 || isPunct(tok.text)) {
      pending.push(tok.text);
    } else {
      pending.push(' ' + tok.text);
    }
  }
  flush();
  return paragraphs;
}

type OptoProps = {
  optotraining: boolean;
  stripeOffset: number; onStripeOffsetChange: (n: number) => void;
  stripeWidth: number; onStripeWidthChange: (n: number) => void;
  stripeRed: string; onStripeRedChange: (s: string) => void;
  stripeCyan: string; onStripeCyanChange: (s: string) => void;
};

export default function BarReaderScreen({
  tokens, textScale, fg, bg, onExit,
  optotraining, stripeOffset, onStripeOffsetChange,
  stripeWidth, onStripeWidthChange,
  stripeRed, onStripeRedChange,
  stripeCyan, onStripeCyanChange,
}: {
  tokens: Token[];
  textScale: number;
  fg: string;
  bg: string;
  onExit: () => void;
} & OptoProps) {
  const [calibrating, setCalibrating] = useState(false);
  const paragraphs = useMemo(() => buildParagraphs(tokens), [tokens]);

  return (
    <div
      className={`bar-reader${optotraining ? ' opto-active' : ''}`}
      style={{
        '--stripe-offset': `${stripeOffset}px`,
        '--stripe-w': `${stripeWidth}px`,
        '--stripe-red': stripeRed,
        '--stripe-cyan': stripeCyan,
        '--bg': bg,
        '--fg': fg,
      } as React.CSSProperties}
    >
      {calibrating && (
        <CalibrationPanel
          stripeOffset={stripeOffset} onStripeOffsetChange={onStripeOffsetChange}
          stripeWidth={stripeWidth} onStripeWidthChange={onStripeWidthChange}
          stripeRed={stripeRed} onStripeRedChange={onStripeRedChange}
          stripeCyan={stripeCyan} onStripeCyanChange={onStripeCyanChange}
          onClose={() => setCalibrating(false)}
        />
      )}

      <div className="bar-reader-header">
        <button className="btn btn-secondary btn-sm" onClick={onExit}>← Zurück</button>
        {optotraining && !calibrating && (
          <button
            className="opto-calib-btn-inline"
            onClick={() => setCalibrating(true)}
          >
            Kalibrieren
          </button>
        )}
      </div>

      <div className="bar-reader-scroll">
        <div
          className="bar-reader-text"
          style={{ fontSize: `${Math.round(18 * textScale)}px` }}
        >
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </div>
  );
}
