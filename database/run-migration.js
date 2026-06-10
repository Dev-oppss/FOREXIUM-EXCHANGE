import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'forexium_v7',
    });

    const conn = await pool.getConnection();
    console.log('✅ Connecté à MySQL\n');

    // Lire et exécuter la migration
    const migrationSQL = fs.readFileSync('./database/migrate-v5.6.1.sql', 'utf-8');
    
    // Exécuter chaque statement
    const statements = migrationSQL.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
    
    for (const stmt of statements) {
      try {
        await conn.execute(stmt.trim());
        console.log('✅ Exécuté:', stmt.trim().substring(0, 50) + '...');
      } catch (e) {
        console.error('❌ Erreur:', e.message);
      }
    }

    console.log('\n✅ Migration complétée !');
    
    // Vérifier
    const [rows] = await conn.execute('DESCRIBE comptes_clients');
    console.log('\nColonnes comptes_clients:');
    rows.forEach(r => {
      if (r.Field === 'quartier' || r.Field === 'adresse' || r.Field === 'telephone') {
        console.log('  ✅', r.Field, '-', r.Type);
      }
    });

    conn.release();
    process.exit(0);
  } catch (e) {
    console.error('❌ Erreur:', e.message);
    process.exit(1);
  }
})();
