// src/components/billing/BillHeader.jsx

import React from "react";

export default function BillHeader({
  title,
  icon = "🧾",
  company,
  onBack,
}) {
  return (
    <>
      <style>{`

        /* =====================================================
           BILL HEADER - MODERN V3
           ===================================================== */

        .bill-header-v3 {
          width: 100%;

          margin: 0 0 22px;

          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Arial,
            sans-serif;

          color: #172033;
        }


        /* =====================================================
           HEADER MAIN
           ===================================================== */

        .bill-header-v3-main {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

          min-height: 64px;
        }


        /* =====================================================
           LEFT SIDE
           ===================================================== */

        .bill-header-v3-left {
          min-width: 0;

          display: flex;

          align-items: center;

          gap: 14px;
        }


        /* =====================================================
           ICON
           ===================================================== */

        .bill-header-v3-icon {
          width: 50px;
          height: 50px;

          flex-shrink: 0;

          display: flex;

          align-items: center;
          justify-content: center;

          border: 1px solid #dfe3ff;

          border-radius: 14px;

          background:
            linear-gradient(
              135deg,
              #f1f2ff 0%,
              #e7eaff 100%
            );

          color: #4f46e5;

          font-size: 22px;

          box-shadow:
            0 2px 7px
              rgba(79,70,229,.07),
            inset 0 1px 0
              rgba(255,255,255,.85);

          transition:
            transform .16s ease,
            box-shadow .16s ease;
        }

        .bill-header-v3-icon:hover {
          transform: translateY(-1px);

          box-shadow:
            0 5px 13px
              rgba(79,70,229,.11),
            inset 0 1px 0
              rgba(255,255,255,.85);
        }


        /* =====================================================
           TEXT CONTAINER
           ===================================================== */

        .bill-header-v3-content {
          min-width: 0;

          display: flex;

          flex-direction: column;

          justify-content: center;
        }


        /* =====================================================
           BILL TITLE
           ===================================================== */

        .bill-header-v3-title {
          margin: 0;

          color: #172033;

          font-size: 27px;

          line-height: 32px;

          font-weight: 800;

          letter-spacing: -.035em;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;
        }


        /* =====================================================
           COMPANY NAME

           Large and prominent
           ===================================================== */

        .bill-header-v3-company {
          display: block;

          width: fit-content;

          max-width: 100%;

          margin: 3px 0 0;

          color: #5148d7;

          font-size: 20px;

          line-height: 25px;

          font-weight: 750;

          letter-spacing: -.025em;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;
        }


        /* =====================================================
           COMPANY NAME UNDERLINE ACCENT
           ===================================================== */

        .bill-header-v3-company::after {
          content: "";

          display: block;

          width: 38px;

          height: 2px;

          margin-top: 3px;

          border-radius: 99px;

          background:
            linear-gradient(
              90deg,
              #635bff,
              #8b83f7
            );
        }


        /* =====================================================
           BACK BUTTON
           ===================================================== */

        .bill-header-v3-back {
          height: 40px;

          flex-shrink: 0;

          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 7px;

          padding: 0 13px;

          border: 1px solid #d8dee8;

          border-radius: 9px;

          background: #ffffff;

          color: #475467;

          font-family: inherit;

          font-size: 11.5px;

          font-weight: 700;

          cursor: pointer;

          box-shadow:
            0 1px 2px
              rgba(16,24,40,.025);

          transition:
            transform .14s ease,
            background .14s ease,
            border-color .14s ease,
            color .14s ease,
            box-shadow .14s ease;
        }

        .bill-header-v3-back:hover {
          border-color: #c3cbd7;

          background: #f8fafc;

          color: #1d2939;

          transform: translateY(-1px);

          box-shadow:
            0 4px 10px
              rgba(16,24,40,.06);
        }

        .bill-header-v3-back:active {
          transform: translateY(0);

          box-shadow:
            0 1px 3px
              rgba(16,24,40,.04);
        }


        /* =====================================================
           BACK ICON
           ===================================================== */

        .bill-header-v3-back-icon {
          width: 17px;

          height: 17px;

          display: flex;

          align-items: center;
          justify-content: center;

          font-size: 15px;

          line-height: 1;

          transition:
            transform .14s ease;
        }

        .bill-header-v3-back:hover
        .bill-header-v3-back-icon {
          transform: translateX(-2px);
        }


        /* =====================================================
           RESPONSIVE - TABLET
           ===================================================== */

        @media (max-width: 700px) {

          .bill-header-v3 {
            margin-bottom: 18px;
          }

          .bill-header-v3-main {
            gap: 14px;

            min-height: 58px;
          }

          .bill-header-v3-left {
            gap: 11px;
          }

          .bill-header-v3-icon {
            width: 44px;
            height: 44px;

            border-radius: 12px;

            font-size: 19px;
          }

          .bill-header-v3-title {
            font-size: 24px;

            line-height: 29px;
          }

          .bill-header-v3-company {
            font-size: 18px;

            line-height: 23px;
          }

          .bill-header-v3-back {
            height: 37px;

            padding: 0 11px;
          }

        }


        /* =====================================================
           RESPONSIVE - MOBILE
           ===================================================== */

        @media (max-width: 520px) {

          .bill-header-v3-main {
            gap: 10px;
          }

          .bill-header-v3-left {
            gap: 9px;
          }

          .bill-header-v3-icon {
            width: 40px;
            height: 40px;

            border-radius: 10px;

            font-size: 17px;
          }

          .bill-header-v3-title {
            font-size: 21px;

            line-height: 26px;
          }

          .bill-header-v3-company {
            font-size: 16px;

            line-height: 21px;
          }

          .bill-header-v3-company::after {
            width: 30px;

            height: 2px;

            margin-top: 2px;
          }

          .bill-header-v3-back {
            width: 37px;

            height: 37px;

            padding: 0;
          }

          .bill-header-v3-back-text {
            display: none;
          }

        }


        /* =====================================================
           VERY SMALL MOBILE
           ===================================================== */

        @media (max-width: 380px) {

          .bill-header-v3-icon {
            width: 37px;
            height: 37px;

            font-size: 16px;
          }

          .bill-header-v3-title {
            font-size: 19px;

            line-height: 23px;
          }

          .bill-header-v3-company {
            font-size: 14px;

            line-height: 19px;
          }

          .bill-header-v3-back {
            width: 34px;

            height: 34px;
          }

        }


        /* =====================================================
           ACCESSIBILITY
           ===================================================== */

        .bill-header-v3-back:focus-visible {
          outline:
            3px solid
            rgba(99,91,255,.20);

          outline-offset: 2px;
        }


        /* =====================================================
           REDUCED MOTION
           ===================================================== */

        @media (prefers-reduced-motion: reduce) {

          .bill-header-v3 *,
          .bill-header-v3-icon,
          .bill-header-v3-back {
            transition: none !important;
          }

        }

      `}</style>


      {/* =====================================================
          BILL HEADER
          ===================================================== */}

      <header className="bill-header-v3">

        <div className="bill-header-v3-main">


          {/* =================================================
              LEFT SIDE
              ================================================= */}

          <div className="bill-header-v3-left">


            {/* =================================================
                ICON
                ================================================= */}

            <div
              className="bill-header-v3-icon"
              aria-hidden="true"
            >
              {icon}
            </div>


            {/* =================================================
                TITLE + COMPANY
                ================================================= */}

            <div className="bill-header-v3-content">


              {/* BILL TITLE */}

              <h1 className="bill-header-v3-title">
                {title}
              </h1>


              {/* COMPANY NAME */}

              {company?.company_name && (

                <div
                  className="bill-header-v3-company"
                  title={company.company_name}
                >
                  {company.company_name}
                </div>

              )}

            </div>

          </div>


          {/* =================================================
              BACK BUTTON
              ================================================= */}

          {onBack && (

            <button
              type="button"
              className="bill-header-v3-back"
              onClick={onBack}
            >

              <span className="bill-header-v3-back-icon">
                ←
              </span>

              <span className="bill-header-v3-back-text">
                Back
              </span>

            </button>

          )}

        </div>

      </header>
    </>
  );
}