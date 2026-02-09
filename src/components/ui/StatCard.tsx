"use client";

import Link from "next/link";

type StatColor = "blue" | "green" | "yellow" | "red" | "purple" | "gray";

const COLOR_MAP: Record<StatColor, string> = {
  blue: "text-teal-500",
  green: "text-green-400",
  yellow: "text-yellow-400",
  red: "text-red-400",
  purple: "text-purple-400",
  gray: "text-gray-400",
};

interface StatCardProps {
  /** Card title */
  title: string;
  /** Main stat value */
  value: string | number;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional link to detail page */
  href?: string;
  /** Simple color name for value text */
  color?: StatColor;
  /** Background color class (overrides default) */
  bgColor?: string;
  /** Text color class for the value (overrides color prop) */
  valueColor?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Optional trend indicator */
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({
  title,
  value,
  subtitle,
  href,
  color,
  bgColor = "bg-gray-800",
  valueColor,
  icon,
  trend,
}: StatCardProps) {
  // Use explicit valueColor if provided, otherwise map from color prop
  const finalValueColor = valueColor || (color ? COLOR_MAP[color] : "text-white");
  const content = (
    <div
      className={`${bgColor} rounded-lg p-6 ${
        href ? "hover:bg-opacity-80 transition-colors cursor-pointer" : ""
      }`}
      role="region"
      aria-label={`${title}: ${value}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-300">{title}</p>
          <p className={`text-3xl font-bold ${finalValueColor} mt-1`}>{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`text-sm mt-1 ${
                trend.isPositive ? "text-green-400" : "text-red-400"
              }`}
              aria-label={`${trend.isPositive ? "Up" : "Down"} ${Math.abs(trend.value)}%`}
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="text-gray-400" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-lg"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default StatCard;
