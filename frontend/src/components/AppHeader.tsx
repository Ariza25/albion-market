import { Shield } from 'lucide-react';
import GoldWidget from './GoldWidget';
import styles from '../App.module.css';

export default function AppHeader() {
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
      </div>
    </header>
  );
}
