"use client"

import { useState, useEffect, useCallback } from "react"
import { Connection, VersionedTransaction } from "@solana/web3.js"
import { CHAINS, QUICK_BUY_AMOUNTS } from "@/lib/constants"
import { getJupiterQuote, getJupiterSwapTx, solToLamports } from "@/lib/jupiter"
import { getTrendingPairs, getNewPairs, formatUsd, formatPrice, DexPair } from "@/lib/dexscreener"

type Chain = "sol" | "bsc"
type Tab = "trade" | "trending" | "portfolio" | "referral"
type Mode = "buy" | "sell"

interface Token {
  sym: string; name: string; address: string; decimals: number; price: number
  color: string; safe: boolean; mc: string; vol: string; liq: string; txns: string
  change: string; mint: string; lp: string; top10: string; honey: string
}

const SOL_TOKENS: Token[] = [
  { sym:"SOL", name:"Solana", address:"So11111111111111111111111111111111111111112", decimals:9, price:0, color:"#9945FF", safe:true, mc:"$60B", vol:"$2.1B", liq:"$800M", txns:"12.4K", change:"0%", mint:"N/A", lp:"N/A", top10:"N/A", honey:"N/A" },
  { sym:"WIF", name:"dogwifhat", address:"EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", decimals:6, price:0, color:"#7F77DD", safe:true, mc:"$1.8B", vol:"$18.2M", liq:"$2.1M", txns:"4.2K", change:"0%", mint:"Revoked", lp:"Yes 85%", top10:"28%", honey:"No" },
  { sym:"BONK", name:"Bonk", address:"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", decimals:5, price:0, color:"#FAC775", safe:true, mc:"$890M", vol:"$9.4M", liq:"$1.2M", txns:"2.8K", change:"0%", mint:"Revoked", lp:"Yes 92%", top10:"21%", honey:"No" },
  { sym:"POPCAT", name:"Popcat", address:"7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", decimals:9, price:0, color:"#ED93B1", safe:false, mc:"$380M", vol:"$24.1M", liq:"$800K", txns:"8K", change:"0%", mint:"Active", lp:"No", top10:"61%", honey:"No" },
  { sym:"PEPE", name:"Pepe", address:"HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", decimals:6, price:0, color:"#5DCAA5", safe:true, mc:"$420M", vol:"$5.2M", liq:"$600K", txns:"1.5K", change:"0%", mint:"Revoked", lp:"Yes 78%", top10:"19%", honey:"No" },
]

const BSC_TOKENS: Token[] = [
  { sym:"BNB", name:"BNB", address:"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals:18, price:0, color:"#FAC775", safe:true, mc:"$88B", vol:"$1.8B", liq:"$500M", txns:"9.2K", change:"0%", mint:"N/A", lp:"N/A", top10:"N/A", honey:"N/A" },
  { sym:"FLOKI", name:"Floki", address:"0xfb5B838b6cfEEdC2873aB27866079AC55363D37E", decimals:9, price:0, color:"#7F77DD", safe:true, mc:"$820M", vol:"$31.2M", liq:"$4.2M", txns:"4.9K", change:"0%", mint:"Revoked", lp:"Yes 70%", top10:"32%", honey:"No" },
  { sym:"SHIB", name:"Shiba Inu", address:"0x2859e4544C4bB03966803b044A93563Bd2D0DD4D", decimals:18, price:0, color:"#F0997B", safe:true, mc:"$11.2B", vol:"$112M", liq:"$22M", txns:"15.6K", change:"0%", mint:"Revoked", lp:"Yes 95%", top10:"12%", honey:"No" },
  { sym:"BABYDOGE", name:"Baby Doge", address:"0xc748673057861a797275CD8A068AbB195b6fb207", decimals:9, price:0, color:"#FAC775", safe:false, mc:"$142M", vol:"$8.3M", liq:"$900K", txns:"4K", change:"0%", mint:"Active", lp:"Partial", top10:"58%", honey:"Yes" },
]

const fmtP = (v: number) => {
  if (!v) return "$..."
  if (v < 0.000001) return "$" + v.toExponential(2)
  if (v < 0.01) return "$" + v.toFixed(6)
  if (v < 1) return "$" + v.toFixed(4)
  return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const fmtAmt = (n: number) => {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B"
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M"
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"
  return n.toFixed(4)
}

const UP = "#1D9E75"
const DN = "#D85A30"

async function fetchJupiterPrices(addresses: string[]): Promise<Record<string, {price: number, change24h: number}>> {
  try {
    const ids = addresses.join(",")
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${ids}&showExtraInfo=true`)
    const data = await res.json()
    const result: Record<string, {price: number, change24h: number}> = {}
    for (const [addr, info] of Object.entries(data.data || {})) {
      const d = info as any
      result[addr] = {
        price: parseFloat(d.price) || 0,
        change24h: d.extraInfo?.priceChange24h || 0
      }
    }
    return result
  } catch (e) {
    return {}
  }
}

async function searchJupiterToken(query: string): Promise<Token[]> {
  try {
    const res = await fetch(`https://api.jup.ag/tokens/v1/search?query=${encodeURIComponent(query)}&limit=10`)
    const data = await res.json()
    return (data || []).map((t: any) => ({
      sym: t.symbol,
      name: t.name,
      address: t.address,
      decimals: t.decimals || 6,
      price: 0,
      color: "#7F77DD",
      safe: true,
      mc: "$—", vol: "$—", liq: "$—", txns: "—",
      change: "0%",
      mint: "—", lp: "—", top10: "—", honey: "—"
    }))
  } catch (e) {
    return []
  }
}

function genCandles(n: number, base: number, bull: boolean) {
  const c = []; let p = base || 1
  for (let i = 0; i < n; i++) {
    const b = bull ? 0.52 : 0.48
    const o = p, mv = (Math.random() - b) * 0.07 * p
    const cl = Math.max(o + mv, o * 0.01)
    const h = Math.max(o, cl) * (1 + Math.random() * 0.02)
    const l = Math.min(o, cl) * (1 - Math.random() * 0.02)
    c.push({ o, h, l, c: cl, vol: Math.random() * 80 + 10 }); p = cl
  }
  return c
}

function calcMA(data: any[], period: number) {
  return data.map((_, i) => {
    if (i < period - 1) return null
    return data.slice(i - period + 1, i + 1).reduce((s, c) => s + c.c, 0) / period
  })
}

function calcRSI(data: any[], period = 14) {
  const rsi: (number | null)[] = Array(data.length).fill(null)
  if (data.length <= period) return rsi
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = data[i].c - data[i - 1].c
    if (diff > 0) gains += diff; else losses -= diff
  }
  let avgG = gains / period, avgL = losses / period
  rsi[period] = 100 - (100 / (1 + avgG / (avgL || 0.001)))
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].c - data[i - 1].c
    avgG = (avgG * (period - 1) + (diff > 0 ? diff : 0)) / period
    avgL = (avgL * (period - 1) + (diff < 0 ? -diff : 0)) / period
    rsi[i] = 100 - (100 / (1 + avgG / (avgL || 0.001)))
  }
  return rsi
}
