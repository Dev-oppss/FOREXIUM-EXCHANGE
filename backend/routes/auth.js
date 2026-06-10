import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// ============================================================
// GET /api/auth/slots — quels rôles sont déjà pris ?
// Public (pas besoin d'être connecté)
// ============================================================
router.get('/slots', asyncHandler(async (req, res) => {
  const rows = await query("SELECT role FROM users WHERE role IN ('porteur', 'associe')");
  const taken = rows.map(r => r.role);
  res.json({
    porteur_taken: taken.includes('porteur'),
    associe_taken: taken.includes('associe'),
    both_taken:    taken.includes('porteur') && taken.includes('associe'),
  });
}));

// ============================================================
// POST /api/auth/register — inscription (1 porteur + 1 associé max)
// ============================================================
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validation
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'Tous les champs sont requis' });

  if (!['porteur', 'associe'].includes(role))
    return res.status(400).json({ error: 'Rôle invalide (porteur ou associe)' });

  if (password.length < 4)
    return res.status(400).json({ error: 'Mot de passe trop court (min 4 caractères)' });

  // Vérifier si le rôle est déjà pris
  const roleExists = await query('SELECT id FROM users WHERE role = ?', [role]);
  if (roleExists.length > 0)
    return res.status(409).json({ error: `Un compte ${role} existe déjà` });

  // Vérifier si l'email est déjà utilisé
  const emailExists = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (emailExists.length > 0)
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });

  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = `u_${Date.now()}`;

  // Créer l'utilisateur
  await query(
    'INSERT INTO users (id, email, password, role, name, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [userId, email, hashedPassword, role, name]
  );

  // Logger
  await query(
    "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'connexion', ?, ?)",
    [`LOG_${Date.now()}`, `Inscription: ${name} — Rôle: ${role}`, userId]
  );

  res.status(201).json({
    success: true,
    message: 'Compte créé avec succès',
    users: { id: userId, email, role, name },
  });
}));

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis' });

  const users = await query('SELECT * FROM users WHERE email = ?', [email]);
  if (users.length === 0)
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const user = users[0];
  const ok = await bcrypt.compare(password, user.password);
  if (!ok)
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'forexium_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
  await query(
    "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'connexion', 'Connexion réussie', ?)",
    [`LOG_${Date.now()}`, user.id]
  );

  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  });
}));

// ============================================================
// POST /api/auth/logout
// ============================================================
router.post('/logout', asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Déconnexion réussie' });
}));

export default router;
