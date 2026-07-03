import styles from '../App.module.css';

export default function DataLimitationsCard() {
  return (
    <section className={styles.limitationsCard}>
      <h3>Como ler os dados da Albion Data</h3>
      <div className={styles.limitationsGrid}>
        <span>Os precos vem de jogadores/loggers da comunidade, nao de uma API oficial da Sandbox.</span>
        <span>Preco ausente nao significa mercado vazio; pode significar falta de coleta recente.</span>
        <span>Dado velho pode distorcer lucro, principalmente em itens com pouco volume.</span>
        <span>Black Market pode ter cobertura menor e deve ser validado com margem de seguranca.</span>
      </div>
    </section>
  );
}
