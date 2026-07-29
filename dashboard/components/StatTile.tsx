type Props = {
  label: string;
  value: string | number;
  tone?: "default" | "alert";
};

export function StatTile({ label, value, tone = "default" }: Props) {
  return (
    <div
      className={`flex-1 rounded-xl border p-4 ${
        tone === "alert" ? "border-red-900/60 bg-red-950/30" : "border-border bg-panel"
      }`}
    >
      <p className={`text-sm ${tone === "alert" ? "text-red-400" : "text-gray-400"}`}>{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "alert" ? "text-red-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
