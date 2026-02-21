"use client";

import { forwardRef, InputHTMLAttributes, useId } from "react";

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  /** Input label */
  label: string;
  /** Error message to display */
  error?: string;
  /** Helper text below input */
  helperText?: string;
  /** Make the field visually required */
  required?: boolean;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, required, id: propId, ...props }, ref) => {
    const generatedId = useId();
    const id = propId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const describedBy = [
      error ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          {label}
          {required && (
            <span className="text-red-400 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
        <input
          ref={ref}
          id={id}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-teal-600
            focus-visible:ring-2 focus-visible:ring-teal-600
            transition-colors
            ${error ? "border-red-500" : "border-gray-600"}
            ${props.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-sm text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export default FormInput;
