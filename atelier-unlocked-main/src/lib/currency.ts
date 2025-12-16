export const CURRENCY_RATES: Record<string, number> = {
  EUR: 1.0,
  USD: 0.92,
  GBP: 1.17,
  JPY: 0.0062,
  CNY: 0.13,
  INR: 0.011,
  AUD: 0.61,
  CAD: 0.68,
  CHF: 1.05,
  SEK: 0.088,
  NOK: 0.087,
  DKK: 0.13,
  PLN: 0.23,
  MXN: 0.054,
  BRL: 0.18,
  ZAR: 0.050,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  MXN: '$',
  BRL: 'R$',
  ZAR: 'R',
};

export const CURRENCY_NAMES: Record<string, string> = {
  EUR: 'Euro',
  USD: 'US Dollar',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  INR: 'Indian Rupee',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone',
  DKK: 'Danish Krone',
  PLN: 'Polish Zloty',
  MXN: 'Mexican Peso',
  BRL: 'Brazilian Real',
  ZAR: 'South African Rand',
};

export function convertToEUR(amount: number, fromCurrency: string): number {
  const rate = CURRENCY_RATES[fromCurrency.toUpperCase()] || 1.0;
  return amount * rate;
}

export function convertFromEUR(amount: number, toCurrency: string): number {
  const rate = CURRENCY_RATES[toCurrency.toUpperCase()] || 1.0;
  return amount / rate;
}

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}

export function formatPrice(amount: number, currency: string = 'EUR'): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

