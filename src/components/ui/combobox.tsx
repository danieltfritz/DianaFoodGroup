"use client";

import { useState, useRef, useEffect, useId } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string };

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  clearable = false,
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const selected = options.find((o) => o.value === value);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(opt: ComboboxOption) {
    onValueChange(opt.value);
    setOpen(false);
    setSearch("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onValueChange("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" && filtered.length === 1) handleSelect(filtered[0]);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={id}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate flex-1 text-left">
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {clearable && selected && (
            <span
              role="button"
              onClick={handleClear}
              className="rounded hover:bg-muted p-0.5"
            >
              <X className="size-3 text-muted-foreground" />
            </span>
          )}
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </div>
      </button>

      {open && (
        <div
          id={id}
          role="listbox"
          className="absolute z-50 mt-1 w-full min-w-[180px] rounded-lg border bg-popover shadow-md text-popover-foreground overflow-hidden"
        >
          <div className="p-1.5 border-b">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search…"
              className="w-full rounded-md bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="py-3 text-center text-sm text-muted-foreground">No results.</p>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onClick={() => handleSelect(opt)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors",
                  opt.value === value && "font-medium"
                )}
              >
                <Check className={cn("size-3.5 shrink-0", opt.value === value ? "opacity-100" : "opacity-0")} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
