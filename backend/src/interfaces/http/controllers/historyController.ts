const { getItemHistory } = require('../../../application/use-cases/history/getItemHistory');

async function showItemHistory(req, res) {
  const payload = await getItemHistory({
    itemId: req.params.itemId,
    locations: req.query.locations,
    qualities: req.query.qualities,
    timescale: req.query.time_scale,
    server: req.query.server,
    date: req.query.date,
    endDate: req.query.end_date,
  });

  return res.json(payload);
}

module.exports = { showItemHistory };

export {};
