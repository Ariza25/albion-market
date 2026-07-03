import { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import PriceComparisonTable from './components/PriceComparisonTable';
import CraftPanel from './components/CraftPanel';
import ApiStatusPanel from './components/ApiStatusPanel';
import OpportunitiesPage from './components/OpportunitiesPage';
import QualityFilter from './components/QualityFilter';
import CityFilter from './components/CityFilter';
import GoldWidget from './components/GoldWidget';
import { getItem } from './services/api';
import { CITY_IDS } from './utils/constants';
import { Shield, Settings, Compass, Sparkles, TrendingUp, Hammer, Radar } from 'lucide-react';
import styles from './App.module.css';

export default function App() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCities, setSelectedCities] = useState(CITY_IDS);
  const [selectedQualities, setSelectedQualities] = useState([1, 2, 3, 4, 5]);
  const [server, setServer] = useState('america');
  const [activeTab, setActiveTab] = useState('prices'); // prices | craft | opportunities

  // Load state from localStorage on startup
  useEffect(() => {
    const savedServer = localStorage.getItem('albion_server');
    const params = new URLSearchParams(window.location.search);
    const urlServer = params.get('server');
    const urlTab = params.get('tab');
    const urlItem = params.get('item');

    if (urlServer) setServer(urlServer);
    else if (savedServer) setServer(savedServer);
    if (urlTab === 'craft' || urlTab === 'prices' || urlTab === 'opportunities') setActiveTab(urlTab);
    if (urlItem) {
      getItem(urlItem).then(setSelectedItem).catch(() => {});
    }
  }, []);

  const handleServerChange = (e) => {
    const newServer = e.target.value;
    setServer(newServer);
    localStorage.setItem('albion_server', newServer);
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logoWrap}>
          <Shield className={styles.logoIcon} size={28} />
          <div>
            <h1 className={styles.logoTitle}>Albion Market</h1>
            <p className={styles.logoSub}>Comparador de Preços Real-Time</p>
          </div>
        </div>

        <div className={styles.headerControls}>
          <GoldWidget />

          <div className={styles.selectWrapper}>
            <Settings size={14} className={styles.selectIcon} />
            <select 
              id="server-select"
              value={server} 
              onChange={handleServerChange} 
              className={styles.select}
            >
              <option value="europe">Europa</option>
              <option value="america">Américas</option>
              <option value="east">Ásia</option>
            </select>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.searchSection}>
          <SearchBar onSelect={setSelectedItem} />
        </section>

        <ApiStatusPanel server={server} />

        <section className={styles.limitationsCard}>
          <h3>Como ler os dados da Albion Data</h3>
          <div className={styles.limitationsGrid}>
            <span>Os preços vêm de jogadores/loggers da comunidade, não de uma API oficial da Sandbox.</span>
            <span>Preço ausente não significa mercado vazio; pode significar falta de coleta recente.</span>
            <span>Dado velho pode distorcer lucro, principalmente em itens com pouco volume.</span>
            <span>Black Market pode ter cobertura menor e deve ser validado com margem de segurança.</span>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className={styles.tabsWrap}>
          <button 
            id="tab-prices"
            className={`${styles.tabBtn} ${activeTab === 'prices' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('prices')}
          >
            <TrendingUp size={16} />
            Tabela de Comparação
          </button>
          <button 
            id="tab-craft"
            className={`${styles.tabBtn} ${activeTab === 'craft' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('craft')}
          >
            <Hammer size={16} />
            Crafting & Lucro
          </button>
          <button
            id="tab-opportunities"
            className={`${styles.tabBtn} ${activeTab === 'opportunities' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('opportunities')}
          >
            <Radar size={16} />
            Oportunidades
          </button>
        </div>

        <div className={styles.layoutGrid}>
          {activeTab === 'prices' ? (
            <>
              <aside className={styles.sidebar}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <Compass size={16} />
                    <h3>Filtros de Busca</h3>
                  </div>
                  <div className={styles.cardBody}>
                    <CityFilter selected={selectedCities} onChange={setSelectedCities} />
                    <hr className={styles.divider} />
                    <QualityFilter selected={selectedQualities} onChange={setSelectedQualities} />
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <Sparkles size={18} className={styles.infoIcon} />
                  <h4>Dica de Ouro</h4>
                  <p>
                    Os preços variam muito entre as Royal Cities e Caerleon (que abriga o Mercado Negro).
                    Sempre confira a <strong>idade dos dados</strong> antes de viajar para revender!
                  </p>
                </div>
              </aside>

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

      <footer className={styles.footer}>
        <p>© 2026 Albion Market. Criado com React & Node.js.</p>
        <p className={styles.disclaimer}>
          Este site não é afiliado à Sandbox Interactive GmbH. Os dados do mercado são coletados pela comunidade.
        </p>
      </footer>
    </div>
  );
}
