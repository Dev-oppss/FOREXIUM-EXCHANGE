import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'forexium_v5',
});

(async () => {
  const conn = await pool.getConnection();
  try {
    console.log('🔄 Réinitialisation de la base de données...\n');

    // 1. Vider les transactions
    await conn.query('DELETE FROM transactions');
    console.log('✓ Transactions supprimées');

    // 2. Vider les utilisateurs
    await conn.query('DELETE FROM users');
    console.log('✓ Utilisateurs supprimés');

    // 3. Réinitialiser le stock USDT
    await conn.query('UPDATE stock SET quantite = 0, cmup = 0 WHERE devise = "USDT"');
    console.log('✓ Stock USDT réinitialisé à 0');

    // 4. Réinitialiser le dépôt et la caisse
    await conn.query('UPDATE comptes SET montant = 0 WHERE type_compte = "depot"');
    await conn.query('UPDATE comptes SET montant = 0 WHERE type_compte = "caisse"');
    console.log('✓ Comptes réinitialisés (Dépôt: 0 XAF, Caisse: 0 XAF)');

    // 5. Réinitialiser la répartition des profits (70/30)
    await conn.query('UPDATE distribution SET total_accumule_visible = 0, total_accumule_cache = 0');
    console.log('✓ Répartition des profits réinitialisée (totaux à 0)');

    // 6. Réinitialiser les sessions
    await conn.query('DELETE FROM sessions');
    console.log('✓ Sessions supprimées');

    // 7. Réinitialiser logs (optionnel)
    await conn.query('DELETE FROM logs');
    console.log('✓ Logs supprimés');

    console.log('\n✅ Base de données réinitialisée avec succès!');
    console.log('   - Tous les utilisateurs supprimés');
    console.log('   - Toutes les transactions supprimées');
    console.log('   - Stock USDT remis à 0');
    console.log('   - Caisse remise à 0 XAF');
    console.log('   - Dépôt remis à 0 XAF');
    console.log('\nVous partez de ZÉRO. Créez un nouvel utilisateur via l\'interface.');

  } catch (err) {
    console.error('❌ Erreur lors de la réinitialisation:', err.message);
  } finally {
    conn.release();
    await pool.end();
  }
})();
