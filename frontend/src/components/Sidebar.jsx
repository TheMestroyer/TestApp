import { useState } from 'react';
import { Link } from 'react-router-dom';

function summaryText(test) {
  const answers = (test.state && test.state.answers) || [];
  const total = answers.length;
  if (test.state && test.state.submitted) {
    return `Submitted${test.state.scoreText ? ` — ${test.state.scoreText}` : ''}`;
  }
  const answered = answers.filter((a) => {
    if (a === null || a === undefined) return false;
    if (Array.isArray(a)) return a.length > 0;
    if (typeof a === 'object') return (a.assignments || []).some((x) => x !== null && x !== undefined);
    if (typeof a === 'string') return a.trim().length > 0;
    return true;
  }).length;
  return `${answered} / ${total} answered`;
}

export default function Sidebar({
  user,
  tests,
  globalTests,
  activeId,
  onSelect,
  onSelectGlobal,
  onRename,
  onDelete,
  onLogout,
  onShowTutorial,
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  function startRename(test) {
    setRenamingId(test.id);
    setRenameValue(test.name);
  }

  function commitRename(test) {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== test.name) onRename(test.id, trimmed);
    setRenamingId(null);
  }

  return (
    <aside className="sidebar">
      <div className="sidebarUser">
        <div className="sidebarUserInfo">
          <div className="sidebarUserLabel">Signed in as</div>
          <div className="sidebarUserEmail">{user.displayName || user.email}</div>
        </div>
        <div className="sidebarUserActions">
          <button type="button" className="btn btn-secondary helpBtn" title="Show tutorial" onClick={onShowTutorial}>
            ?
          </button>
          <button type="button" className="btn btn-secondary" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>

      {user.isAdmin && (
        <Link to="/admin" className="btn btn-secondary adminLink">
          Admin panel
        </Link>
      )}

      <h2 className="sidebarHeading">Shared tests</h2>
      {globalTests.length === 0 && <div className="sidebarEmpty">Nothing shared yet.</div>}
      {globalTests.map((gt) => (
        <div key={gt.id} className="sessionItem" onClick={() => onSelectGlobal(gt.id)}>
          <div className="sessionName">{gt.name}</div>
          <div className="sessionMeta">Shared by admin</div>
        </div>
      ))}

      <h2 className="sidebarHeading">Test history</h2>
      {tests.length === 0 && <div className="sidebarEmpty">No tests loaded yet. Drop a file in to get started.</div>}
      {tests.map((test) => (
        <div
          key={test.id}
          className={`sessionItem${test.id === activeId ? ' active' : ''}`}
          onClick={() => {
            if (test.id !== activeId) onSelect(test.id);
          }}
        >
          {renamingId === test.id ? (
            <input
              className="sessionRenameInput"
              autoFocus
              value={renameValue}
              onClick={(e) => e.stopPropagation()}
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
            <div
              className="sessionName"
              title="Click to rename"
              onClick={(e) => {
                e.stopPropagation();
                startRename(test);
              }}
            >
              {test.name}
              {test.globalTestId && <span className="sharedBadge">Shared</span>}
            </div>
          )}
          <div className="sessionMeta">{summaryText(test)}</div>
          <button
            type="button"
            className="btn-danger-ghost sessionDelete"
            title="Remove from history"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Remove "${test.name}" from your test history? This cannot be undone.`)) {
                onDelete(test.id);
              }
            }}
          >
            ×
          </button>
        </div>
      ))}
    </aside>
  );
}
