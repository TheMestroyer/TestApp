import { useState } from 'react';
import { parseQuiz } from '../lib/quizParser.js';

export default function TestEditor({ name: initialName, rawText: initialRawText, onSave, onCancel, onDownload, showNameField = true }) {
  const [name, setName] = useState(initialName);
  const [text, setText] = useState(initialRawText);
  const [warnings, setWarnings] = useState([]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const parsed = parseQuiz(text);
    if (parsed.warnings.length) {
      setWarnings(parsed.warnings);
      return;
    }
    setWarnings([]);
    setSaving(true);
    try {
      await onSave({ name: name.trim() || parsed.title || 'Untitled test', rawText: text, parsed });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="editorPanel glow-panel">
      <div className="editorHeader">
        {showNameField ? (
          <input
            className="field-input editorNameInput"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
          />
        ) : (
          <span className="editorTitle">Editing</span>
        )}
        <div className="editorActions">
          <button type="button" className="btn btn-secondary" onClick={() => onDownload(text)}>
            Download file
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="errorBox">{`This file could not be saved:\n\n${warnings.join('\n')}`}</div>
      )}

      <textarea
        className="editorTextarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        autoFocus
      />
    </div>
  );
}
