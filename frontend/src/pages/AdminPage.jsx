import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { parseQuiz } from '../lib/quizParser.js';
import { downloadTextFile } from '../lib/exportText.js';
import Dropzone from '../components/Dropzone.jsx';
import TestEditor from '../components/TestEditor.jsx';

function formatDate(ms) {
  return new Date(ms).toLocaleString();
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [globalTests, setGlobalTests] = useState([]);
  const [error, setError] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const replaceInputRef = useRef(null);
  const replaceTargetId = useRef(null);

  function refresh() {
    api
      .listGlobalTests()
      .then((res) => setGlobalTests(res.globalTests))
      .catch(() => {});
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAddFile(text, fileName) {
    const parsed = parseQuiz(text);
    if (parsed.warnings.length) {
      setError(parsed.warnings.join('\n'));
      return;
    }
    setError('');
    await api.createGlobalTest({ fileName, rawText: text, name: parsed.title || fileName });
    refresh();
  }

  function startRename(test) {
    setRenamingId(test.id);
    setRenameValue(test.name);
  }

  async function commitRename(test) {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed || trimmed === test.name) return;
    await api.updateGlobalTest(test.id, { name: trimmed });
    refresh();
  }

  function triggerReplace(id) {
    replaceTargetId.current = id;
    replaceInputRef.current?.click();
  }

  function handleReplaceFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !replaceTargetId.current) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const parsed = parseQuiz(text);
      if (parsed.warnings.length) {
        setError(parsed.warnings.join('\n'));
        return;
      }
      setError('');
      await api.updateGlobalTest(replaceTargetId.current, { rawText: text, fileName: file.name });
      refresh();
    };
    reader.readAsText(file);
  }

  async function handleDelete(test) {
    if (!window.confirm(`Delete "${test.name}" for everyone? Anyone who already started it keeps their own copy, but it will no longer be listed as a shared test.`)) return;
    await api.deleteGlobalTest(test.id);
    refresh();
  }

  async function handleStartEdit(test) {
    setError('');
    const res = await api.getGlobalTest(test.id);
    setEditingId(test.id);
    setEditingData({ name: res.globalTest.name, rawText: res.globalTest.rawText, fileName: res.globalTest.fileName });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditingData(null);
  }

  async function handleSaveEdit({ name, rawText }) {
    await api.updateGlobalTest(editingId, { name, rawText });
    setEditingId(null);
    setEditingData(null);
    refresh();
  }

  async function handleDownload(test) {
    const res = await api.getGlobalTest(test.id);
    downloadTextFile(res.globalTest.rawText, test.fileName);
  }

  return (
    <div className="mainWrap adminWrap">
      <header className="appHeader adminHeader">
        <div>
          <h1>Admin panel</h1>
          <p className="sub">Shared tests you add here show up for every account.</p>
        </div>
        <div className="adminHeaderActions">
          <Link to="/" className="btn btn-secondary">
            Back to app
          </Link>
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <p className="adminSignedInAs">Signed in as {user.displayName || user.email}</p>

      <Dropzone onFileText={handleAddFile} />

      {error && <div className="errorBox">{`This file could not be added:\n\n${error}`}</div>}

      <input ref={replaceInputRef} type="file" accept=".txt,.md,.quiz,text/plain" style={{ display: 'none' }} onChange={handleReplaceFile} />

      <h2 className="sidebarHeading adminListHeading">Shared tests ({globalTests.length})</h2>

      {globalTests.length === 0 && <div className="sidebarEmpty">No shared tests yet — drop a file in above to add one.</div>}

      <div className="adminList">
        {globalTests.map((test) =>
          editingId === test.id && editingData ? (
            <TestEditor
              key={test.id}
              name={editingData.name}
              rawText={editingData.rawText}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              onDownload={(text) => downloadTextFile(text, editingData.fileName)}
            />
          ) : (
            <div key={test.id} className="adminItem glow-panel">
              {renamingId === test.id ? (
                <input
                  className="sessionRenameInput"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(test)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRename(test);
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setRenamingId(null);
                    }
                  }}
                />
              ) : (
                <div className="adminItemName" title="Click to rename" onClick={() => startRename(test)}>
                  {test.name}
                </div>
              )}
              <div className="adminItemMeta">
                {test.fileName} · updated {formatDate(test.updatedAt)}
              </div>
              <div className="adminItemActions">
                <button type="button" className="btn btn-secondary" onClick={() => handleStartEdit(test)}>
                  Edit
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => triggerReplace(test.id)}>
                  Replace file
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => handleDownload(test)}>
                  Download
                </button>
                <button type="button" className="btn-danger-ghost adminDelete" onClick={() => handleDelete(test)}>
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
