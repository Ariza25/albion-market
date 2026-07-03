import { RefreshCw, Search } from 'lucide-react';
import { formatPrice, getCityColor } from '../../utils/constants';
import styles from '../OpportunitiesPage.module.css';
import type { OpportunityRow } from './types';

type Props = {
  rows: OpportunityRow[];
  loading: boolean;
};

export default function OpportunitiesTable({ rows, loading }: Props) {
  return (
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
            <th>Confianca</th>
            <th>Idade</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={10} className={styles.empty}>
                <RefreshCw className={styles.spin} /> Buscando oportunidades...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={10} className={styles.empty}>
                <Search size={18} /> Nenhuma oportunidade calculada ainda.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function CityBadge({ city }: { city: string }) {
  return (
    <span className={styles.cityBadge} style={{ '--city-color': getCityColor(city) } as React.CSSProperties}>
      {city}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  return <span className={`${styles.confidence} ${styles[confidence] || styles.none}`}>{confidenceLabel(confidence)}</span>;
}

function confidenceLabel(value: string) {
  return { high: 'alta', medium: 'media', low: 'baixa', none: 'nenhuma' }[value] || 'nenhuma';
}
