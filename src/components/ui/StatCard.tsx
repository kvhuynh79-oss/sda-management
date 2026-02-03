"use client";

import Link from "next/link";

interface StatCardProps {
  /** Card title */
  title: string;
  /** Main stat value */
  value: string | number;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional link to detail page */
  href?: string;
  /** Background color class */
  bgColor?: string;
  /** Text color class for the value */
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
  bgColor = "bg-gray-800",
  valueColor = "text-white",
  icon,
  trend,
}: StatCardProps) {
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
          <p className="text-sm text-gray-400">{title}</p>
          <p className={`text-3xl font-bold ${valueColor} mt-1`}>{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
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
          <div className="text-gray-500" aria-hidden="true">
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
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default StatCard;
