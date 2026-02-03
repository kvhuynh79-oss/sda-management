"use client";

import { forwardRef, InputHTMLAttributes, useId } from "react";

interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> {
  /** Checkbox label */
  label: string;
  /** Description text below label */
  description?: string;
  /** Error message to display */
  error?: string;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, description, error, id: propId, ...props }, ref) => {
    const generatedId = useId();
    const id = propId || generatedId;
    const errorId = `${id}-error`;

    return (
      <div>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              id={id}
              type="checkbox"
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              className={`w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-gray-800
                ${props.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              {...props}
            />
          </div>
          <div className="ml-3">
            <label
              htmlFor={id}
              className={`text-sm font-medium text-gray-300 ${
                props.disabled ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {label}
            </label>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-400 ml-7" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = "FormCheckbox";

export default FormCheckbox;
