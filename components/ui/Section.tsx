import Container from "./Container";

type SectionProps = {
  children: React.ReactNode;
  id?: string;
  tone?: "dark" | "light" | "black";
};

const Section = ({ children, id, tone = "dark" }: SectionProps) => {
  const toneClasses = {
    dark: "border-[#2d2d2d] bg-[#171717] text-white",
    black: "border-[#2d2d2d] bg-[#111111] text-white",
    light: "border-[#dedbd4] bg-[#f4f1ea] text-[#171717]",
  };

  return (
    <section id={id} className={`border-t py-20 md:py-28 ${toneClasses[tone]}`}>
      <Container>{children}</Container>
    </section>
  );
};

export default Section;
