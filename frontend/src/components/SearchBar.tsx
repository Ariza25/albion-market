// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { searchItems } from '../services/api';
import { getAlbionItemIcon } from '../utils/constants';
import styles from './SearchBar.module.css';

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);
  const wrapRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }

    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await searchItems(query.trim(), 'PT-BR', 30);
        setResults(data.items || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  const handleSelect = (item) => {
    onSelect(item);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <div className={styles.inputWrap}>
        <Search size={18} className={styles.icon} />
        <input
          id="item-search"
          type="text"
          className={styles.input}
          placeholder="Pesquisar item... (ex: bolsa, espada, capacete)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
          spellCheck={false}
        />
        {loading && <Loader2 size={16} className={styles.spinner} />}
        {query && !loading && (
          <button className={styles.clearBtn} onClick={handleClear} aria-label="Limpar">
            <X size={16} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className={styles.dropdown}>
          {results.map(item => (
            <li key={item.id} className={styles.item} onClick={() => handleSelect(item)}>
              <img
                src={getAlbionItemIcon(item.id)}
                alt={item.name}
                className={styles.itemIcon}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{item.name_pt || item.name_en || item.name}</span>
                <span className={styles.itemId}>{item.id}</span>
              </div>
              {item.tier && <span className={styles.tier}>T{item.tier}</span>}
            </li>
          ))}
        </ul>
      )}

      {open && query.length >= 2 && results.length === 0 && !loading && (
        <div className={styles.empty}>Nenhum item encontrado para "{query}"</div>
      )}
    </div>
  );
}
