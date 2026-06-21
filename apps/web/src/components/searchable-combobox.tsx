"use client";

import { useMemo, useState } from "react";

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string | null;
};

type SearchableSingleSelectProps = {
  label: string;
  value: string;
  options: ComboboxOption[];
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

type SearchableMultiSelectProps = {
  label: string;
  selectedValues: string[];
  options: ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
  onChange: (values: string[]) => void;
};

export function SearchableSingleSelect({
  label,
  value,
  options,
  placeholder = "Search and select",
  required,
  onChange
}: SearchableSingleSelectProps) {
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => filterOptions(options, query), [options, query]);

  return (
    <div>
      <label className="block">
        <span className="field-label">{label}</span>
        <input
          className="field-input h-11"
          value={query}
          placeholder={selected ? selected.label : placeholder}
          required={required && !value}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="mt-2 max-h-60 overflow-auto rounded-md border border-[#d9dee3] bg-white dark:border-[#2f3742] dark:bg-[#0f1115]">
        {filtered.length === 0 ? <p className="field-muted p-3 text-sm">No matching option.</p> : null}
        {filtered.map((option) => (
          <button
            key={option.value}
            className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-cyan-50 dark:hover:bg-[#1f242d] ${
              option.value === value ? "bg-cyan-50 dark:bg-[#1f242d]" : ""
            }`}
            type="button"
            onClick={() => {
              onChange(option.value);
              setQuery("");
            }}
          >
            <span className="font-medium">{option.label}</span>
            {option.description ? <span className="field-muted mt-1 block text-xs">{option.description}</span> : null}
          </button>
        ))}
      </div>
      {selected ? (
        <p className="field-muted mt-2 text-sm">
          Selected: <span className="font-medium text-neutral-800 dark:text-neutral-100">{selected.label}</span>
        </p>
      ) : null}
    </div>
  );
}

export function SearchableMultiSelect({
  label,
  selectedValues,
  options,
  placeholder = "Search",
  emptyText = "No matching option.",
  onChange
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterOptions(options, query), [options, query]);
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));

  function toggle(value: string) {
    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value]
    );
  }

  return (
    <div>
      <label className="block">
        <span className="field-label">{label}</span>
        <input
          className="field-input h-11"
          value={query}
          placeholder={placeholder}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {selectedOptions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <button
              key={option.value}
              className="rounded-md border border-[#cfd5dc] bg-[#eef3f6] px-3 py-1 text-sm font-medium text-neutral-800 dark:border-[#3a424d] dark:bg-[#1f242d] dark:text-neutral-100"
              type="button"
              onClick={() => toggle(option.value)}
            >
              {option.label} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 max-h-72 overflow-auto rounded-md border border-[#d9dee3] bg-white dark:border-[#2f3742] dark:bg-[#0f1115]">
        {filtered.length === 0 ? <p className="field-muted p-3 text-sm">{emptyText}</p> : null}
        {filtered.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 border-b border-[#eef1f4] px-3 py-2 text-sm last:border-b-0 dark:border-[#242b34]"
          >
            <input
              className="mt-1 h-4 w-4"
              type="checkbox"
              checked={selectedValues.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            <span>
              <span className="font-medium">{option.label}</span>
              {option.description ? <span className="field-muted mt-1 block text-xs">{option.description}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function filterOptions(options: ComboboxOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return options;

  const startsWithMatches: ComboboxOption[] = [];
  const containsMatches: ComboboxOption[] = [];

  for (const option of options) {
    const label = option.label.toLowerCase();
    const description = option.description?.toLowerCase() ?? "";
    const searchableText = `${label} ${description}`;

    if (label.startsWith(normalizedQuery) || description.startsWith(normalizedQuery)) {
      startsWithMatches.push(option);
    } else if (searchableText.includes(normalizedQuery)) {
      containsMatches.push(option);
    }
  }

  return [...startsWithMatches, ...containsMatches];
}
