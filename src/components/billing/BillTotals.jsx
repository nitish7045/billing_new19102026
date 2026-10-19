// src/components/billing/BillTotals.jsx

import React from "react";

import {
  calculateRoundOff,
  formatMoney,
} from "../../utils/billing/calculations";

export default function BillTotals({
  subtotal,
  roundTotal,
  setRoundTotal,
  amountInWords,
}) {
  const roundOff = calculateRoundOff(
    subtotal
  );

  const finalTotal = roundTotal
    ? Math.round(subtotal)
    : subtotal;

  return (
    <>
      <style>{`
        /* =====================================================
           BILL TOTALS V5
        ===================================================== */

        .bill-totals-v5 {
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

        .bill-totals-v5 *,
        .bill-totals-v5 *::before,
        .bill-totals-v5 *::after {
          box-sizing: border-box;
        }

        /* =====================================================
           MAIN LAYOUT
        ===================================================== */

        .bill-totals-v5-area {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 370px;
          gap: 28px;
          align-items: stretch;
        }

        /* =====================================================
           AMOUNT IN WORDS
        ===================================================== */

        .bill-totals-v5-words {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 18px 20px;
          border: 1px solid #e5e7eb;
          border-radius: 11px;
          background:
            linear-gradient(
              135deg,
              #fbfbff 0%,
              #f7f8fc 100%
            );
          position: relative;
          overflow: hidden;
        }

        /* Decorative left accent */

        .bill-totals-v5-words::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(
            180deg,
            #635bff,
            #8b83f7
          );
        }

        /* Header */

        .bill-totals-v5-words-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }

        .bill-totals-v5-words-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #dedcff;
          border-radius: 9px;
          background: #f0efff;
          color: #5148d7;
          font-size: 15px;
          font-weight: 800;
          box-shadow:
            0 1px 3px rgba(79, 70, 229, 0.06);
        }

        .bill-totals-v5-label {
          margin: 0;
          color: #344054;
          font-size: 11px;
          line-height: 15px;
          font-weight: 800;
          letter-spacing: 0.035em;
          text-transform: uppercase;
        }

        .bill-totals-v5-words-helper {
          margin-top: 2px;
          color: #98a2b3;
          font-size: 9.5px;
          line-height: 14px;
          font-weight: 500;
        }

        /* =====================================================
           WORDS CONTENT
        ===================================================== */

        .bill-totals-v5-words-content {
          min-height: 54px;
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 12px 13px;
          border: 1px solid #e8e8f2;
          border-radius: 8px;
          background: #ffffff;
          box-shadow:
            0 1px 2px rgba(16, 24, 40, 0.025);
        }

        .bill-totals-v5-words-prefix {
          width: 24px;
          height: 24px;
          flex: 0 0 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 1px;
          border-radius: 6px;
          background: #f3f2ff;
          color: #635bff;
          font-size: 12px;
          font-weight: 800;
        }

        .bill-totals-v5-words-text {
          min-width: 0;
          color: #263247;
          font-size: 12px;
          line-height: 19px;
          font-weight: 650;
          letter-spacing: -0.005em;
          word-break: break-word;
        }

        .bill-totals-v5-words-text.empty {
          color: #a3aab6;
          font-weight: 500;
        }

        /* =====================================================
           TOTAL SUMMARY
        ===================================================== */

        .bill-totals-v5-summary {
          width: 100%;
          padding: 15px 16px;
          border: 1px solid #e4e7ec;
          border-radius: 10px;
          background: #ffffff;
        }

        .bill-totals-v5-row {
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          color: #667085;
          font-size: 11px;
          line-height: 16px;
          font-weight: 550;
        }

        .bill-totals-v5-row strong {
          color: #344054;
          font-size: 11.5px;
          font-weight: 700;
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        /* =====================================================
           ROUND TOTAL
        ===================================================== */

        .bill-totals-v5-round {
          min-height: 35px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 3px 0;
          padding: 6px 8px;
          border-radius: 7px;
          color: #475467;
          font-size: 10.5px;
          font-weight: 650;
          cursor: pointer;
          transition:
            background 0.14s ease,
            color 0.14s ease;
        }

        .bill-totals-v5-round:hover {
          background: #f8f9fc;
          color: #344054;
        }

        .bill-totals-v5-round-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* =====================================================
           CUSTOM CHECKBOX
        ===================================================== */

        .bill-totals-v5-checkbox {
          position: relative;
          width: 16px;
          height: 16px;
          margin: 0;
          flex: 0 0 16px;
          appearance: none;
          -webkit-appearance: none;
          border: 1.5px solid #c7cdd7;
          border-radius: 4px;
          background: #ffffff;
          cursor: pointer;
          transition:
            background 0.14s ease,
            border-color 0.14s ease,
            box-shadow 0.14s ease;
        }

        .bill-totals-v5-checkbox:hover {
          border-color: #8f88ee;
        }

        .bill-totals-v5-checkbox:checked {
          border-color: #635bff;
          background: #635bff;
        }

        .bill-totals-v5-checkbox:checked::after {
          content: "";
          position: absolute;
          left: 4px;
          top: 1px;
          width: 5px;
          height: 9px;
          border: solid #ffffff;
          border-width: 0 1.7px 1.7px 0;
          transform: rotate(45deg);
        }

        .bill-totals-v5-checkbox:focus-visible {
          outline: 3px solid rgba(99, 91, 255, 0.14);
          outline-offset: 2px;
        }

        .bill-totals-v5-round-badge {
          padding: 2px 6px;
          border-radius: 4px;
          background: #f1f0ff;
          color: #5148d7;
          font-size: 8.5px;
          line-height: 13px;
          font-weight: 750;
        }

        /* =====================================================
           DIVIDER
        ===================================================== */

        .bill-totals-v5-divider {
          height: 1px;
          margin: 7px 0;
          background: #eaecf0;
        }

        /* =====================================================
           ROUND OFF
        ===================================================== */

        .bill-totals-v5-roundoff {
          color: #667085;
        }

        .bill-totals-v5-roundoff strong {
          color: #5148d7;
        }

        /* =====================================================
           GRAND TOTAL
        ===================================================== */

        .bill-totals-v5-grand {
          min-height: 57px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin: 8px -8px -8px;
          padding: 11px 12px;
          border: 1px solid #dedcff;
          border-radius: 8px;
          background: linear-gradient(
            135deg,
            #f7f6ff 0%,
            #f1f0ff 100%
          );
        }

        .bill-totals-v5-grand-label {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .bill-totals-v5-grand-label span:first-child {
          color: #344054;
          font-size: 10.5px;
          line-height: 15px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.035em;
        }

        .bill-totals-v5-grand-label span:last-child {
          color: #8b83d8;
          font-size: 8.5px;
          line-height: 12px;
          font-weight: 550;
        }

        .bill-totals-v5-grand-amount {
          color: #4038b7;
          font-size: 20px;
          line-height: 25px;
          font-weight: 800;
          letter-spacing: -0.025em;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 850px) {
          .bill-totals-v5-area {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .bill-totals-v5-summary {
            max-width: none;
          }
        }

        @media (max-width: 520px) {
          .bill-totals-v5 {
            padding: 14px;
            border-radius: 11px;
          }

          .bill-totals-v5-words {
            padding: 15px 16px;
          }

          .bill-totals-v5-words-header {
            margin-bottom: 12px;
          }

          .bill-totals-v5-words-icon {
            width: 32px;
            height: 32px;
            flex-basis: 32px;
          }

          .bill-totals-v5-words-content {
            padding: 10px 11px;
          }

          .bill-totals-v5-words-text {
            font-size: 11.5px;
            line-height: 18px;
          }

          .bill-totals-v5-grand-amount {
            font-size: 18px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bill-totals-v5 * {
            transition: none !important;
          }
        }
      `}</style>

      <section className="bill-totals-v5">

        <div className="bill-totals-v5-area">

          {/* =================================================
              AMOUNT IN WORDS
          ================================================= */}

          <div className="bill-totals-v5-words">

            <div className="bill-totals-v5-words-header">

              <div
                className="bill-totals-v5-words-icon"
                aria-hidden="true"
              >
                ₹
              </div>

              <div>

                <div className="bill-totals-v5-label">
                  Amount in Words
                </div>

                <div className="bill-totals-v5-words-helper">
                  Total payable amount in words
                </div>

              </div>

            </div>

            <div className="bill-totals-v5-words-content">

              <span
                className="bill-totals-v5-words-prefix"
                aria-hidden="true"
              >
                ₹
              </span>

              <div
                className={`bill-totals-v5-words-text ${
                  amountInWords
                    ? ""
                    : "empty"
                }`}
              >
                {amountInWords ||
                  "Rupees Zero Only"}
              </div>

            </div>

          </div>

          {/* =================================================
              TOTAL SUMMARY
          ================================================= */}

          <div className="bill-totals-v5-summary">

            {/* SUBTOTAL */}

            <div className="bill-totals-v5-row">

              <span>
                Subtotal
              </span>

              <strong>
                ₹{formatMoney(subtotal)}
              </strong>

            </div>

            {/* ROUND TOTAL */}

            <label className="bill-totals-v5-round">

              <span className="bill-totals-v5-round-left">

                <input
                  type="checkbox"
                  className="bill-totals-v5-checkbox"
                  checked={roundTotal}
                  onChange={(e) =>
                    setRoundTotal(
                      e.target.checked
                    )
                  }
                />

                <span>
                  Round Total
                </span>

              </span>

              <span className="bill-totals-v5-round-badge">
                {roundTotal
                  ? "Enabled"
                  : "Optional"}
              </span>

            </label>

            {/* ROUND OFF */}

            {roundTotal && (
              <>
                <div className="bill-totals-v5-divider" />

                <div className="bill-totals-v5-row bill-totals-v5-roundoff">

                  <span>
                    Round Off
                  </span>

                  <strong>
                    ₹{formatMoney(roundOff)}
                  </strong>

                </div>
              </>
            )}

            <div className="bill-totals-v5-divider" />

            {/* GRAND TOTAL */}

            <div className="bill-totals-v5-grand">

              <div className="bill-totals-v5-grand-label">

                <span>
                  Grand Total
                </span>

                <span>
                  Total payable amount
                </span>

              </div>

              <strong className="bill-totals-v5-grand-amount">
                ₹{formatMoney(finalTotal)}
              </strong>

            </div>

          </div>

        </div>

      </section>
    </>
  );
}