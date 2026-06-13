import Decimal from 'decimal.js'

// ─────────────────────────────────────────────────────────────
// Interface — all providers must implement this
// ─────────────────────────────────────────────────────────────

export interface ExchangeRateProvider {
  getRate(from: string, to: string, date: Date): Promise<Decimal>
  isAvailable(): boolean
}

// ─────────────────────────────────────────────────────────────
// ManualRateProvider — user supplies rate at call time
// This is the DEFAULT production provider.
// ─────────────────────────────────────────────────────────────

export class ManualRateProvider implements ExchangeRateProvider {
  private rateCache = new Map<string, Decimal>() // key: "GBP:INR:2026-01-15"

  setRate(from: string, to: string, date: Date, rate: number | Decimal) {
    const key = this.cacheKey(from, to, date)
    this.rateCache.set(key, new Decimal(rate))
  }

  async getRate(from: string, to: string, date: Date): Promise<Decimal> {
    if (from === to) return new Decimal(1)

    const key = this.cacheKey(from, to, date)
    const cached = this.rateCache.get(key)
    if (cached) return cached

    throw new Error(
      `No manual exchange rate set for ${from}→${to} on ${date.toISOString().split('T')[0]}. ` +
      'Call setRate() before converting, or use CurrencyService.convertWithRate().'
    )
  }

  isAvailable(): boolean {
    return true
  }

  private cacheKey(from: string, to: string, date: Date): string {
    return `${from}:${to}:${date.toISOString().split('T')[0]}`
  }
}

// ─────────────────────────────────────────────────────────────
// MockExchangeRateProvider — deterministic rates for tests
// ─────────────────────────────────────────────────────────────

export class MockExchangeRateProvider implements ExchangeRateProvider {
  private readonly rates: Record<string, number>

  constructor(rates: Record<string, number> = { 'GBP:INR': 107.5, 'INR:GBP': 1 / 107.5 }) {
    this.rates = rates
  }

  async getRate(from: string, to: string): Promise<Decimal> {
    if (from === to) return new Decimal(1)
    const key = `${from}:${to}`
    const rate = this.rates[key]
    if (rate === undefined) throw new Error(`Mock rate not configured for ${from}→${to}`)
    return new Decimal(rate)
  }

  isAvailable(): boolean {
    return true
  }
}

// ─────────────────────────────────────────────────────────────
// OpenERApiProvider — free live rates (future)
// Disabled by default; wired for future activation.
// ─────────────────────────────────────────────────────────────

export class OpenERApiProvider implements ExchangeRateProvider {
  private readonly baseUrl = 'https://open.er-api.com/v6/latest'

  async getRate(from: string, _to: string, _date: Date): Promise<Decimal> {
    const res = await fetch(`${this.baseUrl}/${from}`)
    if (!res.ok) throw new Error(`OpenERApi returned ${res.status}`)
    const data = await res.json() as { rates: Record<string, number> }
    const rate = data.rates[_to]
    if (!rate) throw new Error(`Rate not found for ${from}→${_to}`)
    return new Decimal(rate)
  }

  isAvailable(): boolean {
    return typeof fetch !== 'undefined'
  }
}

// ─────────────────────────────────────────────────────────────
// CurrencyService — the main service class
// ─────────────────────────────────────────────────────────────

export class CurrencyService {
  static readonly BASE_CURRENCY = 'GBP'

  constructor(private readonly provider: ExchangeRateProvider) {}

  /** Convert any amount to GBP (base currency) */
  async toBase(amount: number | Decimal, fromCurrency: string, date: Date): Promise<Decimal> {
    if (fromCurrency === CurrencyService.BASE_CURRENCY) return new Decimal(amount)
    const rate = await this.provider.getRate(fromCurrency, CurrencyService.BASE_CURRENCY, date)
    return new Decimal(amount).mul(rate).toDecimalPlaces(2)
  }

  /** Convert GBP amount to another currency */
  async fromBase(amountGbp: number | Decimal, toCurrency: string, date: Date): Promise<Decimal> {
    if (toCurrency === CurrencyService.BASE_CURRENCY) return new Decimal(amountGbp)
    const rate = await this.provider.getRate(CurrencyService.BASE_CURRENCY, toCurrency, date)
    return new Decimal(amountGbp).mul(rate).toDecimalPlaces(2)
  }

  /** Convert with an explicitly provided rate (bypasses provider — used when user sets rate) */
  static convertWithRate(amount: number | Decimal, rate: number | Decimal): Decimal {
    return new Decimal(amount).mul(new Decimal(rate)).toDecimalPlaces(2)
  }

  /** Format for display */
  static format(amount: number | Decimal, currency: string): string {
    const num = new Decimal(amount).toNumber()
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  /** Round to 2dp (for monetary values) */
  static round(amount: number | Decimal): Decimal {
    return new Decimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton — ManualRateProvider is default
// Tests can swap the provider via currencyService.provider
// ─────────────────────────────────────────────────────────────

export const manualRateProvider = new ManualRateProvider()
export const currencyService = new CurrencyService(manualRateProvider)
