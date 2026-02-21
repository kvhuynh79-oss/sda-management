"use client";

export function StatCard({ label, value, color = "blue" }: { label: string; value: string; color?: "blue" | "green" | "yellow" | "red" }) {
  const colorClasses = { blue: "text-teal-500", green: "text-green-400", yellow: "text-yellow-400", red: "text-red-400" };
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}
