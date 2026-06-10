import express from 'express';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

const validateCodeDevise = (code) => {
  // Uniquement lettres majuscules (généralement 3 lettres: USD, EUR, GBP)
  const regex = /^[A-Z]{2,5}$/;
  return regex.test(code);
};

// ─────────────────────────────────────────────────────────────
// GET /api/devises - Lister toutes les devises
// ─────────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const devises = await query(`
    SELECT 
      id,
      code,
      nom,
      taux_conversion,
      description,
      is_default,
      created_at,
      updated_at
    FROM devises_personnalisees
    ORDER BY is_default DESC, code ASC
  `);

  res.json({ devises });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/devises - Créer une nouvelle devise
// ─────────────────────────────────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  const { code, nom, taux_conversion, description } = req.body;

  // Validation
  if (!code || !taux_conversion) {
    return res.status(400).json({ error: 'Code et taux de conversion requis' });
  }

  // VALIDATION: Code uniquement lettres
  if (!validateCodeDevise(code.toUpperCase())) {
    return res.status(400).json({ error: 'Le code de devise doit contenir uniquement des lettres (2-5 caractères)' });
  }

  // Vérifier que le code n'existe pas déjà
  const existing = await query(
    'SELECT id FROM devises_personnalisees WHERE code = ?',
    [code.toUpperCase()]
  );

  if (existing && existing.length > 0) {
    return res.status(400).json({ error: 'Cette devise existe déjà' });
  }

  const result = await query(
    `INSERT INTO devises_personnalisees 
     (code, nom, taux_conversion, description, is_default) 
     VALUES (?, ?, ?, ?, FALSE)`,
    [code.toUpperCase(), nom || code, parseFloat(taux_conversion), description || null]
  );

  res.json({ 
    success: true, 
    devise_id: result.insertId,
    devise: {
      id: result.insertId,
      code: code.toUpperCase(),
      nom: nom || code,
      taux_conversion: parseFloat(taux_conversion),
      description: description || null,
      is_default: false
    }
  });
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/devises/:id - Modifier une devise
// ─────────────────────────────────────────────────────────────
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { code, nom, taux_conversion, description } = req.body;

  // Vérifier que la devise existe
  const devise = await query(
    'SELECT * FROM devises_personnalisees WHERE id = ?',
    [id]
  );

  if (!devise || devise.length === 0) {
    return res.status(404).json({ error: 'Devise non trouvée' });
  }

  // Vérifier que le code n'existe pas ailleurs
  if (code) {
    if (!validateCodeDevise(code.toUpperCase())) {
      return res.status(400).json({ error: 'Le code de devise doit contenir uniquement des lettres (2-5 caractères)' });
    }

    const existing = await query(
      'SELECT id FROM devises_personnalisees WHERE code = ? AND id != ?',
      [code.toUpperCase(), id]
    );
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Ce code de devise existe déjà' });
    }
  }

  const updates = [];
  const values = [];

  if (code !== undefined) {
    updates.push('code = ?');
    values.push(code.toUpperCase());
  }
  if (nom !== undefined) {
    updates.push('nom = ?');
    values.push(nom);
  }
  if (taux_conversion !== undefined) {
    updates.push('taux_conversion = ?');
    values.push(parseFloat(taux_conversion));
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Aucune modification' });
  }

  updates.push('updated_at = NOW()');
  const sql = `UPDATE devises_personnalisees SET ${updates.join(', ')} WHERE id = ?`;
  values.push(id);

  await query(sql, values);

  res.json({ success: true });
}));

// ─────────────────────────────────────────────────────────────
// DELETE /api/devises/:id - Supprimer une devise
// ─────────────────────────────────────────────────────────────
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const devise = await query('SELECT id, code, is_default FROM devises_personnalisees WHERE id = ?', [id]);
  if (!devise || devise.length === 0)
    return res.status(404).json({ error: 'Devise non trouvée' });

  if (devise[0].is_default)
    return res.status(400).json({ error: 'Impossible de supprimer une devise par défaut (RMB, USD)' });

  // Récupérer le code d'abord, puis vérifier les transactions
  const txCount = await query(
    'SELECT COUNT(*) as count FROM transactions WHERE devise_vente = ?',
    [devise[0].code]
  );
  if (parseInt(txCount[0].count) > 0)
    return res.status(400).json({ error: `Impossible: ${txCount[0].count} transaction(s) utilisent cette devise` });

  await query('DELETE FROM devises_personnalisees WHERE id = ?', [id]);
  res.json({ success: true });
}));

// ─────────────────────────────────────────────────────────────
// GET /api/devises/defaut/list - Devises par défaut (RMB et USD)
// ─────────────────────────────────────────────────────────────
router.get('/defaut/list', asyncHandler(async (req, res) => {
  const devises = await query(`
    SELECT id, code, nom, taux_conversion
    FROM devises_personnalisees
    WHERE is_default = TRUE
    ORDER BY code ASC
  `);

  res.json({ devises });
}));

export default router;
