"use client";

import { forwardRef, SelectHTMLAttributes, useId } from "react";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  /** Select label */
  label: string;
  /** Options for the select */
  options?: SelectOption[];
  /** Grouped options */
  groups?: SelectGroup[];
  /** Error message to display */
  error?: string;
  /** Helper text below select */
  helperText?: string;
  /** Make the field visually required */
  required?: boolean;
  /** Placeholder option text */
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      options,
      groups,
      error,
      helperText,
      required,
      placeholder = "Select an option...",
      id: propId,
      ...props
    },
    ref
  ) => {
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
        <select
          ref={ref}
          id={id}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white
            focus:outline-none focus:ring-2 focus:ring-blue-500
            focus-visible:ring-2 focus-visible:ring-blue-500
            transition-colors
            ${error ? "border-red-500" : "border-gray-600"}
            ${props.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {/* Flat options */}
          {options?.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}

          {/* Grouped options */}
          {groups?.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
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

FormSelect.displayName = "FormSelect";

export default FormSelect;
