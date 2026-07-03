import styles from '../OpportunitiesPage.module.css';
import type { DataQualitySummary as DataQualitySummaryType } from './types';

type Props = {
  dataQuality: DataQualitySummaryType | null;
};

export default function DataQualitySummary({ dataQuality }: Props) {
  if (!dataQuality) return null;

  return (
    <div className={styles.qualitySummary}>
      <span>Confianca: alta {dataQuality.high || 0}</span>
      <span>media {dataQuality.medium || 0}</span>
      <span>baixa {dataQuality.low || 0}</span>
      <span>sem dado {dataQuality.none || 0}</span>
      <span>cache {dataQuality.cached || 0}</span>
    </div>
  );
}
