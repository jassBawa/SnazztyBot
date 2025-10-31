import { Github } from "lucide-react"
import Image from "next/image"

export function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Image 
            src="/images/logo.png" 
            alt="BlowUpBot Logo" 
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
            priority
          />
          <span className="text-xl font-semibold tracking-tight">
            <span className="text-white">BlowUp</span>
            <span className="text-gray-500">Bot</span>
          </span>
        </div>

        <nav className="flex items-center gap-4">
          <a 
            href="https://github.com/jassBawa/BlowUpBot/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <a 
            href="https://t.me/BlowUpBot" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-[#22d3ee] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#06b6d4]"
          >
            <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            <span className="hidden leading-none sm:inline">Launch Bot</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
