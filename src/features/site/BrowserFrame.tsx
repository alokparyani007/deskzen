type BrowserFrameProps = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

/** A calm browser window around a real app screenshot. */
export function BrowserFrame({ src, width, height, alt }: BrowserFrameProps) {
  return (
    <figure className="relative mx-auto w-full max-w-5xl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-10 inset-y-8 rounded-[3rem] bg-print/30 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-[#101815] shadow-2xl sm:rounded-3xl">
        <div className="flex h-9 items-center gap-1.5 border-b border-white/5 px-4 sm:h-11" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="mx-auto rounded-full bg-white/5 px-10 py-0.5 text-xs text-white/60 sm:px-16">DeskZen</span>
          <span className="w-12" />
        </div>
        <img src={src} width={width} height={height} alt={alt} loading="lazy" decoding="async" className="block h-auto w-full" />
      </div>
    </figure>
  );
}
