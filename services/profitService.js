const StockInvestment = require('../models/StockInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const DAY = 24 * 60 * 60 * 1000;
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const DEFAULT_RATE = 0.5;

// ─── Process ONE investment with compare-and-swap ───────────────
// `inv` is a lean object, so missing fields on older documents stay
// missing instead of being filled with schema defaults (e.g. Date.now).
async function processInvestment(inv) {
  const now = new Date();
  const start = inv.lastProfitDate ? new Date(inv.lastProfitDate) : new Date(inv.startDate);
  const end = new Date(inv.endDate);

  const creditUntil = now < end ? now : end;
  const daysToCredit = Math.floor((creditUntil - start) / DAY);
  if (daysToCredit <= 0) return null; // nothing due yet

  const rate = Number(inv.dailyProfitRate);
  const dailyProfitRate = Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_RATE;
  const dailyProfit = inv.amount * (dailyProfitRate / 100);
  const profit = +(dailyProfit * daysToCredit).toFixed(8);
  const newLastDate = addDays(start, daysToCredit);
  const newStatus = newLastDate >= end ? 'completed' : 'active';

  // CAS – only succeeds if nobody else already advanced lastProfitDate
  // (`null` also matches documents where the field does not exist)
  const winner = await StockInvestment.findOneAndUpdate(
    { _id: inv._id, lastProfitDate: inv.lastProfitDate || null },
    {
      $inc: { profit },
      $set: { lastProfitDate: newLastDate, status: newStatus, dailyProfitRate },
    },
    { returnDocument: 'after' }
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

  return { profit, days: daysToCredit, status: newStatus };
}

// ─── Chunk helper (serverless timeout safety) ──────────────────
async function processInChunks(docs, chunkSize = 20) {
  let credited = 0, count = 0, completed = 0, failed = 0;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const results = await Promise.all(
      docs.slice(i, i + chunkSize).map((inv) =>
        processInvestment(inv).catch((e) => {
          console.error(`investment ${inv._id} failed:`, e.message);
          failed++;
          return null;
        })
      )
    );
    for (const r of results) {
      if (!r) continue;
      credited += r.profit;
      count++;
      if (r.status === 'completed') completed++;
    }
  }
  return {
    investments: docs.length,
    investmentsCredited: count,
    totalCredited: +credited.toFixed(8),
    completed,
    failed,
  };
}

// ─── Global run (called by cron) ───────────────────────────────
async function processDailyProfits() {
  const docs = await StockInvestment.find({ status: 'active' }).lean();
  return processInChunks(docs);
}

// ─── Per-user catch-up (called from dashboard/login) ───────────
async function processUserProfits(userId) {
  const docs = await StockInvestment.find({ user: userId, status: 'active' }).lean();
  return processInChunks(docs);
}

module.exports = { processDailyProfits, processUserProfits };
