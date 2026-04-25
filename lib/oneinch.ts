const ZEROX_API = "https://api.0x.org/swap/permit2"
const ZEROX_API_KEY = process.env.NEXT_PUBLIC_ZEROX_API_KEY || ""

export async function getZeroXSwapTx(
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  taker: string,
  chainId: number = 56
): Promise<any | null> {
  try {
    const params = new URLSearchParams({
      chainId: chainId.toString(),
      sellToken,
      buyToken,
      sellAmount,
      taker,
    })
    const res = await fetch(`${ZEROX_API}/quote?${params}`, {
      headers: {
        "0x-api-key": ZEROX_API_KEY,
        "0x-version": "v2",
      },
    })
    if (!res.ok) throw new Error("0x quote failed")
    return await res.json()
  } catch (e) {
    console.error("0x swap error:", e)
    return null
  }
}

export const BNB_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
export const bnbToWei = (bnb: number) => BigInt(Math.floor(bnb * 1e18)).toString()
