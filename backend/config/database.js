import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host:             process.env.DB_HOST     || process.env.MYSQLHOST     || 'localhost',
  port:             parseInt(process.env.DB_PORT || process.env.MYSQLPORT, 10) || 3306,
  user:             process.env.DB_USER     || process.env.MYSQLUSER     || 'root',
  password:         process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database:         process.env.DB_NAME     || process.env.MYSQLDATABASE || 'forexium_v7',
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
  enableKeepAlive:  true,
});

export const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connecté');
    conn.release();
    return true;
  } catch (e) {
    console.error('❌ MySQL:', e.message);
    return false;
  }
};

// Requête simple avec paramètres ? (pool.query supporte LIMIT ?, CALL, BOOLEAN)
export const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (e) {
    console.error('Erreur SQL:', e.message);
    throw e;
  }
};

// Transaction avec callback
export const transaction = async (callback) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    conn.release();
    return result;
  } catch (e) {
    await conn.rollback();
    conn.release();
    throw e;
  }
};

export default pool;
