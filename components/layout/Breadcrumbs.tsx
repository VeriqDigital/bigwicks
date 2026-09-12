import Link from "next/link";

export default function Breadcrumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="landing-breadcrumbs">
      <ol><li><Link href="/">Home</Link></li><li aria-current="page">{current}</li></ol>
    </nav>
  );
}
