import Container from "./Container";

type SectionProps = {
  children: React.ReactNode;
  id?: string;
  tone?: "dark" | "light" | "white" | "promo" | "black";
};

const Section = ({ children, id, tone = "dark" }: SectionProps) => {
  const toneClasses = {
    dark: "border-[#2d2d31] bg-[#19191c] text-white",
    black: "border-[#242427] bg-[#101012] text-white",
    light: "border-[#deded9] bg-[#f3f3f0] text-[#171719]",
    white: "border-[#e2e2de] bg-[#fafaf8] text-[#171719]",
    promo: "border-[#f0cecf] bg-[#fff3f2] text-[#171719]",
  };

  return (
    <section id={id} className={`border-t py-20 md:py-28 lg:py-32 ${toneClasses[tone]}`}>
      <Container>{children}</Container>
    </section>
  );
};

export default Section;
