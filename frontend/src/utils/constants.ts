// @ts-nocheck
export const CITIES = [
  { id: 'Caerleon',      label: 'Caerleon',      color: '#e74c3c', emoji: '🔴' },
  { id: 'Bridgewatch',   label: 'Bridgewatch',   color: '#e67e22', emoji: '🟠' },
  { id: 'Lymhurst',      label: 'Lymhurst',      color: '#27ae60', emoji: '🟢' },
  { id: 'Fort Sterling', label: 'Fort Sterling',  color: '#95a5a6', emoji: '⚪' },
  { id: 'Thetford',      label: 'Thetford',       color: '#8e44ad', emoji: '🟣' },
  { id: 'Martlock',      label: 'Martlock',       color: '#2980b9', emoji: '🔵' },
  { id: 'Brecilien',     label: 'Brecilien',      color: '#16a085', emoji: '🩵' },
];

export const QUALITIES = [
  { id: 1, label: 'Normal',       color: '#9ca3af' },
  { id: 2, label: 'Good',         color: '#22c55e' },
  { id: 3, label: 'Outstanding',  color: '#3b82f6' },
  { id: 4, label: 'Excellent',    color: '#a855f7' },
  { id: 5, label: 'Masterpiece',  color: '#f59e0b' },
];

export const CITY_IDS = CITIES.map(c => c.id);

export function formatPrice(v) {
  if (!v || v === 0) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('pt-BR');
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

export function getAlbionItemIcon(itemId) {
  const encoded = encodeURIComponent(itemId);
  return `https://render.albiononline.com/v1/item/${encoded}.png?quality=1&size=64`;
}

export function getCityColor(cityName) {
  return CITIES.find(c => c.id === cityName)?.color ?? '#8b92b4';
}
