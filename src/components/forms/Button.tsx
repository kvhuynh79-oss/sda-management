"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface BaseButtonProps {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Show loading spinner */
  isLoading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon */
  rightIcon?: React.ReactNode;
  /** Children content */
  children?: React.ReactNode;
}

interface ButtonAsButton extends BaseButtonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> {
  as?: "button";
  href?: never;
}

interface ButtonAsLink extends BaseButtonProps {
  as: "link";
  href: string;
  disabled?: boolean;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-700 text-white border-transparent focus-visible:ring-blue-500",
  secondary:
    "bg-gray-700 hover:bg-gray-600 text-white border-transparent focus-visible:ring-gray-500",
  danger:
    "bg-red-600 hover:bg-red-700 text-white border-transparent focus-visible:ring-red-500",
  ghost:
    "bg-transparent hover:bg-gray-700 text-gray-300 hover:text-white border-gray-600 focus-visible:ring-gray-500",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    variant = "primary",
    size = "md",
    isLoading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    children,
    ...rest
  } = props;

  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg border
    transition-colors
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const className = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${fullWidth ? "w-full" : ""}
  `;

  const content = (
    <>
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {!isLoading && leftIcon && <span aria-hidden="true">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </>
  );

  if (props.as === "link") {
    return (
      <Link href={props.href} className={className}>
        {content}
      </Link>
    );
  }

  // Extract disabled from rest for button
  const { disabled, ...buttonRest } = rest as ButtonAsButton;

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={className}
      {...buttonRest}
    >
      {content}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
