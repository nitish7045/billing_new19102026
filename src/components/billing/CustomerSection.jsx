// src/components/billing/CustomerSection.jsx

import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../lib/supabase";

export default function CustomerSection({
  userId,
  customer,
  onCustomerChange,
  toAddress = "",
  site = "",
  onToAddressChange,
  onSiteChange,
}) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSelector, setShowSelector] =
    useState(false);

  // ============================================================
  // CUSTOMER SEARCH
  // ============================================================

  const [customerSearch, setCustomerSearch] =
    useState("");

  // ============================================================
  // LOAD CUSTOMERS
  // ============================================================

  useEffect(() => {
    if (!userId) {
      setCustomers([]);
      return;
    }

    async function loadCustomers() {
      setLoading(true);

      try {
        const { data, error } =
          await supabase
            .from("customers")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", {
              ascending: false,
            });

        if (error) {
          console.error(
            "Load customers error:",
            error
          );
          return;
        }

        setCustomers(data || []);
      } catch (error) {
        console.error(
          "Customer loading error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadCustomers();
  }, [userId]);

  // ============================================================
  // FILTER CUSTOMERS
  // ============================================================

  const filteredCustomers = useMemo(() => {
    const query = customerSearch
      .trim()
      .toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((item) => {
      const toAddress = String(
        item?.to_address || ""
      ).toLowerCase();

      const site = String(
        item?.site || ""
      ).toLowerCase();

      return (
        toAddress.includes(query) ||
        site.includes(query)
      );
    });
  }, [
    customers,
    customerSearch,
  ]);

  // ============================================================
  // SELECT CUSTOMER
  // ============================================================

  function selectCustomer(value) {
    if (!value) {
      return;
    }

    onCustomerChange?.(value);

    onToAddressChange?.(
      value.to_address || ""
    );

    onSiteChange?.(
      value.site || ""
    );

    setShowSelector(false);
    setCustomerSearch("");
  }

  // ============================================================
  // OPEN CUSTOMER SELECTOR
  // ============================================================

  function openCustomerSelector() {
    setCustomerSearch("");
    setShowSelector(
      (value) => !value
    );
  }

  // ============================================================
  // CLOSE CUSTOMER SELECTOR
  // ============================================================

  function closeCustomerSelector() {
    setShowSelector(false);
    setCustomerSearch("");
  }

  // ============================================================
  // SELECTED CUSTOMER CHECK
  // ============================================================

  const selectedCustomerId =
    customer?.id || null;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <style>{`
        /* =====================================================
           CUSTOMER SECTION V4
        ===================================================== */

        .customer-section-v4 {
          width: 100%;
          margin: 0 0 18px;
          padding: 20px;
          border: 1px solid #e4e7ec;
          border-radius: 12px;
          background: #ffffff;
          box-shadow:
            0 1px 2px rgba(16, 24, 40, 0.03),
            0 4px 14px rgba(16, 24, 40, 0.025);
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Arial,
            sans-serif;
          color: #172033;
          box-sizing: border-box;
        }

        .customer-section-v4 *,
        .customer-section-v4 *::before,
        .customer-section-v4 *::after {
          box-sizing: border-box;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .customer-section-v4-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .customer-section-v4-heading {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .customer-section-v4-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #dfe3ff;
          border-radius: 9px;
          background: linear-gradient(
            135deg,
            #f1f2ff 0%,
            #e8eaff 100%
          );
          color: #5148d7;
          font-size: 17px;
          box-shadow:
            0 1px 3px rgba(79, 70, 229, 0.06),
            inset 0 1px 0 rgba(255,255,255,.9);
        }

        .customer-section-v4-title {
          margin: 0;
          color: #172033;
          font-size: 17px;
          line-height: 22px;
          font-weight: 780;
          letter-spacing: -0.02em;
        }

        .customer-section-v4-subtitle {
          margin: 2px 0 0;
          color: #98a2b3;
          font-size: 10.5px;
          line-height: 15px;
          font-weight: 500;
        }

        /* =====================================================
           MAIN GRID
        ===================================================== */

        .customer-section-v4-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.35fr)
            minmax(0, 1fr);
          gap: 16px;
        }

        .customer-section-v4-field {
          min-width: 0;
        }

        /* =====================================================
           LABEL
        ===================================================== */

        .customer-section-v4-label-row {
          min-height: 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 7px;
        }

        .customer-section-v4-label {
          margin: 0;
          color: #344054;
          font-size: 11.5px;
          line-height: 16px;
          font-weight: 700;
        }

        /* =====================================================
           SELECT CUSTOMER BUTTON
        ===================================================== */

        .customer-section-v4-select-button {
          height: 29px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 9px;
          border: 1px solid #dcd9ff;
          border-radius: 6px;
          background: #f8f7ff;
          color: #5148d7;
          font-family: inherit;
          font-size: 9.5px;
          line-height: 1;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          transition:
            background .14s ease,
            border-color .14s ease,
            color .14s ease,
            transform .14s ease,
            box-shadow .14s ease;
        }

        .customer-section-v4-select-button:hover {
          border-color: #c8c4ff;
          background: #f1f0ff;
          color: #4038b7;
          transform: translateY(-1px);
          box-shadow:
            0 3px 8px rgba(99,91,255,.08);
        }

        .customer-section-v4-select-button:active {
          transform: translateY(0);
        }

        .customer-section-v4-select-icon {
          font-size: 12px;
        }

        /* =====================================================
           TEXTAREAS
        ===================================================== */

        .customer-section-v4-textarea {
          width: 100%;
          min-height: 91px;
          padding: 11px 12px;
          resize: vertical;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          outline: none;
          background: #ffffff;
          color: #172033;
          font-family: inherit;
          font-size: 11.5px;
          line-height: 18px;
          font-weight: 500;
          box-shadow:
            0 1px 2px rgba(16,24,40,.02);
          transition:
            border-color .15s ease,
            box-shadow .15s ease,
            background .15s ease;
        }

        .customer-section-v4-textarea::placeholder {
          color: #a7afbd;
          font-weight: 450;
        }

        .customer-section-v4-textarea:hover {
          border-color: #c5ccd8;
        }

        .customer-section-v4-textarea:focus {
          border-color: #635bff;
          background: #ffffff;
          box-shadow:
            0 0 0 3px rgba(99,91,255,.09);
        }

        /* =====================================================
           SELECTOR PANEL
        ===================================================== */

        .customer-section-v4-selector {
          position: relative;
          z-index: 20;
          width: 100%;
          margin-top: 16px;
          padding: 15px;
          border: 1px solid #e0e3ea;
          border-radius: 10px;
          background: #ffffff;
          box-shadow:
            0 12px 30px rgba(16,24,40,.09),
            0 3px 8px rgba(16,24,40,.04);
          animation:
            customer-panel-in .15s ease-out;
        }

        @keyframes customer-panel-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* =====================================================
           SELECTOR HEADER
        ===================================================== */

        .customer-section-v4-selector-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #eef0f3;
        }

        .customer-section-v4-selector-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .customer-section-v4-selector-title strong {
          color: #172033;
          font-size: 12px;
          line-height: 17px;
          font-weight: 750;
        }

        .customer-section-v4-selector-title small {
          color: #98a2b3;
          font-size: 9.5px;
          line-height: 14px;
          font-weight: 500;
        }

        .customer-section-v4-close {
          width: 30px;
          height: 30px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e1e5eb;
          border-radius: 7px;
          background: #ffffff;
          color: #667085;
          font-family: inherit;
          font-size: 19px;
          line-height: 1;
          cursor: pointer;
          transition:
            background .12s ease,
            border-color .12s ease,
            color .12s ease;
        }

        .customer-section-v4-close:hover {
          border-color: #f0c8c5;
          background: #fff7f6;
          color: #d92d20;
        }

        /* =====================================================
           SEARCH
        ===================================================== */

        .customer-section-v4-search {
          position: relative;
          margin-top: 12px;
        }

        .customer-section-v4-search-icon {
          position: absolute;
          left: 11px;
          top: 50%;
          width: 17px;
          height: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateY(-50%);
          color: #98a2b3;
          font-size: 12px;
          pointer-events: none;
        }

        .customer-section-v4-search-input {
          width: 100%;
          height: 40px;
          padding: 0 36px;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          outline: none;
          background: #ffffff;
          color: #172033;
          font-family: inherit;
          font-size: 11px;
          font-weight: 500;
          transition:
            border-color .15s ease,
            box-shadow .15s ease;
        }

        .customer-section-v4-search-input::placeholder {
          color: #a7afbd;
        }

        .customer-section-v4-search-input:focus {
          border-color: #635bff;
          box-shadow:
            0 0 0 3px rgba(99,91,255,.09);
        }

        .customer-section-v4-search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          width: 24px;
          height: 24px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateY(-50%);
          border: 0;
          border-radius: 5px;
          background: transparent;
          color: #98a2b3;
          font-family: inherit;
          font-size: 17px;
          line-height: 1;
          cursor: pointer;
        }

        .customer-section-v4-search-clear:hover {
          background: #f2f4f7;
          color: #344054;
        }

        /* =====================================================
           RESULT INFO
        ===================================================== */

        .customer-section-v4-result-info {
          margin-top: 8px;
          color: #98a2b3;
          font-size: 9.5px;
          line-height: 14px;
        }

        /* =====================================================
           CUSTOMER LIST
        ===================================================== */

        .customer-section-v4-list {
          max-height: 280px;
          margin-top: 8px;
          padding: 3px;
          overflow-y: auto;
          border: 1px solid #eef0f3;
          border-radius: 8px;
          scrollbar-width: thin;
          scrollbar-color: #cbd2dc transparent;
        }

        .customer-section-v4-list::-webkit-scrollbar {
          width: 6px;
        }

        .customer-section-v4-list::-webkit-scrollbar-track {
          background: transparent;
        }

        .customer-section-v4-list::-webkit-scrollbar-thumb {
          background: #cbd2dc;
          border-radius: 99px;
        }

        /* =====================================================
           CUSTOMER ITEM
        ===================================================== */

        .customer-section-v4-item {
          width: 100%;
          min-height: 55px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 10px;
          border: 1px solid transparent;
          border-radius: 7px;
          background: #ffffff;
          color: #344054;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            background .12s ease,
            border-color .12s ease,
            transform .12s ease;
        }

        .customer-section-v4-item:hover {
          border-color: #e2e0ff;
          background: #f9f9ff;
        }

        .customer-section-v4-item:active {
          transform: scale(.998);
        }

        .customer-section-v4-item.selected {
          border-color: #dcd9ff;
          background: #f5f4ff;
        }

        .customer-section-v4-item-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .customer-section-v4-item-main strong {
          overflow: hidden;
          color: #344054;
          font-size: 10.5px;
          line-height: 15px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .customer-section-v4-item-main small {
          overflow: hidden;
          color: #98a2b3;
          font-size: 9px;
          line-height: 13px;
          font-weight: 500;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .customer-section-v4-item-main small span {
          color: #667085;
          font-weight: 650;
        }

        .customer-section-v4-arrow {
          width: 26px;
          height: 26px;
          flex: 0 0 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: #f2f1ff;
          color: #635bff;
          font-size: 13px;
          font-weight: 700;
          transition:
            transform .12s ease,
            background .12s ease;
        }

        .customer-section-v4-item:hover
          .customer-section-v4-arrow {
          transform: translateX(2px);
          background: #e9e7ff;
        }

        /* =====================================================
           LOADING
        ===================================================== */

        .customer-section-v4-loading {
          min-height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #667085;
          font-size: 10.5px;
          font-weight: 550;
        }

        .customer-section-v4-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e4e7ec;
          border-top-color: #635bff;
          border-radius: 50%;
          animation:
            customer-spin .7s linear infinite;
        }

        @keyframes customer-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =====================================================
           EMPTY / NO RESULTS
        ===================================================== */

        .customer-section-v4-empty {
          min-height: 115px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 18px;
          text-align: center;
        }

        .customer-section-v4-empty-icon {
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 3px;
          border-radius: 9px;
          background: #f5f5f7;
          color: #98a2b3;
          font-size: 14px;
        }

        .customer-section-v4-empty strong {
          color: #475467;
          font-size: 11px;
          line-height: 16px;
          font-weight: 700;
        }

        .customer-section-v4-empty span {
          max-width: 280px;
          color: #98a2b3;
          font-size: 9.5px;
          line-height: 14px;
        }

        .customer-section-v4-clear-button {
          height: 31px;
          margin-top: 6px;
          padding: 0 11px;
          border: 1px solid #d8dee8;
          border-radius: 6px;
          background: #ffffff;
          color: #5148d7;
          font-family: inherit;
          font-size: 9.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .customer-section-v4-clear-button:hover {
          background: #f8f7ff;
          border-color: #c9c5ff;
        }

        /* =====================================================
           FOCUS
        ===================================================== */

        .customer-section-v4 button:focus-visible,
        .customer-section-v4 input:focus-visible,
        .customer-section-v4 textarea:focus-visible {
          outline: 3px solid rgba(99,91,255,.14);
          outline-offset: 1px;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 750px) {
          .customer-section-v4-grid {
            grid-template-columns: 1fr;
            gap: 13px;
          }

          .customer-section-v4-textarea {
            min-height: 82px;
          }
        }

        @media (max-width: 520px) {
          .customer-section-v4 {
            padding: 15px;
            border-radius: 11px;
          }

          .customer-section-v4-header {
            margin-bottom: 15px;
          }

          .customer-section-v4-icon {
            width: 34px;
            height: 34px;
            flex-basis: 34px;
            border-radius: 8px;
            font-size: 16px;
          }

          .customer-section-v4-title {
            font-size: 15px;
            line-height: 20px;
          }

          .customer-section-v4-subtitle {
            font-size: 9.5px;
          }

          .customer-section-v4-label-row {
            align-items: flex-start;
          }

          .customer-section-v4-select-button {
            height: 28px;
            padding: 0 8px;
            font-size: 9px;
          }

          .customer-section-v4-textarea {
            min-height: 78px;
            font-size: 11px;
          }

          .customer-section-v4-selector {
            padding: 12px;
          }
        }

        @media (max-width: 390px) {
          .customer-section-v4 {
            padding: 12px;
          }

          .customer-section-v4-label-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .customer-section-v4-select-button {
            width: 100%;
          }

          .customer-section-v4-item {
            min-height: 52px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .customer-section-v4 *,
          .customer-section-v4 *::before,
          .customer-section-v4 *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <section className="customer-section-v4">

        {/* ======================================================
            SECTION HEADER
        ====================================================== */}

        <div className="customer-section-v4-header">

          <div className="customer-section-v4-heading">

            <div
              className="customer-section-v4-icon"
              aria-hidden="true"
            >
              👤
            </div>

            <div>
              <h2 className="customer-section-v4-title">
                Customer Details
              </h2>

              <p className="customer-section-v4-subtitle">
                Enter or select the customer's billing details
              </p>
            </div>

          </div>

        </div>

        {/* ======================================================
            CUSTOMER DETAILS
        ====================================================== */}

        <div className="customer-section-v4-grid">

          {/* ====================================================
              TO
          ==================================================== */}

          <div className="customer-section-v4-field">

            <div className="customer-section-v4-label-row">

              <label className="customer-section-v4-label">
                To
              </label>

              <button
                type="button"
                className="customer-section-v4-select-button"
                onClick={
                  openCustomerSelector
                }
              >
                <span className="customer-section-v4-select-icon">
                  📂
                </span>

                Select Customer
              </button>

            </div>

            <textarea
              className="customer-section-v4-textarea"
              value={toAddress}
              onChange={(event) =>
                onToAddressChange?.(
                  event.target.value
                )
              }
              placeholder="Enter customer name and address"
            />

          </div>

          {/* ====================================================
              SITE
          ==================================================== */}

          <div className="customer-section-v4-field">

            <div className="customer-section-v4-label-row">

              <label className="customer-section-v4-label">
                Site
              </label>

            </div>

            <textarea
              className="customer-section-v4-textarea"
              value={site}
              onChange={(event) =>
                onSiteChange?.(
                  event.target.value
                )
              }
              placeholder="Enter site details"
            />

          </div>

        </div>

        {/* ======================================================
            CUSTOMER SELECTOR
        ====================================================== */}

        {showSelector && (
          <div className="customer-section-v4-selector">

            {/* ==================================================
                SELECTOR HEADER
            ================================================== */}

            <div className="customer-section-v4-selector-header">

              <div className="customer-section-v4-selector-title">

                <strong>
                  Select Customer
                </strong>

                <small>
                  Search by customer, address or site
                </small>

              </div>

              <button
                type="button"
                className="customer-section-v4-close"
                onClick={
                  closeCustomerSelector
                }
                aria-label="Close customer selector"
              >
                ×
              </button>

            </div>

            {/* ==================================================
                SEARCH
            ================================================== */}

            <div className="customer-section-v4-search">

              <span
                className="customer-section-v4-search-icon"
                aria-hidden="true"
              >
                🔍
              </span>

              <input
                type="text"
                className="customer-section-v4-search-input"
                value={customerSearch}
                onChange={(event) =>
                  setCustomerSearch(
                    event.target.value
                  )
                }
                placeholder="Search customer, address or site..."
                autoFocus
              />

              {customerSearch && (
                <button
                  type="button"
                  className="customer-section-v4-search-clear"
                  onClick={() =>
                    setCustomerSearch("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}

            </div>

            {/* ==================================================
                RESULT COUNT
            ================================================== */}

            {!loading &&
              customers.length > 0 && (
                <div className="customer-section-v4-result-info">
                  {filteredCustomers.length}{" "}
                  customer
                  {filteredCustomers.length !==
                  1
                    ? "s"
                    : ""}{" "}
                  found
                </div>
              )}

            {/* ==================================================
                LOADING
            ================================================== */}

            {loading ? (
              <div className="customer-section-v4-loading">

                <span className="customer-section-v4-spinner" />

                Loading customers...

              </div>

            ) : customers.length ===
              0 ? (

              /* ==================================================
                 NO CUSTOMERS
              ================================================== */

              <div className="customer-section-v4-empty">

                <div className="customer-section-v4-empty-icon">
                  👥
                </div>

                <strong>
                  No customers found
                </strong>

                <span>
                  Add a customer first, then
                  select them here.
                </span>

              </div>

            ) : filteredCustomers.length ===
              0 ? (

              /* ==================================================
                 NO SEARCH RESULTS
              ================================================== */

              <div className="customer-section-v4-empty">

                <div className="customer-section-v4-empty-icon">
                  🔍
                </div>

                <strong>
                  No customer found
                </strong>

                <span>
                  Try another customer,
                  address or site name.
                </span>

                <button
                  type="button"
                  className="customer-section-v4-clear-button"
                  onClick={() =>
                    setCustomerSearch("")
                  }
                >
                  Clear Search
                </button>

              </div>

            ) : (

              /* ==================================================
                 CUSTOMER LIST
              ================================================== */

              <div className="customer-section-v4-list">

                {filteredCustomers.map(
                  (item) => {

                    const isSelected =
                      selectedCustomerId ===
                      item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`customer-section-v4-item ${
                          isSelected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          selectCustomer(
                            item
                          )
                        }
                      >

                        <div className="customer-section-v4-item-main">

                          <strong>
                            {item.to_address ||
                              "Unnamed Customer"}
                          </strong>

                          {item.site && (
                            <small>
                              <span>
                                Site:
                              </span>{" "}
                              {item.site}
                            </small>
                          )}

                        </div>

                        <span className="customer-section-v4-arrow">
                          →
                        </span>

                      </button>
                    );
                  }
                )}

              </div>
            )}

          </div>
        )}

      </section>
    </>
  );
}