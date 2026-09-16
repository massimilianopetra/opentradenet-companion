export interface SymbolInfo {
  description?: string;
  underlying?: string;
  market?: string;
  exchange?: string;
  currency?: string;
  max_leverage?: number;
  discovery_bound?: string;
  margin_mode?: string;
  oi_cap?: string;
  session_external_utc?: string;
  session_internal_utc?: string;
  notes?: string;
  aliases?: string[];
  asset_type?: string;
}

/** description is formatted as "Extended Name — what the symbol is about". */
export function splitDescription(
  description?: string
): { name: string; detail: string } | null {
  if (!description) return null;
  const idx = description.indexOf("—");
  if (idx === -1) return { name: description.trim(), detail: "" };
  return {
    name: description.slice(0, idx).trim(),
    detail: description.slice(idx + 1).trim(),
  };
}
