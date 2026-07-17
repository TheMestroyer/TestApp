import { useRef, useState } from 'react';

export default function Dropzone({ onFileText }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function readFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onFileText(e.target.result, file.name);
    reader.readAsText(file);
  }

  return (
    <div
      className={`dropzone${dragOver ? ' dragover' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        readFile(e.dataTransfer.files && e.dataTransfer.files[0]);
      }}
    >
      <div>
        <strong>Drag &amp; drop your test file here</strong>
      </div>
      <div className="hint">or click to browse · plain-text quiz format</div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.quiz,text/plain"
        style={{ display: 'none' }}
        onChange={(e) => readFile(e.target.files && e.target.files[0])}
      />
    </div>
  );
}
