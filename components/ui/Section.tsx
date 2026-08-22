import Container from "./Container";

type SectionProps = {
  children: React.ReactNode;
  id?: string;
  tone?: "dark" | "light" | "black";
};

const Section = ({ children, id, tone = "dark" }: SectionProps) => {
  const toneClasses = {
    dark: "border-[#37312d] bg-[#1a1715] text-white",
    black: "border-[#2c2824] bg-[#0f0e0d] text-white",
    light: "border-[#d2cdc2] bg-[#f1eee6] text-[#171411]",
  };

  return (
    <section id={id} className={`border-t py-20 md:py-28 lg:py-32 ${toneClasses[tone]}`}>
      <Container>{children}</Container>
    </section>
  );
};

export default Section;
