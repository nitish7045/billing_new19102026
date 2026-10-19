import { useEffect, useState } from "react";
import {
  addBank,
  getBanks,
} from "../../services/bankService";

export default function BankSelector({
  userId,
  selectedBank,
  onBankChange,
}) {
  const [banks, setBanks] = useState([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);

  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branch, setBranch] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // =========================================================
  // LOAD BANKS
  // =========================================================

  async function loadBanks() {
    if (!userId) return;

    try {
      setLoading(true);

      const data = await getBanks(userId);

      setBanks(data || []);
    } catch (error) {
      console.error("Unable to load banks:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBanks();
  }, [userId]);

  // =========================================================
  // SELECT BANK
  // =========================================================

  function selectBank(bank) {
    onBankChange(bank);

    setSearch(bank.bank_name || "");

    setShowDropdown(false);
  }

  // =========================================================
  // CLEAR BANK
  // =========================================================

  function clearBank() {
    onBankChange(null);

    setSearch("");

    setShowDropdown(false);
  }

  // =========================================================
  // ADD BANK
  // =========================================================

  async function handleAddBank() {
    if (!bankName.trim()) {
      alert("Enter bank name.");
      return;
    }

    if (!accountNumber.trim()) {
      alert("Enter account number.");
      return;
    }

    try {
      setSaving(true);

      const newBank = await addBank({
        userId,
        bankName,
        accountNumber,
        ifscCode,
        branch,
      });

      setBanks((previous) =>
        [...previous, newBank].sort((a, b) =>
          (a.bank_name || "").localeCompare(
            b.bank_name || ""
          )
        )
      );

      onBankChange(newBank);

      setSearch(newBank.bank_name || "");

      setBankName("");
      setAccountNumber("");
      setIfscCode("");
      setBranch("");

      setShowAddBank(false);
    } catch (error) {
      alert(
        error?.message ||
          "Unable to add bank."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // FILTER BANKS
  // =========================================================

  const filteredBanks = banks.filter((bank) => {
    const value = search
      .toLowerCase()
      .trim();

    if (!value) return true;

    return (
      bank.bank_name
        ?.toLowerCase()
        .includes(value) ||
      bank.account_number
        ?.toLowerCase()
        .includes(value) ||
      bank.ifsc_code
        ?.toLowerCase()
        .includes(value)
    );
  });

  // =========================================================
  // CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  // =========================================================

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        !event.target.closest(
          ".bank-selector-v2"
        )
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // =========================================================
  // UI
  // =========================================================

  return (
    <>
      <style>{`

        /* =====================================================
           BANK SELECTOR V2
           ===================================================== */

        .bank-selector-v2 {
          width: 100%;
          position: relative;
          box-sizing: border-box;

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

        .bank-selector-v2 *,
        .bank-selector-v2 *::before,
        .bank-selector-v2 *::after {
          box-sizing: border-box;
        }


        /* =====================================================
           HEADER
           ===================================================== */

        .bank-selector-v2-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 16px;

          margin-bottom: 14px;
        }

        .bank-selector-v2-title-wrap {
          display: flex;
          align-items: center;

          gap: 11px;
        }

        .bank-selector-v2-icon {
          width: 38px;
          height: 38px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background:
            linear-gradient(
              135deg,
              #eef2ff,
              #e0e7ff
            );

          color: #4f46e5;

          font-size: 18px;

          box-shadow:
            inset 0 1px 0
              rgba(255,255,255,.8);
        }

        .bank-selector-v2-title {
          margin: 0;

          font-size: 14px;
          line-height: 20px;

          font-weight: 750;

          color: #172033;

          letter-spacing: -.01em;
        }

        .bank-selector-v2-subtitle {
          margin: 2px 0 0;

          font-size: 10.5px;
          line-height: 15px;

          color: #8a94a6;
        }


        /* =====================================================
           MAIN BOX
           ===================================================== */

        .bank-selector-v2-box {
          position: relative;

          display: flex;
          align-items: center;

          gap: 9px;

          width: 100%;

          padding: 8px;

          border: 1px solid #dbe2ec;

          border-radius: 13px;

          background: #ffffff;

          box-shadow:
            0 1px 2px
              rgba(16,24,40,.025);

          transition:
            border-color .16s ease,
            box-shadow .16s ease,
            background .16s ease;
        }

        .bank-selector-v2-box:focus-within {
          border-color: #8b83f7;

          background: #ffffff;

          box-shadow:
            0 0 0 4px
              rgba(99,91,255,.09),
            0 5px 16px
              rgba(16,24,40,.045);
        }


        /* =====================================================
           SEARCH
           ===================================================== */

        .bank-selector-v2-search-wrap {
          position: relative;

          flex: 1;

          min-width: 0;
        }

        .bank-selector-v2-search-icon {
          position: absolute;

          left: 12px;
          top: 50%;

          transform: translateY(-50%);

          width: 17px;
          height: 17px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #98a2b3;

          font-size: 14px;

          pointer-events: none;
        }

        .bank-selector-v2-search {
          width: 100%;

          height: 40px;

          padding:
            0 38px
            0 37px;

          border: 0;

          outline: none;

          border-radius: 9px;

          background: #f8fafc;

          color: #172033;

          font-size: 12px;

          font-weight: 500;

          transition:
            background .16s ease;
        }

        .bank-selector-v2-search:hover {
          background: #f5f7fa;
        }

        .bank-selector-v2-search:focus {
          background: #f5f7fa;
        }

        .bank-selector-v2-search::placeholder {
          color: #a1aaba;
        }


        /* =====================================================
           SEARCH CLEAR
           ===================================================== */

        .bank-selector-v2-search-clear {
          position: absolute;

          right: 8px;
          top: 50%;

          transform: translateY(-50%);

          width: 27px;
          height: 27px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 0;

          border-radius: 7px;

          background: transparent;

          color: #98a2b3;

          cursor: pointer;

          font-size: 17px;

          transition:
            background .14s ease,
            color .14s ease;
        }

        .bank-selector-v2-search-clear:hover {
          background: #e9edf3;

          color: #475467;
        }


        /* =====================================================
           ADD BANK BUTTON
           ===================================================== */

        .bank-selector-v2-add {
          height: 40px;

          flex-shrink: 0;

          padding:
            0 14px;

          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 6px;

          border: 1px solid #d6dcff;

          border-radius: 9px;

          background:
            linear-gradient(
              135deg,
              #f5f5ff,
              #eef2ff
            );

          color: #4f46e5;

          font-size: 11.5px;

          font-weight: 700;

          cursor: pointer;

          white-space: nowrap;

          transition:
            transform .14s ease,
            border-color .14s ease,
            background .14s ease,
            box-shadow .14s ease;
        }

        .bank-selector-v2-add:hover {
          border-color: #b9b2ff;

          background:
            linear-gradient(
              135deg,
              #eeeeff,
              #e5e9ff
            );

          transform: translateY(-1px);

          box-shadow:
            0 4px 10px
              rgba(79,70,229,.10);
        }

        .bank-selector-v2-add:active {
          transform: translateY(0);
        }

        .bank-selector-v2-add-icon {
          font-size: 16px;

          line-height: 1;
        }


        /* =====================================================
           CLEAR BUTTON
           ===================================================== */

        .bank-selector-v2-clear {
          height: 40px;

          flex-shrink: 0;

          padding: 0 12px;

          border: 1px solid #fecaca;

          border-radius: 9px;

          background: #fff7f7;

          color: #dc2626;

          font-size: 11px;

          font-weight: 700;

          cursor: pointer;

          transition:
            background .14s ease,
            border-color .14s ease,
            transform .14s ease;
        }

        .bank-selector-v2-clear:hover {
          background: #feecec;

          border-color: #fca5a5;

          transform: translateY(-1px);
        }


        /* =====================================================
           DROPDOWN
           ===================================================== */

        .bank-selector-v2-dropdown {
          position: absolute;

          z-index: 9999;

          top: calc(100% + 8px);

          left: 8px;
          right: 8px;

          max-height: 330px;

          overflow-y: auto;

          padding: 6px;

          border: 1px solid #e0e6ef;

          border-radius: 13px;

          background: rgba(255,255,255,.98);

          box-shadow:
            0 20px 50px
              rgba(16,24,40,.15),
            0 4px 12px
              rgba(16,24,40,.06);

          backdrop-filter: blur(12px);

          animation:
            bank-dropdown-in
            .15s ease-out;
        }

        @keyframes bank-dropdown-in {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }


        /* =====================================================
           DROPDOWN EMPTY
           ===================================================== */

        .bank-selector-v2-empty {
          min-height: 100px;

          display: flex;

          flex-direction: column;

          align-items: center;
          justify-content: center;

          gap: 7px;

          padding: 20px;

          color: #98a2b3;

          text-align: center;

          font-size: 11px;
        }

        .bank-selector-v2-empty-icon {
          width: 32px;
          height: 32px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 9px;

          background: #f2f4f7;

          font-size: 15px;
        }


        /* =====================================================
           BANK OPTION
           ===================================================== */

        .bank-selector-v2-option {
          width: 100%;

          display: grid;

          grid-template-columns:
            38px minmax(0, 1fr);

          gap: 10px;

          padding: 11px;

          border: 0;

          border-radius: 10px;

          background: transparent;

          color: #172033;

          text-align: left;

          cursor: pointer;

          transition:
            background .14s ease;
        }

        .bank-selector-v2-option:hover {
          background: #f6f7ff;
        }

        .bank-selector-v2-option:active {
          background: #eef0ff;
        }


        /* =====================================================
           BANK OPTION ICON
           ===================================================== */

        .bank-selector-v2-option-icon {
          width: 38px;
          height: 38px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background: #eef2ff;

          color: #4f46e5;

          font-size: 17px;

          font-weight: 700;
        }


        /* =====================================================
           BANK OPTION CONTENT
           ===================================================== */

        .bank-selector-v2-option-content {
          min-width: 0;

          display: flex;

          flex-direction: column;

          justify-content: center;

          gap: 3px;
        }

        .bank-selector-v2-option-name {
          overflow: hidden;

          color: #172033;

          font-size: 12px;

          font-weight: 750;

          white-space: nowrap;

          text-overflow: ellipsis;
        }

        .bank-selector-v2-option-meta {
          display: flex;

          align-items: center;

          flex-wrap: wrap;

          gap: 7px;

          color: #7a8597;

          font-size: 10px;
        }

        .bank-selector-v2-option-meta span {
          display: inline-flex;

          align-items: center;

          gap: 3px;
        }

        .bank-selector-v2-option-meta span + span::before {
          content: "•";

          color: #c1c8d2;

          margin-right: 3px;
        }


        /* =====================================================
           SELECTED BANK
           ===================================================== */

        .bank-selector-v2-selected {
          position: relative;

          display: flex;

          align-items: center;

          gap: 13px;

          margin-top: 11px;

          padding: 13px 15px;

          border: 1px solid #d8ddff;

          border-radius: 12px;

          background:
            linear-gradient(
              135deg,
              #fafaff,
              #f5f7ff
            );

          box-shadow:
            0 2px 7px
              rgba(79,70,229,.045);
        }

        .bank-selector-v2-selected-icon {
          width: 40px;
          height: 40px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background:
            linear-gradient(
              135deg,
              #e8eaff,
              #eef2ff
            );

          color: #4f46e5;

          font-size: 18px;
        }

        .bank-selector-v2-selected-content {
          min-width: 0;

          flex: 1;

          display: grid;

          grid-template-columns:
            minmax(130px, 1.4fr)
            minmax(120px, 1fr)
            minmax(90px, .8fr)
            minmax(100px, .9fr);

          gap: 12px;
        }

        .bank-selector-v2-selected-item {
          min-width: 0;

          display: flex;

          flex-direction: column;

          gap: 3px;
        }

        .bank-selector-v2-selected-label {
          color: #98a2b3;

          font-size: 9px;

          font-weight: 700;

          text-transform: uppercase;

          letter-spacing: .06em;
        }

        .bank-selector-v2-selected-value {
          overflow: hidden;

          color: #344054;

          font-size: 11.5px;

          font-weight: 600;

          white-space: nowrap;

          text-overflow: ellipsis;
        }

        .bank-selector-v2-selected-value.primary {
          color: #312e81;

          font-weight: 750;
        }


        /* =====================================================
           ADD BANK MODAL OVERLAY
           ===================================================== */

        .bank-selector-v2-overlay {
          position: fixed;

          z-index: 99999;

          inset: 0;

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 22px;

          background:
            rgba(15,23,42,.46);

          backdrop-filter: blur(4px);

          animation:
            bank-overlay-in
            .15s ease-out;
        }

        @keyframes bank-overlay-in {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }


        /* =====================================================
           MODAL
           ===================================================== */

        .bank-selector-v2-modal {
          width: min(520px, 100%);

          max-height:
            min(700px, calc(100vh - 44px));

          overflow: auto;

          border: 1px solid rgba(255,255,255,.7);

          border-radius: 18px;

          background: #fff;

          box-shadow:
            0 30px 80px
              rgba(15,23,42,.25);

          animation:
            bank-modal-in
            .18s cubic-bezier(.2,.8,.2,1);
        }

        @keyframes bank-modal-in {
          from {
            opacity: 0;
            transform:
              translateY(12px)
              scale(.98);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }


        /* =====================================================
           MODAL HEADER
           ===================================================== */

        .bank-selector-v2-modal-header {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 15px;

          padding: 18px 20px;

          border-bottom:
            1px solid #edf0f4;
        }

        .bank-selector-v2-modal-title {
          display: flex;

          align-items: center;

          gap: 11px;
        }

        .bank-selector-v2-modal-icon {
          width: 38px;
          height: 38px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background: #eef2ff;

          color: #4f46e5;

          font-size: 17px;
        }

        .bank-selector-v2-modal-header h3 {
          margin: 0;

          color: #172033;

          font-size: 16px;

          font-weight: 750;

          letter-spacing: -.02em;
        }

        .bank-selector-v2-modal-header p {
          margin: 3px 0 0;

          color: #98a2b3;

          font-size: 10.5px;
        }


        /* =====================================================
           MODAL CLOSE
           ===================================================== */

        .bank-selector-v2-modal-close {
          width: 34px;
          height: 34px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #e3e7ed;

          border-radius: 9px;

          background: #fff;

          color: #667085;

          font-size: 20px;

          line-height: 1;

          cursor: pointer;

          transition:
            background .14s ease,
            color .14s ease,
            border-color .14s ease;
        }

        .bank-selector-v2-modal-close:hover {
          border-color: #d1d7e0;

          background: #f8fafc;

          color: #344054;
        }


        /* =====================================================
           MODAL BODY
           ===================================================== */

        .bank-selector-v2-modal-body {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 16px;

          padding: 20px;
        }

        .bank-selector-v2-field {
          min-width: 0;

          display: flex;

          flex-direction: column;

          gap: 6px;
        }

        .bank-selector-v2-field.full {
          grid-column: 1 / -1;
        }

        .bank-selector-v2-field label {
          color: #344054;

          font-size: 10.5px;

          font-weight: 700;
        }

        .bank-selector-v2-required {
          color: #dc2626;
        }

        .bank-selector-v2-field input {
          width: 100%;

          height: 42px;

          padding: 0 11px;

          border: 1px solid #d5ddea;

          border-radius: 9px;

          outline: none;

          background: #fff;

          color: #172033;

          font-family: inherit;

          font-size: 12px;

          transition:
            border-color .15s ease,
            box-shadow .15s ease;
        }

        .bank-selector-v2-field input:hover {
          border-color: #bdc6d3;
        }

        .bank-selector-v2-field input:focus {
          border-color: #6d63f5;

          box-shadow:
            0 0 0 3px
              rgba(99,91,255,.10);
        }

        .bank-selector-v2-field input::placeholder {
          color: #a3adbb;
        }


        /* =====================================================
           MODAL FOOTER
           ===================================================== */

        .bank-selector-v2-modal-footer {
          display: flex;

          align-items: center;

          justify-content: flex-end;

          gap: 9px;

          padding: 14px 20px 18px;

          border-top:
            1px solid #edf0f4;
        }

        .bank-selector-v2-cancel,
        .bank-selector-v2-save {
          height: 40px;

          padding: 0 16px;

          border-radius: 9px;

          font-family: inherit;

          font-size: 11.5px;

          font-weight: 700;

          cursor: pointer;

          transition:
            transform .14s ease,
            box-shadow .14s ease,
            background .14s ease;
        }

        .bank-selector-v2-cancel {
          border: 1px solid #d8dee7;

          background: #fff;

          color: #475467;
        }

        .bank-selector-v2-cancel:hover:not(:disabled) {
          background: #f8fafc;

          transform: translateY(-1px);
        }

        .bank-selector-v2-save {
          min-width: 105px;

          border: 1px solid #5b52df;

          background:
            linear-gradient(
              135deg,
              #5b52df,
              #7168f4
            );

          color: #fff;

          box-shadow:
            0 4px 10px
              rgba(79,70,229,.18);
        }

        .bank-selector-v2-save:hover:not(:disabled) {
          background:
            linear-gradient(
              135deg,
              #4f46d8,
              #6259e9
            );

          transform: translateY(-1px);

          box-shadow:
            0 7px 16px
              rgba(79,70,229,.23);
        }

        .bank-selector-v2-cancel:disabled,
        .bank-selector-v2-save:disabled,
        .bank-selector-v2-add:disabled {
          opacity: .55;

          cursor: not-allowed;

          transform: none;
        }


        /* =====================================================
           LOADING SPINNER
           ===================================================== */

        .bank-selector-v2-spinner {
          width: 15px;
          height: 15px;

          display: inline-block;

          border:
            2px solid
            rgba(255,255,255,.45);

          border-top-color: #fff;

          border-radius: 50%;

          animation:
            bank-spin
            .65s linear infinite;
        }

        @keyframes bank-spin {
          to {
            transform: rotate(360deg);
          }
        }


        /* =====================================================
           SCROLLBAR
           ===================================================== */

        .bank-selector-v2-dropdown::-webkit-scrollbar,
        .bank-selector-v2-modal::-webkit-scrollbar {
          width: 7px;
        }

        .bank-selector-v2-dropdown::-webkit-scrollbar-track,
        .bank-selector-v2-modal::-webkit-scrollbar-track {
          background: transparent;
        }

        .bank-selector-v2-dropdown::-webkit-scrollbar-thumb,
        .bank-selector-v2-modal::-webkit-scrollbar-thumb {
          background: #cbd5e1;

          border-radius: 999px;
        }


        /* =====================================================
           RESPONSIVE
           ===================================================== */

        @media (max-width: 760px) {

          .bank-selector-v2-selected-content {
            grid-template-columns: 1fr 1fr;
          }

          .bank-selector-v2-box {
            flex-wrap: wrap;
          }

          .bank-selector-v2-search-wrap {
            flex-basis: 100%;
          }

          .bank-selector-v2-add,
          .bank-selector-v2-clear {
            flex: 1;
          }

        }


        @media (max-width: 560px) {

          .bank-selector-v2-header {
            align-items: flex-start;
          }

          .bank-selector-v2-selected {
            align-items: flex-start;
          }

          .bank-selector-v2-selected-content {
            grid-template-columns: 1fr;
          }

          .bank-selector-v2-modal-body {
            grid-template-columns: 1fr;
          }

          .bank-selector-v2-field.full {
            grid-column: auto;
          }

          .bank-selector-v2-modal-footer {
            flex-direction: column-reverse;
          }

          .bank-selector-v2-cancel,
          .bank-selector-v2-save {
            width: 100%;
          }

        }


        /* =====================================================
           REDUCED MOTION
           ===================================================== */

        @media (prefers-reduced-motion: reduce) {

          .bank-selector-v2 *,
          .bank-selector-v2-overlay,
          .bank-selector-v2-modal {
            animation: none !important;

            transition: none !important;
          }

        }

      `}</style>


      {/* =====================================================
          MAIN BANK SELECTOR
          ===================================================== */}

      <div className="bank-selector-v2">


        {/* ===================================================
            HEADER
            =================================================== */}

        <div className="bank-selector-v2-header">

          <div className="bank-selector-v2-title-wrap">

            <div className="bank-selector-v2-icon">
              🏦
            </div>

            <div>

              <h3 className="bank-selector-v2-title">
                Bank Details
              </h3>

              <p className="bank-selector-v2-subtitle">
                Select the bank account to display on this bill
              </p>

            </div>

          </div>

        </div>


        {/* ===================================================
            SEARCH BOX
            =================================================== */}

        <div className="bank-selector-v2-box">

          <div className="bank-selector-v2-search-wrap">

            <span className="bank-selector-v2-search-icon">
              🔎
            </span>

            <input
              type="text"
              className="bank-selector-v2-search"
              value={search}
              placeholder="Search bank name, account number or IFSC..."
              onChange={(event) => {
                setSearch(event.target.value);
                setShowDropdown(true);
              }}
              onFocus={() =>
                setShowDropdown(true)
              }
              autoComplete="off"
            />

            {search && (
              <button
                type="button"
                className="bank-selector-v2-search-clear"
                onClick={clearBank}
                aria-label="Clear bank"
              >
                ×
              </button>
            )}

          </div>


          {/* ADD BANK */}

          <button
            type="button"
            className="bank-selector-v2-add"
            onClick={() =>
              setShowAddBank(true)
            }
          >
            <span className="bank-selector-v2-add-icon">
              +
            </span>

            Add Bank
          </button>


          {/* CLEAR */}

          {selectedBank && (
            <button
              type="button"
              className="bank-selector-v2-clear"
              onClick={clearBank}
            >
              Clear
            </button>
          )}


          {/* =================================================
              DROPDOWN
              ================================================= */}

          {showDropdown && (
            <div className="bank-selector-v2-dropdown">

              {loading ? (

                <div className="bank-selector-v2-empty">

                  <div className="bank-selector-v2-empty-icon">
                    ⏳
                  </div>

                  Loading banks...

                </div>

              ) : filteredBanks.length === 0 ? (

                <div className="bank-selector-v2-empty">

                  <div className="bank-selector-v2-empty-icon">
                    🏦
                  </div>

                  <strong>
                    No bank found
                  </strong>

                  <span>
                    Try another search or add a new bank.
                  </span>

                </div>

              ) : (

                filteredBanks.map((bank) => (

                  <button
                    key={bank.id}
                    type="button"
                    className="bank-selector-v2-option"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectBank(bank);
                    }}
                  >

                    <div className="bank-selector-v2-option-icon">
                      🏦
                    </div>

                    <div className="bank-selector-v2-option-content">

                      <div className="bank-selector-v2-option-name">
                        {bank.bank_name}
                      </div>

                      <div className="bank-selector-v2-option-meta">

                        <span>
                          A/C: {bank.account_number}
                        </span>

                        {bank.ifsc_code && (
                          <span>
                            IFSC: {bank.ifsc_code}
                          </span>
                        )}

                        {bank.branch && (
                          <span>
                            {bank.branch}
                          </span>
                        )}

                      </div>

                    </div>

                  </button>

                ))

              )}

            </div>
          )}

        </div>


        {/* ===================================================
            SELECTED BANK
            =================================================== */}

        {selectedBank && (

          <div className="bank-selector-v2-selected">

            <div className="bank-selector-v2-selected-icon">
              🏦
            </div>


            <div className="bank-selector-v2-selected-content">

              <div className="bank-selector-v2-selected-item">

                <span className="bank-selector-v2-selected-label">
                  Bank
                </span>

                <span className="bank-selector-v2-selected-value primary">
                  {selectedBank.bank_name}
                </span>

              </div>


              <div className="bank-selector-v2-selected-item">

                <span className="bank-selector-v2-selected-label">
                  Account Number
                </span>

                <span className="bank-selector-v2-selected-value">
                  {selectedBank.account_number}
                </span>

              </div>


              {selectedBank.ifsc_code && (

                <div className="bank-selector-v2-selected-item">

                  <span className="bank-selector-v2-selected-label">
                    IFSC
                  </span>

                  <span className="bank-selector-v2-selected-value">
                    {selectedBank.ifsc_code}
                  </span>

                </div>

              )}


              {selectedBank.branch && (

                <div className="bank-selector-v2-selected-item">

                  <span className="bank-selector-v2-selected-label">
                    Branch
                  </span>

                  <span className="bank-selector-v2-selected-value">
                    {selectedBank.branch}
                  </span>

                </div>

              )}

            </div>

          </div>

        )}


      </div>


      {/* =====================================================
          ADD BANK MODAL
          ===================================================== */}

      {showAddBank && (

        <div
          className="bank-selector-v2-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              if (!saving) {
                setShowAddBank(false);
              }
            }

          }}
        >

          <div className="bank-selector-v2-modal">


            {/* =================================================
                MODAL HEADER
                ================================================= */}

            <div className="bank-selector-v2-modal-header">

              <div className="bank-selector-v2-modal-title">

                <div className="bank-selector-v2-modal-icon">
                  🏦
                </div>

                <div>

                  <h3>
                    Add Bank Details
                  </h3>

                  <p>
                    Save a bank account for future bills
                  </p>

                </div>

              </div>


              <button
                type="button"
                className="bank-selector-v2-modal-close"
                onClick={() => {
                  if (!saving) {
                    setShowAddBank(false);
                  }
                }}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>

            </div>


            {/* =================================================
                MODAL BODY
                ================================================= */}

            <div className="bank-selector-v2-modal-body">


              {/* BANK NAME */}

              <div className="bank-selector-v2-field full">

                <label>
                  Bank Name
                  <span className="bank-selector-v2-required">
                    {" "}*
                  </span>
                </label>

                <input
                  value={bankName}
                  onChange={(event) =>
                    setBankName(
                      event.target.value
                    )
                  }
                  placeholder="e.g. HDFC Bank"
                  autoComplete="off"
                />

              </div>


              {/* ACCOUNT NUMBER */}

              <div className="bank-selector-v2-field">

                <label>
                  Account Number
                  <span className="bank-selector-v2-required">
                    {" "}*
                  </span>
                </label>

                <input
                  value={accountNumber}
                  onChange={(event) =>
                    setAccountNumber(
                      event.target.value
                    )
                  }
                  placeholder="Enter account number"
                  inputMode="numeric"
                  autoComplete="off"
                />

              </div>


              {/* IFSC */}

              <div className="bank-selector-v2-field">

                <label>
                  IFSC Code
                </label>

                <input
                  value={ifscCode}
                  onChange={(event) =>
                    setIfscCode(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="e.g. HDFC0001234"
                  autoComplete="off"
                />

              </div>


              {/* BRANCH */}

              <div className="bank-selector-v2-field full">

                <label>
                  Branch
                </label>

                <input
                  value={branch}
                  onChange={(event) =>
                    setBranch(
                      event.target.value
                    )
                  }
                  placeholder="Enter branch name"
                  autoComplete="off"
                />

              </div>


            </div>


            {/* =================================================
                MODAL FOOTER
                ================================================= */}

            <div className="bank-selector-v2-modal-footer">

              <button
                type="button"
                className="bank-selector-v2-cancel"
                onClick={() =>
                  setShowAddBank(false)
                }
                disabled={saving}
              >
                Cancel
              </button>


              <button
                type="button"
                className="bank-selector-v2-save"
                onClick={handleAddBank}
                disabled={saving}
              >

                {saving ? (

                  <>
                    <span className="bank-selector-v2-spinner" />
                    Saving...
                  </>

                ) : (

                  "Save Bank"

                )}

              </button>

            </div>


          </div>

        </div>

      )}

    </>
  );
}