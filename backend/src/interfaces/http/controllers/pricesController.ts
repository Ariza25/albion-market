const { getItemPrices } = require('../../../application/use-cases/prices/getItemPrices');
const { getMultiItemPrices } = require('../../../application/use-cases/prices/getMultiItemPrices');

async function showItemPrices(req, res) {
  const payload = await getItemPrices({
    itemId: req.params.itemId,
    locations: req.query.locations,
    qualities: req.query.qualities,
    groupByCity: req.query.groupByCity,
    server: req.query.server,
  });

  return res.json(payload);
}

async function listMultiItemPrices(req, res) {
  const payload = await getMultiItemPrices({
    items: req.query.items,
    locations: req.query.locations,
    qualities: req.query.qualities,
    server: req.query.server,
  });

  return res.json(payload);
}

module.exports = { showItemPrices, listMultiItemPrices };

export {};
