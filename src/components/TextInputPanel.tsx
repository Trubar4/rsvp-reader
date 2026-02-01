import React from 'react';

export default function TextInputPanel(props: { value: string; onChange: (v: string) => void; }) {
  return (
    <textarea
      className="textarea"
      placeholder="Text hier einfügen..."
      value={props.value}
      onChange={e => props.onChange(e.target.value)}
    />
  );
}
