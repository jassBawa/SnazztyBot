import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BlowUpBot - Solana DCA Trading & Token Launch Bot",
  description: "Automate Dollar-Cost Averaging strategies and launch tokens on Solana with our Telegram bot. Test risk-free on devnet. Trade 24/7 and launch tokens with bonding curves like pump.fun - all from Telegram.",
  keywords: ["Solana bot", "Telegram bot", "DCA trading", "token launch", "cryptocurrency trading", "automated trading", "bonding curve", "pump.fun alternative", "trading bot", "crypto automation"],
  icons: {
    icon: "/Robot and Rocket Icon Design.png",
    shortcut: "/Robot and Rocket Icon Design.png",
    apple: "/Robot and Rocket Icon Design.png",
  },
  openGraph: {
    title: "BlowUpBot - Solana DCA Trading & Token Launch Bot",
    description: "Automate Dollar-Cost Averaging strategies and launch tokens on Solana. Test risk-free on devnet with our Telegram bot.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BlowUpBot - Solana DCA Trading & Token Launch Bot",
    description: "Automate DCA strategies and launch tokens on Solana. Trade 24/7 and launch tokens with bonding curves - all from Telegram.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#0a0a0a]">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#0a0a0a] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
