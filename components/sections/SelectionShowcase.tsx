import Image from "next/image";

const SelectionShowcase = () => (
  <div className="story-photos">
    <figure className="story-overview">
      <Image
        src="/images/store/big-wicks-interior-overview.jpg"
        alt="A wide view of the shelves and aisles inside Big Wicks Fireworks"
        fill
        sizes="(max-width: 767px) 90vw, (max-width: 1280px) 55vw, 680px"
      />
    </figure>
    <figure className="story-detail">
      <Image
        src="/images/store/big-wicks-interior-aisle-cakes.jpg"
        alt="Fireworks stacked along an aisle in the Big Wicks store"
        fill
        sizes="(max-width: 767px) 35vw, 220px"
      />
    </figure>
    <p className="story-caption">
      A look inside our La Porte store.
      <br />
      <span>Room to explore. Plenty to discover.</span>
    </p>
  </div>
);
export default SelectionShowcase;
