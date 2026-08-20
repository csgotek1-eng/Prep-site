/** Format integer euro cents as Irish/EU currency, e.g. 125 → "€1.25". */
export function formatEuro(cents: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
