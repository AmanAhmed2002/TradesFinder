// app/page.tsx
"use client";

import AppleMap from "@/components/AppleMap";

export default function HomePage() {
  return (
    <div className="grid gap-6">
      <section className="card card-hover">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="section-title">Find a Trade Service</h2>
            <p className="mt-1 text-sm text-[--color-text-dim]">
              Search Apple Maps data, then save providers you want to revisit later.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-[--color-text-dim]">
            <span className="badge">Powered by Apple Maps</span>
            <span className="badge">Tailwind v4</span>
          </div>
        </div>

        <div className="mt-4">
          <AppleMap />
        </div>
      </section>
    </div>
  );
}

