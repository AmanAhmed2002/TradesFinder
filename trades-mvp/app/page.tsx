// app/page.tsx
import AppleMap from "../components/AppleMap";
export default function Page() {
  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Trades Finder — GTA</h1>
        <p className="text-neutral-400">
          Search by trade and filter across the Greater Toronto Area. Save providers or send a quote request.
        </p>
      </header>
      <AppleMap />
    </main>
  );
}

