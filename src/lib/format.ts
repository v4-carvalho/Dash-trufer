export const brl = (n: number, compact = false) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: compact ? 0 : 2 });
export const int = (n: number) => Math.round(n).toLocaleString("pt-BR");
export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits).replace(".", ",")}%`;
export const tons = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t`;
export const shortDate = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
