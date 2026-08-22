const trustItems = [
  ["Huge Selection", "From novelties to finales"],
  ["Strong Value", "Deals that make the trip count"],
  ["Helpful Staff", "Guidance for the show you want"],
  ["Near New Buffalo", "Just 3 miles south of downtown"],
] as const;

const TrustStrip = () => (
  <section aria-label="Why customers choose Big Wicks" className="border-b border-[#d5d5d0] bg-[#f5f5f2] text-[#171719]">
    <div className="mx-auto grid max-w-(--container-width) sm:grid-cols-2 lg:grid-cols-4">
      {trustItems.map(([title, detail]) => (
        <div key={title} className="relative flex min-h-28 items-center gap-4 border-b border-r border-[#d5d5d0] px-6 py-5 last:border-b-0 lg:border-b-0">
          <span className="relative size-4 shrink-0 bg-(--red)" aria-hidden="true"><span className="absolute -right-1 -top-1 size-1.5 bg-(--accent)" /></span>
          <div>
            <p className="font-heading text-lg font-bold uppercase tracking-[0.03em]">{title}</p>
            <p className="mt-1 text-sm text-[#69625c]">{detail}</p>
          </div>
          <span className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden="true"><span className="w-4/5 bg-(--red)" /><span className="flex-1 bg-(--accent)" /></span>
        </div>
      ))}
    </div>
  </section>
);

export default TrustStrip;
