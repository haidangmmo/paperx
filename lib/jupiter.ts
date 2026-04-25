import { JUPITER_QUOTE_API, PLATFORM_FEE_WALLET_SOL, PLATFORM_FEE_BPS } from "./constants"

export interface JupiterQuote {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  priceImpactPct: string
  routePlan: any[]
}

export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50
): Promise<JupiterQuote | null> {
  try {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
      platformFeeBps: PLATFORM_FEE_BPS.toString(),
    })
    const res = await fetch(`${JUPITER_QUOTE_API}/quote?${params}`)
    if (!res.ok) throw new Error("Jupiter quote failed")
    return await res.json()
  } catch (e) {
    console.error("Jupiter quote error:", e)
    return null
  }
}

export async function getJupiterSwapTx(
  quote: JupiterQuote,
  userPublicKey: string
): Promise<{ swapTransaction: string } | null> {
  try {
    const res = await fetch(`${JUPITER_QUOTE_API}/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        feeAccount: PLATFORM_FEE_WALLET_SOL,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    })
    if (!res.ok) throw new Error("Jupiter swap failed")
    return await res.json()
  } catch (e) {
    console.error("Jupiter swap error:", e)
    return null
  }
}

export const solToLamports = (sol: number) => Math.floor(sol * 1e9)
