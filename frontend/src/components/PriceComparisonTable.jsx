import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Coins, ArrowUpDown, TrendingUp, HelpCircle } from 'lucide-react';
import { getMarketSnapshot } from '../services/api';
import { formatPrice, formatDate, getAlbionItemIcon, getCityColor, QUALITIES } from '../utils/constants';
import styles from './PriceComparisonTable.module.css';

export default function PriceComparisonTable({ item, cities, qualities, server }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [warning, setWarning] = useState('');
  const [sortField, setSortField] = useState('city');
  const [sortOrder, setSortOrder] = useState('asc'); // asc | desc

  const fetchMarketData = useCallback(async () => {
    if (!item) return;
    setLoading(true);
    setWarning('');
    try {
      const res = await getMarketSnapshot([item.id], cities, qualities, server);
      setData(res.prices || []);
      setSnapshot({ id: res.snapshot_id, generatedAt: res.generated_at, dataQuality: res.data_quality });
      if ((res.data_quality?.stale_fallback || 0) > 0) {
        setWarning(`Usando cache antigo em ${res.data_quality.stale_fallback} registro(s). A Albion Data API falhou ou nao respondeu a tempo.`);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erro ao buscar preços:', err);
      setWarning('Nao foi possivel gerar snapshot. Se houver cache antigo disponivel, o backend tentara usa-lo nas proximas chamadas.');
    } finally {
      setLoading(false);
    }
  }, [cities, item, qualities, server]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'quality') {
      valA = a.quality;
      valB = b.quality;
    }

    if (typeof valA === 'string') {
      return sortOrder === 'asc' 
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    // Handle null/0 values for prices so they stay at the bottom
    if (valA === 0 || valA === null) valA = sortOrder === 'asc' ? Infinity : -Infinity;
    if (valB === 0 || valB === null) valB = sortOrder === 'asc' ? Infinity : -Infinity;

    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  if (!item) {
    return (
      <div className={styles.emptyState}>
        <TrendingUp size={48} className={styles.emptyIcon} />
        <h3>Selecione ou busque um item para começar</h3>
        <p>Pesquise pelo nome do equipamento, bolsa, capa ou consumível para ver e comparar os preços nas cidades principais do Albion Online.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.itemMeta}>
          <img
            src={getAlbionItemIcon(item.id)}
            alt={item.name}
            className={styles.itemImage}
          />
          <div>
            <h2 className={styles.itemName}>{item.name_pt || item.name}</h2>
            <span className={styles.itemId}>{item.id}</span>
          </div>
        </div>
        <div className={styles.actions}>
          {lastUpdated && (
            <span className={styles.time}>
              Atualizado às {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            className={`${styles.refreshBtn} ${loading ? styles.spinning : ''}`} 
            onClick={fetchMarketData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {snapshot && (
        <div className={styles.snapshotBar}>
          <span>Snapshot <strong>{snapshot.id}</strong></span>
          <span>gerado em {new Date(snapshot.generatedAt).toLocaleString('pt-BR')}</span>
          <span>confiança alta {snapshot.dataQuality?.high || 0}, media {snapshot.dataQuality?.medium || 0}, baixa {snapshot.dataQuality?.low || 0}</span>
        </div>
      )}
      {warning && <div className={styles.warningBar}>{warning}</div>}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('city')}>
                Cidade <ArrowUpDown size={12} className={styles.sortIcon} />
              </th>
              <th onClick={() => handleSort('quality')}>
                Qualidade <ArrowUpDown size={12} className={styles.sortIcon} />
              </th>
              <th onClick={() => handleSort('sell_price_min')}>
                Preço Mín. Venda <ArrowUpDown size={12} className={styles.sortIcon} />
              </th>
              <th onClick={() => handleSort('sell_price_min_date')}>
                Idade (Venda) <ArrowUpDown size={12} className={styles.sortIcon} />
              </th>
              <th onClick={() => handleSort('buy_price_max')}>
                Preço Máx. Compra <ArrowUpDown size={12} className={styles.sortIcon} />
              </th>
              <th onClick={() => handleSort('buy_price_max_date')}>
                Idade (Compra) <ArrowUpDown size={12} className={styles.sortIcon} />
              </th>
              <th>Confianca / Fonte</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className={styles.loaderCell}>
                  <RefreshCw size={24} className={styles.spinner} />
                  Carregando dados do mercado...
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.noDataCell}>
                  Nenhum dado recente encontrado para as cidades/qualidades selecionadas.
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => {
                const cityColor = getCityColor(row.city);
                const qualityObj = QUALITIES.find(q => q.id === row.quality);
                return (
                  <tr key={`${row.city}-${row.quality}-${idx}`}>
                    <td>
                      <span className={styles.cityBadge} style={{ '--city-color': cityColor }}>
                        {row.city}
                      </span>
                    </td>
                    <td>
                      <span className={styles.qualityBadge} style={{ color: qualityObj?.color }}>
                        {row.quality_label}
                      </span>
                    </td>
                    <td className={styles.priceCell}>
                      <Coins size={14} className={styles.silverIcon} />
                      <span className={row.sell_price_min > 0 ? styles.priceVal : styles.emptyVal}>
                        {formatPrice(row.sell_price_min)}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      <DataAgeBadge status={row.data_quality?.sell_status} age={row.data_quality?.sell_age_hours} fallback={formatDate(row.sell_price_min_date)} />
                    </td>
                    <td className={styles.priceCell}>
                      <Coins size={14} className={styles.silverIcon} />
                      <span className={row.buy_price_max > 0 ? styles.priceVal : styles.emptyVal}>
                        {formatPrice(row.buy_price_max)}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      <DataAgeBadge status={row.data_quality?.buy_status} age={row.data_quality?.buy_age_hours} fallback={formatDate(row.buy_price_max_date)} />
                    </td>
                    <td>
                      <div className={styles.confidenceWrap}>
                        <ConfidenceBadge confidence={row.data_quality?.confidence} />
                        <span className={styles.sourceBadge}>{sourceLabel(row)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.tableFooter}>
        <HelpCircle size={14} />
        <span>Os dados do mercado do Albion Online dependem da contribuição dos jogadores usando o Albion Data Client.</span>
      </div>
    </div>
  );
}

function DataAgeBadge({ status, age, fallback }) {
  return (
    <span className={`${styles.ageBadge} ${styles[status] || styles.unknown}`}>
      {statusLabel(status)} {age !== null && age !== undefined ? `${age}h` : fallback}
    </span>
  );
}

function ConfidenceBadge({ confidence }) {
  return <span className={`${styles.confidenceBadge} ${styles[confidence] || styles.none}`}>{confidenceLabel(confidence)}</span>;
}

function statusLabel(status) {
  return {
    fresh: 'fresh',
    recent: 'recent',
    stale: 'stale',
    very_stale: 'very stale',
    missing: 'missing',
    unknown: 'unknown',
  }[status] || 'unknown';
}

function confidenceLabel(value) {
  return { high: 'alta', medium: 'media', low: 'baixa', none: 'nenhuma' }[value] || 'nenhuma';
}

function sourceLabel(row) {
  if (row.source === 'persistent-cache-stale') return `cache antigo ${Math.round((row.cache_age_seconds || 0) / 3600)}h`;
  if (row.source === 'persistent-cache') return `cache ${row.cache_age_seconds || 0}s`;
  return 'api';
}
