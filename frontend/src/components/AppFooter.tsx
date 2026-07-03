import styles from '../App.module.css';

export default function AppFooter() {
  return (
    <footer className={styles.footer}>
      <p>Copyright 2026 Albion Market. Criado com React & Node.js.</p>
      <p className={styles.disclaimer}>
        Este site nao e afiliado a Sandbox Interactive GmbH. Os dados do mercado sao coletados pela comunidade.
      </p>
    </footer>
  );
}
