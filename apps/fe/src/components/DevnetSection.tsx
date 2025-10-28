export function DevnetSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="container relative mx-auto px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-[#22d3ee]/20 bg-linear-to-br from-[#0a3d4d] via-[#0a2a3a] to-[#0a0a0a]">
          {/* Content Grid */}
          <div className="grid items-center gap-8 lg:grid-cols-2">
            {/* Left: Text Content */}
            <div className="px-8 py-12 md:px-12 md:py-16 lg:py-20">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#22d3ee]/20 bg-[#22d3ee]/10 px-4 py-1.5 text-sm backdrop-blur-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-[#22d3ee]" />
                <span className="text-[#22d3ee]">Devnet Enabled</span>
              </div>
              
              <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
                Test Risk-Free on Devnet
              </h2>
              
              <p className="mb-8 text-lg leading-relaxed text-gray-400">
                Try all features with Solana Devnet tokens. No real money needed. Perfect for learning and testing strategies before going live.
              </p>
              
              <div className="flex flex-col gap-3 sm:flex-row">
                <a 
                  href="https://t.me/your_bot_username" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#22d3ee] px-6 py-3 text-base font-semibold text-white transition-all hover:bg-[#06b6d4]"
                >
                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  <span className="leading-none">Try on Devnet</span>
                </a>
                <a 
                  href="https://faucet.solana.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#22d3ee]/30 bg-[#22d3ee]/10 px-6 py-3 text-base font-semibold text-[#22d3ee] backdrop-blur-sm transition-all hover:border-[#22d3ee]/50 hover:bg-[#22d3ee]/20"
                >
                  Get Devnet SOL
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right: Bot Screenshot */}
            <div className="relative hidden lg:flex lg:items-center lg:justify-center">
              <div className="relative py-8 pr-8">
                <img 
                  src="/images/tg-bot-image.png" 
                  alt="Telegram Bot Interface" 
                  className="h-[500px] w-auto rounded-2xl border border-white/10 shadow-2xl"
                />
                {/* Glow effect behind image */}
                <div className="absolute inset-0 -z-10 bg-cyan-400/20 blur-3xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

