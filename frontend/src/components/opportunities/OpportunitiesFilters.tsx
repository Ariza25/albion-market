import { CITY_IDS, QUALITIES } from '../../utils/constants';
import SearchBar from '../SearchBar';
import styles from '../OpportunitiesPage.module.css';
import type { OpportunityItem } from './types';

type Props = {
  selectedItems: OpportunityItem[];
  cities: string[];
  qualities: number[];
  minProfit: number;
  premium: boolean;
  onItemAdd: (item: OpportunityItem) => void;
  onItemRemove: (itemId: string) => void;
  onResetItems: () => void;
  onCitiesChange: (value: string[]) => void;
  onQualitiesChange: (value: number[]) => void;
  onMinProfitChange: (value: number) => void;
  onPremiumChange: (value: boolean) => void;
};

export default function OpportunitiesFilters({
  selectedItems,
  cities,
  qualities,
  minProfit,
  premium,
  onItemAdd,
  onItemRemove,
  onResetItems,
  onCitiesChange,
  onQualitiesChange,
  onMinProfitChange,
  onPremiumChange,
}: Props) {
  return (
    <>
      <div className={styles.filters}>
        <div className={styles.fieldWide}>
          <span>Itens para avaliar</span>
          <SearchBar onSelect={onItemAdd} />
        </div>
        <label className={styles.field}>
          <span>Lucro minimo</span>
          <input
            type="number"
            value={minProfit}
            onChange={(event) => onMinProfitChange(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
        <div className={styles.field}>
          <span>Taxa de venda</span>
          <label className={styles.inlineCheck}>
            <input type="checkbox" checked={premium} onChange={(event) => onPremiumChange(event.target.checked)} />
            Premium ativo ({premium ? '4%' : '8%'})
          </label>
        </div>
      </div>

      <div className={styles.selectedItems}>
        <div className={styles.selectedItemsHeader}>
          <strong>{selectedItems.length} itens no ranking</strong>
          <button type="button" onClick={onResetItems}>Restaurar padrao</button>
        </div>
        <div className={styles.itemChips}>
          {selectedItems.map((item) => (
            <button key={item.id} type="button" className={styles.itemChip} onClick={() => onItemRemove(item.id)}>
              <span>{item.name_pt || item.name_en || item.name || item.id}</span>
              <small>{item.id}</small>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.checkGrid}>
        <CheckboxGroup
          title="Comprar/craftar em"
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
