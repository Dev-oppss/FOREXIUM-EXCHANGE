import express from 'express';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/stock
router.get('/', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM stock WHERE devise = ?', ['USDT']);
  if (rows.length === 0)
    return res.json({ devise: 'USDT', quantite: 0, cmup: 0, valeur_totale: 0 });

  const s = rows[0];
  res.json({
    devise:        s.devise,
    quantite:      parseFloat(s.quantite),
    cmup:          parseFloat(s.cmup),
    valeur_totale: parseFloat(s.quantite) * parseFloat(s.cmup),
  });
}));

// PUT /api/stock/cmup
router.put('/cmup', asyncHandler(async (req, res) => {
  const { devise = 'USDT', cmup } = req.body;
  if (!cmup || isNaN(cmup) || parseFloat(cmup) <= 0)
    return res.status(400).json({ error: 'CMUP invalide' });

  await query('UPDATE stock SET cmup = ?, updated_at = NOW() WHERE devise = ?', [parseFloat(cmup), devise]);
  await query(
    "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'cmup', ?, ?)",
    [`LOG_${Date.now()}`, `CMUP ${devise} → ${cmup}`, req.user.id]
  );
  res.json({ success: true, devise, cmup: parseFloat(cmup) });
}));

// GET /api/stock/history
router.get('/history', asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;
  const rows = await query(
    `SELECT id, date AS date_enregistrement, type, quantite,
            taux_achat_unitaire, ancien_cmup, nouveau_cmup, fournisseur
     FROM transactions
     WHERE type = 'achat' AND devise = 'USDT' AND statut = 'committed'
     ORDER BY date DESC LIMIT ${parseInt(limit) || 50}`
  );
  res.json({
    history: rows.map(h => ({
      ...h,
      quantite:            parseFloat(h.quantite || 0),
      taux_achat_unitaire: parseFloat(h.taux_achat_unitaire || 0),
      ancien_cmup:         parseFloat(h.ancien_cmup || 0),
      nouveau_cmup:        parseFloat(h.nouveau_cmup || 0),
    }))
  });
}));

export default router;
