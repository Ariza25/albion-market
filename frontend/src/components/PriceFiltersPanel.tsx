import { Compass, Sparkles } from 'lucide-react';
import CityFilter from './CityFilter';
import QualityFilter from './QualityFilter';
import styles from '../App.module.css';

type PriceFiltersPanelProps = {
  selectedCities: string[];
  selectedQualities: number[];
  onCitiesChange: (cities: string[]) => void;
  onQualitiesChange: (qualities: number[]) => void;
};

export default function PriceFiltersPanel({
  selectedCities,
  selectedQualities,
  onCitiesChange,
  onQualitiesChange,
}: PriceFiltersPanelProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Compass size={16} />
          <h3>Filtros de Busca</h3>
        </div>
        <div className={styles.cardBody}>
          <CityFilter selected={selectedCities} onChange={onCitiesChange} />
          <hr className={styles.divider} />
          <QualityFilter selected={selectedQualities} onChange={onQualitiesChange} />
        </div>
      </div>

      <div className={styles.infoCard}>
        <Sparkles size={18} className={styles.infoIcon} />
        <h4>Dica de Ouro</h4>
        <p>
          Os precos variam muito entre as Royal Cities e Caerleon, que abriga o Mercado Negro.
          Sempre confira a <strong>idade dos dados</strong> antes de viajar para revender.
        </p>
      </div>
    </aside>
  );
}
