const trustItems = [
  ["01", "Huge Selection", "From novelties to finales"],
  ["02", "Strong Value", "Deals that make the trip count"],
  ["03", "Helpful Staff", "Guidance for the show you want"],
  ["04", "Near New Buffalo", "Just 3 miles south of downtown"],
] as const;

const TrustStrip = () => (
  <section aria-label="Why customers choose Big Wicks" className="border-b border-[#c9c3b8] bg-[#f1eee6] text-[#171411]">
    <div className="mx-auto grid max-w-(--container-width) sm:grid-cols-2 lg:grid-cols-4">
      {trustItems.map(([number, title, detail], index) => (
        <div key={title} className="relative flex min-h-28 items-center gap-4 border-b border-r border-[#c9c3b8] px-6 py-5 last:border-b-0 lg:border-b-0">
          <span className="font-heading text-2xl font-bold text-[#b5262c]" aria-hidden="true">{number}</span>
          <div>
            <p className="font-heading text-lg font-bold uppercase tracking-[0.03em]">{title}</p>
            <p className="mt-1 text-sm text-[#69625c]">{detail}</p>
          </div>
          <span className={`absolute inset-x-0 bottom-0 h-1 ${index === 1 ? "bg-(--red)" : "bg-(--accent)"}`} aria-hidden="true" />
        </div>
      ))}
    </div>
  </section>
);

export default TrustStrip;
