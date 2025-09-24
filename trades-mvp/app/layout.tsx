export const metadata = {
  title: "Trades Finder MVP",
  description: "Find local trades fast – Durham first MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <div className="mx-auto max-w-7xl p-4">{children}</div>
      </body>
    </html>
  );
}

