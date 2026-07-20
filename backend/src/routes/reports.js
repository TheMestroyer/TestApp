import crypto from 'node:crypto';
import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();
router.use(requireAuth);

const getGlobalTestStmt = db.prepare('SELECT id FROM global_tests WHERE id = ?');
const insertStmt = db.prepare(
  'INSERT INTO question_reports (id, global_test_id, question_index, question_text, reported_by, reporter_email, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
const mineStmt = db.prepare('SELECT question_index FROM question_reports WHERE global_test_id = ? AND reported_by = ?');
const listStmt = db.prepare(`
  SELECT r.id, r.global_test_id, r.question_index, r.question_text, r.reporter_email, r.reason, r.created_at, g.name AS test_name
  FROM question_reports r
  LEFT JOIN global_tests g ON g.id = r.global_test_id
  ORDER BY r.created_at DESC
`);
const deleteStmt = db.prepare('DELETE FROM question_reports WHERE id = ?');

router.post('/', (req, res) => {
  const { globalTestId, questionIndex, questionText, reason } = req.body || {};

  if (typeof globalTestId !== 'string' || !globalTestId) {
    return res.status(400).json({ error: 'globalTestId is required.' });
  }
  if (!Number.isInteger(questionIndex) || questionIndex < 0) {
    return res.status(400).json({ error: 'questionIndex must be a non-negative integer.' });
  }
  if (typeof questionText !== 'string' || !questionText.trim()) {
    return res.status(400).json({ error: 'questionText is required.' });
  }

  const globalTest = getGlobalTestStmt.get(globalTestId);
  if (!globalTest) return res.status(404).json({ error: 'Shared test not found.' });

  const id = crypto.randomUUID();
  const trimmedReason = typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 1000) : null;

  insertStmt.run(
    id,
    globalTestId,
    questionIndex,
    questionText.trim().slice(0, 2000),
    req.user.id,
    req.user.email,
    trimmedReason,
    Date.now()
  );
  res.status(201).json({ report: { id } });
});

router.get('/mine/:globalTestId', (req, res) => {
  const rows = mineStmt.all(req.params.globalTestId, req.user.id);
  res.json({ reportedIndexes: rows.map((r) => r.question_index) });
});

router.get('/', requireAdmin, (req, res) => {
  const rows = listStmt.all();
  res.json({
    reports: rows.map((r) => ({
      id: r.id,
      globalTestId: r.global_test_id,
      testName: r.test_name,
      questionIndex: r.question_index,
      questionText: r.question_text,
      reporterEmail: r.reporter_email,
      reason: r.reason,
      createdAt: r.created_at,
    })),
  });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = deleteStmt.run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Report not found.' });
  res.status(204).end();
});

export default router;
