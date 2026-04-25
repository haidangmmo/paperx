export const PLATFORM_FEE_WALLET_SOL = "8NYzUjv8icuB3DAyYWbwzid6o8kjduDFcjbCs7ZFR2FH"
export const PLATFORM_FEE_WALLET_BSC = "0x4b96D8007a012c965a0081e8Df29c31c7aC1EC38"
export const PLATFORM_FEE_BPS = 100

export const CHAINS = {
  SOL: {
    id: "sol",
    name: "Solana",
    nativeToken: "SOL",
    nativeMint: "So11111111111111111111111111111111111111112",
    rpc: process.env.NEXT_PUBLIC_HELIUS_RPC || "https://api.mainnet-beta.solana.com",
  },
  BSC: {
    id: "bsc",
    chainId: 56,
    name: "BSC",
    nativeToken: "BNB",
    rpc: "https://bsc-dataseed.binance.org",
  },
}

export const QUICK_BUY_AMOUNTS = {
  sol: ["0.1", "0.5", "1", "5"],
  bsc: ["0.01", "0.05", "0.1", "0.5"],
}

export const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6"
export const ONEINCH_API = "https://api.1inch.dev/swap/v6.0/56"
export const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex"
export const RUGCHECK_API = "https://api.rugcheck.xyz/v1"
export const HONEYPOT_API = "https://api.honeypot.is/v2"
