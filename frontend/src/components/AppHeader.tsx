import { Settings, Shield } from 'lucide-react';
import GoldWidget from './GoldWidget';
import styles from '../App.module.css';

type AppHeaderProps = {
  server: string;
  onServerChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

export default function AppHeader({ server, onServerChange }: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.logoWrap}>
        <Shield className={styles.logoIcon} size={28} />
        <div>
          <h1 className={styles.logoTitle}>Albion Market</h1>
          <p className={styles.logoSub}>Comparador de Precos Real-Time</p>
        </div>
      </div>

      <div className={styles.headerControls}>
        <GoldWidget />

        <div className={styles.selectWrapper}>
          <Settings size={14} className={styles.selectIcon} />
          <select id="server-select" value={server} onChange={onServerChange} className={styles.select}>
            <option value="europe">Europa</option>
            <option value="america">Americas</option>
            <option value="east">Asia</option>
          </select>
        </div>
      </div>
    </header>
  );
}
