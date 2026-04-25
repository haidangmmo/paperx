import { ONEINCH_API, PLATFORM_FEE_WALLET_BSC, PLATFORM_FEE_BPS } from "./constants"

export async function getOneInchSwapTx(
  srcToken: string,
  dstToken: string,
  amount: string,
  fromAddress: string,
  slippage: number = 0.5
): Promise<any | null> {
  try {
    const params = new URLSearchParams({
      src: srcToken,
      dst: dstToken,
      amount,
      from: fromAddress,
      slippage: slippage.toString(),
      fee: (PLATFORM_FEE_BPS / 100).toString(),
      referrer: PLATFORM_FEE_WALLET_BSC,
    })
    const res = await fetch(`${ONEINCH_API}/swap?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY || ""}`,
      },
    })
    if (!res.ok) throw new Error("1inch swap failed")
    return await res.json()
  } catch (e) {
    console.error("1inch swap error:", e)
    return null
  }
}

export const BNB_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
export const bnbToWei = (bnb: number) => BigInt(Math.floor(bnb * 1e18)).toString()
