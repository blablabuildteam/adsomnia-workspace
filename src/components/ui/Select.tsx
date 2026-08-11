"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  selectTriggerClass,
  selectTriggerElevatedClass,
} from "@/lib/form-styles";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  id?: string;
  name?: string;
  required?: boolean;
  placeholder?: string;
  options: readonly (SelectOption | string)[];
  className?: string;
  disabled?: boolean;
  variant?: "default" | "elevated";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

function normalizeOptions(
  options: readonly (SelectOption | string)[],
): SelectOption[] {
  return options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );
}

export function Select({
  id: idProp,
  name,
  required,
  placeholder = "Select…",
  options: rawOptions,
  className = "",
  disabled = false,
  variant = "default",
  value: controlledValue,
  defaultValue = "",
  onChange,
}: SelectProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const listboxId = `${id}-listbox`;
  const isControlled = controlledValue !== undefined;

  const options = normalizeOptions(rawOptions);
  const triggerClass =
    variant === "elevated" ? selectTriggerElevatedClass : selectTriggerClass;

  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const value = isControlled ? controlledValue : internalValue;
  const selectedOption = options.find((option) => option.value === value);

  const setValue = (next: string) => {
    if (!isControlled) {
      setInternalValue(next);
    }
    onChange?.(next);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required && !value}
        />
      ) : null}

      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (disabled) return;

          if (!open && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const menuHeight = Math.min(options.length * 44 + 8, 240);
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            setOpenUpward(spaceBelow < menuHeight && spaceAbove > spaceBelow);
          }

          setOpen((current) => !current);
        }}
        className={`${triggerClass} flex items-center justify-between gap-2 text-left ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
      >
        <span className={selectedOption ? "text-white" : "text-muted/50"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={id}
          className={`absolute z-50 max-h-60 w-full overflow-auto border border-border-strong bg-surface-elevated py-1 shadow-[0_8px_24px_rgba(0,0,0,0.6)] ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={selected}
                onClick={() => setValue(option.value)}
                className={`flex cursor-pointer items-center justify-between px-3 py-2.5 text-base transition-colors hover:bg-surface hover:text-foreground ${
                  selected ? "bg-surface text-foreground" : "text-muted"
                }`}
              >
                <span>{option.label}</span>
                {selected ? (
                  <Check className="size-4 shrink-0 text-foreground" />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
