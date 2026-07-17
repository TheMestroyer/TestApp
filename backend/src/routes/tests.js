import crypto from 'node:crypto';
import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare(
  'SELECT id, name, file_name, state, created_at, updated_at FROM tests WHERE user_id = ? ORDER BY updated_at DESC'
);
const getStmt = db.prepare('SELECT * FROM tests WHERE id = ? AND user_id = ?');
const insertStmt = db.prepare(
  'INSERT INTO tests (id, user_id, name, file_name, raw_text, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
const updateStmt = db.prepare('UPDATE tests SET name = ?, state = ?, updated_at = ? WHERE id = ? AND user_id = ?');
const deleteStmt = db.prepare('DELETE FROM tests WHERE id = ? AND user_id = ?');

function blankState(questionCount) {
  const n = Number.isInteger(questionCount) && questionCount > 0 ? questionCount : 0;
  return {
    currentIndex: 0,
    marked: new Array(n).fill(false),
    peeked: new Array(n).fill(false),
    answers: new Array(n).fill(null),
    submitted: false,
    submittedElapsedMs: null,
    scoreText: null
  };
}

function serializeRow(row, includeRawText) {
  const out = {
    id: row.id,
    name: row.name,
    fileName: row.file_name,
    state: JSON.parse(row.state),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (includeRawText) out.rawText = row.raw_text;
  return out;
}

router.get('/', (req, res) => {
  const rows = listStmt.all(req.user.id);
  res.json({ tests: rows.map((row) => serializeRow(row, false)) });
});

router.post('/', (req, res) => {
  const { fileName, rawText, name, questionCount } = req.body || {};
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({ error: 'rawText is required.' });
  }
  if (typeof fileName !== 'string' || !fileName.trim()) {
    return res.status(400).json({ error: 'fileName is required.' });
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const displayName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : fileName.trim();
  const state = blankState(questionCount);

  insertStmt.run(id, req.user.id, displayName, fileName.trim(), rawText, JSON.stringify(state), now, now);
  res.status(201).json({ test: serializeRow(getStmt.get(id, req.user.id), true) });
});

router.get('/:id', (req, res) => {
  const row = getStmt.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Test not found.' });
  res.json({ test: serializeRow(row, true) });
});

router.patch('/:id', (req, res) => {
  const row = getStmt.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Test not found.' });

  const { name, state } = req.body || {};
  const nextName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : row.name;
  const nextState = state && typeof state === 'object' ? JSON.stringify(state) : row.state;

  updateStmt.run(nextName, nextState, Date.now(), row.id, req.user.id);
  res.json({ test: serializeRow(getStmt.get(row.id, req.user.id), true) });
});

router.delete('/:id', (req, res) => {
  const result = deleteStmt.run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Test not found.' });
  res.status(204).end();
});

export default router;
