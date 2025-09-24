// app/page.tsx
import AppleMap from "../components/AppleMap"; // <-- relative path

export default function Page() {
  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Trades Finder — Durham MVP</h1>
        <p className="text-neutral-400">
          Search by trade and filter near Durham Region, Ontario. Save providers or send a quote request.
        </p>
      </header>
      <AppleMap />
    </main>
  );
}

