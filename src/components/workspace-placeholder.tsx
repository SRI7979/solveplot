import styles from "./library-ui.module.css";

export default function WorkspacePlaceholder({ title }: { title: string }) {
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.title}>
          <h1>{title}</h1>
        </div>
      </header>
      <div className={styles.list} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div className={styles.loadingRow} key={i}>
            <span className={styles.loadingLine} />
            <span className={styles.loadingLine} />
            <span className={styles.loadingLine} />
          </div>
        ))}
      </div>
    </div>
  );
}
