import Link from "next/link";

type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
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
    "inline-flex cursor-pointer items-center justify-center border-2 px-6 py-3 font-heading text-sm font-extrabold uppercase tracking-[0.12em] transition-all focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-(--accent)";

  const variantClasses = {
    primary:
      "border-(--accent) bg-(--accent) text-[#111111] hover:border-(--accent-hover) hover:bg-(--accent-hover)",
    secondary:
      "border-white/70 bg-transparent text-white hover:border-(--accent) hover:bg-(--accent) hover:text-[#111111]",
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
