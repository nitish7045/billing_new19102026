import { useState } from "react";

export function useBillItems() {
  const [items, setItems] = useState([]);

  /* =========================================================
     ADD PRODUCT
     ========================================================= */

  function addItem({
    productId = null,
    particular,
    notes = "",
    qty,
    unit = "",
    rate,
  }) {
    const quantity = Number(qty) || 0;
    const itemRate = Number(rate) || 0;

    const newItem = {
      id: crypto.randomUUID(),
      type: "product",
      productId,
      particular: particular || "",
      notes: notes || "",
      qty: quantity,
      unit: unit || "",
      rate: itemRate,
      amount: quantity * itemRate,

      // Product rows count towards Sr. No.
      showSrNo: true,

      // Item formatting
      bold: false,
      center: false,
    };

    setItems((previous) => [
      ...previous,
      newItem,
    ]);
  }

  /* =========================================================
     DELETE
     ========================================================= */

  function deleteItem(id) {
    setItems((previous) =>
      previous.filter(
        (item) => item.id !== id
      )
    );
  }

  /* =========================================================
     UPDATE
     ========================================================= */

  function updateItem(id, updatedValues) {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const updatedItem = {
          ...item,
          ...updatedValues,
        };

        if (updatedItem.type === "product") {
          const quantity =
            Number(updatedItem.qty) || 0;

          const rate =
            Number(updatedItem.rate) || 0;

          updatedItem.amount =
            quantity * rate;
        }

        return updatedItem;
      })
    );
  }

  /* =========================================================
     ADD MANUAL ROW
     ========================================================= */

  function addManualRow(
    text = "",
    rowType = "blank",
    showSrNo = false
  ) {
    const newRow = {
      id: crypto.randomUUID(),
      type: "manual",
      rowType: rowType || "blank",
      showSrNo: Boolean(showSrNo),

      particular: text || "",
      notes: "",
      qty: null,
      unit: "",
      rate: null,
      amount: null,

      // Item formatting
      bold: false,
      center: false,
    };

    setItems((previous) => [
      ...previous,
      newRow,
    ]);
  }

  /* =========================================================
     MOVE ITEM
     ========================================================= */

  function moveItem(id, direction) {
    setItems((previous) => {
      const index =
        previous.findIndex(
          (item) => item.id === id
        );

      if (index === -1) {
        return previous;
      }

      const newIndex =
        index + direction;

      if (
        newIndex < 0 ||
        newIndex >= previous.length
      ) {
        return previous;
      }

      const updated = [
        ...previous,
      ];

      [
        updated[index],
        updated[newIndex],
      ] = [
        updated[newIndex],
        updated[index],
      ];

      return updated;
    });
  }

  /* =========================================================
     CLEAR
     ========================================================= */

  function clearItems() {
    setItems([]);
  }

  /* =========================================================
     RETURN
     ========================================================= */

  return {
    items,
    setItems,
    addItem,
    deleteItem,
    updateItem,
    addManualRow,
    moveItem,
    clearItems,
  };
}