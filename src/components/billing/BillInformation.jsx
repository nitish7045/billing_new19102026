// src/components/billing/BillInformation.jsx

import React from "react";

export default function BillInformation({
  billNo,
  setBillNo,
  date,
  setDate,
}) {
  return (
    <>
      <style>{`
        .bill-information-v4 {
          width: 100%;
          margin: 0 0 18px;
          padding: 20px 26px;
          border: 1px solid #e1e5ec;
          border-radius: 12px;
          background: #ffffff;
          box-shadow:
            0 1px 2px rgba(16,24,40,.03),
            0 4px 14px rgba(16,24,40,.025);
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

        .bill-information-v4 *,
        .bill-information-v4 *::before,
        .bill-information-v4 *::after {
          box-sizing: border-box;
        }

        /* =====================================================
           HEADER
           ===================================================== */

        .bill-information-v4-heading {
          position: relative;
          display: flex;
          align-items: center;
          min-height: 22px;
          margin-bottom: 20px;
          padding-left: 13px;
          color: #172033;
          font-size: 15px;
          line-height: 22px;
          font-weight: 800;
          letter-spacing: -.015em;
        }

        .bill-information-v4-heading::before {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;
          width: 4px;
          height: 18px;
          transform: translateY(-50%);
          border-radius: 99px;
          background: #635bff;
        }

        /* =====================================================
           FORM LAYOUT
           ===================================================== */

        .bill-information-v4-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
          gap: 28px;
          align-items: start;
        }

        .bill-information-v4-field {
          min-width: 0;
        }

        .bill-information-v4-label {
          display: block;
          min-height: 15px;
          margin: 0 0 7px;
          color: #344054;
          font-size: 10px;
          line-height: 15px;
          font-weight: 750;
        }

        /* =====================================================
           BILL NUMBER AREA
           ===================================================== */

        .bill-information-v4-bill-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .bill-information-v4-bill-input {
          width: 202px;
          height: 45px;
          padding: 0 12px;
          border: 1px solid #cfd6e4;
          border-radius: 9px;
          outline: none;
          background: #f8f8ff;
          color: #5148d7;
          font-family: inherit;
          font-size: 15px;
          line-height: 45px;
          font-weight: 750;
          letter-spacing: .01em;
          box-shadow: 0 1px 2px rgba(16,24,40,.025);
          transition:
            border-color .14s ease,
            box-shadow .14s ease,
            background .14s ease;
        }

        .bill-information-v4-bill-input:hover {
          border-color: #bfc6d4;
        }

        .bill-information-v4-bill-input:focus {
          border-color: #8179ee;
          background: #ffffff;
          box-shadow:
            0 0 0 3px rgba(99,91,255,.10),
            0 1px 2px rgba(16,24,40,.025);
        }

        /* =====================================================
           EDIT BUTTON
           ===================================================== */

        .bill-information-v4-edit {
          height: 45px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 13px;
          border: 1px solid #cfd6e4;
          border-radius: 9px;
          background: #ffffff;
          color: #475467;
          font-family: inherit;
          font-size: 10px;
          line-height: 15px;
          font-weight: 700;
          cursor: pointer;
          transition:
            border-color .14s ease,
            background .14s ease,
            color .14s ease,
            transform .14s ease;
        }

        .bill-information-v4-edit:hover {
          border-color: #bfc6d4;
          background: #f8fafc;
          color: #344054;
          transform: translateY(-1px);
        }

        .bill-information-v4-edit:active {
          transform: translateY(0);
        }

        .bill-information-v4-edit:focus-visible {
          outline: 3px solid rgba(99,91,255,.14);
          outline-offset: 2px;
        }

        .bill-information-v4-edit-icon {
          width: 15px;
          height: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #bfc6d4;
          border-radius: 3px;
          color: #667085;
          font-size: 9px;
          line-height: 1;
        }

        /* =====================================================
           DATE
           ===================================================== */

        .bill-information-v4-date {
          width: 100%;
          height: 45px;
          padding: 0 12px;
          border: 1px solid #cfd6e4;
          border-radius: 9px;
          outline: none;
          background: #ffffff;
          color: #344054;
          font-family: inherit;
          font-size: 12px;
          line-height: 45px;
          font-weight: 550;
          box-shadow: 0 1px 2px rgba(16,24,40,.025);
          transition:
            border-color .14s ease,
            box-shadow .14s ease,
            background .14s ease;
        }

        .bill-information-v4-date:hover {
          border-color: #bfc6d4;
        }

        .bill-information-v4-date:focus {
          border-color: #8179ee;
          background: #ffffff;
          box-shadow:
            0 0 0 3px rgba(99,91,255,.10),
            0 1px 2px rgba(16,24,40,.025);
        }

        .bill-information-v4-date::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: .8;
        }

        /* =====================================================
           HELP TEXT
           ===================================================== */

        .bill-information-v4-help {
          margin-top: 7px;
          color: #98a2b3;
          font-size: 9px;
          line-height: 14px;
          font-weight: 500;
        }

        /* =====================================================
           RESPONSIVE
           ===================================================== */

        @media (max-width: 800px) {
          .bill-information-v4-grid {
            grid-template-columns: minmax(0, 1fr) minmax(240px, 300px);
            gap: 18px;
          }

          .bill-information-v4-bill-input {
            width: 180px;
          }
        }

        @media (max-width: 650px) {
          .bill-information-v4 {
            padding: 17px;
          }

          .bill-information-v4-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .bill-information-v4-date {
            width: 100%;
          }
        }

        @media (max-width: 430px) {
          .bill-information-v4 {
            padding: 15px;
            border-radius: 10px;
          }

          .bill-information-v4-bill-row {
            align-items: stretch;
          }

          .bill-information-v4-bill-input {
            min-width: 0;
            width: 100%;
          }

          .bill-information-v4-edit {
            flex-shrink: 0;
            padding: 0 10px;
          }
        }
      `}</style>

      <section className="bill-information-v4">

        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="bill-information-v4-heading">
          Bill Information
        </div>

        {/* =====================================================
            FIELDS
            ===================================================== */}

        <div className="bill-information-v4-grid">

          {/* ===================================================
              BILL NUMBER
              =================================================== */}

          <div className="bill-information-v4-field">

            <label className="bill-information-v4-label">
              Bill No.
            </label>

            <div className="bill-information-v4-bill-row">

              <input
                type="text"
                value={billNo}
                onChange={(e) =>
                  setBillNo(e.target.value)
                }
                className="bill-information-v4-bill-input"
                placeholder="Enter bill number"
              />

              <button
                type="button"
                className="bill-information-v4-edit"
                onClick={() => {
                  /*
                   * Keep your existing edit functionality
                   * here if your parent component handles it.
                   */
                }}
              >
                <span
                  className="bill-information-v4-edit-icon"
                  aria-hidden="true"
                >
                  □
                </span>

                Edit Bill No.
              </button>

            </div>

            <div className="bill-information-v4-help">
              Automatically generated from the previous bill.
            </div>

          </div>

          {/* ===================================================
              DATE
              =================================================== */}

          <div className="bill-information-v4-field">

            <label className="bill-information-v4-label">
              Date
            </label>

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(e.target.value)
              }
              className="bill-information-v4-date"
            />

          </div>

        </div>
      </section>
    </>
  );
}