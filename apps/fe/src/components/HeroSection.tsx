export function HeroSection() {
  return (
    <section className="relative min-h-screen px-6 pt-32">
      {/* Cyan Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#22d3ee15_1px,transparent_1px),linear-gradient(to_bottom,#22d3ee15_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      {/* Cyan Glow Effect */}
      <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#22d3ee]/5 blur-[120px]" />

      <div className="container relative mx-auto max-w-5xl">
        {/* Badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#22d3ee]/20 bg-[#22d3ee]/10 px-4 py-1.5 text-sm backdrop-blur-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[#22d3ee]" />
            <span className="text-[#22d3ee]">Devnet • Test Without Risk</span>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="mb-6 text-center text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl">
          Your Complete Solana
          <br />
          <span className="bg-linear-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Trading & Launch Bot
          </span>
        </h1>

        {/* Description */}
        <p className="mx-auto mb-12 max-w-2xl text-center text-lg leading-relaxed text-gray-400 md:text-xl">
          Automate DCA strategies and launch tokens on bonding curves. Everything you need, right in Telegram.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a 
            href="https://t.me/BlowUpBot" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#22d3ee] px-8 py-4 text-base font-semibold text-white transition-all hover:scale-105 hover:bg-[#06b6d4] hover:shadow-2xl hover:shadow-[#22d3ee]/20"
          >
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            <span className="leading-none">Start Trading</span>
          </a>
          
          <a 
            href="https://github.com/jassBawa/BlowUpBot/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#22d3ee]/30 bg-[#22d3ee]/10 px-8 py-4 text-base font-semibold text-[#22d3ee] backdrop-blur-sm transition-all hover:border-[#22d3ee]/50 hover:bg-[#22d3ee]/20"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            View Source
          </a>
        </div>

        {/* Features */}
        <div className="mt-24 grid gap-6 md:grid-cols-2">
          {/* DCA Feature */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="mb-3 text-xl font-semibold text-white">DCA Trading</h3>
            <p className="mb-4 leading-relaxed text-gray-400">
              Set up automated Dollar-Cost Averaging strategies. Buy tokens at regular intervals, minimize risk, maximize long-term gains.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                <span>Custom intervals & amounts</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                <span>24/7 automated execution</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                <span>Real-time analytics</span>
              </li>
            </ul>
          </div>

          {/* Token Launchpad Feature */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="mb-3 text-xl font-semibold text-white">Token Launchpad</h3>
            <p className="mb-4 leading-relaxed text-gray-400">
              Launch your own token on Solana with bonding curves. Fair launches with automatic liquidity, just like pump.fun.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                <span>Bonding curve mechanics</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                <span>Instant deployment</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                <span>No coding required</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-8 border-t border-white/5 pt-12">
          <div className="text-center">
            <div className="mb-2 text-3xl font-bold text-white">24/7</div>
            <div className="text-sm text-gray-500">Automated Trading</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-3xl font-bold text-white">0.3%</div>
            <div className="text-sm text-gray-500">Platform Fee</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-3xl font-bold text-white">Instant</div>
            <div className="text-sm text-gray-500">Setup Time</div>
          </div>
        </div>
      </div>
    </section>
  )
}
