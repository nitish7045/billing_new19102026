// src/components/billing/BillActions.jsx

import React from "react";

export default function BillActions({
  onSave,
  onPreview,
  onExport,
  onClear,
  saving,
}) {
  function handleBack() {
    if (saving) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to go back?\n\nYour unfinished bill will be saved as a draft and you can continue it later."
    );

    if (!confirmed) {
      return;
    }

    onClear?.();
  }

  return (
    <>
      <style>{`

        /* =====================================================
           BILL ACTIONS - MODERN V2
           ===================================================== */

        .bill-actions-v2 {
          width: 100%;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 14px;

          margin-top: 18px;

          padding: 14px 0 2px;
        }


        /* =====================================================
           LEFT / RIGHT GROUP
           ===================================================== */

        .bill-actions-v2-left,
        .bill-actions-v2-right {
          display: flex;

          align-items: center;

          gap: 9px;
        }


        /* =====================================================
           BASE BUTTON
           ===================================================== */

        .bill-actions-v2-button {
          position: relative;

          height: 42px;

          min-width: 88px;

          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 7px;

          padding: 0 15px;

          border-radius: 10px;

          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Arial,
            sans-serif;

          font-size: 12px;

          font-weight: 700;

          line-height: 1;

          cursor: pointer;

          user-select: none;

          outline: none;

          transition:
            transform .15s ease,
            background .15s ease,
            border-color .15s ease,
            color .15s ease,
            box-shadow .15s ease,
            opacity .15s ease;
        }


        /* =====================================================
           BACK BUTTON
           ===================================================== */

        .bill-actions-v2-back {
          border: 1px solid #d8dee8;

          background: #ffffff;

          color: #475467;

          box-shadow:
            0 1px 2px
              rgba(16,24,40,.025);
        }

        .bill-actions-v2-back:hover:not(:disabled) {
          border-color: #c2cad6;

          background: #f8fafc;

          color: #1d2939;

          transform: translateY(-1px);

          box-shadow:
            0 4px 10px
              rgba(16,24,40,.07);
        }

        .bill-actions-v2-back:active:not(:disabled) {
          transform: translateY(0);

          box-shadow:
            0 1px 3px
              rgba(16,24,40,.05);
        }


        /* =====================================================
           PREVIEW BUTTON
           ===================================================== */

        .bill-actions-v2-preview {
          border: 1px solid #d8dee8;

          background: #ffffff;

          color: #344054;

          box-shadow:
            0 1px 2px
              rgba(16,24,40,.025);
        }

        .bill-actions-v2-preview:hover:not(:disabled) {
          border-color: #bfc8d6;

          background: #f8fafc;

          color: #172033;

          transform: translateY(-1px);

          box-shadow:
            0 4px 10px
              rgba(16,24,40,.06);
        }

        .bill-actions-v2-preview:active:not(:disabled) {
          transform: translateY(0);
        }


        /* =====================================================
           SAVE BUTTON
           ===================================================== */

        .bill-actions-v2-save {
          min-width: 116px;

          border: 1px solid #5148d7;

          background:
            linear-gradient(
              135deg,
              #554bdc 0%,
              #6b61ee 100%
            );

          color: #ffffff;

          box-shadow:
            0 4px 10px
              rgba(79,70,229,.18),
            inset 0 1px 0
              rgba(255,255,255,.16);
        }

        .bill-actions-v2-save:hover:not(:disabled) {
          border-color: #453cc8;

          background:
            linear-gradient(
              135deg,
              #4d43d0 0%,
              #5f55df 100%
            );

          transform: translateY(-1px);

          box-shadow:
            0 7px 16px
              rgba(79,70,229,.24),
            inset 0 1px 0
              rgba(255,255,255,.18);
        }

        .bill-actions-v2-save:active:not(:disabled) {
          transform: translateY(0);

          box-shadow:
            0 3px 7px
              rgba(79,70,229,.18);
        }


        /* =====================================================
           ICONS
           ===================================================== */

        .bill-actions-v2-icon {
          width: 17px;

          height: 17px;

          display: inline-flex;

          align-items: center;

          justify-content: center;

          font-size: 14px;

          line-height: 1;

          flex-shrink: 0;
        }


        /* =====================================================
           SAVE ICON
           ===================================================== */

        .bill-actions-v2-save-icon {
          font-size: 14px;
        }


        /* =====================================================
           LOADING SPINNER
           ===================================================== */

        .bill-actions-v2-spinner {
          width: 15px;

          height: 15px;

          display: inline-block;

          flex-shrink: 0;

          border:
            2px solid
            rgba(255,255,255,.38);

          border-top-color: #ffffff;

          border-radius: 50%;

          animation:
            bill-actions-spin
            .65s linear infinite;
        }

        @keyframes bill-actions-spin {
          to {
            transform: rotate(360deg);
          }
        }


        /* =====================================================
           DISABLED
           ===================================================== */

        .bill-actions-v2-button:disabled {
          opacity: .55;

          cursor: not-allowed;

          transform: none !important;

          box-shadow:
            none !important;
        }


        /* =====================================================
           KEYBOARD ACCESSIBILITY
           ===================================================== */

        .bill-actions-v2-button:focus-visible {
          outline:
            3px solid
            rgba(99,91,255,.22);

          outline-offset: 2px;
        }


        /* =====================================================
           SMALL STATUS AREA
           ===================================================== */

        .bill-actions-v2-status {
          display: flex;

          align-items: center;

          gap: 6px;

          margin-right: 4px;

          color: #98a2b3;

          font-size: 10px;

          font-weight: 500;
        }

        .bill-actions-v2-status-dot {
          width: 6px;

          height: 6px;

          border-radius: 50%;

          background: #22c55e;

          box-shadow:
            0 0 0 3px
              rgba(34,197,94,.10);
        }


        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 640px) {

          .bill-actions-v2 {
            flex-direction: column;

            align-items: stretch;

            gap: 10px;

            margin-top: 14px;

            padding-top: 12px;
          }

          .bill-actions-v2-left,
          .bill-actions-v2-right {
            width: 100%;
          }

          .bill-actions-v2-right {
            display: grid;

            grid-template-columns:
              1fr 1fr;
          }

          .bill-actions-v2-left
          .bill-actions-v2-button {
            width: 100%;
          }

          .bill-actions-v2-right
          .bill-actions-v2-button {
            width: 100%;
          }

        }


        /* =====================================================
           VERY SMALL SCREENS
           ===================================================== */

        @media (max-width: 390px) {

          .bill-actions-v2-right {
            grid-template-columns: 1fr;
          }

          .bill-actions-v2-button {
            width: 100%;
          }

        }


        /* =====================================================
           REDUCED MOTION
           ===================================================== */

        @media (prefers-reduced-motion: reduce) {

          .bill-actions-v2 *,
          .bill-actions-v2-button {
            animation: none !important;

            transition: none !important;
          }

        }

      `}</style>


      {/* =====================================================
          ACTION BAR
          ===================================================== */}

      <div className="bill-actions-v2">


        {/* ===================================================
            LEFT
            =================================================== */}

        <div className="bill-actions-v2-left">

          <button
            type="button"
            className="
              bill-actions-v2-button
              bill-actions-v2-back
            "
            onClick={handleBack}
            disabled={saving}
          >

            <span className="bill-actions-v2-icon">
              ←
            </span>

            Back

          </button>

        </div>


        {/* ===================================================
            RIGHT
            =================================================== */}

        <div className="bill-actions-v2-right">


          {/* PREVIEW */}

          <button
            type="button"
            className="
              bill-actions-v2-button
              bill-actions-v2-preview
            "
            onClick={onPreview}
            disabled={saving}
          >

            <span className="bill-actions-v2-icon">
              👁
            </span>

            Preview

          </button>


          {/* EXPORT PDF */}

          <button
            type="button"
            className="
              bill-actions-v2-button
              bill-actions-v2-preview
            "
            onClick={onExport || onPreview}
            disabled={saving}
          >
            <span className="bill-actions-v2-icon">⬇</span>
            Export PDF
          </button>


          {/* SAVE */}

          <button
            type="button"
            className="
              bill-actions-v2-button
              bill-actions-v2-save
            "
            onClick={onSave}
            disabled={saving}
          >

            {saving ? (

              <>
                <span className="bill-actions-v2-spinner" />

                Saving...
              </>

            ) : (

              <>
                <span className="bill-actions-v2-icon bill-actions-v2-save-icon">
                  ✓
                </span>

                Save Bill
              </>

            )}

          </button>

        </div>

      </div>
    </>
  );
}