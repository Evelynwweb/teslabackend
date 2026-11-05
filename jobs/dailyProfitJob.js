const cron = require('node-cron');
const { processDailyProfits } = require('../services/profitService');

function startDailyProfitJob() {
  // Runs every day at 00:05 UTC
  cron.schedule(
    '5 0 * * *',
    async () => {
      console.log('[CRON] Daily profit job started');
      try {
        const result = await processDailyProfits();
        console.log('[CRON] Daily profit result:', result);
      } catch (err) {
        console.error('[CRON] Daily profit failed:', err);
      }
    },
    { timezone: 'UTC' }
  );

  console.log('[CRON] Daily profit scheduler registered (00:05 UTC)');
}

module.exports = startDailyProfitJob;