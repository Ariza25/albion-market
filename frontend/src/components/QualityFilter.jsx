import { QUALITIES } from '../utils/constants';
import styles from './QualityFilter.module.css';

export default function QualityFilter({ selected, onChange }) {
  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(q => q !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Qualidade:</span>
      <div className={styles.pills}>
        {QUALITIES.map(q => {
          const active = selected.includes(q.id);
          return (
            <button
              key={q.id}
              id={`quality-${q.id}`}
              className={`${styles.pill} ${active ? styles.active : ''}`}
              style={active ? { '--pill-color': q.color } : {}}
              onClick={() => toggle(q.id)}
              title={q.label}
            >
              <span className={styles.dot} style={{ background: q.color }} />
              {q.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
