import express from 'express';
import { query, transaction as dbTransaction } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// VALIDATIONS
// ─────────────────────────────────────────────────────────────

const validateNom = (val) => /^[a-zA-ZÀ-ÿ0-9\s\-']+$/.test(val);
const validateVille = (val) => /^[a-zA-ZÀ-ÿ\s\-']+$/.test(val);
const validateTelephone = (tel) => /^[+0-9\s]+$/.test(tel);
const normalizeFullName = (...parts) => parts
  .filter(Boolean)
  .join(' ')
  .replace(/\s+/g, ' ')
  .trim();

const enrichLedgerRows = (rows = []) => {
  const runningByRole = { porteur: 0, associe: 0 };
  const totalsByRole = {
    porteur: { montant_a_payer: 0, montant_paye: 0, reste: 0 },
    associe: { montant_a_payer: 0, montant_paye: 0, reste: 0 },
  };

  let runningTotal = 0;

  const ledgerRows = rows.map((raw) => {
    const montantAPayer = parseFloat(raw.montant_a_payer || 0);
    const montantPaye = parseFloat(raw.montant_paye || 0);
    const delta = montantAPayer - montantPaye;
    const role = String(raw.user_role || '').toLowerCase();

    runningTotal += delta;

    if (Object.prototype.hasOwnProperty.call(runningByRole, role)) {
      runningByRole[role] += delta;
      totalsByRole[role].montant_a_payer += montantAPayer;
      totalsByRole[role].montant_paye += montantPaye;
      totalsByRole[role].reste += delta;
    }

    return {
      ...raw,
      montant_a_payer: montantAPayer,
      montant_paye: montantPaye,
      reste_courant: runningTotal,
      porteur_montant_a_payer: role === 'porteur' ? montantAPayer : 0,
      porteur_montant_paye: role === 'porteur' ? montantPaye : 0,
      porteur_reste_courant: runningByRole.porteur,
      associe_montant_a_payer: role === 'associe' ? montantAPayer : 0,
      associe_montant_paye: role === 'associe' ? montantPaye : 0,
      associe_reste_courant: runningByRole.associe,
    };
  });

  return { rows: ledgerRows, byRole: totalsByRole };
};

// ─────────────────────────────────────────────────────────────
// COMPTES CLIENTS
// ─────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════
// COMPTES CLIENTS — REFACTORISÉ
// ═════════════════════════════════════════════════════════════

// GET /api/accounts/clients
// ✅ total_a_payer = SUM(montant_a_payer) ventes — TOUS statuts en cours (pending inclus)
// ✅ total_paye    = SUM(montant_paye) ventes + SUM(montant_paye) paiements_client
// ✅ reste         = calculé automatiquement
router.get('/clients', asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT
      cc.*,
      IFNULL((
        SELECT COUNT(*)
        FROM transactions t
        WHERE t.type = 'vente'
          AND t.statut IN ('committed','porteur_pending','assoc_pending','pending')
          AND (t.client_id = cc.id
            OR FIND_IN_SET(
              TRIM(CONCAT(cc.nom, IF(cc.prenom IS NOT NULL AND cc.prenom != '', CONCAT(' ', cc.prenom), ''))),
              t.client
            ) > 0)
      ), 0) AS nb_transactions,

      -- ✅ Fix 3 : s'affiche dès la création (pending inclus)
      IFNULL((
        SELECT SUM(COALESCE(t.montant_a_payer, t.valeur_vente_visible, 0))
        FROM transactions t
        WHERE t.type = 'vente'
          AND t.statut IN ('committed','porteur_pending','assoc_pending','pending')
          AND (t.client_id = cc.id
            OR FIND_IN_SET(
              TRIM(CONCAT(cc.nom, IF(cc.prenom IS NOT NULL AND cc.prenom != '', CONCAT(' ', cc.prenom), ''))),
              t.client
            ) > 0)
      ), 0) AS total_a_payer,

      -- ✅ Fix 2 : total_paye = montant_paye des VENTES + montant_paye des paiements_client
      -- (quand montant reçu du client lors de la vente elle-même)
      IFNULL((
        SELECT SUM(COALESCE(t.montant_paye, 0))
        FROM transactions t
        WHERE t.type IN ('vente','paiement_client')
          AND t.statut IN ('committed','porteur_pending','assoc_pending','pending')
          AND COALESCE(t.montant_paye, 0) > 0
          AND (t.client_id = cc.id
            OR FIND_IN_SET(
              TRIM(CONCAT(cc.nom, IF(cc.prenom IS NOT NULL AND cc.prenom != '', CONCAT(' ', cc.prenom), ''))),
              t.client
            ) > 0)
      ), 0) AS total_paye

    FROM comptes_clients cc
    ORDER BY cc.nom ASC
  `);

  const clientsWithReste = rows.map(c => ({
    ...c,
    reste: parseFloat(c.total_a_payer) - parseFloat(c.total_paye)
  }));

  res.json({ clients: clientsWithReste });
}));

router.post('/clients', asyncHandler(async (req, res) => {
  const { nom, prenom, ville, adresse, telephone } = req.body;

  if (!nom) return res.status(400).json({ error: 'Nom requis' });
  if (!validateNom(nom)) return res.status(400).json({ error: 'Nom invalide' });
  if (prenom && !validateNom(prenom)) return res.status(400).json({ error: 'Prénom invalide' });
  if (ville && !validateVille(ville)) return res.status(400).json({ error: 'La ville ne doit contenir que des lettres' });
  if (telephone && !validateTelephone(telephone)) return res.status(400).json({ error: 'Format téléphone invalide. Entrer uniquement des chiffres' });

  const lastRows = await query("SELECT id FROM comptes_clients ORDER BY id DESC LIMIT 1");
  const nextId = lastRows && lastRows.length > 0 ? lastRows[0].id + 1 : 1;
  const numero = `CLT-${String(nextId).padStart(3, '0')}`;

  const result = await query(
    'INSERT INTO comptes_clients (nom, prenom, ville, adresse, telephone, numero) VALUES (?, ?, ?, ?, ?, ?)',
    [nom, prenom || null, ville || null, adresse || null, telephone || null, numero]
  );

  res.json({ success: true, client_id: result.insertId, numero });
}));

router.put('/clients/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, ville, adresse, solde, telephone } = req.body;

  const updates = [];
  const values = [];

  if (nom !== undefined) {
    if (!validateNom(nom)) return res.status(400).json({ error: 'Nom invalide' });
    updates.push('nom = ?'); values.push(nom);
  }
  if (prenom !== undefined) {
    if (prenom && !validateNom(prenom)) return res.status(400).json({ error: 'Prénom invalide' });
    updates.push('prenom = ?'); values.push(prenom || null);
  }
  if (ville !== undefined) {
    if (ville && !validateVille(ville)) return res.status(400).json({ error: 'La ville ne doit contenir que des lettres' });
    updates.push('ville = ?'); values.push(ville || null);
  }
  if (adresse !== undefined) {
    updates.push('adresse = ?'); values.push(adresse);
  }
  if (solde !== undefined) {
    updates.push('solde = ?'); values.push(solde);
  }
  if (telephone !== undefined) {
    if (telephone && !validateTelephone(telephone))
      return res.status(400).json({ error: 'Format téléphone invalide. Entrer uniquement des chiffres' });
    updates.push('telephone = ?'); values.push(telephone || null);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Aucune modification' });

  updates.push('updated_at = NOW()');
  await query(`UPDATE comptes_clients SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);
  res.json({ success: true });
}));

router.delete('/clients/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM comptes_clients WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

router.get('/clients/:id/transactions', asyncHandler(async (req, res) => {
  const clientRows = await query('SELECT nom, prenom FROM comptes_clients WHERE id = ?', [req.params.id]);
  if (!clientRows || clientRows.length === 0) return res.status(404).json({ error: 'Client non trouvé' });

  const nomComplet = normalizeFullName(clientRows[0].nom, clientRows[0].prenom);

  const transactions = await query(`
    SELECT t.*, u.name as user_name, u.role as user_role
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE FIND_IN_SET(?, t.client) > 0
      AND (t.statut IN ('committed','porteur_pending','assoc_pending') OR (t.type IN ('vente','paiement_client') AND t.statut = 'pending'))
    ORDER BY t.date DESC
  `, [nomComplet]);

  res.json({ transactions });
}));

// ═════════════════════════════════════════════════════════════
// COMPTES FOURNISSEURS - REFACTORISÉ
// ═════════════════════════════════════════════════════════════

// GET /api/accounts/fournisseurs
// Convention fournisseur:
// achat de devise = paiement fournisseur; vente de devise = dette envers le fournisseur.
// ✅ S'affiche dès création (pending inclus), pas seulement après validation
router.get('/fournisseurs', asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT
      cf.*,
      IFNULL((
        SELECT COUNT(*)
        FROM transactions t
        WHERE t.type IN ('achat', 'vente', 'paiement_fournisseur')
          AND t.statut IN ('committed','porteur_pending','assoc_pending','pending')
          AND (
            (t.type = 'achat' AND (t.id_fournisseur = cf.id OR TRIM(t.fournisseur) = TRIM(CONCAT(cf.nom, IF(cf.prenom IS NOT NULL AND cf.prenom != '', CONCAT(' ', cf.prenom), '')))))
            OR (t.type = 'vente' AND t.id_fournisseur = cf.id)
            OR (t.type = 'paiement_fournisseur' AND t.id_fournisseur = cf.id)
          )
      ), 0) AS nb_transactions,
      IFNULL((
        SELECT SUM(COALESCE(t.valeur_achat_xaf, t.montant_a_payer, 0))
        FROM transactions t
        WHERE t.type = 'vente'
          AND t.statut IN ('committed','porteur_pending','assoc_pending','pending')
          AND t.id_fournisseur = cf.id
      ), 0) AS total_a_payer,
      IFNULL((
        SELECT SUM(CASE
          WHEN t.type = 'achat' THEN COALESCE(t.prix_achat_total, t.montant_paye, 0)
          WHEN t.type = 'paiement_fournisseur' THEN COALESCE(t.montant_paye, 0)
          ELSE 0
        END)
        FROM transactions t
        WHERE t.type IN ('achat', 'paiement_fournisseur')
          AND t.statut IN ('committed','porteur_pending','assoc_pending','pending')
          AND (
            (t.type = 'achat' AND (t.id_fournisseur = cf.id OR TRIM(t.fournisseur) = TRIM(CONCAT(cf.nom, IF(cf.prenom IS NOT NULL AND cf.prenom != '', CONCAT(' ', cf.prenom), '')))))
            OR (t.type = 'paiement_fournisseur' AND t.id_fournisseur = cf.id)
          )
      ), 0) AS total_paye,
      IFNULL((
        SELECT SUM(COALESCE(t.quantite, 0))
        FROM transactions t
        WHERE t.type = 'achat'
          AND t.statut IN ('committed','porteur_pending','assoc_pending','pending')
          AND (t.id_fournisseur = cf.id OR TRIM(t.fournisseur) = TRIM(CONCAT(cf.nom, IF(cf.prenom IS NOT NULL AND cf.prenom != '', CONCAT(' ', cf.prenom), ''))))
      ), 0) AS total_achats_usdt,
      IFNULL((
        SELECT SUM(COALESCE(t.usdt_consomme, 0))
        FROM transactions t
        WHERE t.type = 'vente'
          AND t.statut IN ('committed','porteur_pending','assoc_pending','pending')
          AND t.id_fournisseur = cf.id
      ), 0) AS total_ventes_usdt
    FROM comptes_fournisseurs cf
    ORDER BY cf.nom ASC
  `);

  const fournisseursWithReste = rows.map(f => ({
    ...f,
    reste: parseFloat(f.total_a_payer) - parseFloat(f.total_paye),
    stock_usdt: parseFloat(f.total_achats_usdt || 0) - parseFloat(f.total_ventes_usdt || 0),
  }));

  res.json({ fournisseurs: fournisseursWithReste });
}));

router.post('/fournisseurs', asyncHandler(async (req, res) => {
  const { nom, prenom, ville, adresse, telephone } = req.body;

  if (!nom) return res.status(400).json({ error: 'Nom requis' });
  if (!validateNom(nom)) return res.status(400).json({ error: 'Nom invalide' });
  if (prenom && !validateNom(prenom)) return res.status(400).json({ error: 'Prénom invalide' });
  if (ville && !validateVille(ville)) return res.status(400).json({ error: 'La ville ne doit contenir que des lettres' });
  if (telephone && !validateTelephone(telephone)) return res.status(400).json({ error: 'Format téléphone invalide. Entrer uniquement des chiffres' });

  const lastRows = await query("SELECT id FROM comptes_fournisseurs ORDER BY id DESC LIMIT 1");
  const nextId = lastRows && lastRows.length > 0 ? lastRows[0].id + 1 : 1;
  const numero = `FRN-${String(nextId).padStart(3, '0')}`;

  const result = await query(
    'INSERT INTO comptes_fournisseurs (nom, prenom, ville, adresse, telephone) VALUES (?, ?, ?, ?, ?)',
    [nom, prenom || null, ville || null, adresse || null, telephone || null]
  );

  res.json({ success: true, fournisseur_id: result.insertId, numero });
}));

router.put('/fournisseurs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, ville, adresse, solde_xaf, solde_usdt, dette_usdt, telephone } = req.body;

  const updates = [];
  const values = [];

  if (nom !== undefined) {
    if (!validateNom(nom)) return res.status(400).json({ error: 'Nom invalide' });
    updates.push('nom = ?'); values.push(nom);
  }
  if (prenom !== undefined) {
    if (prenom && !validateNom(prenom)) return res.status(400).json({ error: 'Prénom invalide' });
    updates.push('prenom = ?'); values.push(prenom || null);
  }
  if (ville !== undefined) {
    if (ville && !validateVille(ville)) return res.status(400).json({ error: 'La ville ne doit contenir que des lettres' });
    updates.push('ville = ?'); values.push(ville || null);
  }
  if (adresse !== undefined) {
    updates.push('adresse = ?'); values.push(adresse);
  }
  if (solde_xaf !== undefined) {
    updates.push('solde_xaf = ?'); values.push(solde_xaf);
  }
  if (solde_usdt !== undefined) {
    updates.push('solde_usdt = ?'); values.push(solde_usdt);
  }
  if (dette_usdt !== undefined) {
    updates.push('dette_usdt = ?'); values.push(dette_usdt);
  }
  if (telephone !== undefined) {
    if (telephone && !validateTelephone(telephone))
      return res.status(400).json({ error: 'Format téléphone invalide. Entrer uniquement des chiffres' });
    updates.push('telephone = ?'); values.push(telephone || null);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Aucune modification' });

  updates.push('updated_at = NOW()');
  await query(`UPDATE comptes_fournisseurs SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);
  res.json({ success: true });
}));

router.delete('/fournisseurs/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM comptes_fournisseurs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

router.get('/fournisseurs/:id/transactions', asyncHandler(async (req, res) => {
  const fournRows = await query('SELECT nom, prenom FROM comptes_fournisseurs WHERE id = ?', [req.params.id]);
  if (!fournRows || fournRows.length === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });

  const nomComplet = normalizeFullName(fournRows[0].nom, fournRows[0].prenom);

  const transactions = await query(`
    SELECT t.*, u.name as user_name, u.role as user_role
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE (
      (t.type = 'achat' AND TRIM(t.fournisseur) = TRIM(?))
      OR (t.type = 'vente' AND t.id_fournisseur = ?)
      OR (t.type = 'paiement_fournisseur' AND t.id_fournisseur = ?)
    )
      AND (t.statut IN ('committed','porteur_pending','assoc_pending') OR (t.type IN ('achat','vente','paiement_fournisseur') AND t.statut = 'pending'))
    ORDER BY t.date DESC
  `, [nomComplet, req.params.id, req.params.id]);

  res.json({ transactions });
}));

// ═════════════════════════════════════════════════════════════
// GET /api/accounts/extrait/clients/:id
// ✅ NOUVEAU: Affiche ventes (montant_a_payer) + paiements (montant_paye)
//            XAF uniquement — reste calculé dynamiquement
// ═════════════════════════════════════════════════════════════
router.get('/extrait/clients/:id', asyncHandler(async (req, res) => {
  const { date_debut, date_fin } = req.query;

  const clientRows = await query('SELECT * FROM comptes_clients WHERE id = ?', [req.params.id]);
  if (!clientRows || clientRows.length === 0) return res.status(404).json({ error: 'Client non trouvé' });
  const client = clientRows[0];
  const nomComplet = normalizeFullName(client.nom, client.prenom);

  let dateFilter = '';
  const dateParams = [];
  if (date_debut) { dateFilter += ' AND DATE(t.date) >= ?'; dateParams.push(date_debut); }
  if (date_fin)   { dateFilter += ' AND DATE(t.date) <= ?'; dateParams.push(date_fin); }

  const clientCondition = `(t.client_id = ? OR FIND_IN_SET(?, t.client) > 0)`;

  // Le client suit un solde courant chronologique:
  // vente => augmente la dette, paiement => la réduit.
  const transactions = await query(`
    SELECT
      t.id,
      t.date,
      t.date_enregistrement,
      t.type,
      'XAF'                                                     AS devise,
      CASE
        WHEN t.type = 'vente'           THEN COALESCE(t.montant_a_payer, t.valeur_vente_visible, 0)
        WHEN t.type = 'paiement_client' THEN COALESCE(t.montant_a_payer, 0)
        ELSE 0
      END                                                       AS montant_a_payer,
      CASE
        WHEN t.type IN ('paiement_client','vente') THEN COALESCE(t.montant_paye, 0)
        ELSE 0
      END                                                       AS montant_paye,
      t.notes,
      t.devise_vente,
      t.quantite_vente,
      u.name                                                    AS user_name,
      u.role                                                    AS user_role
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE ${clientCondition}
      AND (t.statut IN ('committed','porteur_pending','assoc_pending') OR (t.type IN ('vente','paiement_client') AND t.statut = 'pending'))
      AND t.type IN ('vente','paiement_client')
      ${dateFilter}
    ORDER BY COALESCE(t.date, t.date_enregistrement) ASC, t.date_enregistrement ASC, t.id ASC`,
    [req.params.id, nomComplet, ...dateParams]
  );

  const ledger = enrichLedgerRows(transactions);

  // ✅ Totaux détaillés
  const totalsRows = await query(`
    SELECT
      COUNT(DISTINCT CASE WHEN t.type = 'vente'           THEN t.id END) AS nb_ventes,
      COUNT(DISTINCT CASE WHEN t.type = 'paiement_client' THEN t.id END) AS nb_paiements,
      IFNULL(SUM(CASE
        WHEN t.type = 'vente' AND (t.statut IN ('committed','porteur_pending','assoc_pending') OR t.statut = 'pending')
        THEN COALESCE(t.montant_a_payer, t.valeur_vente_visible, 0) ELSE 0
      END), 0) AS total_a_payer,
      IFNULL(SUM(CASE
        WHEN t.type IN ('paiement_client','vente') AND t.statut IN ('committed','porteur_pending','assoc_pending','pending')
        THEN COALESCE(t.montant_paye, 0) ELSE 0
      END), 0) AS total_paye
    FROM transactions t
    WHERE ${clientCondition}
      AND t.type IN ('vente','paiement_client')
      ${dateFilter}`,
    [req.params.id, nomComplet, ...dateParams]
  );

  const t = totalsRows[0];
  const totals = {
    nb_ventes:    t.nb_ventes,
    nb_paiements: t.nb_paiements,
    total_a_payer: parseFloat(t.total_a_payer || 0),
    total_paye:    parseFloat(t.total_paye    || 0),
    total_reste:   parseFloat(t.total_a_payer || 0) - parseFloat(t.total_paye || 0),
    by_role: ledger.byRole,
  };

  res.json({ extrait: client, transactions: ledger.rows, totals });
}));

// ═════════════════════════════════════════════════════════════
// GET /api/accounts/extrait/fournisseurs/:id - Extrait fournisseur
// ✅ NOUVEAU: Affiche achat + vente + paiement en une seule vue
// ═════════════════════════════════════════════════════════════
router.get('/extrait/fournisseurs/:id', asyncHandler(async (req, res) => {
  const { date_debut, date_fin } = req.query;

  const fournRows = await query('SELECT * FROM comptes_fournisseurs WHERE id = ?', [req.params.id]);
  if (!fournRows || fournRows.length === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });
  const fournisseur = fournRows[0];
  const nomComplet = normalizeFullName(fournisseur.nom, fournisseur.prenom);

  let dateFilter = '';
  const params = [nomComplet, req.params.id, req.params.id];
  if (date_debut) { dateFilter += ' AND DATE(t.date) >= ?'; params.push(date_debut); }
  if (date_fin)   { dateFilter += ' AND DATE(t.date) <= ?'; params.push(date_fin); }

  // Convention fournisseur:
  // achat de devise = paiement fournisseur; vente de devise = dette envers le fournisseur.
  const transactions = await query(`
    SELECT
      t.id,
      t.date,
      t.date_enregistrement,
      t.type,
      t.devise,
      CASE
        WHEN t.type = 'vente' THEN COALESCE(t.valeur_achat_xaf, 0)
        ELSE 0
      END AS montant_a_payer,
      CASE
        WHEN t.type = 'achat' THEN COALESCE(t.prix_achat_total, t.montant_paye, 0)
        WHEN t.type = 'paiement_fournisseur' THEN COALESCE(t.montant_paye, 0)
        ELSE 0
      END AS montant_paye,
      t.prix_achat_total,
      t.valeur_achat_xaf,
      t.quantite,
      t.usdt_consomme,
      t.fournisseur,
      t.notes,
      u.name AS user_name,
      u.role AS user_role
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE (t.statut IN ('committed','porteur_pending','assoc_pending')
      OR (t.type IN ('achat','vente','paiement_fournisseur') AND t.statut = 'pending'))
      AND (
        (t.type = 'achat' AND TRIM(t.fournisseur) = TRIM(?))
        OR 
        (t.type = 'vente' AND t.id_fournisseur = ?)
        OR
        (t.type = 'paiement_fournisseur' AND t.id_fournisseur = ?)
      )${dateFilter}
    ORDER BY COALESCE(t.date, t.date_enregistrement) ASC, t.date_enregistrement ASC, t.id ASC`,
    params
  );

  const ledger = enrichLedgerRows(transactions);

  const totalsRows = await query(`
    SELECT
      COUNT(DISTINCT CASE WHEN t.type = 'achat' THEN t.id END)                  AS nb_achats,
      COUNT(DISTINCT CASE WHEN t.type = 'vente' AND t.id_fournisseur IS NOT NULL THEN t.id END) AS nb_ventes,
      COUNT(DISTINCT CASE WHEN t.type = 'paiement_fournisseur' THEN t.id END) AS nb_paiements,
      IFNULL(SUM(CASE WHEN t.type = 'achat' THEN COALESCE(t.prix_achat_total, t.montant_a_payer, 0) ELSE 0 END), 0) AS total_achats,
      IFNULL(SUM(CASE WHEN t.type = 'vente' AND t.id_fournisseur IS NOT NULL THEN t.valeur_achat_xaf ELSE 0 END), 0) AS total_ventes,
      IFNULL(SUM(CASE WHEN t.type = 'paiement_fournisseur' THEN t.montant_paye ELSE 0 END), 0) AS total_paiements_paye,
      IFNULL(SUM(CASE
        WHEN t.type = 'vente' AND t.id_fournisseur IS NOT NULL THEN COALESCE(t.valeur_achat_xaf, 0)
        ELSE 0
      END), 0) AS total_a_payer_global,
      IFNULL(SUM(CASE 
        WHEN t.type = 'achat' THEN COALESCE(t.prix_achat_total, t.montant_paye, 0)
        WHEN t.type = 'paiement_fournisseur' THEN COALESCE(t.montant_paye, 0)
        ELSE 0
      END), 0) AS total_paye_global,
      IFNULL(SUM(CASE WHEN t.type = 'achat' THEN COALESCE(t.quantite, 0) ELSE 0 END), 0) AS total_achats_usdt,
      IFNULL(SUM(CASE WHEN t.type = 'vente' AND t.id_fournisseur IS NOT NULL THEN COALESCE(t.usdt_consomme, 0) ELSE 0 END), 0) AS total_ventes_usdt
    FROM transactions t
    WHERE (t.statut IN ('committed','porteur_pending','assoc_pending')
      OR (t.type IN ('achat','vente','paiement_fournisseur') AND t.statut = 'pending'))
      AND (
        (t.type = 'achat' AND TRIM(t.fournisseur) = TRIM(?))
        OR 
        (t.type = 'vente' AND t.id_fournisseur = ?)
        OR
        (t.type = 'paiement_fournisseur' AND t.id_fournisseur = ?)
      )${dateFilter}`,
    params
  );

  const t = totalsRows[0];
  const totals = {
    nb_achats: t.nb_achats,
    nb_ventes: t.nb_ventes,
    nb_paiements: t.nb_paiements,
    total_achats: parseFloat(t.total_achats || 0),
    total_ventes: parseFloat(t.total_ventes || 0),
    total_paiements_paye: parseFloat(t.total_paiements_paye || 0),
    total_a_payer_global: parseFloat(t.total_a_payer_global || 0),
    total_paye_global: parseFloat(t.total_paye_global || 0),
    reste_global: parseFloat(t.total_a_payer_global || 0) - parseFloat(t.total_paye_global || 0),
    total_achats_usdt: parseFloat(t.total_achats_usdt || 0),
    total_ventes_usdt: parseFloat(t.total_ventes_usdt || 0),
    stock_usdt: parseFloat(t.total_achats_usdt || 0) - parseFloat(t.total_ventes_usdt || 0),
    by_role: ledger.byRole,
  };

  res.json({ extrait: fournisseur, transactions: ledger.rows, totals });
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/accounts/clients/:id/payment
// ─────────────────────────────────────────────────────────────
router.put('/clients/:id/payment', asyncHandler(async (req, res) => {
  const { transaction_id, montant_paye, mode_paiement } = req.body;

  if (!transaction_id || !montant_paye) {
    return res.status(400).json({ error: 'Paramètres requis: transaction_id, montant_paye' });
  }

  const [txRows] = await query('SELECT * FROM transactions WHERE id = ? AND client_id = ?', 
    [transaction_id, req.params.id]);
  
  if (!txRows || txRows.length === 0) {
    return res.status(404).json({ error: 'Transaction non trouvée' });
  }

  const tx = txRows[0];
  const montantPayeActuel = parseFloat(tx.montant_paye || 0);
  const nouveauMontantPaye = montantPayeActuel + parseFloat(montant_paye);
  const montantTotal = parseFloat(tx.montant || tx.valeur_vente_visible || 0);
  const montantReste = Math.max(0, montantTotal - nouveauMontantPaye);

  let payment_status = 'unpaid';
  if (nouveauMontantPaye > 0 && montantReste > 0) payment_status = 'partial';
  else if (nouveauMontantPaye >= montantTotal) payment_status = 'paid';

  await query(
    'UPDATE transactions SET montant_paye = ?, montant_reste = ?, payment_status = ?, mode_paiement = ?, date_modification = NOW() WHERE id = ?',
    [nouveauMontantPaye, montantReste, payment_status, mode_paiement || 'XAF', transaction_id]
  );

  res.json({
    success: true,
    transaction_id,
    montant_paye: nouveauMontantPaye,
    montant_reste: montantReste,
    payment_status
  });
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/accounts/fournisseurs/:id/payment
// ─────────────────────────────────────────────────────────────
router.put('/fournisseurs/:id/payment', asyncHandler(async (req, res) => {
  const { transaction_id, montant_paye, mode_paiement } = req.body;

  if (!transaction_id || !montant_paye) {
    return res.status(400).json({ error: 'Paramètres requis: transaction_id, montant_paye' });
  }

  const [txRows] = await query('SELECT * FROM transactions WHERE id = ? AND id_fournisseur = ?', 
    [transaction_id, req.params.id]);
  
  if (!txRows || txRows.length === 0) {
    return res.status(404).json({ error: 'Transaction non trouvée' });
  }

  const tx = txRows[0];
  const montantPayeActuel = parseFloat(tx.montant_paye || 0);
  const nouveauMontantPaye = montantPayeActuel + parseFloat(montant_paye);
  const montantTotal = parseFloat(tx.montant || 0);
  const montantReste = Math.max(0, montantTotal - nouveauMontantPaye);

  let payment_status = 'unpaid';
  if (nouveauMontantPaye > 0 && montantReste > 0) payment_status = 'partial';
  else if (nouveauMontantPaye >= montantTotal) payment_status = 'paid';

  await query(
    'UPDATE transactions SET montant_paye = ?, montant_reste = ?, payment_status = ?, mode_paiement = ?, date_modification = NOW() WHERE id = ?',
    [nouveauMontantPaye, montantReste, payment_status, mode_paiement || 'XAF', transaction_id]
  );

  res.json({
    success: true,
    transaction_id,
    montant_paye: nouveauMontantPaye,
    montant_reste: montantReste,
    payment_status
  });
}));

export default router;
