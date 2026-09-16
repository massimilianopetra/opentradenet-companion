import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <h1>OpenTradeNet Companion</h1>
      <p className={styles.lead}>
        Webapp di supporto a opentradenet_bot: grafici e dati di mercato in
        sola lettura.
      </p>
      <Link href="/charts" className={styles.cta}>
        Vai ai Grafici →
      </Link>
    </div>
  );
}
