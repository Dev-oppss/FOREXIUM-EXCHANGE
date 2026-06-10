export const errorHandler = (err, req, res, next) => {
  console.error('❌', err.message);

  // Erreurs MySQL SIGNAL (procédures stockées → messages métier lisibles)
  if (err.code === 'ER_SIGNAL_EXCEPTION') {
    return res.status(400).json({
      error: err.sqlMessage || err.message || 'Erreur métier',
    });
  }

  // Autres erreurs MySQL
  if (err.code?.startsWith('ER_')) {
    return res.status(400).json({
      error: 'Erreur base de données',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue',
    });
  }

  if (err.name === 'JsonWebTokenError')
    return res.status(401).json({ error: 'Token invalide' });

  if (err.name === 'TokenExpiredError')
    return res.status(401).json({ error: 'Session expirée' });

  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
