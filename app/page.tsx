"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
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

async function fetchJupiterPrices(addresses: string[]) {
  try {
    const ids = addresses.join(",")
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${ids}&showExtraInfo=true`)
    const data = await res.json()
    const result: Record<string, {price: number, change24h: number}> = {}
    for (const [addr, info] of Object.entries(data.data || {})) {
      const d = info as any
      result[addr] = { price: parseFloat(d.price) || 0, change24h: d.extraInfo?.priceChange24h || 0 }
    }
    return result
  } catch (e) { return {} }
}

async function searchJupiterToken(query: string): Promise<Token[]> {
  try {
    const res = await fetch(`https://api.jup.ag/tokens/v1/search?query=${encodeURIComponent(query)}&limit=10`)
    const data = await res.json()
    return (data || []).map((t: any) => ({
      sym: t.symbol, name: t.name, address: t.address, decimals: t.decimals || 6,
      price: 0, color: "#7F77DD", safe: true,
      mc: "$—", vol: "$—", liq: "$—", txns: "—", change: "0%",
      mint: "—", lp: "—", top10: "—", honey: "—"
    }))
  } catch (e) { return [] }
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
export default function PaperX() {
  const [tab, setTab] = useState<Tab>("trade")
  const [chain, setChain] = useState<Chain>("sol")
  const [mode, setMode] = useState<Mode>("buy")
  const [tokens, setTokens] = useState<Token[]>(SOL_TOKENS)
  const [activeToken, setActiveToken] = useState<Token>(SOL_TOKENS[1])
  const [inAmount, setInAmount] = useState("1")
  const [outAmount, setOutAmount] = useState("")
  const [outUsd, setOutUsd] = useState("")
  const [slippage, setSlippage] = useState(0.5)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isSwapping, setIsSwapping] = useState(false)
  const [txStatus, setTxStatus] = useState<string | null>(null)
  const [trendingPairs, setTrendingPairs] = useState<DexPair[]>([])
  const [newPairs, setNewPairs] = useState<DexPair[]>([])
  const [candleData, setCandleData] = useState<any[]>([])
  const [chartType, setChartType] = useState<"candle"|"line">("candle")
  const [quickActive, setQuickActive] = useState<string|null>(null)
  const [refCopied, setRefCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Token[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const native = chain === "sol" ? "SOL" : "BNB"
  const nativePrice = tokens[0]?.price || (chain === "sol" ? 145.2 : 610)
  const SITE_URL = "https://paperx.io"
  const refCode = walletAddress ? "PAPERX-" + walletAddress.slice(-6).toUpperCase() : "PAPERX-CONNECT"
  const refLink = walletAddress ? `${SITE_URL}/r/${walletAddress.slice(-6).toUpperCase()}` : ""

  useEffect(() => {
    const tkns = chain === "sol" ? SOL_TOKENS : BSC_TOKENS
    setTokens(tkns)
    setActiveToken(tkns[1])
    loadPrices(tkns)
  }, [chain])

  const loadPrices = async (tkns: Token[]) => {
    const addrs = tkns.filter(t => !t.address.startsWith("0x")).map(t => t.address)
    if (!addrs.length) return
    const prices = await fetchJupiterPrices(addrs)
    setTokens(prev => prev.map(t => {
      const p = prices[t.address]
      if (!p) return t
      return { ...t, price: p.price, change: (p.change24h >= 0 ? "+" : "") + p.change24h.toFixed(1) + "%" }
    }))
    setActiveToken(prev => {
      const p = prices[prev.address]
      if (!p) return prev
      return { ...prev, price: p.price, change: (p.change24h >= 0 ? "+" : "") + p.change24h.toFixed(1) + "%" }
    })
  }

  useEffect(() => {
    const interval = setInterval(() => loadPrices(chain === "sol" ? SOL_TOKENS : BSC_TOKENS), 30000)
    return () => clearInterval(interval)
  }, [chain])

  useEffect(() => {
    setCandleData(genCandles(60, activeToken.price || 1, !activeToken.change.startsWith("-")))
  }, [activeToken.address])

  useEffect(() => {
    const amt = parseFloat(inAmount) || 0
    const inUsd = amt * (mode === "buy" ? nativePrice : activeToken.price)
    const out = inUsd * 0.99 / (mode === "buy" ? activeToken.price : nativePrice)
    setOutAmount(fmtAmt(out || 0))
    setOutUsd("≈ $" + (inUsd * 0.99).toFixed(2))
  }, [inAmount, activeToken, mode, nativePrice])

  useEffect(() => {
    if (tab === "trending") loadTrending()
  }, [tab, chain])

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchJupiterToken(searchQuery)
      const addrs = results.map(t => t.address).filter(a => !a.startsWith("0x"))
      if (addrs.length) {
        const prices = await fetchJupiterPrices(addrs)
        setSearchResults(results.map(t => {
          const p = prices[t.address]
          return p ? { ...t, price: p.price, change: (p.change24h >= 0 ? "+" : "") + p.change24h.toFixed(1) + "%" } : t
        }))
      } else setSearchResults(results)
      setIsSearching(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadTrending = async () => {
    setTrendingPairs([]); setNewPairs([])
    const [t, n] = await Promise.all([
      getTrendingPairs(chain === "sol" ? "solana" : "bsc"),
      getNewPairs(chain === "sol" ? "solana" : "bsc"),
    ])
    setTrendingPairs(t); setNewPairs(n)
  }

  const connectWallet = async () => {
    try {
      if (chain === "sol") {
        const phantom = (window as any).solana
        if (!phantom?.isPhantom) return alert("Install Phantom wallet")
        const res = await phantom.connect()
        setWalletAddress(res.publicKey.toString())
      } else {
        const eth = (window as any).ethereum
        if (!eth) return alert("Install MetaMask")
        const accounts = await eth.request({ method: "eth_requestAccounts" })
        setWalletAddress(accounts[0])
      }
    } catch (e) { console.error(e) }
  }

  const doSwap = async () => {
    if (!walletAddress) return connectWallet()
    setIsSwapping(true); setTxStatus("Getting quote...")
    try {
      if (chain === "sol") {
        const amt = solToLamports(parseFloat(inAmount))
        const inMint = mode === "buy" ? tokens[0].address : activeToken.address
        const outMint = mode === "buy" ? activeToken.address : tokens[0].address
        const quote = await getJupiterQuote(inMint, outMint, amt, Math.floor(slippage * 100))
        if (!quote) throw new Error("Quote failed")
        setTxStatus("Building tx...")
        const swapData = await getJupiterSwapTx(quote, walletAddress)
        if (!swapData) throw new Error("Swap tx failed")
        setTxStatus("Sign in wallet...")
        const { Connection, VersionedTransaction } = await import("@solana/web3.js")
        const phantom = (window as any).solana
        const conn = new Connection(CHAINS.SOL.rpc)
        const tx = VersionedTransaction.deserialize(Buffer.from(swapData.swapTransaction, "base64"))
        const signed = await phantom.signTransaction(tx)
        const sig = await conn.sendRawTransaction(signed.serialize())
        await conn.confirmTransaction(sig)
        setTxStatus("Confirmed! " + sig.slice(0, 8) + "...")
      } else {
        const { getOneInchSwapTx, bnbToWei } = await import("@/lib/oneinch")
        const amt = bnbToWei(parseFloat(inAmount))
        const swapData = await getOneInchSwapTx(activeToken.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", amt, walletAddress, slippage)
        if (!swapData) throw new Error("Swap failed")
        const eth = (window as any).ethereum
        const tx = await eth.request({ method: "eth_sendTransaction", params: [{ ...swapData.tx, from: walletAddress }] })
        setTxStatus("TX: " + tx.slice(0, 10) + "...")
      }
    } catch (e: any) {
      setTxStatus("Error: " + e.message)
    } finally {
      setIsSwapping(false)
      setTimeout(() => setTxStatus(null), 5000)
    }
  }

  const selectToken = (t: Token) => {
    setActiveToken(t); setShowSearch(false); setSearchQuery(""); setSearchResults([]); setTab("trade")
  }

  const chartSvg = () => {
    const W = 680, H = 200, pad = 6, n = candleData.length
    if (!n) return ""
    const cw = Math.max(Math.floor((W - pad * 2) / n), 2)
    const prices = candleData.flatMap((c: any) => [c.h, c.l])
    const minP = Math.min(...prices), maxP = Math.max(...prices), range = maxP - minP || 1
    const sy = (v: number) => pad + (H - pad * 2) * (1 - (v - minP) / range)
    const sx = (i: number) => pad + i * cw + cw / 2
    let out = ""
    ;[0.25, 0.5, 0.75].forEach(p => {
      out += `<line x1="${pad}" y1="${(pad + (H - pad * 2) * (1 - p)).toFixed(0)}" x2="${W - pad}" y2="${(pad + (H - pad * 2) * (1 - p)).toFixed(0)}" stroke="#1a1c28" stroke-width="0.5"/>`
    })
    if (chartType === "candle") {
      candleData.forEach((c: any, i: number) => {
        const up = c.c >= c.o, col = up ? UP : DN, x = sx(i)
        const top = Math.min(sy(c.o), sy(c.c)), bh = Math.max(Math.max(sy(c.o), sy(c.c)) - top, 1)
        out += `<line x1="${x}" y1="${sy(c.h).toFixed(1)}" x2="${x}" y2="${sy(c.l).toFixed(1)}" stroke="${col}" stroke-width="0.8"/>`
        out += `<rect x="${(x - cw / 2 + 0.5).toFixed(1)}" y="${top.toFixed(1)}" width="${Math.max(cw - 1, 1)}" height="${bh.toFixed(1)}" fill="${col}"/>`
      })
    } else {
      const pathD = candleData.map((c: any, i: number) => (i === 0 ? "M" : "L") + sx(i).toFixed(1) + "," + sy(c.c).toFixed(1)).join(" ")
      const col = candleData[n - 1].c > candleData[0].c ? UP : DN
      out += `<path d="${pathD} L${sx(n - 1)},${H} L${sx(0)},${H} Z" fill="${col}" opacity="0.07"/>`
      out += `<path d="${pathD}" fill="none" stroke="${col}" stroke-width="1.5"/>`
    }
    const drawMA = (arr: (number | null)[], col: string) => {
      const pts = arr.map((v, i) => v !== null ? [i, v] : null).filter(Boolean) as [number, number][]
      if (pts.length < 2) return
      out += `<path d="${pts.map((p, j) => (j === 0 ? "M" : "L") + sx(p[0]).toFixed(1) + "," + sy(p[1]).toFixed(1)).join(" ")}" fill="none" stroke="${col}" stroke-width="1" opacity="0.8"/>`
    }
    drawMA(calcMA(candleData, 7), "#EF9F27")
    drawMA(calcMA(candleData, 25), "#378ADD")
    return out
  }

  const rsiSvg = () => {
    const W = 680, H = 60, pad = 4, n = candleData.length
    if (!n) return ""
    const cw = Math.max(Math.floor((W - pad * 2) / n), 2)
    const sx = (i: number) => pad + i * cw + cw / 2
    const rsy = (v: number) => pad + (H - pad * 2) * (1 - v / 100)
    const rsi = calcRSI(candleData)
    const lastRsi = rsi.filter(v => v !== null).pop() || 50
    const rCol = lastRsi > 70 ? DN : lastRsi < 30 ? UP : "#7F77DD"
    let out = `<rect x="0" y="0" width="${W}" height="${H}" fill="#0a0c10"/>`
    out += `<line x1="${pad}" y1="${rsy(70).toFixed(1)}" x2="${W - pad}" y2="${rsy(70).toFixed(1)}" stroke="#D85A3040" stroke-width="0.8" stroke-dasharray="3,3"/>`
    out += `<line x1="${pad}" y1="${rsy(30).toFixed(1)}" x2="${W - pad}" y2="${rsy(30).toFixed(1)}" stroke="#1D9E7540" stroke-width="0.8" stroke-dasharray="3,3"/>`
    out += `<text x="${pad + 2}" y="10" font-size="8" fill="#5a5f78">RSI(14): ${lastRsi.toFixed(0)}</text>`
    const pts = rsi.map((v, i) => v !== null ? [i, v] : null).filter(Boolean) as [number, number][]
    if (pts.length > 1) out += `<path d="${pts.map((p, j) => (j === 0 ? "M" : "L") + sx(p[0]).toFixed(1) + "," + rsy(p[1]).toFixed(1)).join(" ")}" fill="none" stroke="${rCol}" stroke-width="1.2"/>`
    return out
  }

  const verdict = (t: Token) => !t.safe ? "DANGER" : t.top10 !== "N/A" && parseInt(t.top10) > 40 ? "RISKY" : "SAFE"
  const vColor = (v: string) => v === "SAFE" ? UP : v === "RISKY" ? "#EF9F27" : DN

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: "#0d0e12", minHeight: "100vh", color: "#e2e4ea" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "#13151c", borderBottom: "1px solid #1e2130" }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: "#fff", letterSpacing: -0.5 }}>paper<span style={{ color: "#7F77DD" }}>X</span></div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["sol", "bsc"] as Chain[]).map(c => (
            <button key={c} onClick={() => setChain(c)}
              style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, border: "1px solid #2a2d3a", background: chain === c ? "#7F77DD" : "transparent", color: chain === c ? "#fff" : "#8a8fa8", cursor: "pointer" }}>
              {c === "sol" ? "Solana" : "BSC"}
            </button>
          ))}
        </div>
        <button onClick={connectWallet}
          style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #2a2d3a", background: "transparent", color: walletAddress ? UP : "#8a8fa8", fontSize: 12, cursor: "pointer" }}>
          {walletAddress ? walletAddress.slice(0, 4) + "..." + walletAddress.slice(-4) : "Connect"}
        </button>
      </div>

      <div style={{ padding: "8px 14px", background: "#13151c", borderBottom: "1px solid #1e2130", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0d0e12", border: "1px solid #2a2d3a", borderRadius: 8, padding: "7px 12px" }}>
          <span style={{ color: "#5a5f78", fontSize: 14 }}>🔍</span>
          <input type="text" placeholder="Search token name or paste address..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSearch(true) }}
            onFocus={() => setShowSearch(true)}
            style={{ background: "transparent", border: "none", color: "#e2e4ea", fontSize: 13, outline: "none", flex: 1 }} />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setSearchResults([]); setShowSearch(false) }}
              style={{ background: "none", border: "none", color: "#5a5f78", cursor: "pointer", fontSize: 16 }}>✕</button>
          )}
        </div>
        {showSearch && searchQuery.length >= 2 && (
          <div style={{ position: "absolute", left: 14, right: 14, top: "100%", background: "#13151c", border: "1px solid #2a2d3a", borderRadius: 8, zIndex: 50, maxHeight: 280, overflowY: "auto", marginTop: 4 }}>
            {isSearching && <div style={{ padding: "12px 14px", fontSize: 12, color: "#5a5f78" }}>Searching...</div>}
            {!isSearching && searchResults.length === 0 && <div style={{ padding: "12px 14px", fontSize: 12, color: "#5a5f78" }}>No results found</div>}
            {searchResults.map((t, i) => (
              <div key={i} onClick={() => selectToken(t)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #1e2130", cursor: "pointer" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#7F77DD", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{t.sym.slice(0, 3)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e4ea" }}>{t.sym}</div>
                  <div style={{ fontSize: 10, color: "#5a5f78" }}>{t.name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#e2e4ea" }}>{fmtP(t.price)}</div>
                  <div style={{ fontSize: 10, color: t.change.startsWith("-") ? DN : UP }}>{t.change}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, padding: "8px 14px", overflowX: "auto", background: "#13151c", borderBottom: "1px solid #1e2130" }}>
        {tokens.map(t => (
          <button key={t.sym} onClick={() => selectToken(t)}
            style={{ padding: "4px 12px", borderRadius: 20, border: "1px solid #2a2d3a", background: activeToken.sym === t.sym ? "#7F77DD22" : "transparent", color: activeToken.sym === t.sym ? "#7F77DD" : "#8a8fa8", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {t.sym}
          </button>
        ))}
      </div>

      <div style={{ padding: "10px 14px", background: "#13151c", borderBottom: "1px solid #1e2130" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: activeToken.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{activeToken.sym.slice(0, 3)}</div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{activeToken.name}</span>
          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: verdict(activeToken) === "SAFE" ? "#0a1f12" : "#1f0a0a", color: vColor(verdict(activeToken)), fontWeight: 500 }}>{verdict(activeToken)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 500, color: "#fff" }}>{fmtP(activeToken.price)}</span>
          <span style={{ fontSize: 13, color: activeToken.change.startsWith("-") ? DN : UP }}>{activeToken.change}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: "1px solid #1e2130" }}>
          {[["MC", activeToken.mc], ["Vol", activeToken.vol], ["Liq", activeToken.liq], ["Txns", activeToken.txns]].map(([l, v]) => (
            <div key={l} style={{ textAlign: "center", padding: "5px 0", borderRight: "1px solid #1e2130" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#e2e4ea" }}>{v}</div>
              <div style={{ fontSize: 9, color: "#5a5f78", marginTop: 1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#0d0e12" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", borderBottom: "1px solid #1e2130" }}>
          <div style={{ display: "flex", gap: 2 }}>
            {["1m", "5m", "15m", "1h", "1d"].map(t => (
              <button key={t} onClick={() => setCandleData(genCandles(t === "1d" ? 120 : t === "1h" ? 80 : 60, activeToken.price || 1, !activeToken.change.startsWith("-")))}
                style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, border: "none", background: "transparent", color: "#5a5f78", cursor: "pointer" }}>{t}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {(["candle", "line"] as const).map(ct => (
              <button key={ct} onClick={() => setChartType(ct)}
                style={{ padding: "3px 7px", borderRadius: 4, fontSize: 10, border: "1px solid #2a2d3a", background: chartType === ct ? "#1e2130" : "transparent", color: chartType === ct ? "#7F77DD" : "#5a5f78", cursor: "pointer" }}>{ct}</button>
            ))}
          </div>
        </div>
        <svg style={{ width: "100%", height: 200, display: "block" }} viewBox="0 0 680 200" preserveAspectRatio="none" dangerouslySetInnerHTML={{ __html: chartSvg() }} />
        <div style={{ display: "flex", gap: 8, padding: "2px 10px", fontSize: 10 }}>
          <span style={{ color: "#EF9F27" }}>■ MA7</span>
          <span style={{ color: "#378ADD" }}>■ MA25</span>
          <span style={{ color: "#7F77DD" }}>RSI(14)</span>
        </div>
        <svg style={{ width: "100%", height: 60, display: "block" }} viewBox="0 0 680 60" preserveAspectRatio="none" dangerouslySetInnerHTML={{ __html: rsiSvg() }} />
      </div>

      {tab === "trade" && (
        <div style={{ padding: "12px 14px", background: "#0d0e12" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {(["buy", "sell"] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ flex: 1, padding: 9, borderRadius: 8, border: "none", background: mode === m ? (m === "buy" ? "#7F77DD" : DN) : "transparent", color: mode === m ? "#fff" : "#5a5f78", fontSize: 13, cursor: "pointer", fontWeight: 500, boxShadow: mode !== m ? "inset 0 0 0 1px #2a2d3a" : "none" }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {QUICK_BUY_AMOUNTS[chain].map(amt => (
              <button key={amt} onClick={() => { setQuickActive(amt); setInAmount(amt) }}
                style={{ flex: 1, padding: "6px 4px", borderRadius: 6, border: "1px solid #2a2d3a", background: quickActive === amt ? "#7F77DD22" : "transparent", color: quickActive === amt ? "#7F77DD" : "#8a8fa8", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                {amt} {native}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[0.5, 1, 5, 10].map(sl => (
              <button key={sl} onClick={() => setSlippage(sl)}
                style={{ flex: 1, padding: "4px 0", borderRadius: 5, border: "1px solid #2a2d3a", background: slippage === sl ? "#1e2130" : "transparent", color: slippage === sl ? "#7F77DD" : "#5a5f78", fontSize: 10, cursor: "pointer" }}>
                {sl}%
              </button>
            ))}
          </div>
          <div style={{ background: "#13151c", border: "1px solid #1e2130", borderRadius: 10, padding: "10px 12px", marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: "#5a5f78", marginBottom: 4 }}>You {mode === "buy" ? "pay" : "sell"}</div>
            <input type="number" value={inAmount} onChange={e => { setInAmount(e.target.value); setQuickActive(null) }}
              style={{ background: "transparent", border: "none", color: "#fff", fontSize: 20, fontWeight: 500, outline: "none", width: "100%" }} />
            <div style={{ fontSize: 10, color: "#5a5f78", marginTop: 4 }}>≈ ${((parseFloat(inAmount) || 0) * (mode === "buy" ? nativePrice : activeToken.price)).toFixed(2)}</div>
          </div>
          <div style={{ background: "#13151c", border: "1px solid #1e2130", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#5a5f78", marginBottom: 4 }}>You receive</div>
            <input readOnly value={outAmount} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 20, fontWeight: 500, outline: "none", width: "100%" }} />
            <div style={{ fontSize: 10, color: "#5a5f78", marginTop: 4 }}>{outUsd}</div>
          </div>
          <div style={{ background: verdict(activeToken) === "SAFE" ? "#0a1f12" : verdict(activeToken) === "RISKY" ? "#1f1508" : "#1f0a0a", border: `1px solid ${vColor(verdict(activeToken))}40`, borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: vColor(verdict(activeToken)) }}>{verdict(activeToken)} · {activeToken.sym}</span>
              <span style={{ fontSize: 9, color: "#5a5f78" }}>rugcheck.xyz</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
              {[["Mint", activeToken.mint, activeToken.mint === "Revoked"], ["LP", activeToken.lp, activeToken.lp.startsWith("Yes")], ["Top10", activeToken.top10, activeToken.top10 === "N/A" || parseInt(activeToken.top10) < 30], ["Honeypot", activeToken.honey, activeToken.honey === "No"]].map(([l, v, good]) => (
                <div key={l as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                  <span style={{ color: "#5a5f78" }}>{l}</span>
                  <span style={{ color: v === "N/A" ? "#5a5f78" : good ? UP : DN }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#5a5f78", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
            <span>Route: <span style={{ color: "#7F77DD" }}>{chain === "sol" ? "Jupiter" : "1inch"}</span></span>
            <span style={{ color: UP }}>Fee: 1% → paperX</span>
          </div>
          <button onClick={doSwap} disabled={isSwapping}
            style={{ width: "100%", padding: 14, background: isSwapping ? "#B4B2A9" : mode === "buy" ? "#7F77DD" : DN, border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 500, cursor: isSwapping ? "not-allowed" : "pointer" }}>
            {isSwapping ? "Swapping..." : walletAddress ? `${mode === "buy" ? "Buy" : "Sell"} ${activeToken.sym}` : "Connect wallet"}
          </button>
          {txStatus && (
            <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: txStatus.includes("Error") ? "#1f0a0a" : txStatus.includes("Confirmed") ? "#0a1f12" : "#1f1508", fontSize: 12, color: txStatus.includes("Error") ? DN : txStatus.includes("Confirmed") ? UP : "#EF9F27" }}>
              {txStatus}
            </div>
          )}
        </div>
      )}

      {tab === "trending" && (
        <div>
          <div style={{ padding: "8px 14px", fontSize: 12, fontWeight: 500, color: "#5a5f78", borderBottom: "1px solid #1e2130" }}>🔥 Trending</div>
          {trendingPairs.length === 0 && <div style={{ padding: "20px 14px", color: "#5a5f78", fontSize: 13 }}>Loading...</div>}
          {trendingPairs.map((p, i) => {
            const chg = p.priceChange?.h24 || 0
            return (
              <div key={i} onClick={() => setTab("trade")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #131520", cursor: "pointer" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#7F77DD", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{p.baseToken.symbol.slice(0, 3)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e4ea" }}>{p.baseToken.symbol}</div>
                  <div style={{ fontSize: 10, color: "#5a5f78", marginTop: 2 }}>Vol: {formatUsd(p.volume?.h24)} · MC: {formatUsd(p.marketCap)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: chg >= 0 ? UP : DN }}>{chg >= 0 ? "+" : ""}{chg.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: "#5a5f78" }}>{formatPrice(p.priceUsd)}</div>
                </div>
              </div>
            )
          })}
          <div style={{ padding: "8px 14px", fontSize: 12, fontWeight: 500, color: "#5a5f78", borderBottom: "1px solid #1e2130" }}>🆕 New launches</div>
          {newPairs.map((p, i) => {
            const chg = p.priceChange?.h24 || 0
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #131520", cursor: "pointer" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#378ADD", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{p.baseToken.symbol.slice(0, 3)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e4ea" }}>{p.baseToken.symbol}</div>
                  <div style={{ fontSize: 10, color: "#5a5f78", marginTop: 2 }}>Vol: {formatUsd(p.volume?.h24)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: chg >= 0 ? UP : DN }}>{chg >= 0 ? "+" : ""}{chg.toFixed(1)}%</div>
              </div>
            )
          })}
        </div>
      )}

      {tab === "portfolio" && (
        <div style={{ padding: "14px" }}>
          <div style={{ textAlign: "center", background: "#13151c", border: "1px solid #1e2130", borderRadius: 12, padding: "16px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#5a5f78", marginBottom: 4 }}>Total value</div>
            <div style={{ fontSize: 28, fontWeight: 500, color: "#fff" }}>$2,847.32</div>
            <div style={{ fontSize: 13, marginTop: 4 }}><span style={{ color: UP }}>+$312.40</span> <span style={{ color: "#5a5f78" }}>(+12.3%) today</span></div>
          </div>
          <button onClick={connectWallet} style={{ width: "100%", padding: 12, background: "transparent", border: "1px solid #2a2d3a", borderRadius: 8, color: "#e2e4ea", fontSize: 13, cursor: "pointer" }}>
            {walletAddress ? "Loading real portfolio..." : "Connect wallet to load portfolio"}
          </button>
        </div>
      )}

      {tab === "referral" && (
        <div>
          <div style={{ padding: "20px 14px", background: "#13151c", borderBottom: "1px solid #1e2130", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#5a5f78", marginBottom: 6 }}>Total earned from referrals</div>
            <div style={{ fontSize: 28, fontWeight: 500, color: "#7F77DD" }}>$48.20 USDT</div>
            <div style={{ fontSize: 11, color: "#5a5f78", marginTop: 4 }}>0.5% of every swap your referrals make</div>
          </div>
          <div style={{ margin: 14, background: "#13151c", border: "1px solid #2a2d3a", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#5a5f78", marginBottom: 4 }}>Your referral code</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#fff", letterSpacing: 2, textAlign: "center", padding: 12, background: "#0d0e12", borderRadius: 8, marginBottom: 6 }}>{refCode}</div>
            <div style={{ fontSize: 11, color: "#5a5f78", marginBottom: 8, textAlign: "center", wordBreak: "break-all" }}>
              {walletAddress ? refLink : "Connect wallet to get your referral link"}
            </div>
            <button onClick={() => { if (!walletAddress) return connectWallet(); navigator.clipboard?.writeText(refLink); setRefCopied(true); setTimeout(() => setRefCopied(false), 2000) }}
              style={{ width: "100%", padding: 10, background: "#7F77DD", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              {!walletAddress ? "Connect wallet first" : refCopied ? "Copied!" : "Copy referral link"}
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
              <button onClick={() => { if (!walletAddress) return; window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Trade meme coins on paperX!")}`, "_blank") }}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #2a2d3a", background: "transparent", color: "#378ADD", fontSize: 12, cursor: "pointer" }}>Telegram</button>
              <button onClick={() => { if (!walletAddress) return; window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Trade meme coins on paperX! " + refLink)}`, "_blank") }}
                style={{ padding: 8, borderRadius: 8, border: "1px solid #2a2d3a", background: "transparent", color: "#e2e4ea", fontSize: 12, cursor: "pointer" }}>Twitter/X</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "0 14px 14px" }}>
            {[["12", "Total referrals"], ["8", "Active traders"], ["$4,820", "Their volume"], ["0.5%", "Your cut"]].map(([v, l]) => (
              <div key={l} style={{ background: "#13151c", border: "1px solid #1e2130", borderRadius: 10, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 500, color: "#e2e4ea" }}>{v}</div>
                <div style={{ fontSize: 10, color: "#5a5f78", marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ margin: "0 14px 14px", background: "#13151c", border: "1px solid #1e2130", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#e2e4ea", marginBottom: 10 }}>How it works</div>
            {[["1", "Share your referral link với friends"], ["2", "Friend swap trên paperX → bạn earn 0.5% mỗi swap"], ["3", "Fee tự động về ví SOL/BSC của bạn, không cần claim"]].map(([n, text]) => (
              <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#7F77DD22", border: "1px solid #7F77DD", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#7F77DD", flexShrink: 0 }}>{n}</div>
                <div style={{ fontSize: 12, color: "#8a8fa8", paddingTop: 2 }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ position: "sticky", bottom: 0, display: "flex", background: "#13151c", borderTop: "1px solid #1e2130" }}>
        {(["trade", "trending", "portfolio", "referral"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "8px 4px 6px", border: "none", background: "transparent", color: tab === t ? "#7F77DD" : "#5a5f78", fontSize: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 16 }}>{t === "trade" ? "◈" : t === "trending" ? "◎" : t === "portfolio" ? "◫" : "◉"}</span>
            <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
