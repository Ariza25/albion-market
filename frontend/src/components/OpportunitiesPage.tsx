import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { getMarketOpportunities } from '../services/api';
import { CITY_IDS } from '../utils/constants';
import DataQualitySummary from './opportunities/DataQualitySummary';
import OpportunitiesFilters from './opportunities/OpportunitiesFilters';
import OpportunitiesTable from './opportunities/OpportunitiesTable';
import type { DataQualitySummary as DataQualitySummaryType, OpportunityItem, OpportunityRow } from './opportunities/types';
import styles from './OpportunitiesPage.module.css';

const DEFAULT_ITEM_IDS = [
  'T4_BAG',
  'T5_BAG',
  'T6_BAG',
  'T7_BAG',
  'T8_BAG',
  'T4_CAPE',
  'T5_CAPE',
  'T6_CAPE',
  'T7_CAPE',
  'T8_CAPE',
  'T4_2H_BOW',
  'T5_2H_BOW',
  'T6_2H_BOW',
  'T4_MAIN_SWORD',
  'T5_MAIN_SWORD',
  'T6_MAIN_SWORD',
  'T4_OFF_SHIELD',
  'T5_OFF_SHIELD',
  'T6_OFF_SHIELD',
  'T4_HEAD_PLATE_SET1',
  'T4_ARMOR_PLATE_SET1',
  'T4_SHOES_PLATE_SET1',
  'T5_HEAD_LEATHER_SET1',
  'T5_ARMOR_LEATHER_SET1',
  'T5_SHOES_LEATHER_SET1',
  'T6_HEAD_CLOTH_SET1',
  'T6_ARMOR_CLOTH_SET1',
  'T6_SHOES_CLOTH_SET1',
];

const DEFAULT_ITEMS = DEFAULT_ITEM_IDS.map((id) => ({ id }));

type Props = {
  server: string;
};

export default function OpportunitiesPage({ server }: Props) {
  const [selectedItems, setSelectedItems] = useState<OpportunityItem[]>(DEFAULT_ITEMS);
  const [cities, setCities] = useState<string[]>(CITY_IDS);
  const [qualities, setQualities] = useState<number[]>([1]);
  const [minProfit, setMinProfit] = useState(0);
  const [premium, setPremium] = useState(true);
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualitySummaryType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const didLoadDefault = useRef(false);

  const runSearch = useCallback(async (itemsToSearch = selectedItems) => {
    const items = itemsToSearch.map((item) => item.id);
    if (!items.length) {
      setError('Adicione pelo menos um item.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await getMarketOpportunities(items, cities, qualities, server, minProfit, premium);
      setRows(response.opportunities || []);
      setDataQuality(response.data_quality || null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao consultar oportunidades.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [cities, minProfit, premium, qualities, selectedItems, server]);

  useEffect(() => {
    if (didLoadDefault.current) return;
    didLoadDefault.current = true;
    runSearch(DEFAULT_ITEMS);
  }, [runSearch]);

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2><TrendingUp size={18} /> Black Market</h2>
          <p>Compare compra nas cidades selecionadas contra venda no Black Market com taxa de {premium ? '4%' : '8%'}.</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => runSearch()} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} />
          Buscar
        </button>
      </div>

      <OpportunitiesFilters
        selectedItems={selectedItems}
        cities={cities}
        qualities={qualities}
        minProfit={minProfit}
        premium={premium}
        onItemAdd={(item) => setSelectedItems((current) => addItem(current, item))}
        onItemRemove={(itemId) => setSelectedItems((current) => current.filter((item) => item.id !== itemId))}
        onResetItems={() => setSelectedItems(DEFAULT_ITEMS)}
        onCitiesChange={setCities}
        onQualitiesChange={setQualities}
        onMinProfitChange={setMinProfit}
        onPremiumChange={setPremium}
      />

      <DataQualitySummary dataQuality={dataQuality} />
      {error && <div className={styles.error}>{error}</div>}
      <OpportunitiesTable rows={rows} loading={loading} />
    </section>
  );
}

function addItem(items: OpportunityItem[], item: OpportunityItem) {
  if (items.some((current) => current.id === item.id)) return items;
  return [...items, item];
}
