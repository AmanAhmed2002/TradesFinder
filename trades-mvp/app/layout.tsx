// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Trades Finder",
  description: "Find and save local trade service providers",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="container-app">
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Smaller logo */}
              <div className="grid h-7 w-7 place-items-center rounded-md bg-brand-600">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 text-white">
                  <path d="M12 2l2.2 6.8H21l-5.6 4 2.2 6.8L12 15.6 6.4 19.6 8.6 12.8 3 8.8h6.8z" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <div className="title leading-none">Trades Finder</div>
                <div className="subtitle">Search & save trusted providers</div>
              </div>
            </div>
            <nav className="flex items-center gap-2">
              <a href="/" className="btn-ghost">Home</a>
              <a href="/saved" className="btn">My Saved</a>
            </nav>
          </header>

          <main className="section">{children}</main>

          <footer className="mt-8 border-t border-[--color-border] pt-4 text-[12px] muted flex justify-between">
            <span>&copy; {new Date().getFullYear()} Trades Finder</span>
            <span>Tailwind v4 theme</span>
          </footer>
        </div>
      </body>
    </html>
  );
}

