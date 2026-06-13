import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { CurrencyService, MockExchangeRateProvider, ManualRateProvider } from '../currency.service'

describe('CurrencyService', () => {
  describe('with MockExchangeRateProvider', () => {
    const provider = new MockExchangeRateProvider({ 'GBP:INR': 107.5, 'INR:GBP': 1 / 107.5 })
    const svc = new CurrencyService(provider)
    const date = new Date('2026-06-01')

    it('toBase returns same amount for GBP→GBP', async () => {
      const result = await svc.toBase(100, 'GBP', date)
      expect(result.toNumber()).toBe(100)
    })

    it('toBase converts INR to GBP correctly', async () => {
      const result = await svc.toBase(10750, 'INR', date)
      // 10750 INR / 107.5 = 100 GBP (roughly)
      expect(result.toNumber()).toBeCloseTo(100, 1)
    })

    it('fromBase converts GBP to INR correctly', async () => {
      const result = await svc.fromBase(100, 'INR', date)
      expect(result.toNumber()).toBeCloseTo(10750, 0)
    })
  })

  describe('ManualRateProvider', () => {
    it('throws if rate not set', async () => {
      const provider = new ManualRateProvider()
      await expect(provider.getRate('GBP', 'INR', new Date())).rejects.toThrow('No manual exchange rate')
    })

    it('returns set rate', async () => {
      const provider = new ManualRateProvider()
      const date = new Date('2026-06-01')
      provider.setRate('GBP', 'INR', date, 108.5)
      const rate = await provider.getRate('GBP', 'INR', date)
      expect(rate.toNumber()).toBe(108.5)
    })

    it('returns 1 for same currency', async () => {
      const provider = new ManualRateProvider()
      const rate = await provider.getRate('GBP', 'GBP', new Date())
      expect(rate.toNumber()).toBe(1)
    })
  })

  describe('static helpers', () => {
    it('convertWithRate multiplies correctly', () => {
      const result = CurrencyService.convertWithRate(100, 107.5)
      expect(result.toNumber()).toBe(10750)
    })

    it('round uses ROUND_HALF_UP', () => {
      expect(CurrencyService.round(1.555).toNumber()).toBe(1.56)
      expect(CurrencyService.round(1.554).toNumber()).toBe(1.55)
    })

    it('format returns GBP string', () => {
      const formatted = CurrencyService.format(1234.56, 'GBP')
      expect(formatted).toContain('1,234.56')
    })
  })
})
