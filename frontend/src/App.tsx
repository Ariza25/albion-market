import { useEffect, useState } from 'react';
import SearchBar from './components/SearchBar';
import PriceComparisonTable from './components/PriceComparisonTable';
import CraftPanel from './components/CraftPanel';
import ApiStatusPanel from './components/ApiStatusPanel';
import OpportunitiesPage from './components/OpportunitiesPage';
import AppHeader from './components/AppHeader';
import AppFooter from './components/AppFooter';
import DataLimitationsCard from './components/DataLimitationsCard';
import PageTabs from './components/PageTabs';
import PriceFiltersPanel from './components/PriceFiltersPanel';
import { getItem } from './services/api';
import { CITY_IDS } from './utils/constants';
import styles from './App.module.css';

type ActiveTab = 'prices' | 'craft' | 'opportunities';

type AlbionItem = {
  id: string;
  name?: string;
  localized_names?: Record<string, string>;
  [key: string]: unknown;
};

export default function App() {
  const [selectedItem, setSelectedItem] = useState<AlbionItem | null>(null);
  const [selectedCities, setSelectedCities] = useState<string[]>(CITY_IDS);
  const [selectedQualities, setSelectedQualities] = useState<number[]>([1, 2, 3, 4, 5]);
  const [server, setServer] = useState('america');
  const [activeTab, setActiveTab] = useState<ActiveTab>('prices');

  useEffect(() => {
    const savedServer = localStorage.getItem('albion_server');
    const params = new URLSearchParams(window.location.search);
    const urlServer = params.get('server');
    const urlTab = params.get('tab') as ActiveTab | null;
    const urlItem = params.get('item');

    if (urlServer) setServer(urlServer);
    else if (savedServer) setServer(savedServer);
    if (urlTab === 'craft' || urlTab === 'prices' || urlTab === 'opportunities') setActiveTab(urlTab);
    if (urlItem) {
      getItem(urlItem).then(setSelectedItem).catch(() => {});
    }
  }, []);

  const handleServerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newServer = event.target.value;
    setServer(newServer);
    localStorage.setItem('albion_server', newServer);
  };

  return (
    <div className={styles.app}>
      <AppHeader server={server} onServerChange={handleServerChange} />

      <main className={styles.main}>
        <section className={styles.searchSection}>
          <SearchBar onSelect={setSelectedItem} />
        </section>

        <ApiStatusPanel server={server} />
        <DataLimitationsCard />
        <PageTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className={styles.layoutGrid}>
          {activeTab === 'prices' ? (
            <>
              <PriceFiltersPanel
                selectedCities={selectedCities}
                selectedQualities={selectedQualities}
                onCitiesChange={setSelectedCities}
                onQualitiesChange={setSelectedQualities}
              />

              <section className={styles.content}>
                <PriceComparisonTable
                  item={selectedItem}
                  cities={selectedCities}
                  qualities={selectedQualities}
                  server={server}
                />
              </section>
            </>
          ) : activeTab === 'craft' ? (
            <section className={styles.fullContent}>
              <CraftPanel item={selectedItem} server={server} />
            </section>
          ) : (
            <section className={styles.fullContent}>
              <OpportunitiesPage server={server} />
            </section>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
