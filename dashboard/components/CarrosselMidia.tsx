"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { urlPublica } from "@/lib/api";

export function CarrosselMidia({ urls }: { urls: string[] }) {
  const [indice, setIndice] = useState(0);
  const total = urls.length;

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-black/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={urlPublica(urls[indice])} alt="" className="h-full w-full object-cover" />
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndice((i) => (i - 1 + total) % total)}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setIndice((i) => (i + 1) % total)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
          >
            <ChevronRight size={16} />
          </button>
          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
            {indice + 1}/{total}
          </span>
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            {urls.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === indice ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
