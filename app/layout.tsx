import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "paperX — Meme Coin DEX",
  description: "Trade meme coins on Solana & BSC",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
