// @ts-nocheck
import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 20000 });

export const searchItems = (q, lang = 'PT-BR', limit = 30) =>
  api.get('/items/search', { params: { q, lang, limit } }).then(r => r.data);

export const getItem = (itemId) =>
  api.get(`/items/${itemId}`).then(r => r.data);

export const getPrices = (itemId, locations, qualities, server) =>
  api.get(`/prices/${itemId}`, {
    params: {
      locations: locations?.join(','),
      qualities: qualities?.join(','),
      server,
      groupByCity: false,
    },
  }).then(r => r.data);

export const getMultiPrices = (items, locations, qualities, server) =>
  api.get('/prices', {
    params: {
      items: items.join(','),
      locations: locations?.join(','),
      qualities: qualities?.join(','),
      server,
    },
  }).then(r => r.data);

export const getGold = (count = 1) =>
  api.get('/gold', { params: { count } }).then(r => r.data);

export const getHistory = (itemId, locations, qualities, server, date, timeScale = 24) =>
  api.get(`/history/${itemId}`, {
    params: {
      locations: locations?.join(','),
      qualities: qualities?.join(','),
      server,
      date,
      time_scale: timeScale,
    },
  }).then(r => r.data);

export const getCities = () =>
  api.get('/cities').then(r => r.data);

export const getHealth = () =>
  axios.get('/health', { timeout: 10000 }).then(r => r.data);

export const getCraftRecipe = (itemId, lang = 'PT-BR') =>
  api.get(`/crafting/recipe/${itemId}`, { params: { lang } }).then(r => r.data);

export const getMarketSnapshot = (items, locations, qualities, server) =>
  api.get('/market/snapshot', {
    params: {
      items: items.join(','),
      locations: locations?.join(','),
      qualities: qualities?.join(','),
      server,
    },
  }).then(r => r.data);

export const getMarketOpportunities = (items, locations, qualities, server, minProfit = 0) =>
  api.get('/market/opportunities', {
    params: {
      items: items.join(','),
      locations: locations?.join(','),
      qualities: qualities?.join(','),
      server,
      min_profit: minProfit,
    },
  }).then(r => r.data);
