import express from 'express';
import { query, transaction as dbTransaction } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/stats
router.get('/', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM vue_stats_globales');
  if (rows.length === 0) return res.json({ depot:0, caisse:0, stock_usdt:0, cmup_usdt:0 });
  const s = rows[0];
  res.json({
    depot:                    parseFloat(s.depot || 0),
    caisse:                   parseFloat(s.caisse || 0),
    stock_usdt:               parseFloat(s.stock_usdt || 0),
    cmup_usdt:                parseFloat(s.cmup_usdt || 0),
    total_ventes:             parseInt(s.total_ventes || 0),
    total_achats:             parseInt(s.total_achats || 0),
    benefices_visibles_total: parseFloat(s.benefices_visibles_total || 0),
    benefices_caches_total:   parseFloat(s.benefices_caches_total || 0),
  });
}));

// GET /api/stats/comptes
router.get('/comptes', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM comptes');
  const result = {};
  rows.forEach(c => { result[c.type_compte] = parseFloat(c.montant); });
  res.json(result);
}));

// GET /api/stats/repartition
router.get('/repartition', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM repartition_profits');
  res.json({
    repartition: rows.map(r => ({
      role:                   r.role,
      pourcentage_defaut:     parseFloat(r.pourcentage_defaut),
      total_accumule_visible: parseFloat(r.total_accumule_visible || 0),
      total_accumule_cache:   parseFloat(r.total_accumule_cache || 0),
      distribution_active:    r.distribution_active || false,
    }))
  });
}));

// ─────────────────────────────────────────────────────────────
// CORRIGÉ: GET /api/stats/distribution-details
// SUPPRESSION de t.user_name, utilisation de jointures correctes
// ─────────────────────────────────────────────────────────────
router.get('/distribution-details', asyncHandler(async (req, res) => {
  const distributions = await query(`
    SELECT 
      dp.id,
      dp.transaction_id,
      t.date,
      t.type,
      t.devise_vente,
      t.quantite_vente,
      t.taux_vente_visible,
      t.taux_vente_cache,
      dp.role,
      dp.benefice_visible,
      dp.benefice_cache,
      dp.pourcentage,
      (dp.benefice_visible + COALESCE(dp.benefice_cache, 0)) as benefice_total,
      u.name as user_name,
      t.client,
      COALESCE(cf.nom, t.fournisseur) as fournisseur_nom
    FROM distribution_partenaires dp
    LEFT JOIN transactions t ON dp.transaction_id = t.id
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN comptes_fournisseurs cf ON t.id_fournisseur = cf.id
    WHERE t.statut = 'committed'
    ORDER BY t.date DESC
  `);

  const detailsParRole = {};
  distributions.forEach(d => {
    if (!detailsParRole[d.role]) {
      detailsParRole[d.role] = [];
    }
    detailsParRole[d.role].push({
      id: d.id,
      transaction_id: d.transaction_id,
      date: d.date,
      type: d.type,
      devise: d.devise_vente,
      quantite: parseFloat(d.quantite_vente || 0),
      taux_visible: parseFloat(d.taux_vente_visible || 0),
      taux_cache: parseFloat(d.taux_vente_cache || 0),
      benefice_visible: parseFloat(d.benefice_visible || 0),
      benefice_cache: parseFloat(d.benefice_cache || 0),
      benefice_total: parseFloat(d.benefice_total || 0),
      pourcentage: parseInt(d.pourcentage || 0),
      client: d.client,
      fournisseur: d.fournisseur_nom,
      user_name: d.user_name
    });
  });

  const totalsParRole = {};
  ['porteur', 'associe'].forEach(role => {
    const dists = detailsParRole[role] || [];
    totalsParRole[role] = {
      nb_ventes: dists.length,
      total_visible: dists.reduce((sum, d) => sum + d.benefice_visible, 0),
      total_cache: dists.reduce((sum, d) => sum + d.benefice_cache, 0),
      total: dists.reduce((sum, d) => sum + d.benefice_total, 0),
    };
  });

  res.json({
    distributions: detailsParRole,
    totals: totalsParRole
  });
}));

router.post('/toggle-distribution', asyncHandler(async (req, res) => {
  const { role } = req.body;
  
  if (!role) {
    const current = await query('SELECT distribution_active FROM repartition_profits WHERE role = ?', ['porteur']);
    const newState = !current[0].distribution_active;

    await dbTransaction(async (conn) => {
      await conn.query(
        'UPDATE repartition_profits SET distribution_active = ?, updated_at = NOW()',
        [newState]
      );
    });

    res.json({ 
      success: true, 
      distribution_active: newState,
      message: newState ? 'Distribution activée' : 'Distribution désactivée'
    });
  } else {
    const current = await query('SELECT distribution_active FROM repartition_profits WHERE role = ?', [role]);
    if (!current || current.length === 0) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    const newState = !current[0].distribution_active;

    await dbTransaction(async (conn) => {
      await conn.query(
        'UPDATE repartition_profits SET distribution_active = ?, updated_at = NOW() WHERE role = ?',
        [newState, role]
      );
    });

    res.json({ 
      success: true, 
      role,
      distribution_active: newState,
      message: newState ? 'Distribution activée' : 'Distribution désactivée'
    });
  }
}));

router.get('/distribution-status', asyncHandler(async (req, res) => {
  const status = await query('SELECT role, distribution_active FROM repartition_profits ORDER BY role');
  
  const result = {};
  status.forEach(s => {
    result[s.role] = s.distribution_active;
  });

  res.json(result);
}));

router.get('/daily', asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const rows = await query(
    `SELECT * FROM vue_stats_journalier ORDER BY jour DESC LIMIT ${parseInt(days) || 30}`
  );
  res.json({
    stats: rows.map(s => ({
      jour:                    s.jour,
      nb_transactions:         parseInt(s.nb_transactions),
      nb_ventes:               parseInt(s.nb_ventes),
      nb_achats:               parseInt(s.nb_achats),
      benefices_visibles_jour: parseFloat(s.benefices_visibles_jour || 0),
      benefices_caches_jour:   parseFloat(s.benefices_caches_jour || 0),
      ventes_cachees:          parseInt(s.ventes_cachees || 0),
    }))
  });
}));

router.get('/extraits', asyncHandler(async (req, res) => {
  const clients = await query('SELECT * FROM vue_extrait_clients');
  const fournisseurs = await query('SELECT * FROM vue_extrait_fournisseurs');

  res.json({
    clients: clients.map(c => ({
      id: c.id,
      nom: c.nom,
      numero: c.numero,
      solde: parseFloat(c.solde || 0),
      nb_transactions: parseInt(c.nb_transactions || 0),
      nb_ventes: parseInt(c.nb_ventes || 0),
      nb_achats: parseInt(c.nb_achats || 0),
    })),
    fournisseurs: fournisseurs.map(f => ({
      id: f.id,
      nom: f.nom,
      numero: f.numero,
      solde_xaf: parseFloat(f.solde_xaf || 0),
      solde_usdt: parseFloat(f.solde_usdt || 0),
      dette_usdt: parseFloat(f.dette_usdt || 0),
      nb_transactions: parseInt(f.nb_transactions || 0),
      nb_ventes: parseInt(f.nb_ventes || 0),
      nb_achats: parseInt(f.nb_achats || 0),
    }))
  });
}));

export default router;
