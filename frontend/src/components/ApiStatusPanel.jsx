import { useCallback, useEffect, useState } from 'react';
import { Activity, Database, RefreshCw, Server } from 'lucide-react';
import { getHealth } from '../services/api';
import styles from './ApiStatusPanel.module.css';

const SERVER_LABELS = {
  europe: 'Europa',
  west: 'Americas',
  east: 'Asia',
};

export default function ApiStatusPanel({ server }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHealth();
      setHealth(data);
    } catch (err) {
      setHealth((prev) => ({
        ...(prev || {}),
        status: 'degraded',
        albion_data: {
          ...(prev?.albion_data || {}),
          lastError: err.message,
          lastFailureAt: new Date().toISOString(),
        },
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth, server]);

  const albion = health?.albion_data || {};
  const persistent = albion.persistent_cache || {};

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h3><Activity size={16} /> Status da Albion Data API</h3>
          <p>Transparencia sobre servidor, cache e estabilidade dos dados.</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchHealth} disabled={loading}>
          <RefreshCw size={14} className={loading ? styles.spin : ''} />
          Atualizar
        </button>
      </div>

      <div className={styles.grid}>
        <StatusCard icon={<Server size={16} />} label="Servidor selecionado" value={SERVER_LABELS[server] || server} />
        <StatusCard icon={<Activity size={16} />} label="Ultimo sucesso" value={formatDateTime(albion.lastSuccessAt)} tone="good" />
        <StatusCard icon={<Activity size={16} />} label="Ultima falha" value={formatDateTime(albion.lastFailureAt)} tone={albion.lastFailureAt ? 'bad' : undefined} />
        <StatusCard icon={<Database size={16} />} label="Cache hits/misses" value={`${albion.cacheHits || 0}/${albion.cacheMisses || 0}`} />
        <StatusCard icon={<Database size={16} />} label="Cache persistente" value={`${persistent.entries || 0} arquivos`} />
        <StatusCard icon={<Database size={16} />} label="Tamanho cache" value={formatBytes(persistent.bytes || 0)} />
      </div>

      {albion.lastError && (
        <div className={styles.warning}>
          Ultimo erro da Albion Data API: {albion.lastError}. Quando possivel, o app usa dados de cache com aviso de idade.
        </div>
      )}
    </section>
  );
}

function StatusCard({ icon, label, value, tone }) {
  return (
    <div className={styles.card}>
      <span className={styles.cardIcon}>{icon}</span>
      <span className={styles.label}>{label}</span>
      <strong className={tone === 'good' ? styles.good : tone === 'bad' ? styles.bad : ''}>{value || '-'}</strong>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function formatBytes(value) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}
