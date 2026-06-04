import React from 'react';

type Props = {
  stripeOffset: number; onStripeOffsetChange: (n: number) => void;
  stripeWidth: number; onStripeWidthChange: (n: number) => void;
  stripeRed: string; onStripeRedChange: (s: string) => void;
  stripeCyan: string; onStripeCyanChange: (s: string) => void;
  onClose: () => void;
};

export default function CalibrationPanel({
  stripeOffset, onStripeOffsetChange,
  stripeWidth, onStripeWidthChange,
  stripeRed, onStripeRedChange,
  stripeCyan, onStripeCyanChange,
  onClose,
}: Props) {
  return (
    <div className="opto-calib-panel" onClick={e => e.stopPropagation()}>
      <h3>Kalibrierung</h3>

      <div className="opto-calib-label">Streifenbreite: {stripeWidth} px</div>
      <div className="opto-calib-row">
        <button className="opto-calib-step" onClick={() => onStripeWidthChange(Math.max(10, stripeWidth - 5))}>−5</button>
        <button className="opto-calib-step" onClick={() => onStripeWidthChange(Math.max(10, stripeWidth - 1))}>−1</button>
        <input type="range" min={10} max={300} value={stripeWidth}
          onChange={e => onStripeWidthChange(Number(e.target.value))} />
        <button className="opto-calib-step" onClick={() => onStripeWidthChange(Math.min(300, stripeWidth + 1))}>+1</button>
        <button className="opto-calib-step" onClick={() => onStripeWidthChange(Math.min(300, stripeWidth + 5))}>+5</button>
      </div>

      <div className="opto-calib-label">Versatz: {stripeOffset} px</div>
      <div className="opto-calib-row">
        <button className="opto-calib-step" onClick={() => onStripeOffsetChange(stripeOffset - 10)}>−10</button>
        <button className="opto-calib-step" onClick={() => onStripeOffsetChange(stripeOffset - 1)}>−1</button>
        <input type="range" min={-300} max={300} value={stripeOffset}
          onChange={e => onStripeOffsetChange(Number(e.target.value))} />
        <button className="opto-calib-step" onClick={() => onStripeOffsetChange(stripeOffset + 1)}>+1</button>
        <button className="opto-calib-step" onClick={() => onStripeOffsetChange(stripeOffset + 10)}>+10</button>
      </div>

      <div className="opto-calib-colors">
        <div className="opto-calib-color-item">
          <span>Rot</span>
          <input type="color" value={stripeRed} onChange={e => onStripeRedChange(e.target.value)} />
          <button className="opto-calib-step" onClick={() => onStripeRedChange('#FF0000')}>Reset</button>
        </div>
        <div className="opto-calib-color-item">
          <span>Cyan</span>
          <input type="color" value={stripeCyan} onChange={e => onStripeCyanChange(e.target.value)} />
          <button className="opto-calib-step" onClick={() => onStripeCyanChange('#00FFFF')}>Reset</button>
        </div>
      </div>

      <button className="opto-calib-done" onClick={onClose}>Fertig</button>
    </div>
  );
}
