import type { SymbolInfo } from "@/lib/symbolInfo";
import { splitDescription } from "@/lib/symbolInfo";
import styles from "./SymbolInfoPanel.module.css";

export default function SymbolInfoPanel({
  symbol,
  info,
}: {
  symbol: string;
  info: SymbolInfo | null;
}) {
  if (!info) {
    return (
      <div className={styles.panel}>
        <p className={styles.empty}>
          Nessuna informazione disponibile per {symbol}.
        </p>
      </div>
    );
  }

  const parsed = splitDescription(info.description);

  return (
    <div className={styles.panel}>
      {parsed?.detail && <p className={styles.detail}>{parsed.detail}</p>}
      {info.notes && <p className={styles.notes}>{info.notes}</p>}

      <dl className={styles.grid}>
        {info.asset_type && (
          <Field label="Tipo" value={info.asset_type} />
        )}
        {info.market && <Field label="Mercato" value={info.market} />}
        {info.exchange && <Field label="Exchange" value={info.exchange} />}
        {info.currency && <Field label="Valuta" value={info.currency} />}
        {info.underlying && (
          <Field label="Sottostante" value={info.underlying} />
        )}
        {info.max_leverage != null && (
          <Field label="Leva max" value={`${info.max_leverage}x`} />
        )}
        {info.margin_mode && (
          <Field label="Margine" value={info.margin_mode} />
        )}
        {info.session_internal_utc && (
          <Field label="Sessione (liquidità)" value={info.session_internal_utc} />
        )}
        {info.session_external_utc && (
          <Field label="Sessione (estesa)" value={info.session_external_utc} />
        )}
        {info.aliases && info.aliases.length > 0 && (
          <Field label="Alias" value={info.aliases.join(", ")} />
        )}
      </dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
    </div>
  );
}
