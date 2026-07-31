import Link from "next/link";

type Props = {
  label: string;
  value: string | number;
  tone?: "default" | "alert";
  href?: string;
};

export function StatTile({ label, value, tone = "default", href }: Props) {
  const conteudo = (
    <>
      <p className={`text-sm ${tone === "alert" ? "text-red-400" : "text-gray-400"}`}>{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "alert" ? "text-red-400" : "text-white"}`}>{value}</p>
    </>
  );

  const className = `flex-1 rounded-xl border p-4 ${
    tone === "alert" ? "border-red-900/60 bg-red-950/30" : "border-border bg-panel"
  }${href ? " transition-colors hover:border-gray-500" : ""}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {conteudo}
      </Link>
    );
  }

  return <div className={className}>{conteudo}</div>;
}
