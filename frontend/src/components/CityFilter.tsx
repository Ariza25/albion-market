// @ts-nocheck
import { CITIES } from '../utils/constants';
import styles from './CityFilter.module.css';

export default function CityFilter({ selected, onChange }) {
  const toggle = (id) => {
    if (selected.includes(id)) {
      if (selected.length > 1) {
        onChange(selected.filter(c => c !== id));
      }
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => {
    onChange(CITIES.map(c => c.id));
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>Cidades:</span>
        <button className={styles.allBtn} onClick={selectAll}>Selecionar Todas</button>
      </div>
      <div className={styles.pills}>
        {CITIES.map(c => {
          const active = selected.includes(c.id);
          return (
            <button
              key={c.id}
              id={`city-${c.id.replace(/\s+/g, '-')}`}
              className={`${styles.pill} ${active ? styles.active : ''}`}
              style={active ? { '--pill-color': c.color } : {}}
              onClick={() => toggle(c.id)}
            >
              <span className={styles.emoji}>{c.emoji}</span>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
