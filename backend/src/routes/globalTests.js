import crypto from 'node:crypto';
import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare('SELECT id, name, file_name, created_at, updated_at FROM global_tests ORDER BY name COLLATE NOCASE');
const getStmt = db.prepare('SELECT * FROM global_tests WHERE id = ?');
const insertStmt = db.prepare(
  'INSERT INTO global_tests (id, name, file_name, raw_text, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const renameStmt = db.prepare('UPDATE global_tests SET name = ?, updated_at = ? WHERE id = ?');
const replaceStmt = db.prepare('UPDATE global_tests SET name = ?, file_name = ?, raw_text = ?, updated_at = ? WHERE id = ?');
const deleteStmt = db.prepare('DELETE FROM global_tests WHERE id = ?');
const clearRefsStmt = db.prepare('UPDATE tests SET global_test_id = NULL WHERE global_test_id = ?');

function serialize(row, includeRawText) {
  const out = {
    id: row.id,
    name: row.name,
    fileName: row.file_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (includeRawText) out.rawText = row.raw_text;
  return out;
}

router.get('/', (req, res) => {
  res.json({ globalTests: listStmt.all().map((row) => serialize(row, false)) });
});

router.get('/:id', requireAdmin, (req, res) => {
  const row = getStmt.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Shared test not found.' });
  res.json({ globalTest: serialize(row, true) });
});

router.post('/', requireAdmin, (req, res) => {
  const { fileName, rawText, name } = req.body || {};
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({ error: 'rawText is required.' });
  }
  if (typeof fileName !== 'string' || !fileName.trim()) {
    return res.status(400).json({ error: 'fileName is required.' });
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const displayName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : fileName.trim();

  insertStmt.run(id, displayName, fileName.trim(), rawText, req.user.id, now, now);
  res.status(201).json({ globalTest: serialize(getStmt.get(id)) });
});

router.patch('/:id', requireAdmin, (req, res) => {
  const row = getStmt.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Shared test not found.' });

  const { name, rawText, fileName } = req.body || {};
  const nextName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : row.name;

  if (typeof rawText === 'string' && rawText.trim()) {
    const nextFileName = typeof fileName === 'string' && fileName.trim() ? fileName.trim() : row.file_name;
    replaceStmt.run(nextName, nextFileName, rawText, Date.now(), row.id);
  } else {
    renameStmt.run(nextName, Date.now(), row.id);
  }

  res.json({ globalTest: serialize(getStmt.get(row.id)) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const row = getStmt.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Shared test not found.' });
  clearRefsStmt.run(row.id);
  deleteStmt.run(row.id);
  res.status(204).end();
});

export default router;
