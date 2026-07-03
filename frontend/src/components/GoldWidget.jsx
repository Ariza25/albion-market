import { useState, useEffect } from 'react';
import { getGold } from '../services/api';
import { formatPrice } from '../utils/constants';
import { TrendingUp, Coins } from 'lucide-react';
import styles from './GoldWidget.module.css';

export default function GoldWidget() {
  const [gold, setGold] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchGold = async () => {
    setLoading(true);
    try {
      const data = await getGold(1);
      if (data.latest_price) {
        setGold(data.latest_price);
      }
    } catch (err) {
      console.error('Erro ao buscar preço do ouro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGold();
    const interval = setInterval(fetchGold, 600000); // 10 min
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.widget}>
      <TrendingUp size={16} className={styles.icon} />
      <span className={styles.label}>Ouro:</span>
      <Coins size={14} className={styles.goldIcon} />
      <span className={styles.value}>
        {loading && !gold ? '...' : gold ? `${formatPrice(gold.price)} Silvers` : '—'}
      </span>
    </div>
  );
}
