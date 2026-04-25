const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex"

export interface DexPair {
  chainId: string
  pairAddress: string
  baseToken: { address: string; name: string; symbol: string }
  quoteToken: { address: string; name: string; symbol: string }
  priceUsd: string
  volume: { h24: number }
  priceChange: { h24: number }
  liquidity: { usd: number }
  marketCap: number
  pairCreatedAt: number
  boosts?: { active: number }
}

export async function getTrendingPairs(chain: "solana" | "bsc"): Promise<DexPair[]> {
  try {
    const res = await fetch(`${DEXSCREENER_API}/search?q=SOL`, { next: { revalidate: 60 } })
    const data = await res.json()
    return (data.pairs || [])
      .filter((p: DexPair) => 
        p.chainId === chain && 
        p.volume?.h24 > 500_000 &&
        p.baseToken.symbol !== "SOL" &&
        p.baseToken.symbol !== "WSOL" &&
        p.baseToken.symbol !== "USDC" &&
        p.baseToken.symbol !== "USDT" &&
        p.liquidity?.usd > 50_000
      )
      .sort((a: DexPair, b: DexPair) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
      .slice(0, 10)
  } catch (e) {
    return []
  }
}

export async function getNewPairs(chain: "solana" | "bsc"): Promise<DexPair[]> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/token-profiles/latest/v1`,
      { next: { revalidate: 30 } }
    )
    const data = await res.json()
    return (data || [])
      .filter((p: any) => p.chainId === chain)
      .slice(0, 10)
      .map((p: any) => ({
        chainId: p.chainId,
        pairAddress: p.tokenAddress,
        baseToken: { address: p.tokenAddress, name: p.description || p.tokenAddress.slice(0,8), symbol: p.tokenAddress.slice(0,6).toUpperCase() },
        quoteToken: { address: "", name: "", symbol: "" },
        priceUsd: "0",
        volume: { h24: 0 },
        priceChange: { h24: 0 },
        liquidity: { usd: 0 },
        marketCap: 0,
        pairCreatedAt: Date.now(),
      }))
  } catch (e) {
    return []
  }
}

export const formatUsd = (n: number) => {
  if (!n) return "$0"
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(1) + "B"
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K"
  return "$" + n.toFixed(2)
}

export const formatPrice = (p: string) => {
  const n = parseFloat(p)
  if (!n) return "$0"
  if (n < 0.000001) return "$" + n.toExponential(2)
  if (n < 0.01) return "$" + n.toFixed(6)
  if (n < 1) return "$" + n.toFixed(4)
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
