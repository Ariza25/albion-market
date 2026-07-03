import { CITY_IDS, QUALITIES } from '../../utils/constants';
import styles from '../OpportunitiesPage.module.css';

type Props = {
  itemsText: string;
  cities: string[];
  qualities: number[];
  minProfit: number;
  onItemsTextChange: (value: string) => void;
  onCitiesChange: (value: string[]) => void;
  onQualitiesChange: (value: number[]) => void;
  onMinProfitChange: (value: number) => void;
};

export default function OpportunitiesFilters({
  itemsText,
  cities,
  qualities,
  minProfit,
  onItemsTextChange,
  onCitiesChange,
  onQualitiesChange,
  onMinProfitChange,
}: Props) {
  return (
    <>
      <div className={styles.filters}>
        <label className={styles.fieldWide}>
          <span>Itens</span>
          <textarea value={itemsText} onChange={(event) => onItemsTextChange(event.target.value)} rows={3} />
        </label>
        <label className={styles.field}>
          <span>Lucro minimo</span>
          <input
            type="number"
            value={minProfit}
            onChange={(event) => onMinProfitChange(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
      </div>

      <div className={styles.checkGrid}>
        <CheckboxGroup
          title="Cidades"
          values={CITY_IDS}
          selected={cities}
          labelFor={(city) => city}
          onToggle={(city) => onCitiesChange(toggle(cities, city))}
        />
        <CheckboxGroup
          title="Qualidades"
          values={QUALITIES.map((quality) => quality.id)}
          selected={qualities}
          labelFor={(qualityId) => QUALITIES.find((quality) => quality.id === qualityId)?.label || String(qualityId)}
          onToggle={(qualityId) => onQualitiesChange(toggle(qualities, qualityId))}
        />
      </div>
    </>
  );
}

type CheckboxGroupProps<T extends string | number> = {
  title: string;
  values: T[];
  selected: T[];
  labelFor: (value: T) => string;
  onToggle: (value: T) => void;
};

function CheckboxGroup<T extends string | number>({ title, values, selected, labelFor, onToggle }: CheckboxGroupProps<T>) {
  return (
    <div>
      <strong>{title}</strong>
      <div className={styles.checks}>
        {values.map((value) => (
          <label key={value}>
            <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
            {labelFor(value)}
          </label>
        ))}
      </div>
    </div>
  );
}

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
