import Button from "@/components/ui/Button";
import Image from "next/image";
import { services } from "@/data/services";

type ServicesSectionProps = { showAll?: boolean };

const ServicesSection = ({ showAll = false }: ServicesSectionProps) => {
  const displayedServices = showAll ? services : services.slice(0, 6);

  return (
    <div>
      <div className="max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-(--accent)">Transportation services</p>
        <h2 className="mt-4 font-heading text-4xl font-black uppercase leading-[0.95] text-white md:text-6xl">Freight solutions that keep business moving</h2>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#a9a9a9]">From a single regional shipment to a recurring dedicated lane, every load is coordinated with practical planning and clear communication.</p>
      </div>

      <div className="mt-12 grid gap-px bg-[#3a3a3a] md:grid-cols-2 lg:grid-cols-3">
        {displayedServices.map((service, index) => (
          <article key={service.title} className={`group flex min-h-[430px] flex-col ${"featured" in service ? "bg-[#29240f] ring-2 ring-inset ring-(--accent)" : "bg-[#202020]"}`}>
            <div className="relative min-h-56 overflow-hidden bg-[#252525]">
              <Image src={service.image} alt={service.title} fill className="object-cover grayscale-[20%] transition duration-700 group-hover:scale-105 group-hover:grayscale-0" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#202020] to-transparent" />
            </div>
            <div className="flex flex-1 flex-col border-t-2 border-(--accent) p-7">
              <p className="font-heading text-xs font-bold tracking-[0.25em] text-(--accent)">{"featured" in service ? "FEATURED SERVICE" : `SERVICE ${String(index + 1).padStart(2, "0")}`}</p>
              <h3 className="mt-3 font-heading text-2xl font-black uppercase text-white">{service.title}</h3>
              <p className="mt-4 text-sm leading-7 text-[#adadad]">{service.description}</p>
            </div>
          </article>
        ))}
      </div>

      {!showAll && <div className="mt-10"><Button href="/services" variant="secondary">Explore all services</Button></div>}
    </div>
  );
};

export default ServicesSection;
