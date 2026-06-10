import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

(async () => {
  try {
    console.log('🔄 Démarrage de la migration...\n');
    console.log(`📊 DB_HOST: ${process.env.DB_HOST}`);
    console.log(`📊 DB_USER: ${process.env.DB_USER}`);
    console.log(`📊 DB_NAME: ${process.env.DB_NAME}\n`);

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
    const migrationPath = path.join(__dirname, '../database/migrate-v5.6.1.sql');
    console.log(`📂 Migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`📖 SQL file size: ${migrationSQL.length} bytes\n`);
    
    // Exécuter chaque statement
    const statements = migrationSQL.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
    
    console.log(`📋 Found ${statements.length} statements to execute\n`);
    
    let count = 0;
    for (const stmt of statements) {
      try {
        await conn.execute(stmt.trim());
        console.log(`✅ (${++count}) ${stmt.trim().substring(0, 70).replace(/\n/g, ' ')}...`);
      } catch (e) {
        console.error(`⚠️  (${++count}) Erreur: ${e.message}`);
        // Continue even if some statements fail (they might already exist)
      }
    }

    console.log('\n✅ Migration complétée !\n');
    
    // Vérifier les colonnes
    console.log('📋 Vérification des colonnes comptes_clients:\n');
    const [rows] = await conn.execute('DESCRIBE comptes_clients');
    let found = 0;
    rows.forEach(r => {
      if (['quartier', 'adresse', 'telephone', 'prenom'].includes(r.Field)) {
        console.log(`  ✅ ${r.Field.padEnd(15)} - ${r.Type}`);
        found++;
      }
    });

    if (found === 4) {
      console.log('\n✅ Migration successful! All fields present.\n');
    } else {
      console.log(`\n⚠️  Found ${found}/4 expected fields\n`);
    }

    conn.release();
    pool.end();
    process.exit(0);
  } catch (e) {
    console.error('❌ Erreur:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
