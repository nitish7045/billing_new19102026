// src/components/billing/BillItemsTable.jsx

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

export default function BillItemsTable({
  items = [],
  onDeleteItem,
  onUpdateItem,
  onAddManualRow,
  onMoveItem,
  userId,
  deepMode = false,
}) {
  /* =========================================================
     MANUAL ROW
     ========================================================= */

  const [showManualOptions, setShowManualOptions] =
    useState(false);

  const [manualText, setManualText] =
    useState("");

  const [manualType, setManualType] =
    useState("blank");

  const [manualSrNo, setManualSrNo] =
    useState(false);

  /* =========================================================
     SELECTED ROW
     ========================================================= */

  const [selectedRowId, setSelectedRowId] =
    useState(null);

  /* =========================================================
     SEARCH EXISTING BILL ITEMS
     ========================================================= */

  const [itemSearch, setItemSearch] =
    useState("");

  const [searchMatchIndex, setSearchMatchIndex] =
    useState(0);

  const rowRefs =
    useRef({});

  const tableWrapperRef = useRef(null);
  const previousItemCountRef = useRef(items.length);

  /* =========================================================
     AUTO-SCROLL TO THE LAST ITEM WHEN A NEW ROW IS ADDED
     ========================================================= */

  useEffect(() => {
    const previousCount = previousItemCountRef.current;
    previousItemCountRef.current = items.length;

    // Only auto-scroll when a new row is appended and the table is in scroll mode.
    if (items.length > previousCount && items.length > 7) {
      requestAnimationFrame(() => {
        const wrapper = tableWrapperRef.current;
        if (wrapper) {
          wrapper.scrollTop = wrapper.scrollHeight;
        }
      });
    }
  }, [items.length]);

  /* =========================================================
     PRODUCT DATABASE
     ========================================================= */

  const [products, setProducts] =
    useState([]);

  const [searchRowId, setSearchRowId] =
    useState(null);

  const [
    highlightedProductIndex,
    setHighlightedProductIndex,
  ] = useState(-1);

  /* =========================================================
     DRAG
     ========================================================= */

  const [draggedRowId, setDraggedRowId] =
    useState(null);

  /* =========================================================
     INPUT REFS
     ========================================================= */

  const inputRefs =
    useRef({});

  function focusItemField(itemId, field) {
    const input = inputRefs.current[`${itemId}:${field}`];
    if (input) {
      input.focus();
      if (typeof input.select === "function") input.select();
    }
  }

  function handleItemFieldEnter(event, itemId, field) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const fields = deepMode
      ? ["deep", "qty", "unit", "rate"]
      : ["qty", "unit", "rate"];
    const currentIndex = fields.indexOf(field);
    if (currentIndex >= 0 && currentIndex < fields.length - 1) {
      focusItemField(itemId, fields[currentIndex + 1]);
      return;
    }

    const currentIndexInItems = items.findIndex((row) => row.id === itemId);
    const nextProduct = items.slice(currentIndexInItems + 1).find((row) => isProductRow(row));
    if (nextProduct) {
      inputRefs.current[nextProduct.id]?.focus();
    }
  }

  /* =========================================================
     LOAD PRODUCTS
     ========================================================= */

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

  /* =========================================================
     DISPLAY NAME
     ========================================================= */

  function getDisplayName(item) {
    const name =
      item?.particular || "";

    const notes =
      item?.notes || "";

    if (
      name.trim() &&
      notes.trim()
    ) {
      return `${name.trim()} (${notes.trim()})`;
    }

    return name;
  }

  /* =========================================================
     ROW TYPE HELPERS
     ========================================================= */

  function isProductRow(item) {
    return (
      item?.type === "product" ||
      item?.is_manual === false
    );
  }

  function isManualRow(item) {
    return (
      item?.type === "manual" ||
      item?.is_manual === true
    );
  }

  function isBlankRow(item) {
    if (!isManualRow(item)) {
      return false;
    }

    return (
      String(
        item?.particular || ""
      ).trim() === ""
    );
  }

  function isHeadingRow(item) {
    if (!isManualRow(item)) {
      return false;
    }

    return !isBlankRow(item);
  }

  function shouldRowHaveSerialNumber(item) {
    if (isProductRow(item)) {
      return true;
    }

    if (isBlankRow(item)) {
      return false;
    }

    if (isHeadingRow(item)) {
      return (
        item?.showSrNo === true ||
        item?.show_sr_no === true
      );
    }

    return false;
  }

  /* =========================================================
     SEARCH EXISTING ITEMS
     ========================================================= */

  const normalizedItemSearch =
    itemSearch.trim().toLowerCase();

  const matchingItemIndexes =
    normalizedItemSearch
      ? items
          .map((item, index) => ({
            item,
            index,
          }))
          .filter(({ item }) =>
            getDisplayName(item)
              .toLowerCase()
              .includes(
                normalizedItemSearch
              )
          )
          .map(({ index }) => index)
      : [];

  useEffect(() => {
    setSearchMatchIndex(0);
  }, [itemSearch]);

  /* =========================================================
     JUMP TO SEARCH RESULT
     ========================================================= */

  function jumpToSearchResult(
    matchIndex = 0
  ) {
    if (
      matchingItemIndexes.length ===
      0
    ) {
      return;
    }

    const safeIndex =
      matchIndex %
      matchingItemIndexes.length;

    const itemIndex =
      matchingItemIndexes[
        safeIndex
      ];

    const item =
      items[itemIndex];

    if (!item) {
      return;
    }

    setSelectedRowId(item.id);

    const row =
      rowRefs.current[item.id];

    if (row) {
      row.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  /* =========================================================
     ENTER IN BILL ITEM SEARCH
     ========================================================= */

  function handleItemSearchKeyDown(
    event
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (
      matchingItemIndexes.length ===
      0
    ) {
      return;
    }

    const nextIndex =
      searchMatchIndex %
      matchingItemIndexes.length;

    jumpToSearchResult(
      nextIndex
    );

    setSearchMatchIndex(
      (current) =>
        (current + 1) %
        matchingItemIndexes.length
    );
  }

  /* =========================================================
     SERIAL NUMBER
     ========================================================= */

  function getSerialNumber(index) {
    const currentItem =
      items[index];

    if (!currentItem) {
      return "";
    }

    if (
      !shouldRowHaveSerialNumber(
        currentItem
      )
    ) {
      return "";
    }

    let serial = 0;

    for (
      let i = 0;
      i < index;
      i++
    ) {
      const previousItem =
        items[i];

      if (
        shouldRowHaveSerialNumber(
          previousItem
        )
      ) {
        serial++;
      }
    }

    return serial + 1;
  }

  /* =========================================================
     PARSE DISPLAY NAME
     ========================================================= */

  function parseDisplayName(value) {
    const text =
      value.trim();

    const match =
      text.match(
        /^(.*)\s+\(([^()]*)\)$/
      );

    if (match) {
      return {
        particular:
          match[1].trim(),

        notes:
          match[2].trim(),
      };
    }

    return {
      particular:
        text,

      notes:
        "",
    };
  }

  /* =========================================================
     PRODUCT SEARCH
     ========================================================= */

  function getFilteredProducts(
    searchValue
  ) {
    const search =
      String(
        searchValue || ""
      )
        .trim()
        .toLowerCase();

    if (!search) {
      return products.slice(
        0,
        20
      );
    }

    return products
      .filter((product) =>
        String(
          product.name || ""
        )
          .toLowerCase()
          .includes(search)
      )
      .slice(0, 20);
  }

  /* =========================================================
     SELECT PRODUCT
     ========================================================= */

  function selectTableProduct(
    item,
    product
  ) {
    onUpdateItem?.(
      item.id,
      {
        productId:
          product.id,

        particular:
          product.name || "",

        notes:
          item.notes || "",

        qty:
          item.qty || 1,

        unit:
          product.unit || "",

        rate:
          product.price ??
          item.rate ??
          0,

        showSrNo:
          true,
      }
    );

    setSearchRowId(null);

    setHighlightedProductIndex(
      -1
    );

    setTimeout(() => {
      if (deepMode) {
        focusItemField(item.id, "deep");
      } else {
        focusItemField(item.id, "qty");
      }
    }, 0);
  }

  /* =========================================================
     PARTICULAR CHANGE
     ========================================================= */

  function handleParticularChange(
    item,
    value
  ) {
    const parsed =
      parseDisplayName(value);

    onUpdateItem?.(
      item.id,
      {
        particular:
          parsed.particular,

        notes:
          parsed.notes,

        productId:
          null,
      }
    );

    setSearchRowId(item.id);

    setHighlightedProductIndex(
      -1
    );

    setSelectedRowId(
      item.id
    );
  }

  /* =========================================================
     PRODUCT INPUT KEYBOARD
     ========================================================= */

  function handleParticularKeyDown(
    event,
    item
  ) {
    const filtered =
      getFilteredProducts(
        getDisplayName(item)
      );

    if (event.key === "Escape") {
      event.preventDefault();

      setSearchRowId(null);

      setHighlightedProductIndex(
        -1
      );

      return;
    }

    if (
      event.key === "ArrowDown"
    ) {
      if (
        filtered.length === 0
      ) {
        return;
      }

      event.preventDefault();

      setSearchRowId(
        item.id
      );

      setHighlightedProductIndex(
        (current) => {
          if (
            current >=
            filtered.length - 1
          ) {
            return 0;
          }

          return current + 1;
        }
      );

      return;
    }

    if (
      event.key === "ArrowUp"
    ) {
      if (
        filtered.length === 0
      ) {
        return;
      }

      event.preventDefault();

      setSearchRowId(
        item.id
      );

      setHighlightedProductIndex(
        (current) => {
          if (current <= 0) {
            return (
              filtered.length - 1
            );
          }

          return current - 1;
        }
      );

      return;
    }

    if (
      event.key === "Enter"
    ) {
      if (
        searchRowId ===
          item.id &&
        filtered.length > 0
      ) {
        event.preventDefault();

        const index =
          highlightedProductIndex >=
          0
            ? highlightedProductIndex
            : 0;

        const product =
          filtered[index];

        if (product) {
          selectTableProduct(
            item,
            product
          );
        }
      }
    }
  }

  /* =========================================================
     DELETE
     ========================================================= */

  function handleDelete(item) {
    const name =
      getDisplayName(item) ||
      "this item";

    const confirmed =
      window.confirm(
        `Delete "${name}" from this bill?`
      );

    if (!confirmed) {
      return;
    }

    onDeleteItem?.(
      item.id
    );

    if (
      selectedRowId ===
      item.id
    ) {
      setSelectedRowId(
        null
      );
    }
  }

  /* =========================================================
     MOVE
     ========================================================= */

  function moveRow(
    id,
    direction
  ) {
    setSelectedRowId(id);

    onMoveItem?.(
      id,
      direction
    );
  }

  /* =========================================================
     BOLD / CENTER
     ========================================================= */

  function toggleItemBold(
    item
  ) {
    onUpdateItem?.(
      item.id,
      {
        bold: !item.bold,
      }
    );

    setSelectedRowId(
      item.id
    );
  }

  function toggleItemCenter(
    item
  ) {
    onUpdateItem?.(
      item.id,
      {
        center: !item.center,
      }
    );

    setSelectedRowId(
      item.id
    );
  }

  /* =========================================================
     ALT + UP / DOWN
     ========================================================= */

  useEffect(() => {
    function handleGlobalKeyDown(
      event
    ) {
      if (!selectedRowId) {
        return;
      }

      if (!event.altKey) {
        return;
      }

      if (
        event.key ===
        "ArrowUp"
      ) {
        event.preventDefault();

        moveRow(
          selectedRowId,
          -1
        );

        return;
      }

      if (
        event.key ===
        "ArrowDown"
      ) {
        event.preventDefault();

        moveRow(
          selectedRowId,
          1
        );
      }
    }

    document.addEventListener(
      "keydown",
      handleGlobalKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleGlobalKeyDown
      );
    };
  }, [
    selectedRowId,
    items,
  ]);

  /* =========================================================
     DRAG
     ========================================================= */

  function handleDragStart(
    event,
    id
  ) {
    setDraggedRowId(id);

    setSelectedRowId(id);

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      id
    );
  }

  function handleDragOver(
    event
  ) {
    event.preventDefault();

    event.dataTransfer.dropEffect =
      "move";
  }

  function handleDrop(
    event,
    targetId
  ) {
    event.preventDefault();

    const sourceId =
      draggedRowId ||
      event.dataTransfer.getData(
        "text/plain"
      );

    if (
      !sourceId ||
      sourceId === targetId
    ) {
      setDraggedRowId(null);

      return;
    }

    const sourceIndex =
      items.findIndex(
        (item) =>
          item.id === sourceId
      );

    const targetIndex =
      items.findIndex(
        (item) =>
          item.id === targetId
      );

    if (
      sourceIndex === -1 ||
      targetIndex === -1
    ) {
      setDraggedRowId(null);

      return;
    }

    const direction =
      sourceIndex <
      targetIndex
        ? 1
        : -1;

    const distance =
      Math.abs(
        targetIndex -
          sourceIndex
      );

    for (
      let i = 0;
      i < distance;
      i++
    ) {
      onMoveItem?.(
        sourceId,
        direction
      );
    }

    setSelectedRowId(
      sourceId
    );

    setDraggedRowId(
      null
    );
  }

  /* =========================================================
     ADD MANUAL ROW
     ========================================================= */

  function handleAddManualRow() {
    if (
      manualType ===
        "heading" &&
      !manualText.trim()
    ) {
      alert(
        "Please enter the heading."
      );

      return;
    }

    const showSrNo =
      manualType ===
      "blank"
        ? false
        : Boolean(
            manualSrNo
          );

    onAddManualRow?.(
      manualText.trim(),
      manualType,
      showSrNo
    );

    setManualText("");

    setManualType(
      "blank"
    );

    setManualSrNo(
      false
    );

    setShowManualOptions(
      false
    );
  }

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <>
      <style>{`
        /* =====================================================
           BILL ITEMS V4
        ===================================================== */

        .bill-items-v4 {
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

        .bill-items-v4 *,
        .bill-items-v4 *::before,
        .bill-items-v4 *::after {
          box-sizing: border-box;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .bill-items-v4-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
        }

        .bill-items-v4-heading {
          flex: 1 1 auto;
          min-width: 180px;
        }

        .bill-items-v4-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .bill-items-v4-icon {
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

        .bill-items-v4-title {
          margin: 0;
          color: #172033;
          font-size: 17px;
          line-height: 22px;
          font-weight: 780;
          letter-spacing: -0.02em;
        }

        .bill-items-v4-subtitle {
          margin: 3px 0 0 46px;
          color: #98a2b3;
          font-size: 10.5px;
          line-height: 15px;
          font-weight: 500;
        }

        /* =====================================================
           SEARCH
        ===================================================== */

        .bill-items-v4-search {
          flex: 0 1 280px;
          min-width: 220px;
        }

        .bill-items-v4-search-box {
          position: relative;
          width: 100%;
        }

        .bill-items-v4-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateY(-50%);
          color: #98a2b3;
          font-size: 13px;
          pointer-events: none;
        }

        .bill-items-v4-search-input {
          width: 100%;
          height: 40px;
          padding: 0 36px;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          outline: none;
          background: #ffffff;
          color: #172033;
          font-family: inherit;
          font-size: 11.5px;
          font-weight: 500;
          transition:
            border-color .15s ease,
            box-shadow .15s ease;
        }

        .bill-items-v4-search-input::placeholder {
          color: #a7afbd;
        }

        .bill-items-v4-search-input:hover {
          border-color: #c6cdd8;
        }

        .bill-items-v4-search-input:focus {
          border-color: #635bff;
          box-shadow:
            0 0 0 3px rgba(99,91,255,.09);
        }

        .bill-items-v4-search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          width: 23px;
          height: 23px;
          padding: 0;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #98a2b3;
          font-family: inherit;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          transform: translateY(-50%);
        }

        .bill-items-v4-search-clear:hover {
          background: #f2f4f7;
          color: #344054;
        }

        .bill-items-v4-search-status {
          margin-top: 5px;
          padding-left: 2px;
          color: #667085;
          font-size: 9.5px;
          line-height: 14px;
        }

        .bill-items-v4-search-status strong {
          color: #5148d7;
          font-weight: 750;
        }

        .bill-items-v4-no-result {
          color: #d92d20;
        }

        /* =====================================================
           MANUAL ROW BUTTON
        ===================================================== */

        .bill-items-v4-manual {
          position: relative;
          flex: 0 0 auto;
        }

        .bill-items-v4-manual-button {
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 14px;
          border: 1px solid #d8dee8;
          border-radius: 8px;
          background: #ffffff;
          color: #344054;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(16,24,40,.025);
          transition:
            background .15s ease,
            border-color .15s ease,
            color .15s ease,
            transform .15s ease,
            box-shadow .15s ease;
        }

        .bill-items-v4-manual-button:hover {
          background: #f8f9fc;
          border-color: #c5ccd8;
          color: #1d2939;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(16,24,40,.05);
        }

        .bill-items-v4-manual-button:active {
          transform: translateY(0);
        }

        .bill-items-v4-plus {
          width: 19px;
          height: 19px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          background: #efefff;
          color: #5148d7;
          font-size: 15px;
          line-height: 1;
          font-weight: 700;
        }

        /* =====================================================
           MANUAL MENU
        ===================================================== */

        .bill-items-v4-manual-menu {
          position: absolute;
          z-index: 100;
          top: calc(100% + 8px);
          right: 0;
          width: 290px;
          padding: 15px;
          border: 1px solid #e4e7ec;
          border-radius: 11px;
          background: #ffffff;
          box-shadow:
            0 14px 30px rgba(16,24,40,.12),
            0 3px 8px rgba(16,24,40,.05);
        }

        .bill-items-v4-menu-title {
          margin-bottom: 13px;
          color: #172033;
          font-size: 12px;
          line-height: 17px;
          font-weight: 750;
        }

        .bill-items-v4-radio {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 32px;
          margin-bottom: 3px;
          color: #344054;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .bill-items-v4-radio input {
          width: 15px;
          height: 15px;
          margin: 0;
          accent-color: #635bff;
          cursor: pointer;
        }

        .bill-items-v4-heading-input {
          width: 100%;
          height: 38px;
          margin: 8px 0 10px;
          padding: 0 10px;
          border: 1px solid #d8dee8;
          border-radius: 7px;
          outline: none;
          background: #fff;
          color: #172033;
          font-family: inherit;
          font-size: 11px;
        }

        .bill-items-v4-heading-input:focus {
          border-color: #635bff;
          box-shadow: 0 0 0 3px rgba(99,91,255,.09);
        }

        .bill-items-v4-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 5px 0 12px;
          color: #475467;
          font-size: 10.5px;
          line-height: 15px;
          font-weight: 550;
          cursor: pointer;
        }

        .bill-items-v4-checkbox input {
          width: 15px;
          height: 15px;
          margin: 0;
          flex: 0 0 15px;
          accent-color: #635bff;
          cursor: pointer;
        }

        .bill-items-v4-checkbox.disabled {
          color: #b3bac6;
          cursor: not-allowed;
        }

        .bill-items-v4-checkbox.disabled input {
          cursor: not-allowed;
        }

        .bill-items-v4-menu-actions {
          display: flex;
          gap: 7px;
          padding-top: 2px;
          border-top: 1px solid #f0f1f3;
        }

        .bill-items-v4-primary,
        .bill-items-v4-secondary {
          height: 35px;
          border-radius: 7px;
          font-family: inherit;
          font-size: 10.5px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform .14s ease,
            box-shadow .14s ease,
            background .14s ease;
        }

        .bill-items-v4-primary {
          flex: 1;
          border: 1px solid #5b52eb;
          background: linear-gradient(
            135deg,
            #635bff,
            #5148d7
          );
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(99,91,255,.18);
        }

        .bill-items-v4-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 12px rgba(99,91,255,.22);
        }

        .bill-items-v4-secondary {
          padding: 0 12px;
          border: 1px solid #d8dee8;
          background: #ffffff;
          color: #475467;
        }

        .bill-items-v4-secondary:hover {
          background: #f8fafc;
        }

        /* =====================================================
           TABLE WRAPPER
        ===================================================== */

        .bill-items-v4-table-wrapper {
          width: 100%;
          overflow-x: auto;
          overflow-y: visible;
          border: 1px solid #e4e7ec;
          border-radius: 9px;
          background: #ffffff;
          scrollbar-width: thin;
          scrollbar-color: #cbd2dc transparent;
        }

        /* Keep the table header and seven rows visible; scroll for additional rows. */
        .bill-items-v4-table-wrapper-scroll {
          max-height: 402px;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .bill-items-v4-table-wrapper-scroll .bill-items-v4-table thead th {
          position: sticky;
          top: 0;
          z-index: 5;
        }

        .bill-items-v4-table-wrapper::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        .bill-items-v4-table-wrapper::-webkit-scrollbar-track {
          background: #f8f9fb;
        }

        .bill-items-v4-table-wrapper::-webkit-scrollbar-thumb {
          background: #cbd2dc;
          border-radius: 99px;
        }

        /* =====================================================
           TABLE
        ===================================================== */

        .bill-items-v4-table {
          width: 100%;
          min-width: 920px;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
          font-size: 11px;
        }

        .bill-items-v4-table thead th {
          height: 37px;
          padding: 0 8px;
          border-bottom: 1px solid #e4e7ec;
          background: #f8f9fb;
          color: #667085;
          font-size: 9px;
          line-height: 12px;
          font-weight: 750;
          letter-spacing: .055em;
          text-align: left;
          white-space: nowrap;
        }

        .bill-items-v4-table thead th:first-child {
          border-top-left-radius: 8px;
        }

        .bill-items-v4-table thead th:last-child {
          border-top-right-radius: 8px;
        }

        .bill-items-v4-table tbody td {
          height: 52px;
          padding: 6px 7px;
          border-bottom: 1px solid #eef0f3;
          background: #ffffff;
          vertical-align: middle;
        }

        .bill-items-v4-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .bill-items-v4-table tbody tr {
          transition:
            background .12s ease,
            box-shadow .12s ease;
        }

        .bill-items-v4-table tbody tr:hover td {
          background: #fbfcff;
        }

        /* =====================================================
           COLUMN WIDTHS
        ===================================================== */

        .bill-items-v4-drag-column,
        .bill-items-v4-drag-cell {
          width: 55px;
          text-align: center !important;
        }

        .bill-items-v4-sr-column,
        .bill-items-v4-sr-cell {
          width: 48px;
          text-align: center !important;
        }

        .bill-items-v4-particular-column {
          width: 32%;
        }

        .bill-items-v4-qty-column {
          width: 72px;
          text-align: center !important;
        }

        .bill-items-v4-unit-column {
          width: 76px;
        }

        .bill-items-v4-rate-column {
          width: 100px;
        }

        .bill-items-v4-amount-column {
          width: 115px;
        }

        .bill-items-v4-action-column {
          width: 190px;
        }

        /* =====================================================
           MOVE HANDLE
        ===================================================== */

        .bill-items-v4-drag-cell {
          cursor: grab;
          color: #98a2b3;
        }

        .bill-items-v4-drag-cell:active {
          cursor: grabbing;
        }

        .bill-items-v4-drag-handle {
          width: 27px;
          height: 30px;
          margin: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          color: #98a2b3;
          font-size: 15px;
          letter-spacing: -2px;
          transition:
            background .12s ease,
            color .12s ease;
        }

        .bill-items-v4-drag-handle:hover {
          background: #f2f4f7;
          color: #667085;
        }

        /* =====================================================
           SERIAL
        ===================================================== */

        .bill-items-v4-sr-cell {
          color: #667085;
          font-size: 10.5px;
          font-weight: 650;
        }

        /* =====================================================
           TABLE INPUTS
        ===================================================== */

        .bill-items-v4-table-input {
          width: 100%;
          height: 36px;
          padding: 0 8px;
          border: 1px solid transparent;
          border-radius: 6px;
          outline: none;
          background: transparent;
          color: #344054;
          font-family: inherit;
          font-size: 11px;
          font-weight: 550;
          transition:
            background .13s ease,
            border-color .13s ease,
            box-shadow .13s ease;
        }

        .bill-items-v4-table-input:hover {
          border-color: #e0e4ea;
          background: #fbfcfe;
        }

        .bill-items-v4-table-input:focus {
          border-color: #635bff;
          background: #ffffff;
          box-shadow:
            0 0 0 3px rgba(99,91,255,.08);
        }

        .bill-items-v4-table-input::placeholder {
          color: #b0b7c3;
        }

        .bill-items-v4-number-input {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .bill-items-v4-table-input[type="number"]::-webkit-inner-spin-button,
        .bill-items-v4-table-input[type="number"]::-webkit-outer-spin-button {
          opacity: .45;
        }

        .bill-items-v4-product-name {
          color: #172033;
          font-weight: 650;
        }

        .bill-items-v4-heading-input-table {
          color: #5148d7;
          font-weight: 750;
        }

        .bill-items-v4-item-bold {
          font-weight: 800 !important;
        }

        .bill-items-v4-item-center {
          text-align: center !important;
        }

        /* =====================================================
           PRODUCT SEARCH
        ===================================================== */

        .bill-items-v4-product-search {
          position: relative;
          width: 100%;
        }

        .bill-items-v4-suggestions {
          position: absolute;
          z-index: 200;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          min-width: 340px;
          max-height: 270px;
          overflow-y: auto;
          padding: 4px;
          border: 1px solid #dfe3ea;
          border-radius: 8px;
          background: #ffffff;
          box-shadow:
            0 14px 30px rgba(16,24,40,.13),
            0 3px 8px rgba(16,24,40,.06);
        }

        .bill-items-v4-suggestion {
          width: 100%;
          min-height: 43px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 60px 85px;
          align-items: center;
          gap: 8px;
          padding: 7px 9px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #344054;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            background .1s ease;
        }

        .bill-items-v4-suggestion:hover {
          background: #f6f7ff;
        }

        .bill-items-v4-suggestion-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #172033;
          font-size: 10.5px;
          font-weight: 650;
        }

        .bill-items-v4-suggestion-unit {
          color: #667085;
          font-size: 9px;
          text-align: center;
        }

        .bill-items-v4-suggestion-rate {
          color: #5148d7;
          font-size: 10px;
          font-weight: 700;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        /* =====================================================
           AMOUNT
        ===================================================== */

        .bill-items-v4-amount-cell {
          padding-right: 12px !important;
          color: #172033;
          font-size: 11px;
          font-weight: 750;
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        /* =====================================================
           ACTIONS
        ===================================================== */

        .bill-items-v4-actions {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 4px;
          white-space: nowrap;
        }

        .bill-items-v4-action {
          width: 29px;
          height: 29px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e1e5eb;
          border-radius: 6px;
          background: #ffffff;
          color: #667085;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background .12s ease,
            border-color .12s ease,
            color .12s ease,
            transform .12s ease;
        }

        .bill-items-v4-action:hover:not(:disabled) {
          border-color: #cbd2dc;
          background: #f8fafc;
          color: #344054;
          transform: translateY(-1px);
        }

        .bill-items-v4-action:active:not(:disabled) {
          transform: translateY(0);
        }

        .bill-items-v4-action.active {
          border-color: #d8d4ff;
          background: #f1f0ff;
          color: #5148d7;
        }

        .bill-items-v4-action:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        .bill-items-v4-delete {
          width: auto;
          min-width: 48px;
          padding: 0 8px;
          border-color: #f1d4d1;
          color: #d92d20;
          background: #fffafa;
        }

        .bill-items-v4-delete:hover {
          border-color: #efb4af !important;
          background: #fff1f0 !important;
          color: #b42318 !important;
        }

        /* =====================================================
           ROW STATES
        ===================================================== */

        .bill-items-v4-selected td {
          background: #f8f8ff !important;
          border-bottom-color: #e8e7ff;
        }

        .bill-items-v4-selected td:first-child {
          box-shadow: inset 3px 0 0 #635bff;
        }

        .bill-items-v4-search-match td {
          background: #fffdf0 !important;
        }

        .bill-items-v4-search-match td:first-child {
          box-shadow: inset 3px 0 0 #f2b233;
        }

        .bill-items-v4-dragging td {
          opacity: .55;
          background: #f4f4ff !important;
        }

        /* =====================================================
           MANUAL HEADING
        ===================================================== */

        .bill-items-v4-manual-heading td {
          background: #faf9ff;
        }

        .bill-items-v4-manual-heading .bill-items-v4-table-input {
          color: #5148d7;
          font-weight: 750;
        }

        /* =====================================================
           BLANK ROW
        ===================================================== */

        .bill-items-v4-manual-blank td {
          height: 40px;
          background: #fcfcfd;
        }

        .bill-items-v4-manual-blank .bill-items-v4-table-input {
          color: #98a2b3;
        }

        /* =====================================================
           FOOTERS
        ===================================================== */

        .bill-items-v4-search-footer,
        .bill-items-v4-keyboard-help {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          color: #98a2b3;
          font-size: 9.5px;
          line-height: 15px;
        }

        .bill-items-v4-search-footer {
          margin-top: 9px;
          padding: 7px 10px;
          border: 1px solid #ececf8;
          border-radius: 7px;
          background: #fafaff;
        }

        .bill-items-v4-search-footer strong {
          color: #5148d7;
          font-weight: 700;
        }

        .bill-items-v4-keyboard-help {
          margin-top: 9px;
          padding: 0 2px;
        }

        .bill-items-v4-kbd {
          display: inline-flex;
          min-width: 18px;
          height: 18px;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          border: 1px solid #d9dde5;
          border-bottom-width: 2px;
          border-radius: 4px;
          background: #f8f9fb;
          color: #667085;
          font-family: inherit;
          font-size: 8.5px;
          font-weight: 650;
        }

        .bill-items-v4-keyboard-help strong {
          color: #667085;
        }

        .bill-items-v4-placeholder-row td {
          height: 52px;
          background: #fcfcfd;
        }

        .bill-items-v4-placeholder-row .bill-items-v4-empty-text {
          color: #98a2b3;
          font-size: 10px;
        }

        /* =====================================================
           EMPTY STATE
        ===================================================== */

        .bill-items-v4-empty {
          min-height: 155px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 25px;
          color: #98a2b3;
        }

        .bill-items-v4-empty-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
          border-radius: 10px;
          background: #f5f5ff;
          color: #635bff;
          font-size: 17px;
        }

        .bill-items-v4-empty-title {
          color: #475467;
          font-size: 11.5px;
          font-weight: 700;
        }

        .bill-items-v4-empty-text {
          color: #98a2b3;
          font-size: 9.5px;
          text-align: center;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 950px) {
          .bill-items-v4-header {
            flex-wrap: wrap;
          }

          .bill-items-v4-heading {
            flex: 1 1 100%;
          }

          .bill-items-v4-search {
            flex: 1 1 auto;
          }

          .bill-items-v4-manual {
            flex: 0 0 auto;
          }
        }

        @media (max-width: 650px) {
          .bill-items-v4 {
            padding: 15px;
            border-radius: 11px;
          }

          .bill-items-v4-header {
            gap: 10px;
          }

          .bill-items-v4-search {
            flex: 1 1 100%;
            order: 3;
          }

          .bill-items-v4-manual {
            margin-left: auto;
          }

          .bill-items-v4-subtitle {
            margin-left: 0;
            padding-left: 46px;
          }

          .bill-items-v4-manual-menu {
            right: 0;
            width: min(290px, calc(100vw - 42px));
          }
        }

        @media (max-width: 460px) {
          .bill-items-v4 {
            padding: 12px;
          }

          .bill-items-v4-title-row {
            gap: 8px;
          }

          .bill-items-v4-icon {
            width: 33px;
            height: 33px;
            flex-basis: 33px;
            border-radius: 8px;
            font-size: 15px;
          }

          .bill-items-v4-title {
            font-size: 15px;
          }

          .bill-items-v4-subtitle {
            padding-left: 41px;
            font-size: 9.5px;
          }

          .bill-items-v4-manual-button {
            padding: 0 10px;
          }

          .bill-items-v4-plus {
            width: 17px;
            height: 17px;
          }

          .bill-items-v4-keyboard-help {
            display: none;
          }
        }

        /* =====================================================
           FOCUS / MOTION
        ===================================================== */

        .bill-items-v4 button:focus-visible,
        .bill-items-v4 input:focus-visible {
          outline: 3px solid rgba(99,91,255,.16);
          outline-offset: 1px;
        }

        @media (prefers-reduced-motion: reduce) {
          .bill-items-v4 *,
          .bill-items-v4 *::before,
          .bill-items-v4 *::after {
            scroll-behavior: auto !important;
            transition: none !important;
          }
        }
      `}</style>

      <section className="bill-items-v4">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="bill-items-v4-header">

          <div className="bill-items-v4-heading">

            <div className="bill-items-v4-title-row">

              <div
                className="bill-items-v4-icon"
                aria-hidden="true"
              >
                🛒
              </div>

              <h2 className="bill-items-v4-title">
                Bill Items
              </h2>

            </div>

            <p className="bill-items-v4-subtitle">
              Edit, search and arrange your bill items
            </p>

          </div>

          {/* ===================================================
              SEARCH
          =================================================== */}

          <div className="bill-items-v4-search">

            <div className="bill-items-v4-search-box">

              <span
                className="bill-items-v4-search-icon"
                aria-hidden="true"
              >
                🔎
              </span>

              <input
                type="text"
                className="bill-items-v4-search-input"
                placeholder="Search added items..."
                value={itemSearch}
                onChange={(event) =>
                  setItemSearch(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleItemSearchKeyDown
                }
              />

              {itemSearch && (
                <button
                  type="button"
                  className="bill-items-v4-search-clear"
                  onClick={() =>
                    setItemSearch("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}

            </div>

            {itemSearch && (
              <div className="bill-items-v4-search-status">

                {matchingItemIndexes.length >
                0 ? (
                  <>
                    Found{" "}
                    <strong>
                      {
                        matchingItemIndexes.length
                      }
                    </strong>{" "}
                    item
                    {matchingItemIndexes.length !==
                    1
                      ? "s"
                      : ""}
                    {" · "}
                    Press Enter to jump
                  </>
                ) : (
                  <span className="bill-items-v4-no-result">
                    No matching item
                  </span>
                )}

              </div>
            )}

          </div>

          {/* ===================================================
              MANUAL ROW
          =================================================== */}

          <div className="bill-items-v4-manual">

            <button
              type="button"
              className="bill-items-v4-manual-button"
              onClick={() =>
                setShowManualOptions(
                  (value) => !value
                )
              }
            >
              <span className="bill-items-v4-plus">
                +
              </span>

              Manual Row
            </button>

            {showManualOptions && (
              <div className="bill-items-v4-manual-menu">

                <div className="bill-items-v4-menu-title">
                  Add Manual Row
                </div>

                {/* BLANK */}

                <label className="bill-items-v4-radio">

                  <input
                    type="radio"
                    name="manual-row-type"
                    checked={
                      manualType ===
                      "blank"
                    }
                    onChange={() => {
                      setManualType(
                        "blank"
                      );

                      setManualSrNo(
                        false
                      );
                    }}
                  />

                  <span>
                    Blank Line
                  </span>

                </label>

                {/* HEADING */}

                <label className="bill-items-v4-radio">

                  <input
                    type="radio"
                    name="manual-row-type"
                    checked={
                      manualType ===
                      "heading"
                    }
                    onChange={() =>
                      setManualType(
                        "heading"
                      )
                    }
                  />

                  <span>
                    Heading
                  </span>

                </label>

                {manualType ===
                  "heading" && (
                  <input
                    type="text"
                    className="bill-items-v4-heading-input"
                    placeholder="Enter heading"
                    value={
                      manualText
                    }
                    onChange={(
                      event
                    ) =>
                      setManualText(
                        event.target.value
                      )
                    }
                    autoFocus
                  />
                )}

                {/* SR NUMBER */}

                <label
                  className={`bill-items-v4-checkbox ${
                    manualType ===
                    "blank"
                      ? "disabled"
                      : ""
                  }`}
                >

                  <input
                    type="checkbox"
                    checked={
                      manualType ===
                      "heading"
                        ? manualSrNo
                        : false
                    }
                    disabled={
                      manualType ===
                      "blank"
                    }
                    onChange={(
                      event
                    ) => {
                      if (
                        manualType ===
                        "heading"
                      ) {
                        setManualSrNo(
                          event.target
                            .checked
                        );
                      }
                    }}
                  />

                  <span>
                    Count Sr. No. for this row
                  </span>

                </label>

                {/* ACTIONS */}

                <div className="bill-items-v4-menu-actions">

                  <button
                    type="button"
                    className="bill-items-v4-primary"
                    onClick={
                      handleAddManualRow
                    }
                  >
                    Add Row
                  </button>

                  <button
                    type="button"
                    className="bill-items-v4-secondary"
                    onClick={() =>
                      setShowManualOptions(
                        false
                      )
                    }
                  >
                    Cancel
                  </button>

                </div>

              </div>
            )}

          </div>

        </div>

        {/* =====================================================
            TABLE
        ===================================================== */}

        <div
          ref={tableWrapperRef}
          className={`bill-items-v4-table-wrapper ${items.length > 7 ? "bill-items-v4-table-wrapper-scroll" : ""}`}
        >

          <table className="bill-items-v4-table">

            <thead>

              <tr>

                <th className="bill-items-v4-drag-column">
                  MOVE
                </th>

                <th className="bill-items-v4-sr-column">
                  SR.
                </th>

                <th className="bill-items-v4-particular-column">
                  PARTICULAR
                </th>
                {deepMode && <th className="bill-items-v4-rate-column">DEEP (IN INCH)</th>}

                <th className="bill-items-v4-qty-column">
                  QTY
                </th>

                <th className="bill-items-v4-unit-column">
                  UNIT
                </th>

                <th className="bill-items-v4-rate-column">
                  {deepMode ? "RATE PER INCH" : "RATE"}
                </th>

                <th className="bill-items-v4-amount-column">
                  AMOUNT
                </th>

                <th className="bill-items-v4-action-column">
                  ACTIONS
                </th>

              </tr>

            </thead>

            <tbody>

              {items.length === 0 ? (
                <tr className="bill-items-v4-placeholder-row">
                  <td className="bill-items-v4-drag-cell" aria-label="Move">
                    ⋮⋮
                  </td>
                  <td className="bill-items-v4-sr-cell"></td>
                  <td>
                    <div className="bill-items-v4-empty-text">
                      Add a product or use Manual Row
                    </div>
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="bill-items-v4-amount-cell"></td>
                  <td></td>
                </tr>
              ) : (
                items.map(
                  (
                    item,
                    index
                  ) => {

                    const isProduct =
                      isProductRow(
                        item
                      );

                    const isManual =
                      isManualRow(
                        item
                      );

                    const blankRow =
                      isBlankRow(
                        item
                      );

                    const headingRow =
                      isHeadingRow(
                        item
                      );

                    const isSelected =
                      selectedRowId ===
                      item.id;

                    const isSearchMatch =
                      matchingItemIndexes.includes(
                        index
                      );

                    const filteredProducts =
                      searchRowId ===
                      item.id
                        ? getFilteredProducts(
                            getDisplayName(
                              item
                            )
                          )
                        : [];

                    const itemTextClassName =
                      [
                        "bill-items-v4-table-input",

                        isProduct
                          ? "bill-items-v4-product-name"
                          : "",

                        headingRow
                          ? "bill-items-v4-heading-input-table"
                          : "",

                        item.bold
                          ? "bill-items-v4-item-bold"
                          : "",

                        item.center
                          ? "bill-items-v4-item-center"
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(" ");

                    return (
                      <tr
                        key={
                          item.id
                        }
                        ref={(
                          element
                        ) => {
                          if (
                            element
                          ) {
                            rowRefs.current[
                              item.id
                            ] =
                              element;
                          }
                        }}
                        draggable
                        onClick={() =>
                          setSelectedRowId(
                            item.id
                          )
                        }
                        onDragStart={(
                          event
                        ) =>
                          handleDragStart(
                            event,
                            item.id
                          )
                        }
                        onDragOver={
                          handleDragOver
                        }
                        onDrop={(
                          event
                        ) =>
                          handleDrop(
                            event,
                            item.id
                          )
                        }
                        onDragEnd={() =>
                          setDraggedRowId(
                            null
                          )
                        }
                        className={[
                          headingRow
                            ? "bill-items-v4-manual-heading"
                            : blankRow
                            ? "bill-items-v4-manual-blank"
                            : "",

                          isSelected
                            ? "bill-items-v4-selected"
                            : "",

                          isSearchMatch
                            ? "bill-items-v4-search-match"
                            : "",

                          draggedRowId ===
                          item.id
                            ? "bill-items-v4-dragging"
                            : "",
                        ]
                          .filter(
                            Boolean
                          )
                          .join(" ")}
                      >

                        {/* MOVE */}

                        <td className="bill-items-v4-drag-cell">

                          <span
                            className="bill-items-v4-drag-handle"
                            title="Drag to move"
                          >
                            ⋮⋮
                          </span>

                        </td>

                        {/* SR */}

                        <td className="bill-items-v4-sr-cell">
                          {getSerialNumber(
                            index
                          )}
                        </td>

                        {/* PARTICULAR */}

                        <td>

                          {isProduct ? (

                            <div className="bill-items-v4-product-search">

                              <input
                                ref={(
                                  element
                                ) => {
                                  if (
                                    element
                                  ) {
                                    inputRefs.current[
                                      item.id
                                    ] =
                                      element;
                                  }
                                }}
                                type="text"
                                className={
                                  itemTextClassName
                                }
                                value={getDisplayName(
                                  item
                                )}
                                placeholder="Search product..."
                                autoComplete="off"
                                onFocus={() => {
                                  setSelectedRowId(
                                    item.id
                                  );

                                  setSearchRowId(
                                    item.id
                                  );

                                  setHighlightedProductIndex(
                                    -1
                                  );
                                }}
                                onChange={(
                                  event
                                ) =>
                                  handleParticularChange(
                                    item,
                                    event
                                      .target
                                      .value
                                  )
                                }
                                onKeyDown={(
                                  event
                                ) =>
                                  handleParticularKeyDown(
                                    event,
                                    item
                                  )
                                }
                              />

                              {searchRowId ===
                                item.id &&
                                filteredProducts.length >
                                  0 && (
                                  <div className="bill-items-v4-suggestions">

                                    {filteredProducts.map(
                                      (
                                        product,
                                        productIndex
                                      ) => {

                                        const highlighted =
                                          productIndex ===
                                          highlightedProductIndex;

                                        return (
                                          <button
                                            key={
                                              product.id
                                            }
                                            type="button"
                                            className="bill-items-v4-suggestion"
                                            style={
                                              highlighted
                                                ? {
                                                    background:
                                                      "#eef4ff",
                                                  }
                                                : undefined
                                            }
                                            onMouseDown={(
                                              event
                                            ) => {
                                              event.preventDefault();

                                              selectTableProduct(
                                                item,
                                                product
                                              );
                                            }}
                                            onMouseEnter={() =>
                                              setHighlightedProductIndex(
                                                productIndex
                                              )
                                            }
                                          >

                                            <span className="bill-items-v4-suggestion-name">
                                              {
                                                product.name
                                              }
                                            </span>

                                            <span className="bill-items-v4-suggestion-unit">
                                              {
                                                product.unit ||
                                                ""
                                              }
                                            </span>

                                            <span className="bill-items-v4-suggestion-rate">
                                              ₹
                                              {Number(
                                                product.price ||
                                                  0
                                              ).toFixed(
                                                2
                                              )}
                                            </span>

                                          </button>
                                        );
                                      }
                                    )}

                                  </div>
                                )}

                            </div>

                          ) : (

                            <input
                              type="text"
                              className={
                                itemTextClassName
                              }
                              placeholder={
                                headingRow
                                  ? "Heading"
                                  : "Blank line"
                              }
                              value={
                                item.particular ||
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                onUpdateItem?.(
                                  item.id,
                                  {
                                    particular:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                            />

                          )}

                        </td>

                        {deepMode && (
                          <td>
                            {isProduct && (
                              <input
                                ref={(element) => { if (element) inputRefs.current[`${item.id}:deep`] = element; }}
                                type="number"
                                min="0"
                                step="any"
                                className="bill-items-v4-table-input bill-items-v4-number-input"
                                value={item.deep ?? ""}
                                onChange={(event) => onUpdateItem?.(item.id, { deep: event.target.value, deepMode: true })}
                                onKeyDown={(event) => handleItemFieldEnter(event, item.id, "deep")}
                                aria-label="Deep (in inch)"
                              />
                            )}
                          </td>
                        )}

                        {/* QTY */}

                        <td>

                          {isProduct && (
                            <input
                              ref={(element) => { if (element) inputRefs.current[`${item.id}:qty`] = element; }}
                              type="number"
                              min="0"
                              step="any"
                              className="bill-items-v4-table-input bill-items-v4-number-input"
                              value={
                                item.qty ??
                                ""
                              }
                              onKeyDown={(event) => handleItemFieldEnter(event, item.id, "qty")}
                              onChange={(
                                event
                              ) =>
                                onUpdateItem?.(
                                  item.id,
                                  {
                                    qty:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                            />
                          )}

                        </td>

                        {/* UNIT */}

                        <td>

                          {isProduct && (
                            <input
                              ref={(element) => { if (element) inputRefs.current[`${item.id}:unit`] = element; }}
                              type="text"
                              className="bill-items-v4-table-input"
                              value={
                                item.unit ||
                                ""
                              }
                              onKeyDown={(event) => handleItemFieldEnter(event, item.id, "unit")}
                              onChange={(
                                event
                              ) =>
                                onUpdateItem?.(
                                  item.id,
                                  {
                                    unit:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                            />
                          )}

                        </td>

                        {/* RATE */}

                        <td>

                          {isProduct && (
                            <input
                              ref={(element) => { if (element) inputRefs.current[`${item.id}:rate`] = element; }}
                              type="number"
                              min="0"
                              step="0.01"
                              className="bill-items-v4-table-input bill-items-v4-number-input"
                              value={
                                item.rate ??
                                ""
                              }
                              onKeyDown={(event) => handleItemFieldEnter(event, item.id, "rate")}
                              onChange={(
                                event
                              ) =>
                                onUpdateItem?.(
                                  item.id,
                                  {
                                    rate:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                            />
                          )}

                        </td>

                        {/* AMOUNT */}

                        <td className="bill-items-v4-amount-cell">

                          {isProduct
                            ? `₹${Number(
                                item.amount ||
                                  0
                              ).toFixed(
                                2
                              )}`
                            : ""}

                        </td>

                        {/* ACTIONS */}

                        <td>

                          <div className="bill-items-v4-actions">

                            {/* BOLD */}

                            <button
                              type="button"
                              className={`bill-items-v4-action ${
                                item.bold
                                  ? "active"
                                  : ""
                              }`}
                              title={
                                item.bold
                                  ? "Remove bold"
                                  : "Make bold"
                              }
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                toggleItemBold(
                                  item
                                );
                              }}
                            >
                              <strong>
                                B
                              </strong>
                            </button>

                            {/* CENTER */}

                            <button
                              type="button"
                              className={`bill-items-v4-action ${
                                item.center
                                  ? "active"
                                  : ""
                              }`}
                              title={
                                item.center
                                  ? "Align item left"
                                  : "Center item"
                              }
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                toggleItemCenter(
                                  item
                                );
                              }}
                            >
                              ≡
                            </button>

                            {/* MOVE UP */}

                            <button
                              type="button"
                              className="bill-items-v4-action"
                              title="Move up (Alt + ↑)"
                              disabled={
                                index ===
                                0
                              }
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                moveRow(
                                  item.id,
                                  -1
                                );
                              }}
                            >
                              ↑
                            </button>

                            {/* MOVE DOWN */}

                            <button
                              type="button"
                              className="bill-items-v4-action"
                              title="Move down (Alt + ↓)"
                              disabled={
                                index ===
                                items.length -
                                  1
                              }
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                moveRow(
                                  item.id,
                                  1
                                );
                              }}
                            >
                              ↓
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              className="bill-items-v4-action bill-items-v4-delete"
                              title="Delete item"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                handleDelete(
                                  item
                                );
                              }}
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )
              )}

            </tbody>

          </table>

        </div>

        {/* =====================================================
            SEARCH HELP
        ===================================================== */}

        {itemSearch &&
          matchingItemIndexes.length >
            0 && (
            <div className="bill-items-v4-search-footer">

              <span>
                Search is checking{" "}
                <strong>
                  added items only
                </strong>
              </span>

              <span>
                Press{" "}
                <kbd className="bill-items-v4-kbd">
                  Enter
                </kbd>{" "}
                to jump to the next match
              </span>

            </div>
          )}

        {/* =====================================================
            KEYBOARD HELP
        ===================================================== */}

        {items.length > 0 && (
          <div className="bill-items-v4-keyboard-help">

            <span>
              <kbd className="bill-items-v4-kbd">
                Alt
              </kbd>{" "}
              +{" "}
              <kbd className="bill-items-v4-kbd">
                ↑
              </kbd>
              <kbd className="bill-items-v4-kbd">
                ↓
              </kbd>{" "}
              Move selected row
            </span>

            <span>
              Drag{" "}
              <strong>
                ⋮⋮
              </strong>{" "}
              to reorder
            </span>

          </div>
        )}

      </section>
    </>
  );
}