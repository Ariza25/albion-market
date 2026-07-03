import { useState } from 'react';
import { RefreshCw, Search, TrendingUp } from 'lucide-react';
import { getMarketOpportunities } from '../services/api';
import { CITY_IDS, QUALITIES, formatPrice, getCityColor } from '../utils/constants';
import styles from './OpportunitiesPage.module.css';

const DEFAULT_ITEMS = 'T4_BAG,T5_BAG,T6_BAG,T4_CAPE,T5_CAPE,T4_2H_BOW,T5_2H_BOW';

export default function OpportunitiesPage({ server }) {
  const [itemsText, setItemsText] = useState(DEFAULT_ITEMS);
  const [cities, setCities] = useState(CITY_IDS);
  const [qualities, setQualities] = useState([1]);
  const [minProfit, setMinProfit] = useState(0);
  const [rows, setRows] = useState([]);
  const [dataQuality, setDataQuality] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async () => {
    const items = parseItems(itemsText);
    if (!items.length) {
      setError('Informe pelo menos um item_id.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await getMarketOpportunities(items, cities, qualities, server, minProfit);
      setRows(response.opportunities || []);
      setDataQuality(response.data_quality || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao consultar oportunidades.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2><TrendingUp size={18} /> Oportunidades de mercado</h2>
          <p>Ranking baseado em snapshot consistente de preços, lucro liquido 4% e confiança dos dados.</p>
        </div>
        <button className={styles.primaryBtn} onClick={runSearch} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} />
          Buscar
        </button>
      </div>

      <div className={styles.filters}>
        <label className={styles.fieldWide}>
          <span>Itens</span>
          <textarea value={itemsText} onChange={(event) => setItemsText(event.target.value)} rows={3} />
        </label>
        <label className={styles.field}>
          <span>Lucro minimo</span>
          <input type="number" value={minProfit} onChange={(event) => setMinProfit(Math.max(0, Number(event.target.value) || 0))} />
        </label>
      </div>

      <div className={styles.checkGrid}>
        <div>
          <strong>Cidades</strong>
          <div className={styles.checks}>
            {CITY_IDS.map((city) => (
              <label key={city}>
                <input type="checkbox" checked={cities.includes(city)} onChange={() => toggle(cities, city, setCities)} />
                {city}
              </label>
            ))}
          </div>
        </div>
        <div>
          <strong>Qualidades</strong>
          <div className={styles.checks}>
            {QUALITIES.map((quality) => (
              <label key={quality.id}>
                <input type="checkbox" checked={qualities.includes(quality.id)} onChange={() => toggle(qualities, quality.id, setQualities)} />
                {quality.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {dataQuality && (
        <div className={styles.qualitySummary}>
          <span>Confiança: alta {dataQuality.high || 0}</span>
          <span>media {dataQuality.medium || 0}</span>
          <span>baixa {dataQuality.low || 0}</span>
          <span>sem dado {dataQuality.none || 0}</span>
          <span>cache {dataQuality.cached || 0}</span>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qualidade</th>
              <th>Comprar</th>
              <th>Vender</th>
              <th>Entrada</th>
              <th>Saida</th>
              <th>Lucro</th>
              <th>ROI</th>
              <th>Confiança</th>
              <th>Idade</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" className={styles.empty}><RefreshCw className={styles.spin} /> Buscando oportunidades...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="10" className={styles.empty}><Search size={18} /> Nenhuma oportunidade calculada ainda.</td></tr>
            ) : rows.map((row) => (
              <tr key={`${row.item_id}-${row.quality}-${row.buy_city}-${row.sell_city}`}>
                <td className={styles.itemId}>{row.item_id}</td>
                <td>{row.quality_label}</td>
                <td><CityBadge city={row.buy_city} /></td>
                <td><CityBadge city={row.sell_city} /></td>
                <td>{formatPrice(row.buy_price)}</td>
                <td>{formatPrice(row.sell_price)}</td>
                <td className={row.profit >= 0 ? styles.good : styles.bad}>{formatPrice(row.profit)}</td>
                <td>{row.roi.toFixed(1)}%</td>
                <td><ConfidenceBadge confidence={row.confidence} /></td>
                <td>{row.buy_age_hours ?? '-'}h / {row.sell_age_hours ?? '-'}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CityBadge({ city }) {
  return <span className={styles.cityBadge} style={{ '--city-color': getCityColor(city) }}>{city}</span>;
}

function ConfidenceBadge({ confidence }) {
  return <span className={`${styles.confidence} ${styles[confidence] || styles.none}`}>{confidenceLabel(confidence)}</span>;
}

function confidenceLabel(value) {
  return { high: 'alta', medium: 'media', low: 'baixa', none: 'nenhuma' }[value] || 'nenhuma';
}

function parseItems(value) {
  return [...new Set(String(value || '').split(/[\s,;]+/).map((item) => item.trim().toUpperCase()).filter(Boolean))];
}

function toggle(values, value, setter) {
  setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
}
