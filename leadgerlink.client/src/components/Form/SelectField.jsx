import React, { useEffect, useRef, useState } from "react";
import FieldWrapper from "./FieldWrapper";

/*
  SelectField
  Props:
    - label, required, value, onChange, options (array of {label,value} or simple strings)
    - disabled, helpText, name
    - searchable: boolean (optional) - render inline search + filtered dropdown
    - placeholder: string (optional) - shown in search input
*/
const normalize = (opt) =>
  typeof opt === "string"
    ? { label: opt, value: opt }
    : { label: opt.label ?? opt.name ?? String(opt), value: opt.value ?? opt.id ?? opt.supplierId ?? opt.unitId ?? opt };

const SelectField = ({
  label,
  required,
  value,
  onChange,
  options = [],
  disabled = false,
  helpText,
  name,
  searchable = false,
  placeholder = "Search...",
}) => {
  const normalized = (options || []).map(normalize);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setFilter("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = normalized.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()));

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActiveIndex((i) => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      const opt = filtered[activeIndex];
      if (opt) {
        onChange && onChange(opt.value);
        setOpen(false);
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      e.preventDefault();
    }
  };

  if (!searchable) {
    return (
      <FieldWrapper label={label} required={required} helpText={helpText}>
        <select
          name={name}
          className="form-select"
          value={value ?? ""}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
          required={required}
        >
          {normalized.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FieldWrapper>
    );
  }

  // searchable mode
  const selected = normalized.find((o) => String(o.value) === String(value));

  return (
    <FieldWrapper label={label} required={required} helpText={helpText} className="position-relative">
      <div ref={containerRef} className="w-100" style={{ position: "relative" }}>
        {/* input-group so the toggle visually sits flush with the input and resembles a native select */}
        <div className="input-group">
          <input
            ref={inputRef}
            type="text"
            className="form-control"
            placeholder={placeholder}
            value={open ? filter : selected ? selected.label : ""}
            onChange={(e) => {
              setFilter(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={`${name ?? "select"}-listbox`}
            readOnly={false}
            disabled={disabled}
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          />
          <button
            type="button"
            className="btn btn-light"
            onClick={() => {
              if (disabled) return;
              setOpen((s) => !s);
              if (!open) inputRef.current?.focus();
            }}
            aria-label="Toggle options"
            style={{
              borderLeft: "none",
              color: "#000",
              padding: "0 .6rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // don't set explicit height — let bootstrap match it; adjust padding instead
            }}
          >
            {/* simple black caret - looks like native select arrow */}
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
              <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {open && (
          <ul
            id={`${name ?? "select"}-listbox`}
            role="listbox"
            className="list-group position-absolute"
            style={{
              zIndex: 1050,
              maxHeight: 220,
              overflowY: "auto",
              left: 0,
              right: 0,
              border: "1px solid #ced4da",
              background: "#ffffff",
              marginTop: ".15rem",
              borderRadius: ".25rem",
              boxShadow: "0 .25rem .5rem rgba(0,0,0,0.08)",
            }}
          >
            {filtered.length === 0 && <li className="list-group-item small text-muted">No matches</li>}
            {filtered.map((opt, idx) => {
              const isActive = idx === activeIndex;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={String(opt.value) === String(value)}
                  className={`list-group-item list-group-item-action ${isActive ? "active" : ""}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    // use onMouseDown to select before blur
                    e.preventDefault();
                    onChange && onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </FieldWrapper>
  );
};

export default SelectField;