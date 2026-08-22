const trustItems = [
  ["Huge Selection", "From novelties to finales"],
  ["Strong Value", "Deals that make the trip count"],
  ["Helpful Staff", "Guidance for the show you want"],
  ["Near New Buffalo", "Just 3 miles south of downtown"],
] as const;

const TrustStrip = () => (
  <section
    aria-label="Why customers choose Big Wicks"
    className="border-b border-[#d5d5d0] bg-[#f5f5f2] text-[#171719]"
  >
    <div className="mx-auto grid max-w-(--container-width) border-l border-[#d5d5d0] sm:grid-cols-2 lg:grid-cols-4">
      {trustItems.map(([title, detail], index) => (
        <div
          key={title}
          className="flex min-h-28 items-center gap-4 border-b border-r border-[#d5d5d0] px-6 py-5 last:border-b-0 lg:border-b-0"
        >
          <span
            className="font-heading text-xl font-bold text-(--red)"
            aria-hidden="true"
          >
            0{index + 1}
          </span>
          <div>
            <p className="font-heading text-lg font-bold uppercase tracking-[0.03em]">
              {title}
            </p>
            <p className="mt-1 text-sm text-[#69625c]">{detail}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default TrustStrip;
