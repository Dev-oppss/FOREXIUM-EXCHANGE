import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ error: 'Token manquant' });

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'forexium_secret');

    const users = await query('SELECT id, email, role, name FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0)
      return res.status(401).json({ error: 'Utilisateur non trouvé' });

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Session expirée' });
    if (error.name === 'JsonWebTokenError')
      return res.status(401).json({ error: 'Token invalide' });
    next(error);
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: `Rôle requis: ${roles.join(' ou ')}` });
  next();
};
