import { describe, expect, it } from 'vitest'
import { parseMexcSpotUsdMessage } from './mexcSpotStream'

/** Exemple proche de la doc MEXC (trade stream). */
const DEALS_JSON = JSON.stringify({
  channel: 'spot@public.aggre.deals.v3.api.pb@100ms@BTCUSDT',
  publicdeals: {
    dealsList: [
      {
        price: '93220.00',
        quantity: '0.04438243',
        tradetype: 2,
        time: 1736409765051,
      },
    ],
    eventtype: 'spot@public.aggre.deals.v3.api.pb@100ms',
  },
  symbol: 'BTCUSDT',
  sendtime: 1736409765052,
})

const BOOK_JSON = JSON.stringify({
  channel: 'spot@public.aggre.bookTicker.v3.api.pb@100ms@BTCUSDT',
  publicbookticker: {
    bidprice: '93387.28',
    bidquantity: '3.73485',
    askprice: '93387.29',
    askquantity: '7.669875',
  },
  symbol: 'BTCUSDT',
  sendtime: 1736412092433,
})

const BATCH_JSON = JSON.stringify({
  channel: 'spot@public.bookTicker.batch.v3.api.pb@BTCUSDT',
  symbol: 'BTCUSDT',
  sendTime: '1739503249114',
  publicBookTickerBatch: {
    items: [{ bidPrice: '96567.37', bidQuantity: '3.362925', askPrice: '96567.38', askQuantity: '1.545255' }],
  },
})

describe('parseMexcSpotUsdMessage', () => {
  it('extrait le dernier trade', () => {
    const t = parseMexcSpotUsdMessage(DEALS_JSON)
    expect(t).toEqual({ usd: 93220, at: 1736409765051 })
  })

  it('extrait le milieu bid/ask du carnet', () => {
    const t = parseMexcSpotUsdMessage(BOOK_JSON)
    expect(t?.usd).toBeCloseTo((93387.28 + 93387.29) / 2, 10)
    expect(t?.at).toBe(1736412092433)
  })

  it('supporte le book ticker batch (camelCase)', () => {
    const t = parseMexcSpotUsdMessage(BATCH_JSON)
    expect(t?.usd).toBeCloseTo((96567.37 + 96567.38) / 2, 10)
    expect(t?.at).toBe(1739503249114)
  })

  it('retourne null pour JSON invalide', () => {
    expect(parseMexcSpotUsdMessage('not json')).toBeNull()
  })

  it('retourne null pour payload vide', () => {
    expect(parseMexcSpotUsdMessage('{}')).toBeNull()
  })
})
