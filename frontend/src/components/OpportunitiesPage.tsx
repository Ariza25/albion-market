import { useState } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { getMarketOpportunities } from '../services/api';
import { CITY_IDS } from '../utils/constants';
import DataQualitySummary from './opportunities/DataQualitySummary';
import OpportunitiesFilters from './opportunities/OpportunitiesFilters';
import OpportunitiesTable from './opportunities/OpportunitiesTable';
import type { DataQualitySummary as DataQualitySummaryType, OpportunityRow } from './opportunities/types';
import styles from './OpportunitiesPage.module.css';

const DEFAULT_ITEMS = 'T4_BAG,T5_BAG,T6_BAG,T4_CAPE,T5_CAPE,T4_2H_BOW,T5_2H_BOW';

type Props = {
  server: string;
};

export default function OpportunitiesPage({ server }: Props) {
  const [itemsText, setItemsText] = useState(DEFAULT_ITEMS);
  const [cities, setCities] = useState<string[]>(CITY_IDS);
  const [qualities, setQualities] = useState<number[]>([1]);
  const [minProfit, setMinProfit] = useState(0);
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualitySummaryType | null>(null);
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
    } catch (err: any) {
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
          <p>Ranking baseado em snapshot consistente de precos, lucro liquido 4% e confianca dos dados.</p>
        </div>
        <button className={styles.primaryBtn} onClick={runSearch} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} />
          Buscar
        </button>
      </div>

      <OpportunitiesFilters
        itemsText={itemsText}
        cities={cities}
        qualities={qualities}
        minProfit={minProfit}
        onItemsTextChange={setItemsText}
        onCitiesChange={setCities}
        onQualitiesChange={setQualities}
        onMinProfitChange={setMinProfit}
      />

      <DataQualitySummary dataQuality={dataQuality} />
      {error && <div className={styles.error}>{error}</div>}
      <OpportunitiesTable rows={rows} loading={loading} />
    </section>
  );
}

function parseItems(value: string) {
  return [...new Set(String(value || '').split(/[\s,;]+/).map((item) => item.trim().toUpperCase()).filter(Boolean))];
}
