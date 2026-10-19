
import { useEffect, useRef, useState } from "react";

const FILTER_STORAGE_KEY = "billing-reports-filters-v1";

const COMPACT_FILTER_CSS = `
/* ==========================================
   COMPACT REPORT MULTISELECT
========================================== */

.report-multiselect {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  text-align: left;
}

.report-multiselect-label {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  line-height: 1.3;
  text-align: left;
}

.report-multiselect-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-width: 0;
  height: 35px;
  min-height: 35px;
  padding: 0 10px;
  border: 1px solid #d5dce7;
  border-radius: 6px;
  background: #fff;
  color: #1e293b;
  font-family: inherit;
  font-size: 12px;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
}

.report-multiselect-trigger:hover {
  border-color: #94a3b8;
}

.report-multiselect-trigger:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgb(59 130 246 / 12%);
}

.report-multiselect-value {
  display: block;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.report-multiselect-arrow {
  flex-shrink: 0;
  font-size: 10px;
  color: #64748b;
}

.report-multiselect-dismiss {
  position: fixed;
  inset: 0;
  z-index: 99;
  border: 0;
  background: transparent;
  cursor: default;
}

.report-multiselect-menu {
  position: absolute;
  z-index: 100;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 195px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid #dbe2ec;
  border-radius: 8px;
  background: #fff;
  color: #1e293b;
  box-shadow: 0 8px 20px rgb(15 23 42 / 12%);
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

/* Override inherited report label styles */
.report-multiselect .report-multiselect-option {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 8px !important;
  width: 100%;
  min-height: 28px !important;
  height: auto !important;
  margin: 0 !important;
  padding: 5px 7px !important;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #334155;
  font-size: 11px !important;
  font-weight: 400 !important;
  line-height: 1.3 !important;
  text-align: left !important;
  cursor: pointer;
  box-sizing: border-box;
}

.report-multiselect .report-multiselect-option:hover {
  background: #f1f5f9;
}

.report-multiselect .report-multiselect-option span {
  display: block;
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.3;
  text-align: left;
  overflow-wrap: anywhere;
}

/* Custom small checkbox */
.report-multiselect
.report-multiselect-option
input[type="checkbox"] {
  appearance: none !important;
  -webkit-appearance: none !important;
  display: inline-grid !important;
  place-content: center;
  position: relative;
  flex: 0 0 14px !important;
  width: 14px !important;
  height: 14px !important;
  min-width: 14px !important;
  min-height: 14px !important;
  max-width: 14px !important;
  max-height: 14px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 1px solid #cbd5e1 !important;
  border-radius: 3px !important;
  background: #fff;
  cursor: pointer;
  box-sizing: border-box;
}

.report-multiselect
.report-multiselect-option
input[type="checkbox"]::before {
  content: "";
  width: 7px;
  height: 4px;
  border-left: 1.5px solid #fff;
  border-bottom: 1.5px solid #fff;
  transform: translateY(-1px) rotate(-45deg) scale(0);
}

.report-multiselect
.report-multiselect-option
input[type="checkbox"]:checked {
  background: #2563eb !important;
  border-color: #2563eb !important;
}

.report-multiselect
.report-multiselect-option
input[type="checkbox"]:checked::before {
  transform: translateY(-1px) rotate(-45deg) scale(1);
}

.report-multiselect
.report-multiselect-option
input[type="checkbox"]:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

/* All option separator */
.report-multiselect-all {
  border-bottom: 1px solid #e8edf4;
  padding-bottom: 4px;
  margin-bottom: 3px;
}

.report-multiselect-all .report-multiselect-option span {
  font-weight: 600 !important;
}

/* Footer */
.report-multiselect-footer {
  position: sticky;
  bottom: -4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 4px;
  padding: 6px 3px 2px;
  border-top: 1px solid #e8edf4;
  background: #fff;
}

.report-multiselect-footer button {
  min-height: 26px;
  padding: 4px 9px;
  border: 1px solid #d5dce7;
  border-radius: 5px;
  background: #fff;
  color: #334155;
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.report-multiselect-footer button:hover {
  background: #f1f5f9;
}

.report-multiselect-footer .report-multiselect-done {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.report-multiselect-footer .report-multiselect-done:hover {
  background: #1d4ed8;
}

/* Mobile */
@media (max-width: 640px) {
  .report-multiselect-trigger {
    height: 34px;
    min-height: 34px;
    padding: 0 8px;
  }

  .report-multiselect-menu {
    max-height: 190px;
  }
}
`;

function MultiSelectFilter({
  label,
  options = [],
  value,
  onChange,
  allLabel,
}) {
  const [open, setOpen] = useState(false);
  const selected = Array.isArray(value) ? value : [];
  const allSelected = selected.length === 0;

  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);

  const displayText = allSelected
    ? allLabel
    : selectedLabels.join(", ") || allLabel;

  function toggleOption(optionValue) {
    if (allSelected) {
      // From All, selecting one option selects only that option.
      onChange([optionValue]);
      return;
    }

    if (selected.includes(optionValue)) {
      const next = selected.filter((item) => item !== optionValue);
      onChange(next);
    } else {
      const next = [...selected, optionValue];
      onChange(
        next.length === options.length ? [] : next
      );
    }
  }

  return (
    <div className="report-multiselect">
      <span className="report-multiselect-label">
        {label}
      </span>

      <button
        type="button"
        className="report-multiselect-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={`${label}: ${displayText}`}
      >
        <span className="report-multiselect-value">
          {displayText}
        </span>
        <span
          className="report-multiselect-arrow"
          aria-hidden="true"
        >
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="report-multiselect-dismiss"
            aria-label={`Close ${label} options`}
            onClick={() => setOpen(false)}
          />

          <div className="report-multiselect-menu">
            <div className="report-multiselect-all">
              <label className="report-multiselect-option">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onChange([])}
                />
                <span>{allLabel}</span>
              </label>
            </div>

            {options.map((option) => (
              <label
                key={option.value}
                className="report-multiselect-option"
              >
                <input
                  type="checkbox"
                  checked={
                    allSelected ||
                    selected.includes(option.value)
                  }
                  onChange={() => toggleOption(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}

            <div className="report-multiselect-footer">
              <button
                type="button"
                className="report-multiselect-done"
                onClick={() => setOpen(false)}
              >
                Done
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange([]);
                  setOpen(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ReportsFilters({
  search,
  setSearch,
  companyFilter,
  setCompanyFilter,
  billTypeFilter,
  setBillTypeFilter,
  statusFilter,
  setStatusFilter,
  invoiceFrom,
  setInvoiceFrom,
  invoiceTo,
  setInvoiceTo,
  paymentMode,
  setPaymentMode,
  paymentFrom,
  setPaymentFrom,
  paymentTo,
  setPaymentTo,
  companies,
  onReset,
}) {
  const [filtersRestored, setFiltersRestored] = useState(false);
  const restoringRef = useRef(false);

  // Restore saved filters once when mounted.
  useEffect(() => {
    if (restoringRef.current) return;
    restoringRef.current = true;

    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);

      if (raw) {
        const saved = JSON.parse(raw);

        if (typeof saved.search === "string") {
          setSearch(saved.search);
        }

        if (Array.isArray(saved.companyFilter)) {
          setCompanyFilter(saved.companyFilter);
        }

        if (Array.isArray(saved.billTypeFilter)) {
          setBillTypeFilter(saved.billTypeFilter);
        }

        if (typeof saved.statusFilter === "string") {
          setStatusFilter(saved.statusFilter);
        }

        if (typeof saved.invoiceFrom === "string") {
          setInvoiceFrom(saved.invoiceFrom);
        }

        if (typeof saved.invoiceTo === "string") {
          setInvoiceTo(saved.invoiceTo);
        }

        if (typeof saved.paymentMode === "string") {
          setPaymentMode(saved.paymentMode);
        }

        if (typeof saved.paymentFrom === "string") {
          setPaymentFrom(saved.paymentFrom);
        }

        if (typeof saved.paymentTo === "string") {
          setPaymentTo(saved.paymentTo);
        }
      }
    } catch (error) {
      console.error("Could not restore report filters:", error);
    } finally {
      setFiltersRestored(true);
    }
  }, [
    setSearch,
    setCompanyFilter,
    setBillTypeFilter,
    setStatusFilter,
    setInvoiceFrom,
    setInvoiceTo,
    setPaymentMode,
    setPaymentFrom,
    setPaymentTo,
  ]);

  // Persist changes after restoration.
  useEffect(() => {
    if (!filtersRestored) return;

    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          search,
          companyFilter: Array.isArray(companyFilter)
            ? companyFilter
            : [],
          billTypeFilter: Array.isArray(billTypeFilter)
            ? billTypeFilter
            : [],
          statusFilter,
          invoiceFrom,
          invoiceTo,
          paymentMode,
          paymentFrom,
          paymentTo,
        })
      );
    } catch (error) {
      console.error("Could not save report filters:", error);
    }
  }, [
    filtersRestored,
    search,
    companyFilter,
    billTypeFilter,
    statusFilter,
    invoiceFrom,
    invoiceTo,
    paymentMode,
    paymentFrom,
    paymentTo,
  ]);

  const companyOptions = (companies || []).map((company) => ({
    value: company.id,
    label: company.company_name,
  }));

  const billTypeOptions = [
    { value: "normal", label: "Normal" },
    { value: "gst", label: "GST" },
    { value: "corecutting", label: "Core Cutting" },
    { value: "challan", label: "Challan" },
  ];

  function handleReset() {
    onReset?.();

    try {
      localStorage.removeItem(FILTER_STORAGE_KEY);
    } catch (error) {
      console.error("Could not clear report filters:", error);
    }
  }

  return (
    <>
      <style>{COMPACT_FILTER_CSS}</style>

      <section className="report-card filters-card">
        <div className="filter-grid">
          <label>
            Search
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Bill no, company, site..."
            />
          </label>

          <MultiSelectFilter
            label="Company"
            options={companyOptions}
            value={companyFilter}
            onChange={setCompanyFilter}
            allLabel="All Companies"
          />

          <MultiSelectFilter
            label="Bill Type"
            options={billTypeOptions}
            value={billTypeFilter}
            onChange={setBillTypeFilter}
            allLabel="All Types"
          />

          <label>
            Status
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </label>

          <label>
            Bill From
            <input
              type="date"
              value={invoiceFrom}
              onChange={(event) =>
                setInvoiceFrom(event.target.value)
              }
            />
          </label>

          <label>
            Bill To
            <input
              type="date"
              value={invoiceTo}
              onChange={(event) =>
                setInvoiceTo(event.target.value)
              }
            />
          </label>

          <label>
            Payment Period
            <select
              value={paymentMode}
              onChange={(event) =>
                setPaymentMode(event.target.value)
              }
            >
              <option value="upto-end">
                All payments up to Bill To
              </option>
              <option value="report-range">
                Same as Bill From → Bill To
              </option>
              <option value="custom">
                Custom payment date range
              </option>
            </select>
          </label>

          {paymentMode === "custom" && (
            <label>
              Payment From
              <input
                type="date"
                value={paymentFrom}
                onChange={(event) =>
                  setPaymentFrom(event.target.value)
                }
              />
            </label>
          )}

          {paymentMode === "custom" && (
            <label>
              Payment To
              <input
                type="date"
                value={paymentTo}
                onChange={(event) =>
                  setPaymentTo(event.target.value)
                }
              />
            </label>
          )}

          <div className="filter-reset-wrap">
            <button
              className="report-btn"
              onClick={handleReset}
              type="button"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
