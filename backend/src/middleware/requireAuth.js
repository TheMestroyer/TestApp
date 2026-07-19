import db from '../db.js';
import { verifyToken } from '../lib/tokens.js';

const getUserStmt = db.prepare('SELECT id, email, display_name, is_admin FROM users WHERE id = ?');

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  const user = getUserStmt.get(payload.sub);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  req.user = { id: user.id, email: user.email, displayName: user.display_name, isAdmin: !!user.is_admin };
  next();
}
