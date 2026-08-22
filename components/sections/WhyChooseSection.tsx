import { customerPriorities } from "@/data/fireworks";

const ValueIcon = ({ index }: { index: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-7"
    aria-hidden="true"
  >
    {index === 0 ? (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ) : index === 1 ? (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ) : (
      <>
        <path d="M20 13 11 22l-9-9V3h10Z" />
        <circle cx="7" cy="8" r="1.5" />
      </>
    )}
  </svg>
);

const WhyChooseSection = () => (
  <div>
    <div className="grid gap-8 lg:grid-cols-[1fr_0.65fr] lg:items-end">
      <div>
        <p className="text-sm font-extrabold uppercase tracking-[0.1em] text-(--red)">
          Customer feedback themes
        </p>
        <h2 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] text-[#171411] md:text-6xl">
          Why shoppers make the drive
        </h2>
      </div>
      <p className="leading-7 text-[#655e58]">
        A clear pattern across customer feedback: more choice, useful guidance,
        and a personal experience that feels different from a giant chain.
      </p>
    </div>

    <div className="mt-12 grid gap-5 lg:grid-cols-3">
      {customerPriorities.map((item, index) => (
        <article
          key={item.title}
          className="min-h-72 rounded-[7px] border border-[#d5d5d0] bg-white p-7 sm:p-8"
        >
          <div className="flex size-10 items-center justify-center text-(--red)">
            <ValueIcon index={index} />
          </div>
          <h3 className="mt-7 font-heading text-2xl font-bold uppercase leading-none text-[#171411]">
            {item.title}
          </h3>
          <p className="mt-4 leading-7 text-[#625b55]">{item.description}</p>
        </article>
      ))}
    </div>
  </div>
);

export default WhyChooseSection;
