const { getGoldHistory } = require('../../../application/use-cases/gold/getGoldHistory');

async function listGoldHistory(req, res) {
  const payload = await getGoldHistory({
    count: req.query.count,
    server: req.query.server,
    date: req.query.date,
    endDate: req.query.end_date,
  });

  return res.json(payload);
}

module.exports = { listGoldHistory };

export {};
