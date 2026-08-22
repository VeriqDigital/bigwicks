const trustItems = [
  "Reliable delivery",
  "Experienced drivers",
  "Commercial freight",
  "Regional transportation",
  "Licensed & insured",
] as const;

const TrustStrip = () => (
  <section aria-label="S&B Express service highlights" className="border-b border-[#393939] bg-[#202020]">
    <div className="mx-auto grid max-w-(--container-width) grid-cols-2 px-4 sm:px-6 lg:grid-cols-5">
      {trustItems.map((item) => (
        <div key={item} className="flex min-h-24 items-center gap-3 border-b border-r border-[#393939] px-3 py-5 last:col-span-2 lg:last:col-span-1 lg:border-b-0">
          <span className="flex size-8 shrink-0 items-center justify-center border border-(--accent) text-lg font-bold text-(--accent)" aria-hidden="true">✓</span>
          <p className="font-heading text-sm font-black uppercase leading-5 tracking-[0.06em] text-white">{item}</p>
        </div>
      ))}
    </div>
  </section>
);

export default TrustStrip;
