export function getApplicableTaxRate(countryCode: string): number {
  // Simple placeholder: 7.5% for Nigeria, 0 otherwise
  if (!countryCode) return 0;
  return countryCode.toUpperCase() === 'NG' ? 0.075 : 0;
}

export function calculateTax(amount: number, rate: number): number {
  if (!amount || !rate) return 0;
  return amount * rate;
}
