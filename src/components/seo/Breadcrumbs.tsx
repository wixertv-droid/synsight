import Link from "next/link";

export type Crumb = { name: string; href: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Brotkrumen" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase text-white/35">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {last ? (
                <span className="text-cyber-cyan/80">{item.name}</span>
              ) : (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-white/70"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
