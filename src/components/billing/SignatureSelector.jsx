// src/components/billing/SignatureSelector.jsx

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const BUCKET = "signatures";

export default function SignatureSelector({
  userId,
  selectedSignature,
  onSignatureChange,
}) {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectingPath, setSelectingPath] = useState(null);

  /*
   * =========================================================
   * LOAD SIGNATURES + PREVIEW URLS
   * =========================================================
   */

  async function loadSignatures() {
    if (!userId) {
      setSignatures([]);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(userId, {
          limit: 100,
          sortBy: {
            column: "name",
            order: "asc",
          },
        });

      if (error) {
        console.error(
          "Error loading signatures:",
          error
        );

        throw error;
      }

      const files = (data || []).filter(
        (file) =>
          file.name &&
          file.name !== ".emptyFolderPlaceholder"
      );

      /*
       * Create signed preview URLs for ALL signatures.
       *
       * This is the important fix:
       * preview is generated before the user selects anything.
       */

      const result = await Promise.all(
        files.map(async (file) => {
          const path = `${userId}/${file.name}`;

          const { data: signedData, error: signedError } =
            await supabase.storage
              .from(BUCKET)
              .createSignedUrl(path, 3600);

          if (signedError) {
            console.error(
              `Preview error for ${file.name}:`,
              signedError
            );
          }

          return {
            name: file.name,
            path,
            previewUrl:
              signedData?.signedUrl || null,
          };
        })
      );

      setSignatures(result);
    } catch (error) {
      console.error(
        "Error loading signatures:",
        error
      );

      setSignatures([]);
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================================
   * LOAD WHEN USER CHANGES
   * =========================================================
   */

  useEffect(() => {
    loadSignatures();
  }, [userId]);

  /*
   * =========================================================
   * SELECT SIGNATURE
   * =========================================================
   */

  function handleSelect(signature) {
    try {
      setSelectingPath(signature.path);

      onSignatureChange?.({
        name: signature.name,
        path: signature.path,
        previewUrl: signature.previewUrl,
      });
    } finally {
      setSelectingPath(null);
    }
  }

  /*
   * =========================================================
   * CLEAR SIGNATURE
   * =========================================================
   */

  function clearSignature() {
    onSignatureChange?.(null);
  }

  /*
   * =========================================================
   * DISPLAY NAME
   * =========================================================
   */

  function getDisplayName(name) {
    if (!name) {
      return "Signature";
    }

    return name.replace(
      /\.(png|jpg|jpeg|webp|gif|svg)$/i,
      ""
    );
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <>
      <style>{`
        .signature-selector-v6 {
          width: 100%;
          margin: 0 0 18px;
          padding: 20px;
          border: 1px solid #e4e7ec;
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

        .signature-selector-v6 *,
        .signature-selector-v6 *::before,
        .signature-selector-v6 *::after {
          box-sizing: border-box;
        }

        /* =====================================================
           HEADER
           ===================================================== */

        .signature-selector-v6-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 17px;
        }

        .signature-selector-v6-title-wrap {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .signature-selector-v6-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #dedcff;
          border-radius: 9px;
          background: linear-gradient(
            135deg,
            #f3f2ff 0%,
            #ecebff 100%
          );
          color: #5148d7;
          font-size: 17px;
          box-shadow:
            0 1px 3px rgba(79,70,229,.06),
            inset 0 1px 0 rgba(255,255,255,.8);
        }

        .signature-selector-v6-title {
          margin: 0;
          color: #172033;
          font-size: 15px;
          line-height: 20px;
          font-weight: 800;
          letter-spacing: -.02em;
        }

        .signature-selector-v6-subtitle {
          margin: 2px 0 0;
          color: #98a2b3;
          font-size: 10px;
          line-height: 14px;
          font-weight: 500;
        }

        .signature-selector-v6-count {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 27px;
          height: 23px;
          padding: 0 8px;
          border: 1px solid #e4e7ec;
          border-radius: 6px;
          background: #fafbfc;
          color: #667085;
          font-size: 9px;
          line-height: 13px;
          font-weight: 700;
        }

        /* =====================================================
           LOADING
           ===================================================== */

        .signature-selector-v6-loading {
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 8px;
          border: 1px dashed #dfe3ea;
          border-radius: 9px;
          background: #fafbfc;
          color: #98a2b3;
          font-size: 10px;
          font-weight: 550;
        }

        .signature-selector-v6-spinner {
          width: 23px;
          height: 23px;
          border: 2px solid #e7e8f3;
          border-top-color: #635bff;
          border-radius: 50%;
          animation:
            signature-selector-v6-spin
            .75s linear infinite;
        }

        @keyframes signature-selector-v6-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =====================================================
           EMPTY
           ===================================================== */

        .signature-selector-v6-empty {
          min-height: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 6px;
          padding: 20px;
          border: 1px dashed #dfe3ea;
          border-radius: 9px;
          background: #fafbfc;
          text-align: center;
        }

        .signature-selector-v6-empty-icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: #f1f2f5;
          color: #98a2b3;
          font-size: 14px;
        }

        .signature-selector-v6-empty-title {
          color: #667085;
          font-size: 10px;
          line-height: 14px;
          font-weight: 700;
        }

        .signature-selector-v6-empty-text {
          color: #98a2b3;
          font-size: 8.5px;
          line-height: 13px;
        }

        /* =====================================================
           SIGNATURE GRID
           ===================================================== */

        .signature-selector-v6-list {
          display: grid;
          grid-template-columns:
            repeat(auto-fill, minmax(155px, 1fr));
          gap: 11px;
        }

        /* =====================================================
           SIGNATURE CARD
           ===================================================== */

        .signature-selector-v6-option {
          position: relative;
          min-width: 0;
          min-height: 135px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 8px;
          padding: 9px;
          border: 1px solid #e4e7ec;
          border-radius: 9px;
          background: #ffffff;
          color: #344054;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          overflow: hidden;
          transition:
            border-color .14s ease,
            box-shadow .14s ease,
            transform .14s ease,
            background .14s ease;
        }

        .signature-selector-v6-option:hover {
          border-color: #c9c6f5;
          background: #fcfcff;
          transform: translateY(-1px);
          box-shadow:
            0 6px 14px rgba(16,24,40,.07);
        }

        .signature-selector-v6-option.selected {
          border-color: #8179ee;
          background: #f8f7ff;
          box-shadow:
            0 0 0 2px rgba(99,91,255,.09);
        }

        .signature-selector-v6-option:focus-visible {
          outline: 3px solid rgba(99,91,255,.15);
          outline-offset: 2px;
        }

        .signature-selector-v6-option:disabled {
          cursor: default;
        }

        /* =====================================================
           PREVIEW
           ===================================================== */

        .signature-selector-v6-preview {
          width: 100%;
          height: 88px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border: 1px solid #eaecf0;
          border-radius: 6px;

          /*
           * Checkerboard background makes transparent
           * PNG signatures easier to see.
           */
          background-color: #ffffff;
          background-image:
            linear-gradient(
              45deg,
              #f4f5f7 25%,
              transparent 25%
            ),
            linear-gradient(
              -45deg,
              #f4f5f7 25%,
              transparent 25%
            ),
            linear-gradient(
              45deg,
              transparent 75%,
              #f4f5f7 75%
            ),
            linear-gradient(
              -45deg,
              transparent 75%,
              #f4f5f7 75%
            );
          background-size: 12px 12px;
          background-position:
            0 0,
            0 6px,
            6px -6px,
            -6px 0px;

          overflow: hidden;
        }

        .signature-selector-v6-preview img {
          display: block;
          max-width: 100%;
          max-height: 72px;
          width: auto;
          height: auto;
          object-fit: contain;
        }

        .signature-selector-v6-no-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 4px;
          color: #b0b7c3;
          font-size: 8px;
          font-weight: 600;
        }

        .signature-selector-v6-no-preview-icon {
          font-size: 18px;
          opacity: .7;
        }

        /* =====================================================
           CARD FOOTER
           ===================================================== */

        .signature-selector-v6-footer {
          width: 100%;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 7px;
        }

        .signature-selector-v6-name {
          min-width: 0;
          overflow: hidden;
          color: #344054;
          font-size: 9px;
          line-height: 14px;
          font-weight: 700;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .signature-selector-v6-selected-badge {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 5px;
          border-radius: 4px;
          background: #ebeaff;
          color: #5148d7;
          font-size: 7px;
          line-height: 11px;
          font-weight: 750;
        }

        /* =====================================================
           SELECTING SPINNER
           ===================================================== */

        .signature-selector-v6-small-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid #e7e8f3;
          border-top-color: #635bff;
          border-radius: 50%;
          animation:
            signature-selector-v6-spin
            .75s linear infinite;
        }

        /* =====================================================
           SELECTED SIGNATURE
           ===================================================== */

        .signature-selector-v6-selected {
          display: grid;
          grid-template-columns:
            135px minmax(0, 1fr) auto;
          gap: 13px;
          align-items: center;
          margin-top: 14px;
          padding: 11px;
          border: 1px solid #dedcff;
          border-radius: 9px;
          background: linear-gradient(
            135deg,
            #faf9ff 0%,
            #f6f5ff 100%
          );
        }

        .signature-selector-v6-selected-preview {
          width: 135px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 7px;
          border: 1px solid #e3e1fa;
          border-radius: 6px;
          background: #fff;
          overflow: hidden;
        }

        .signature-selector-v6-selected-preview img {
          max-width: 100%;
          max-height: 56px;
          object-fit: contain;
        }

        .signature-selector-v6-selected-info {
          min-width: 0;
        }

        .signature-selector-v6-selected-label {
          margin-bottom: 3px;
          color: #8b83d8;
          font-size: 8px;
          line-height: 12px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: .045em;
        }

        .signature-selector-v6-selected-name {
          display: block;
          overflow: hidden;
          color: #344054;
          font-size: 10.5px;
          line-height: 16px;
          font-weight: 750;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .signature-selector-v6-selected-path {
          margin-top: 2px;
          overflow: hidden;
          color: #98a2b3;
          font-size: 8px;
          line-height: 12px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        /* =====================================================
           REMOVE
           ===================================================== */

        .signature-selector-v6-remove {
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 0 9px;
          border: 1px solid #e4e7ec;
          border-radius: 6px;
          background: #fff;
          color: #667085;
          font-family: inherit;
          font-size: 8.5px;
          font-weight: 700;
          cursor: pointer;
          transition:
            border-color .14s ease,
            background .14s ease,
            color .14s ease,
            transform .14s ease;
        }

        .signature-selector-v6-remove:hover {
          border-color: #f0b8bd;
          background: #fff8f8;
          color: #c43d4b;
          transform: translateY(-1px);
        }

        .signature-selector-v6-remove:active {
          transform: translateY(0);
        }

        .signature-selector-v6-remove:focus-visible {
          outline: 3px solid rgba(99,91,255,.14);
          outline-offset: 2px;
        }

        /* =====================================================
           RESPONSIVE
           ===================================================== */

        @media (max-width: 700px) {
          .signature-selector-v6 {
            padding: 15px;
          }

          .signature-selector-v6-list {
            grid-template-columns:
              repeat(auto-fill, minmax(135px, 1fr));
          }

          .signature-selector-v6-selected {
            grid-template-columns:
              110px minmax(0, 1fr);
          }

          .signature-selector-v6-selected-preview {
            width: 110px;
          }

          .signature-selector-v6-remove {
            grid-column: 1 / -1;
            width: 100%;
          }
        }

        @media (max-width: 460px) {
          .signature-selector-v6 {
            padding: 13px;
            border-radius: 10px;
          }

          .signature-selector-v6-count {
            display: none;
          }

          .signature-selector-v6-list {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .signature-selector-v6-option {
            min-height: 125px;
            padding: 7px;
          }

          .signature-selector-v6-preview {
            height: 78px;
          }

          .signature-selector-v6-selected {
            grid-template-columns: 1fr;
          }

          .signature-selector-v6-selected-preview {
            width: 100%;
            height: 85px;
          }

          .signature-selector-v6-selected-preview img {
            max-height: 70px;
          }
        }

        @media (max-width: 330px) {
          .signature-selector-v6-list {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .signature-selector-v6 *,
          .signature-selector-v6 *::before,
          .signature-selector-v6 *::after {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>

      <section className="signature-selector-v6">

        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="signature-selector-v6-header">
          <div className="signature-selector-v6-title-wrap">

            <div
              className="signature-selector-v6-icon"
              aria-hidden="true"
            >
              ✍
            </div>

            <div>
              <h2 className="signature-selector-v6-title">
                Signature
              </h2>

              <div className="signature-selector-v6-subtitle">
                Choose a saved signature for this bill
              </div>
            </div>

          </div>

          {!loading &&
            signatures.length > 0 && (
              <span className="signature-selector-v6-count">
                {signatures.length}
              </span>
            )}
        </div>

        {/* =====================================================
            LOADING
            ===================================================== */}

        {loading ? (
          <div className="signature-selector-v6-loading">

            <div
              className="signature-selector-v6-spinner"
              aria-hidden="true"
            />

            <span>
              Loading signature previews...
            </span>

          </div>
        ) : signatures.length === 0 ? (

          /* ===================================================
             EMPTY
             =================================================== */

          <div className="signature-selector-v6-empty">

            <div
              className="signature-selector-v6-empty-icon"
              aria-hidden="true"
            >
              ✍
            </div>

            <div className="signature-selector-v6-empty-title">
              No saved signatures found
            </div>

            <div className="signature-selector-v6-empty-text">
              Upload a signature to use it on your bills.
            </div>

          </div>

        ) : (

          /* ===================================================
             SIGNATURE LIST
             =================================================== */

          <div className="signature-selector-v6-list">

            {signatures.map((signature) => {
              const selected =
                selectedSignature?.path ===
                signature.path;

              const selecting =
                selectingPath ===
                signature.path;

              return (
                <button
                  key={signature.path}
                  type="button"
                  className={`
                    signature-selector-v6-option
                    ${selected ? "selected" : ""}
                  `}
                  onClick={() =>
                    handleSelect(signature)
                  }
                  disabled={selecting}
                  title={`Select ${getDisplayName(
                    signature.name
                  )}`}
                >

                  {/* =========================================
                      ACTUAL SIGNATURE PREVIEW
                      ========================================= */}

                  <div className="signature-selector-v6-preview">

                    {selecting ? (
                      <span
                        className="signature-selector-v6-small-spinner"
                        aria-label="Selecting signature"
                      />
                    ) : signature.previewUrl ? (

                      /*
                       * IMPORTANT:
                       * This uses signature.previewUrl,
                       * NOT selectedSignature.previewUrl.
                       *
                       * Therefore every signature is visible
                       * before it is selected.
                       */

                      <img
                        src={signature.previewUrl}
                        alt={`${getDisplayName(
                          signature.name
                        )} signature`}
                      />

                    ) : (

                      <div className="signature-selector-v6-no-preview">

                        <span
                          className="signature-selector-v6-no-preview-icon"
                          aria-hidden="true"
                        >
                          ✍
                        </span>

                        <span>
                          Preview unavailable
                        </span>

                      </div>
                    )}

                  </div>

                  {/* =========================================
                      CARD FOOTER
                      ========================================= */}

                  <span className="signature-selector-v6-footer">

                    <span className="signature-selector-v6-name">
                      {getDisplayName(
                        signature.name
                      )}
                    </span>

                    {selected && (
                      <span className="signature-selector-v6-selected-badge">
                        ✓ Selected
                      </span>
                    )}

                  </span>

                </button>
              );
            })}

          </div>
        )}

        {/* =====================================================
            SELECTED SIGNATURE
            ===================================================== */}

        {selectedSignature && (
          <div className="signature-selector-v6-selected">

            <div className="signature-selector-v6-selected-preview">

              {selectedSignature.previewUrl ? (
                <img
                  src={
                    selectedSignature.previewUrl
                  }
                  alt="Selected signature"
                />
              ) : (
                <div className="signature-selector-v6-no-preview">
                  <span
                    className="signature-selector-v6-no-preview-icon"
                  >
                    ✍
                  </span>

                  <span>
                    Preview unavailable
                  </span>
                </div>
              )}

            </div>

            <div className="signature-selector-v6-selected-info">

              <div className="signature-selector-v6-selected-label">
                Selected Signature
              </div>

              <strong className="signature-selector-v6-selected-name">
                {getDisplayName(
                  selectedSignature.name
                )}
              </strong>

              <div className="signature-selector-v6-selected-path">
                {selectedSignature.path}
              </div>

            </div>

            <button
              type="button"
              className="signature-selector-v6-remove"
              onClick={clearSignature}
            >
              <span aria-hidden="true">
                ×
              </span>

              Remove
            </button>

          </div>
        )}

      </section>
    </>
  );
}