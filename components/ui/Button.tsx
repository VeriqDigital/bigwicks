import Link from "next/link";

type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "dark";
  href?: string;
  newTab?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
};

const Button = ({
  children,
  variant = "primary",
  href,
  newTab,
  onClick,
  type = "button",
}: ButtonProps) => {
  const baseClasses =
    "inline-flex cursor-pointer items-center justify-center rounded-[3px] border-2 px-6 py-3.5 text-xs font-extrabold uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-(--red)";

  const variantClasses = {
    primary:
      "border-(--red) bg-(--red) text-white hover:border-(--red-hover) hover:bg-(--red-hover)",
    secondary:
      "border-white/65 bg-transparent text-white hover:border-white hover:bg-white hover:text-[#171719]",
    dark: "border-[#242426] bg-transparent text-[#171719] hover:border-(--red) hover:bg-(--red) hover:text-white",
  };

  if (href) {
    return (
      <Link
        href={href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        className={`${baseClasses} ${variantClasses[variant]}`}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
};

export default Button;
