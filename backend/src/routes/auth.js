import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import { signToken, COOKIE_MAX_AGE_MS } from '../lib/tokens.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' }
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const insertUserStmt = db.prepare(
  'INSERT INTO users (id, email, password_hash, display_name, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');

function setAuthCookie(res, userId) {
  const token = signToken({ sub: userId });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/'
  });
}

function publicUser(row) {
  return { id: row.id, email: row.email, displayName: row.display_name, isAdmin: !!row.is_admin };
}

router.post('/register', authLimiter, (req, res) => {
  const { email, password, displayName } = req.body || {};

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (findByEmailStmt.get(normalizedEmail)) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim().slice(0, 60) : null;
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const isAdmin = adminEmail && normalizedEmail === adminEmail ? 1 : 0;

  insertUserStmt.run(id, normalizedEmail, passwordHash, name, isAdmin, Date.now());
  setAuthCookie(res, id);
  res.status(201).json({ user: { id, email: normalizedEmail, displayName: name, isAdmin: !!isAdmin } });
});

router.post('/login', authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const row = findByEmailStmt.get(email.trim().toLowerCase());
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  setAuthCookie(res, row.id);
  res.json({ user: publicUser(row) });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
