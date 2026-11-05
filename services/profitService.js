const StockInvestment = require('../models/StockInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const DAY = 24 * 60 * 60 * 1000;
const addDays = (d, n) => new Date(d.getTime() + n * DAY);

// ─── Process ONE investment with compare-and-swap ───────────────
async function processInvestment(inv) {
  const now = new Date();
  const start = inv.lastProfitDate ? new Date(inv.lastProfitDate) : new Date(inv.startDate);
  const end = new Date(inv.endDate);

  const creditUntil = now < end ? now : end;
  const daysToCredit = Math.floor((creditUntil - start) / DAY);
  if (daysToCredit <= 0) return null; // nothing due yet

  const dailyProfit = inv.amount * (inv.dailyProfitRate / 100);
  const profit = +(dailyProfit * daysToCredit).toFixed(8);
  const newLastDate = addDays(start, daysToCredit);
  const newStatus = newLastDate >= end ? 'completed' : 'active';

  // CAS – only succeeds if nobody else already advanced lastProfitDate
  const winner = await StockInvestment.findOneAndUpdate(
    { _id: inv._id, lastProfitDate: inv.lastProfitDate || null },
    { $inc: { profit }, $set: { lastProfitDate: newLastDate, status: newStatus } },
    { new: true }
  );
  if (!winner) return null; // another instance got it

  // Atomic credit to user
  await User.updateOne(
    { _id: inv.user },
    { $inc: { balance: profit, profit: profit } }
  );

  await Transaction.create({
    user: inv.user,
    amount: profit,
    type: 'profit',
    description: `Daily profit – ${inv.stockName} (${daysToCredit} day${daysToCredit > 1 ? 's' : ''})`,
    status: 'completed',
  });

  return { profit, days: daysToCredit };
}

// ─── Chunk helper (serverless timeout safety) ──────────────────
async function processInChunks(docs, chunkSize = 20) {
  let credited = 0, count = 0, completed = 0;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const results = await Promise.all(
      docs.slice(i, i + chunkSize).map(processInvestment).catch((e) => {
        console.error('investment failed:', e.message);
        return null;
      })
    );
    for (let j = 0; j < results.length; j++) {
      if (results[j]) { credited += results[j].profit; count++; }
      if (docs[i + j] && docs[i + j].status === 'completed') completed++;
    }
  }
  return { investments: docs.length, usersCredited: count, totalCredited: credited, completed };
}

// ─── Global run (called by cron) ───────────────────────────────
async function processDailyProfits() {
  const docs = await StockInvestment.find({ status: 'active' });
  return processInChunks(docs);
}

// ─── Per-user catch-up (called from dashboard/login) ───────────
async function processUserProfits(userId) {
  const docs = await StockInvestment.find({ user: userId, status: 'active' });
  return processInChunks(docs);
}

module.exports = { processDailyProfits, processUserProfits };