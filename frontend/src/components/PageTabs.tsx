import { Hammer, Radar, TrendingUp } from 'lucide-react';
import styles from '../App.module.css';

type ActiveTab = 'prices' | 'craft' | 'opportunities';

type PageTabsProps = {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
};

export default function PageTabs({ activeTab, onChange }: PageTabsProps) {
  return (
    <div className={styles.tabsWrap}>
      <button
        id="tab-prices"
        className={`${styles.tabBtn} ${activeTab === 'prices' ? styles.tabActive : ''}`}
        onClick={() => onChange('prices')}
      >
        <TrendingUp size={16} />
        Tabela de Comparacao
      </button>
      <button
        id="tab-craft"
        className={`${styles.tabBtn} ${activeTab === 'craft' ? styles.tabActive : ''}`}
        onClick={() => onChange('craft')}
      >
        <Hammer size={16} />
        Crafting & Lucro
      </button>
      <button
        id="tab-opportunities"
        className={`${styles.tabBtn} ${activeTab === 'opportunities' ? styles.tabActive : ''}`}
        onClick={() => onChange('opportunities')}
      >
        <Radar size={16} />
        Black Market
      </button>
    </div>
  );
}
