import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const chain = searchParams.get("chain")
  const address = searchParams.get("address")

  if (!chain || !address) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  try {
    if (chain === "sol") {
      const res = await fetch(`https://api.rugcheck.xyz/v1/tokens/${address}/report/summary`)
      if (!res.ok) throw new Error("rugcheck failed")
      const data = await res.json()
      return NextResponse.json({
        verdict: data.score < 30 ? "SAFE" : data.score < 60 ? "RISKY" : "DANGER",
        mintAuthority: data.tokenMeta?.mutable === false ? "Revoked" : "Active",
        freezeAuthority: data.freezeAuthority ? "Active" : "Revoked",
        lpLocked: (data.markets?.[0]?.lp?.lpLockedPct || 0) > 80,
        lpLockedPct: data.markets?.[0]?.lp?.lpLockedPct || 0,
        top10HoldersPct: data.topHolders?.slice(0, 10).reduce((s: number, h: any) => s + (h.pct || 0), 0) || 0,
      })
    }

    if (chain === "bsc") {
      const res = await fetch(`https://api.honeypot.is/v2/IsHoneypot?address=${address}`)
      if (!res.ok) throw new Error("honeypot failed")
      const data = await res.json()
      const isHoneypot = data.honeypotResult?.isHoneypot || false
      const buyTax = data.simulationResult?.buyTax || 0
      const sellTax = data.simulationResult?.sellTax || 0
      return NextResponse.json({
        verdict: isHoneypot ? "DANGER" : buyTax > 10 || sellTax > 10 ? "RISKY" : "SAFE",
        isHoneypot,
        buyTax,
        sellTax,
      })
    }

    return NextResponse.json({ error: "Unknown chain" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
