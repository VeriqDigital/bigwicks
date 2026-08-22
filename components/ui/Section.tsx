import Container from "./Container";

type SectionProps = {
  children: React.ReactNode;
  id?: string;
  tone?: "dark" | "light" | "black";
};

const Section = ({ children, id, tone = "dark" }: SectionProps) => {
  const toneClasses = {
    dark: "border-[#2d2d31] bg-[#19191c] text-white",
    black: "border-[#2d2d31] bg-[#151517] text-white",
    light: "border-[#deded9] bg-(--background) text-[#171719]",
  };

  return (
    <section
      id={id}
      className={`border-t py-20 md:py-28 lg:py-32 ${toneClasses[tone]}`}
    >
      <Container>{children}</Container>
    </section>
  );
};

export default Section;
