import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import des routes
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import statsRoutes from './routes/stats.js';
import stockRoutes from './routes/stock.js';
import settingsRoutes from './routes/settings.js';
import accountRoutes from './routes/accounts.js';       // NEW
import deviseRoutes from './routes/devises.js';       // NEW

import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Log les requêtes
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/accounts', accountRoutes);        // NEW
app.use('/api/devises', deviseRoutes);         // NEW

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '5.6.0+' });
});

// ─────────────────────────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────────────────────────

app.use(errorHandler);

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║          FOREXIUM v5.6.0+ - Server démarré              ║
║  Écoute sur http://localhost:${PORT}                    ║
╚════════════════════════════════════════════════════════╝
  `);
  });
}

export default app;
