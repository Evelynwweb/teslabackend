const express = require('express');
const router = express.Router();
const { processDailyProfits } = require('../services/profitService');

router.get('/daily-profit', async (req, res) => {
  const secret = process.env.CRON_SECRET;

  // Vercel Cron sends the Bearer token
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const result = await processDailyProfits();
    res.json({ ok: true, runAt: new Date().toISOString(), result });
  } catch (err) {
    console.error('cron daily-profit failed:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;