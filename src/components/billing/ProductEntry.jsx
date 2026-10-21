// src/components/billing/ProductEntry.jsx

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProductEntry({
  userId,
  onAddItem,
  deepMode = false,
}) {
  const [products, setProducts] = useState([]);

  const [particular, setParticular] = useState("");
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("Nos");
  const [rate, setRate] = useState("");
  const [deep, setDeep] = useState("");

  const [selectedProductId, setSelectedProductId] =
    useState(null);

  const [showSuggestions, setShowSuggestions] =
    useState(false);

  const [highlightedIndex, setHighlightedIndex] =
    useState(-1);

  const particularRef = useRef(null);
  const notesRef = useRef(null);
  const qtyRef = useRef(null);
  const unitRef = useRef(null);
  const deepRef = useRef(null);
  const rateRef = useRef(null);
  const addButtonRef = useRef(null);

  /*
   * =========================================================
   * LOAD PRODUCTS
   * =========================================================
   */

  useEffect(() => {
    if (!userId) {
      return;
    }

    loadProducts();
  }, [userId]);

  async function loadProducts() {
    const {
      data,
      error,
    } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userId)
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Error loading products:",
        error
      );

      return;
    }

    setProducts(data || []);
  }

  /*
   * =========================================================
   * FILTER PRODUCTS
   * =========================================================
   */

  const searchText = particular
    .trim()
    .toLowerCase();

  const filteredProducts = searchText
    ? products.filter((product) =>
        String(product.name || "")
          .toLowerCase()
          .includes(searchText)
      )
    : [];

  /*
   * =========================================================
   * RESET HIGHLIGHT WHEN SEARCH CHANGES
   * =========================================================
   */

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [particular]);

  /*
   * =========================================================
   * SELECT PRODUCT
   * =========================================================
   */

  function selectProduct(product) {
    setSelectedProductId(product.id);

    setParticular(product.name || "");

    setQty("1");

    setUnit(product.unit || "");

    setRate(
      product.price !== null &&
        product.price !== undefined
        ? String(product.price)
        : ""
    );

    setShowSuggestions(false);
    setHighlightedIndex(-1);

    /*
     * After selecting product,
     * move directly to Extra Text.
     */
    setTimeout(() => {
      notesRef.current?.focus();
    }, 0);
  }

  /*
   * =========================================================
   * CLEAR FORM
   * =========================================================
   */

  function clearForm() {
    setParticular("");
    setNotes("");
    setQty("1");
    setUnit("Nos");
    setRate("");
    setDeep("");

    setSelectedProductId(null);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  }

  /*
   * =========================================================
   * ADD ITEM
   * =========================================================
   */

  function handleAddItem() {
    const name = particular.trim();
    const extraText = notes.trim();

    const quantity = Number(qty);
    const itemRate = Number(rate);

    if (!name) {
      alert(
        "Please select or enter a product."
      );

      particularRef.current?.focus();

      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      alert(
        "Please enter a valid quantity."
      );

      qtyRef.current?.focus();

      return;
    }

    if (
      !Number.isFinite(itemRate) ||
      itemRate < 0
    ) {
      alert(
        "Please enter a valid rate."
      );

      rateRef.current?.focus();

      return;
    }

    onAddItem?.({
      productId: selectedProductId,

      particular: name,

      notes: extraText,

      qty: quantity,

      unit: unit.trim(),

      rate: itemRate,
      deep: deepMode ? Number(deep) || 0 : 0,
      deepMode: Boolean(deepMode),
    });

    clearForm();

    /*
     * After adding, focus product search
     * so another item can be entered immediately.
     */
    setTimeout(() => {
      particularRef.current?.focus();
    }, 0);
  }

  /*
   * =========================================================
   * PRODUCT SEARCH KEYBOARD
   * =========================================================
   */

  function handleParticularKeyDown(event) {
    /*
     * ESCAPE
     */

    if (event.key === "Escape") {
      event.preventDefault();

      setShowSuggestions(false);
      setHighlightedIndex(-1);

      return;
    }

    /*
     * DOWN ARROW
     */

    if (event.key === "ArrowDown") {
      if (!filteredProducts.length) {
        return;
      }

      event.preventDefault();

      setShowSuggestions(true);

      setHighlightedIndex((current) => {
        if (
          current >=
          filteredProducts.length - 1
        ) {
          return 0;
        }

        return current + 1;
      });

      return;
    }

    /*
     * UP ARROW
     */

    if (event.key === "ArrowUp") {
      if (!filteredProducts.length) {
        return;
      }

      event.preventDefault();

      setShowSuggestions(true);

      setHighlightedIndex((current) => {
        if (current <= 0) {
          return (
            filteredProducts.length - 1
          );
        }

        return current - 1;
      });

      return;
    }

    /*
     * ENTER
     */

    if (event.key === "Enter") {
      event.preventDefault();

      /*
       * If suggestions are visible,
       * select highlighted product.
       */

      if (
        showSuggestions &&
        filteredProducts.length > 0
      ) {
        const index =
          highlightedIndex >= 0
            ? highlightedIndex
            : 0;

        const product =
          filteredProducts[index];

        if (product) {
          selectProduct(product);

          return;
        }
      }

      /*
       * If there is no suggestion,
       * go to Extra Text.
       */

      notesRef.current?.focus();
    }
  }

  /*
   * =========================================================
   * EXTRA TEXT KEYBOARD
   * =========================================================
   */

  function handleNotesKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();

      qtyRef.current?.focus();

      setTimeout(() => {
        qtyRef.current?.select();
      }, 0);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      qtyRef.current?.focus();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      particularRef.current?.focus();
    }
  }

  /*
   * =========================================================
   * QTY KEYBOARD
   * =========================================================
   */

  function handleQtyKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();

      unitRef.current?.focus();
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      unitRef.current?.focus();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      notesRef.current?.focus();
    }
  }

  /*
   * =========================================================
   * UNIT KEYBOARD
   * =========================================================
   */

  function handleUnitKeyDown(event) {
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      (deepMode ? deepRef : rateRef).current?.focus();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      qtyRef.current?.focus();
    }
  }

  /*
   * =========================================================
   * DEEP KEYBOARD
   * =========================================================
   */

  function handleDeepKeyDown(event) {
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      rateRef.current?.focus();
      rateRef.current?.select();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      unitRef.current?.focus();
    }
  }

  /*
   * =========================================================
   * RATE KEYBOARD
   * =========================================================
   */

  function handleRateKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();

      handleAddItem();

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      (deepMode ? deepRef : unitRef).current?.focus();
    }
  }

  /*
   * =========================================================
   * OUTSIDE CLICK
   * =========================================================
   */

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        particularRef.current &&
        !particularRef.current.contains(
          event.target
        )
      ) {
        setTimeout(() => {
          setShowSuggestions(false);
        }, 100);
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

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <>
      <style>{`
        .product-entry-v5 {
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

        .product-entry-v5 *,
        .product-entry-v5 *::before,
        .product-entry-v5 *::after {
          box-sizing: border-box;
        }

        /* =====================================================
           HEADER
           ===================================================== */

        .product-entry-v5-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .product-entry-v5-title-wrap {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .product-entry-v5-icon {
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
          font-size: 16px;
          box-shadow:
            0 1px 3px rgba(79,70,229,.06),
            inset 0 1px 0 rgba(255,255,255,.8);
        }

        .product-entry-v5-title {
          margin: 0;
          color: #172033;
          font-size: 15px;
          line-height: 20px;
          font-weight: 800;
          letter-spacing: -.02em;
        }

        .product-entry-v5-subtitle {
          margin: 2px 0 0;
          color: #98a2b3;
          font-size: 10px;
          line-height: 14px;
          font-weight: 500;
        }

        .product-entry-v5-shortcut {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          border: 1px solid #eaecf0;
          border-radius: 6px;
          background: #fafbfc;
          color: #98a2b3;
          font-size: 8.5px;
          line-height: 13px;
          font-weight: 600;
        }

        .product-entry-v5-key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 18px;
          padding: 0 4px;
          border: 1px solid #dfe3e8;
          border-bottom-width: 2px;
          border-radius: 4px;
          background: #fff;
          color: #667085;
          font-size: 8px;
          font-weight: 750;
        }

        /* =====================================================
           GRID
           ===================================================== */

        .product-entry-v5-grid {
          display: grid;
          grid-template-columns:
            minmax(250px, 2.2fr)
            minmax(180px, 1.45fr)
            95px
            100px
            120px
            112px;
          gap: 12px;
          align-items: end;
        }

        .product-entry-v5-field {
          min-width: 0;
          position: relative;
        }

        .product-entry-v5-label {
          display: flex;
          align-items: center;
          gap: 5px;
          min-height: 17px;
          margin: 0 0 6px;
          color: #475467;
          font-size: 10px;
          line-height: 15px;
          font-weight: 750;
          letter-spacing: .01em;
        }

        .product-entry-v5-label-required {
          color: #635bff;
          font-size: 12px;
          line-height: 10px;
        }

        /* =====================================================
           INPUTS
           ===================================================== */

        .product-entry-v5-input {
          width: 100%;
          height: 40px;
          padding: 0 11px;
          border: 1px solid #dfe3e8;
          border-radius: 7px;
          outline: none;
          background: #fff;
          color: #172033;
          font-family: inherit;
          font-size: 11px;
          font-weight: 550;
          line-height: 40px;
          box-shadow:
            0 1px 2px rgba(16,24,40,.025);
          transition:
            border-color .14s ease,
            box-shadow .14s ease,
            background .14s ease;
        }

        .product-entry-v5-input::placeholder {
          color: #a3acb9;
          font-weight: 450;
        }

        .product-entry-v5-input:hover {
          border-color: #c8ced8;
        }

        .product-entry-v5-input:focus {
          border-color: #8179ee;
          background: #fff;
          box-shadow:
            0 0 0 3px rgba(99,91,255,.10),
            0 1px 2px rgba(16,24,40,.025);
        }

        .product-entry-v5-input[type="number"] {
          font-variant-numeric: tabular-nums;
        }

        /* =====================================================
           PARTICULAR / PRODUCT SEARCH
           ===================================================== */

        .product-entry-v5-particular {
          position: relative;
          min-width: 0;
        }

        .product-entry-v5-search-input-wrap {
          position: relative;
        }

        .product-entry-v5-search-input {
          padding-right: 34px;
        }

        .product-entry-v5-search-icon {
          position: absolute;
          right: 11px;
          top: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateY(-50%);
          color: #98a2b3;
          font-size: 12px;
          pointer-events: none;
        }

        .product-entry-v5-selected-dot {
          position: absolute;
          right: 11px;
          top: 50%;
          width: 7px;
          height: 7px;
          transform: translateY(-50%);
          border-radius: 50%;
          background: #635bff;
          box-shadow: 0 0 0 3px #efeeff;
          pointer-events: none;
        }

        /* =====================================================
           SUGGESTIONS
           ===================================================== */

        .product-entry-v5-suggestions {
          position: absolute;
          z-index: 1000;
          top: calc(100% + 5px);
          left: 0;
          right: 0;
          max-height: 255px;
          overflow-y: auto;
          padding: 5px;
          border: 1px solid #dfe3ea;
          border-radius: 9px;
          background: #fff;
          box-shadow:
            0 12px 28px rgba(16,24,40,.12),
            0 2px 7px rgba(16,24,40,.05);
        }

        .product-entry-v5-suggestion {
          width: 100%;
          min-height: 44px;
          display: grid;
          grid-template-columns: minmax(0,1fr) auto auto;
          align-items: center;
          gap: 10px;
          padding: 7px 9px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #344054;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            background .1s ease,
            transform .1s ease;
        }

        .product-entry-v5-suggestion:hover {
          background: #f7f7ff;
        }

        .product-entry-v5-suggestion.highlighted {
          background: #eef0ff;
        }

        .product-entry-v5-suggestion:active {
          transform: scale(.995);
        }

        .product-entry-v5-suggestion-main {
          min-width: 0;
        }

        .product-entry-v5-suggestion-name {
          display: block;
          overflow: hidden;
          color: #263247;
          font-size: 10.5px;
          line-height: 15px;
          font-weight: 700;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .product-entry-v5-suggestion-meta {
          display: block;
          margin-top: 1px;
          overflow: hidden;
          color: #98a2b3;
          font-size: 8.5px;
          line-height: 12px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .product-entry-v5-suggestion-unit {
          min-width: 32px;
          padding: 3px 6px;
          border: 1px solid #eaecf0;
          border-radius: 4px;
          background: #fafbfc;
          color: #667085;
          font-size: 8px;
          line-height: 12px;
          font-weight: 650;
          text-align: center;
        }

        .product-entry-v5-suggestion-price {
          min-width: 58px;
          color: #5148d7;
          font-size: 10px;
          line-height: 15px;
          font-weight: 800;
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .product-entry-v5-empty-search {
          padding: 15px 10px;
          color: #98a2b3;
          font-size: 9px;
          line-height: 14px;
          text-align: center;
        }

        /* =====================================================
           HELP TEXT
           ===================================================== */

        .product-entry-v5-help {
          display: flex;
          align-items: center;
          gap: 5px;
          min-height: 14px;
          margin-top: 5px;
          color: #98a2b3;
          font-size: 8.5px;
          line-height: 13px;
          font-weight: 500;
        }

        .product-entry-v5-help-icon {
          color: #8b83d8;
          font-size: 9px;
        }

        /* =====================================================
           ADD BUTTON
           ===================================================== */

        .product-entry-v5-action {
          min-width: 0;
        }

        .product-entry-v5-add-button {
          width: 100%;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 12px;
          border: 1px solid #5a52d6;
          border-radius: 7px;
          background: linear-gradient(
            135deg,
            #635bff 0%,
            #5148d7 100%
          );
          color: #fff;
          font-family: inherit;
          font-size: 10px;
          line-height: 15px;
          font-weight: 750;
          white-space: nowrap;
          cursor: pointer;
          box-shadow:
            0 2px 5px rgba(79,70,229,.16),
            inset 0 1px 0 rgba(255,255,255,.16);
          transition:
            transform .14s ease,
            box-shadow .14s ease,
            filter .14s ease;
        }

        .product-entry-v5-add-button:hover {
          filter: brightness(1.025);
          transform: translateY(-1px);
          box-shadow:
            0 5px 12px rgba(79,70,229,.20),
            inset 0 1px 0 rgba(255,255,255,.16);
        }

        .product-entry-v5-add-button:active {
          transform: translateY(0);
          box-shadow:
            0 2px 5px rgba(79,70,229,.14);
        }

        .product-entry-v5-add-button:focus-visible {
          outline: 3px solid rgba(99,91,255,.18);
          outline-offset: 2px;
        }

        .product-entry-v5-add-icon {
          width: 17px;
          height: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          background: rgba(255,255,255,.16);
          font-size: 13px;
          line-height: 1;
        }

        /* =====================================================
           SCROLLBAR
           ===================================================== */

        .product-entry-v5-suggestions::-webkit-scrollbar {
          width: 6px;
        }

        .product-entry-v5-suggestions::-webkit-scrollbar-track {
          background: transparent;
        }

        .product-entry-v5-suggestions::-webkit-scrollbar-thumb {
          border-radius: 99px;
          background: #d8dce5;
        }

        .product-entry-v5-suggestions::-webkit-scrollbar-thumb:hover {
          background: #c4c9d4;
        }

        /* =====================================================
           RESPONSIVE
           ===================================================== */

        @media (max-width: 1100px) {
          .product-entry-v5-grid {
            grid-template-columns:
              minmax(220px, 2fr)
              minmax(170px, 1.4fr)
              85px
              90px
              110px
              105px;
            gap: 10px;
          }
        }

        @media (max-width: 900px) {
          .product-entry-v5-grid {
            grid-template-columns:
              minmax(220px, 2fr)
              minmax(160px, 1.4fr)
              85px 90px;
          }

          .product-entry-v5-action {
            grid-column: span 2;
          }

          .product-entry-v5-add-button {
            max-width: 180px;
          }
        }

        @media (max-width: 680px) {
          .product-entry-v5 {
            padding: 15px;
          }

          .product-entry-v5-header {
            align-items: flex-start;
          }

          .product-entry-v5-shortcut {
            display: none;
          }

          .product-entry-v5-grid {
            grid-template-columns:
              1fr 1fr;
            gap: 11px;
          }

          .product-entry-v5-particular {
            grid-column: 1 / -1;
          }

          .product-entry-v5-action {
            grid-column: 1 / -1;
          }

          .product-entry-v5-add-button {
            max-width: none;
          }
        }

        @media (max-width: 440px) {
          .product-entry-v5 {
            padding: 13px;
            border-radius: 10px;
          }

          .product-entry-v5-title-wrap {
            gap: 9px;
          }

          .product-entry-v5-icon {
            width: 32px;
            height: 32px;
            flex-basis: 32px;
            border-radius: 8px;
            font-size: 14px;
          }

          .product-entry-v5-title {
            font-size: 14px;
          }

          .product-entry-v5-subtitle {
            font-size: 9px;
          }

          .product-entry-v5-grid {
            grid-template-columns: 1fr;
          }

          .product-entry-v5-particular,
          .product-entry-v5-action {
            grid-column: auto;
          }

          .product-entry-v5-suggestion {
            grid-template-columns: minmax(0,1fr) auto;
          }

          .product-entry-v5-suggestion-unit {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .product-entry-v5 * {
            transition: none !important;
          }
        }
      `}</style>

      <section className="product-entry-v5">
        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="product-entry-v5-header">
          <div className="product-entry-v5-title-wrap">
            <div
              className="product-entry-v5-icon"
              aria-hidden="true"
            >
              +
            </div>

            <div>
              <h2 className="product-entry-v5-title">
                Add Item
              </h2>

              <div className="product-entry-v5-subtitle">
                Add a product or service to this bill
              </div>
            </div>
          </div>

          <div className="product-entry-v5-shortcut">
            <span className="product-entry-v5-key">
              Enter
            </span>

            Add item
          </div>
        </div>

        {/* =====================================================
            FORM
            ===================================================== */}

        <div className="product-entry-v5-grid">

          {/* ===================================================
              PARTICULAR
              =================================================== */}

          <div className="product-entry-v5-field product-entry-v5-particular">
            <label className="product-entry-v5-label">
              Particular
              <span className="product-entry-v5-label-required">
                *
              </span>
            </label>

            <div className="product-entry-v5-search-input-wrap">
              <input
                ref={particularRef}
                type="text"
                className="
                  product-entry-v5-input
                  product-entry-v5-search-input
                "
                placeholder="Search product..."
                value={particular}
                autoComplete="off"
                onFocus={() => {
                  if (
                    filteredProducts.length > 0
                  ) {
                    setShowSuggestions(true);
                  }
                }}
                onChange={(event) => {
                  setParticular(
                    event.target.value
                  );

                  setSelectedProductId(null);

                  setShowSuggestions(true);
                }}
                onKeyDown={
                  handleParticularKeyDown
                }
              />

              {selectedProductId ? (
                <span
                  className="product-entry-v5-selected-dot"
                  title="Product selected"
                />
              ) : (
                <span
                  className="product-entry-v5-search-icon"
                  aria-hidden="true"
                >
                  ⌕
                </span>
              )}
            </div>

            {/* PRODUCT DROPDOWN */}

            {showSuggestions &&
              filteredProducts.length > 0 && (
                <div className="product-entry-v5-suggestions">

                  {filteredProducts.map(
                    (product, index) => {
                      const isHighlighted =
                        index ===
                        highlightedIndex;

                      return (
                        <button
                          key={product.id}
                          type="button"
                          className={`
                            product-entry-v5-suggestion
                            ${
                              isHighlighted
                                ? "highlighted"
                                : ""
                            }
                          `}
                          onMouseDown={(event) => {
                            event.preventDefault();

                            selectProduct(product);
                          }}
                          onMouseEnter={() =>
                            setHighlightedIndex(
                              index
                            )
                          }
                        >
                          <span className="product-entry-v5-suggestion-main">
                            <span className="product-entry-v5-suggestion-name">
                              {product.name}
                            </span>

                            <span className="product-entry-v5-suggestion-meta">
                              Product
                            </span>
                          </span>

                          <span className="product-entry-v5-suggestion-unit">
                            {product.unit || "—"}
                          </span>

                          <span className="product-entry-v5-suggestion-price">
                            ₹
                            {Number(
                              product.price || 0
                            ).toFixed(2)}
                          </span>
                        </button>
                      );
                    }
                  )}

                </div>
              )}
          </div>

          {/* ===================================================
              EXTRA TEXT
              =================================================== */}

          <div className="product-entry-v5-field">
            <label className="product-entry-v5-label">
              Extra Text
            </label>

            <input
              ref={notesRef}
              type="text"
              className="product-entry-v5-input"
              placeholder="Example: Tank"
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              onKeyDown={handleNotesKeyDown}
            />

            {/* <div className="product-entry-v5-help">
              <span
                className="product-entry-v5-help-icon"
                aria-hidden="true"
              >
                ●
              </span>

              Displays as: Product (Extra Text)
            </div> */}
          </div>

          {/* ===================================================
              QTY
              =================================================== */}

          <div className="product-entry-v5-field">
            <label className="product-entry-v5-label">
              Qty
              <span className="product-entry-v5-label-required">
                *
              </span>
            </label>

            <input
              ref={qtyRef}
              type="number"
              min="0"
              step="any"
              className="product-entry-v5-input"
              value={qty}
              onChange={(event) =>
                setQty(event.target.value)
              }
              onKeyDown={handleQtyKeyDown}
            />
          </div>

          {/* ===================================================
              UNIT
              =================================================== */}

          <div className="product-entry-v5-field">
            <label className="product-entry-v5-label">
              Unit
            </label>

            <input
              ref={unitRef}
              type="text"
              className="product-entry-v5-input"
              value={unit}
              onChange={(event) =>
                setUnit(event.target.value)
              }
              onKeyDown={handleUnitKeyDown}
            />
          </div>

          {deepMode && (
            <div className="product-entry-v5-field">
              <label className="product-entry-v5-label">Deep (in inch) *</label>
              <input
                ref={deepRef}
                type="number"
                min="0"
                step="any"
                className="product-entry-v5-input"
                placeholder="Deep (in inch)"
                value={deep}
                onChange={(event) => setDeep(event.target.value)}
                onKeyDown={handleDeepKeyDown}
              />
            </div>
          )}

          {/* ===================================================
              RATE
              =================================================== */}

          <div className="product-entry-v5-field">
            <label className="product-entry-v5-label">
              {deepMode ? "Rate per inch" : "Rate"}
              <span className="product-entry-v5-label-required">
                *
              </span>
            </label>

            <input
              ref={rateRef}
              type="number"
              min="0"
              step="0.01"
              className="product-entry-v5-input"
              placeholder="0.00"
              value={rate}
              onChange={(event) =>
                setRate(event.target.value)
              }
              onKeyDown={handleRateKeyDown}
            />
          </div>

          {/* ===================================================
              ADD ITEM
              =================================================== */}

          <div className="product-entry-v5-action">
            <label className="product-entry-v5-label">
              &nbsp;
            </label>

            <button
              ref={addButtonRef}
              type="button"
              className="product-entry-v5-add-button"
              onClick={handleAddItem}
            >
              <span
                className="product-entry-v5-add-icon"
                aria-hidden="true"
              >
                +
              </span>

              Add Item
            </button>
          </div>

        </div>
      </section>
    </>
  );
}