import { useEffect, useState } from "react";

function BillEditor({
  billType,
  challanType,
  company,
  onBack,
}) {

  // =========================
  // BILL NUMBER
  // =========================

  const [billNo, setBillNo] =
    useState("");

  const [editBillNo, setEditBillNo] =
    useState(false);


  // =========================
  // DATE
  // =========================

  const [date, setDate] =
    useState(() => {

      const today =
        new Date();

      return today
        .toISOString()
        .split("T")[0];
    });


  // =========================
  // CUSTOMER DETAILS
  // =========================

  const [toAddress, setToAddress] =
    useState("");

  const [site, setSite] =
    useState("");


  // =========================
  // ITEMS
  // =========================

  const [items, setItems] =
    useState([]);


  // =========================
  // ITEM FORM
  // =========================

  const [particular, setParticular] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [qty, setQty] =
    useState("");

  const [unit, setUnit] =
    useState("");

  const [rate, setRate] =
    useState("");


  // =========================
  // TOTAL SETTINGS
  // =========================

  const [roundTotal, setRoundTotal] =
    useState(false);


  // =========================
  // GET BILL TITLE
  // =========================

  function getBillTitle() {

    if (
      billType === "normal"
    ) {
      return "Normal Bill";
    }

    if (
      billType === "gst"
    ) {
      return "Tax Invoice";
    }

    if (
      billType === "corecutting"
    ) {
      return "CoreCutting Bill";
    }

    if (
      billType === "challan"
    ) {

      return challanType === "gst"
        ? "GST Challan"
        : "Normal Challan";
    }

    return "New Bill";
  }


  // =========================
  // GET BILL ICON
  // =========================

  function getBillIcon() {

    if (
      billType === "normal"
    ) {
      return "🧾";
    }

    if (
      billType === "gst"
    ) {
      return "📄";
    }

    if (
      billType === "corecutting"
    ) {
      return "✂️";
    }

    if (
      billType === "challan"
    ) {
      return "🚚";
    }

    return "🧾";
  }


  // =========================
  // ADD ITEM
  // =========================

  function handleAddItem() {

    if (
      !particular.trim()
    ) {

      alert(
        "Please enter a particular."
      );

      return;
    }


    const quantity =
      Number(qty) || 0;

    const itemRate =
      Number(rate) || 0;

    const amount =
      quantity * itemRate;


    const newItem = {

      id:
        crypto.randomUUID(),

      type:
        "product",

      particular:
        particular.trim(),

      notes:
        notes.trim(),

      qty:
        quantity,

      unit:
        unit.trim(),

      rate:
        itemRate,

      amount:
        amount,
    };


    setItems((previous) => [

      ...previous,

      newItem,

    ]);


    // =========================
    // CLEAR FORM
    // =========================

    setParticular("");

    setNotes("");

    setQty("");

    setUnit("");

    setRate("");
  }


  // =========================
  // DELETE ITEM
  // =========================

  function deleteItem(id) {

    const confirmDelete =
      window.confirm(
        "Delete this item?"
      );

    if (
      !confirmDelete
    ) {
      return;
    }


    setItems((previous) =>
      previous.filter(
        (item) =>
          item.id !== id
      )
    );
  }


  // =========================
  // MOVE ITEM
  // =========================

  function moveItem(
    index,
    direction
  ) {

    const newIndex =
      index + direction;


    if (
      newIndex < 0 ||
      newIndex >= items.length
    ) {
      return;
    }


    const updatedItems =
      [...items];


    [
      updatedItems[index],
      updatedItems[newIndex],
    ] = [

      updatedItems[newIndex],
      updatedItems[index],

    ];


    setItems(
      updatedItems
    );
  }


  // =========================
  // CLEAR ALL
  // =========================

  function handleClearAll() {

    const confirmed =
      window.confirm(
        "Are you sure you want to clear the entire bill?"
      );


    if (
      !confirmed
    ) {
      return;
    }


    setItems([]);

    setToAddress("");

    setSite("");

    setParticular("");

    setNotes("");

    setQty("");

    setUnit("");

    setRate("");
  }


  // =========================
  // CALCULATE TOTAL
  // =========================

  const exactTotal =
    items.reduce(
      (
        total,
        item
      ) => {

        return (
          total +
          (
            Number(
              item.amount
            ) || 0
          )
        );

      },
      0
    );


  const finalTotal =
    roundTotal
      ? Math.round(
          exactTotal
        )
      : exactTotal;


  // =========================
  // FORMAT AMOUNT
  // =========================

  function formatAmount(
    amount
  ) {

    return new Intl.NumberFormat(
      "en-IN",
      {
        minimumFractionDigits:
          Number.isInteger(
            amount
          )
            ? 0
            : 2,

        maximumFractionDigits:
          2,
      }
    ).format(
      amount
    );
  }


  // =========================
  // HANDLE NEW BILL
  // =========================

  function handleNewBill() {

    const confirmed =
      window.confirm(
        "Start a new bill? Current bill data will be cleared."
      );


    if (
      !confirmed
    ) {
      return;
    }


    const currentBillNo =
      Number(billNo) || 0;


    setBillNo(
      String(
        currentBillNo + 1
      )
    );


    setItems([]);

    setToAddress("");

    setSite("");

    setParticular("");

    setNotes("");

    setQty("");

    setUnit("");

    setRate("");
  }


  // =========================
  // GO BACK
  // =========================

  function handleBack() {

    if (
      onBack
    ) {

      onBack();
    }
  }


  // =========================
  // ENTER TO ADD ITEM
  // =========================

  function handleRateKeyDown(
    event
  ) {

    if (
      event.key === "Enter"
    ) {

      event.preventDefault();

      handleAddItem();
    }
  }


  return (

    <div
      style={
        styles.container
      }
    >


      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <div
        style={
          styles.pageHeader
        }
      >

        <div
          style={
            styles.headerLeft
          }
        >

          <div
            style={
              styles.headerIcon
            }
          >
            {getBillIcon()}
          </div>


          <div>

            <div
              style={
                styles.titleRow
              }
            >

              <h1
                style={
                  styles.title
                }
              >
                {getBillTitle()}
              </h1>


              <span
                style={
                  styles.draftBadge
                }
              >
                Draft
              </span>

            </div>


            <p
              style={
                styles.subtitle
              }
            >
              {company?.company_name}
            </p>

          </div>

        </div>


        <button
          type="button"
          onClick={
            handleBack
          }
          style={
            styles.backButton
          }
        >
          ← Back
        </button>

      </div>


      {/* ========================= */}
      {/* BILL INFORMATION */}
      {/* ========================= */}

      <div
        style={
          styles.card
        }
      >

        <div
          style={
            styles.cardHeader
          }
        >

          <div
            style={
              styles.sectionIcon
            }
          >
            📋
          </div>


          <div>

            <h2
              style={
                styles.cardTitle
              }
            >
              Bill Information
            </h2>


            <p
              style={
                styles.cardSubtitle
              }
            >
              Enter the basic bill details.
            </p>

          </div>

        </div>


        <div
          style={
            styles.formGrid
          }
        >


          {/* COMPANY */}

          <div
            style={
              styles.field
            }
          >

            <label
              style={
                styles.label
              }
            >
              Company
            </label>


            <div
              style={
                styles.readOnlyField
              }
            >
              🏢{" "}

              {
                company?.company_name
              }

            </div>

          </div>


          {/* BILL TYPE */}

          <div
            style={
              styles.field
            }
          >

            <label
              style={
                styles.label
              }
            >
              Bill Type
            </label>


            <div
              style={
                styles.readOnlyField
              }
            >
              {getBillIcon()}{" "}

              {getBillTitle()}

            </div>

          </div>


          {/* BILL NUMBER */}

          <div
            style={
              styles.field
            }
          >

            <label
              style={
                styles.label
              }
            >
              Bill Number
            </label>


            <div
              style={
                styles.billNumberWrapper
              }
            >

              <input
                type="text"
                value={
                  billNo
                }
                readOnly={
                  !editBillNo
                }
                onChange={
                  (event) =>
                    setBillNo(
                      event.target.value
                    )
                }
                placeholder="Bill number"
                style={{

                  ...styles.input,

                  ...(
                    !editBillNo
                      ? styles.inputReadOnly
                      : {}
                  ),

                }}
              />


              <button
                type="button"
                onClick={() =>
                  setEditBillNo(
                    !editBillNo
                  )
                }
                style={
                  styles.editButton
                }
              >
                {editBillNo
                  ? "Lock"
                  : "Edit"}
              </button>

            </div>

          </div>


          {/* DATE */}

          <div
            style={
              styles.field
            }
          >

            <label
              style={
                styles.label
              }
            >
              Date
            </label>


            <input
              type="date"
              value={
                date
              }
              onChange={
                (event) =>
                  setDate(
                    event.target.value
                  )
              }
              style={
                styles.input
              }
            />

          </div>

        </div>

      </div>


      {/* ========================= */}
      {/* CUSTOMER DETAILS */}
      {/* ========================= */}

      <div
        style={
          styles.card
        }
      >

        <div
          style={
            styles.cardHeader
          }
        >

          <div
            style={
              styles.sectionIcon
            }
          >
            👤
          </div>


          <div>

            <h2
              style={
                styles.cardTitle
              }
            >
              Customer Details
            </h2>


            <p
              style={
                styles.cardSubtitle
              }
            >
              Enter customer and site information.
            </p>

          </div>

        </div>


        <div
          style={
            styles.customerGrid
          }
        >


          {/* TO */}

          <div
            style={
              styles.field
            }
          >

            <div
              style={
                styles.labelRow
              }
            >

              <label
                style={
                  styles.label
                }
              >
                To
              </label>


              <button
                type="button"
                style={
                  styles.selectCustomerButton
                }
              >
                📂 Select Customer
              </button>

            </div>


            <textarea
              value={
                toAddress
              }
              onChange={
                (event) =>
                  setToAddress(
                    event.target.value
                  )
              }
              placeholder="Enter customer name and address"
              style={
                styles.textarea
              }
            />

          </div>


          {/* SITE */}

          <div
            style={
              styles.field
            }
          >

            <label
              style={
                styles.label
              }
            >
              Site
            </label>


            <textarea
              value={
                site
              }
              onChange={
                (event) =>
                  setSite(
                    event.target.value
                  )
              }
              placeholder="Enter site details"
              style={
                styles.textarea
              }
            />

          </div>

        </div>

      </div>


      {/* ========================= */}
      {/* ADD ITEM */}
      {/* ========================= */}

      <div
        style={
          styles.card
        }
      >

        <div
          style={
            styles.cardHeader
          }
        >

          <div
            style={
              styles.sectionIcon
            }
          >
            ➕
          </div>


          <div>

            <h2
              style={
                styles.cardTitle
              }
            >
              Add Item
            </h2>


            <p
              style={
                styles.cardSubtitle
              }
            >
              Add products or services to the bill.
            </p>

          </div>

        </div>


        <div
          style={
            styles.itemForm
          }
        >


          {/* PARTICULAR */}

          <div
            style={
              styles.particularField
            }
          >

            <label
              style={
                styles.label
              }
            >
              Particular
            </label>


            <input
              type="text"
              value={
                particular
              }
              onChange={
                (event) =>
                  setParticular(
                    event.target.value
                  )
              }
              placeholder="Search or enter product"
              style={
                styles.input
              }
            />

          </div>


          {/* NOTES */}

          <div
            style={
              styles.notesField
            }
          >

            <label
              style={
                styles.label
              }
            >
              Notes
            </label>


            <input
              type="text"
              value={
                notes
              }
              onChange={
                (event) =>
                  setNotes(
                    event.target.value
                  )
              }
              placeholder="Optional"
              style={
                styles.input
              }
            />

          </div>


          {/* QTY */}

          <div
            style={
              styles.smallField
            }
          >

            <label
              style={
                styles.label
              }
            >
              Qty
            </label>


            <input
              type="number"
              value={
                qty
              }
              onChange={
                (event) =>
                  setQty(
                    event.target.value
                  )
              }
              placeholder="0"
              style={
                styles.input
              }
            />

          </div>


          {/* UNIT */}

          <div
            style={
              styles.smallField
            }
          >

            <label
              style={
                styles.label
              }
            >
              Unit
            </label>


            <input
              type="text"
              value={
                unit
              }
              onChange={
                (event) =>
                  setUnit(
                    event.target.value
                  )
              }
              placeholder="Nos"
              style={
                styles.input
              }
            />

          </div>


          {/* RATE */}

          <div
            style={
              styles.rateField
            }
          >

            <label
              style={
                styles.label
              }
            >
              Rate
            </label>


            <input
              type="number"
              value={
                rate
              }
              onChange={
                (event) =>
                  setRate(
                    event.target.value
                  )
              }
              onKeyDown={
                handleRateKeyDown
              }
              placeholder="0"
              style={
                styles.input
              }
            />

          </div>


          {/* ADD BUTTON */}

          <button
            type="button"
            onClick={
              handleAddItem
            }
            style={
              styles.addItemButton
            }
          >
            + Add Item
          </button>

        </div>

      </div>


      {/* ========================= */}
      {/* ITEM TABLE */}
      {/* ========================= */}

      <div
        style={
          styles.card
        }
      >

        <div
          style={
            styles.tableHeader
          }
        >

          <div>

            <h2
              style={
                styles.cardTitle
              }
            >
              Bill Items
            </h2>


            <p
              style={
                styles.cardSubtitle
              }
            >
              {items.length} item
              {items.length !== 1
                ? "s"
                : ""}{" "}
              added
            </p>

          </div>


          <button
            type="button"
            style={
              styles.manualRowButton
            }
          >
            + Insert Manual Row
          </button>

        </div>


        <div
          style={
            styles.tableWrapper
          }
        >

          <table
            style={
              styles.table
            }
          >

            <thead>

              <tr>

                <th
                  style={
                    styles.th
                  }
                >
                  #
                </th>

                <th
                  style={{
                    ...styles.th,
                    textAlign:
                      "left",
                  }}
                >
                  Particular
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Qty
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Unit
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Rate
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Amount
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Action
                </th>

              </tr>

            </thead>


            <tbody>

              {items.length === 0 && (

                <tr>

                  <td
                    colSpan="7"
                    style={
                      styles.emptyTable
                    }
                  >
                    No items added yet.

                  </td>

                </tr>

              )}


              {items.map(
                (
                  item,
                  index
                ) => (

                  <tr
                    key={
                      item.id
                    }
                  >

                    <td
                      style={
                        styles.td
                      }
                    >
                      {index + 1}
                    </td>


                    <td
                      style={{
                        ...styles.td,
                        textAlign:
                          "left",
                      }}
                    >

                      <div
                        style={
                          styles.itemName
                        }
                      >
                        {
                          item.particular
                        }
                      </div>


                      {item.notes && (

                        <div
                          style={
                            styles.itemNotes
                          }
                        >
                          {
                            item.notes
                          }
                        </div>

                      )}

                    </td>


                    <td
                      style={
                        styles.td
                      }
                    >
                      {
                        item.qty
                      }
                    </td>


                    <td
                      style={
                        styles.td
                      }
                    >
                      {
                        item.unit
                      }
                    </td>


                    <td
                      style={
                        styles.td
                      }
                    >
                      ₹{" "}

                      {
                        formatAmount(
                          item.rate
                        )
                      }

                    </td>


                    <td
                      style={{
                        ...styles.td,
                        ...styles.amountCell,
                      }}
                    >
                      ₹{" "}

                      {
                        formatAmount(
                          item.amount
                        )
                      }

                    </td>


                    <td
                      style={
                        styles.td
                      }
                    >

                      <div
                        style={
                          styles.actionButtons
                        }
                      >

                        <button
                          type="button"
                          onClick={() =>
                            moveItem(
                              index,
                              -1
                            )
                          }
                          style={
                            styles.iconButton
                          }
                        >
                          ↑
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            moveItem(
                              index,
                              1
                            )
                          }
                          style={
                            styles.iconButton
                          }
                        >
                          ↓
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            deleteItem(
                              item.id
                            )
                          }
                          style={{
                            ...styles.iconButton,
                            ...styles.deleteButton,
                          }}
                        >
                          🗑
                        </button>

                      </div>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* ========================= */}
      {/* TOTAL */}
      {/* ========================= */}

      <div
        style={
          styles.bottomGrid
        }
      >


        {/* LEFT ACTIONS */}

        <div
          style={
            styles.card
          }
        >

          <h2
            style={{
              ...styles.cardTitle,
              marginBottom:
                "20px",
            }}
          >
            Bill Actions
          </h2>


          <div
            style={
              styles.actionGrid
            }
          >

            <button
              type="button"
              style={
                styles.previewButton
              }
            >
              👁 Preview
            </button>


            <button
              type="button"
              style={
                styles.saveButton
              }
            >
              💾 Save Invoice
            </button>


            <button
              type="button"
              onClick={
                handleNewBill
              }
              style={
                styles.newBillButton
              }
            >
              🆕 New Bill
            </button>


            <button
              type="button"
              onClick={
                handleClearAll
              }
              style={
                styles.clearButton
              }
            >
              🗑 Clear All
            </button>

          </div>

        </div>


        {/* TOTAL CARD */}

        <div
          style={{
            ...styles.card,
            ...styles.totalCard,
          }}
        >

          <div
            style={
              styles.totalRow
            }
          >

            <span
              style={
                styles.totalLabel
              }
            >
              Subtotal
            </span>


            <span
              style={
                styles.totalValue
              }
            >
              ₹{" "}

              {
                formatAmount(
                  exactTotal
                )
              }

            </span>

          </div>


          <div
            style={
              styles.roundOption
            }
          >

            <label
              style={
                styles.roundLabel
              }
            >

              <input
                type="checkbox"
                checked={
                  roundTotal
                }
                onChange={
                  (event) =>
                    setRoundTotal(
                      event.target.checked
                    )
                }
              />

              <span>
                Use Rounded Total
              </span>

            </label>

          </div>


          <div
            style={
              styles.finalTotal
            }
          >

            <span
              style={
                styles.finalTotalLabel
              }
            >
              Total Amount
            </span>


            <span
              style={
                styles.finalTotalValue
              }
            >
              ₹{" "}

              {
                formatAmount(
                  finalTotal
                )
              }

            </span>

          </div>


          <div
            style={
              styles.amountWords
            }
          >

            Amount in words will be added
            in the next step.

          </div>

        </div>

      </div>

    </div>
  );
}


// =========================
// STYLES
// =========================

const styles = {

  container: {
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
    paddingBottom: "50px",
  },


  // =========================
  // PAGE HEADER
  // =========================

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "28px",
    flexWrap: "wrap",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  headerIcon: {
    width: "56px",
    height: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eaf3ff",
    borderRadius: "14px",
    fontSize: "28px",
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    color: "#1f2937",
    fontSize: "28px",
    fontWeight: "700",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  draftBadge: {
    padding: "5px 10px",
    borderRadius: "20px",
    background: "#fff7ed",
    color: "#c2410c",
    fontSize: "12px",
    fontWeight: "700",
    border: "1px solid #fed7aa",
  },

  backButton: {
    height: "44px",
    padding: "0 18px",
    borderRadius: "9px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#374151",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },


  // =========================
  // CARD
  // =========================

  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "26px",
    marginBottom: "22px",
    boxShadow:
      "0 4px 16px rgba(15, 23, 42, 0.04)",
    boxSizing: "border-box",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
  },

  sectionIcon: {
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f3f4f6",
    borderRadius: "11px",
    fontSize: "21px",
  },

  cardTitle: {
    margin: 0,
    color: "#1f2937",
    fontSize: "19px",
    fontWeight: "700",
  },

  cardSubtitle: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: "13px",
  },


  // =========================
  // FORM
  // =========================

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
  },

  customerGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
  },

  field: {
    minWidth: 0,
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  },

  input: {
    width: "100%",
    height: "46px",
    padding: "0 13px",
    borderRadius: "9px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#1f2937",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  },

  inputReadOnly: {
    background: "#f9fafb",
    color: "#6b7280",
  },

  textarea: {
    width: "100%",
    minHeight: "90px",
    padding: "12px 13px",
    borderRadius: "9px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#1f2937",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "vertical",
    boxSizing: "border-box",
    outline: "none",
  },

  readOnlyField: {
    height: "46px",
    padding: "0 13px",
    display: "flex",
    alignItems: "center",
    borderRadius: "9px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#374151",
    fontSize: "14px",
    boxSizing: "border-box",
  },

  billNumberWrapper: {
    display: "flex",
    gap: "8px",
  },

  editButton: {
    height: "46px",
    padding: "0 13px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#2563eb",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },

  selectCustomerButton: {
    marginBottom: "8px",
    padding: "6px 10px",
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#2563eb",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },


  // =========================
  // ITEM ENTRY
  // =========================

  itemForm: {
    display: "grid",
    gridTemplateColumns:
      "minmax(180px, 2fr) minmax(150px, 1.5fr) 100px 100px 120px auto",
    gap: "12px",
    alignItems: "end",
  },

  particularField: {
    minWidth: 0,
  },

  notesField: {
    minWidth: 0,
  },

  smallField: {
    minWidth: 0,
  },

  rateField: {
    minWidth: 0,
  },

  addItemButton: {
    height: "46px",
    padding: "0 20px",
    border: "none",
    borderRadius: "9px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },


  // =========================
  // TABLE
  // =========================

  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  manualRowButton: {
    height: "42px",
    padding: "0 15px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#374151",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "750px",
  },

  th: {
    padding: "13px 12px",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
    textAlign: "center",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #f1f5f9",
    color: "#374151",
    fontSize: "14px",
    textAlign: "center",
  },

  emptyTable: {
    padding: "45px",
    textAlign: "center",
    color: "#9ca3af",
    fontSize: "14px",
  },

  itemName: {
    fontWeight: "600",
    color: "#1f2937",
  },

  itemNotes: {
    marginTop: "4px",
    color: "#6b7280",
    fontSize: "12px",
  },

  amountCell: {
    fontWeight: "700",
    color: "#1f2937",
  },

  actionButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "5px",
  },

  iconButton: {
    width: "30px",
    height: "30px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    background: "#ffffff",
    cursor: "pointer",
    color: "#475569",
  },

  deleteButton: {
    color: "#dc2626",
    borderColor: "#fecaca",
    background: "#fffafa",
  },


  // =========================
  // BOTTOM
  // =========================

  bottomGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) minmax(320px, 450px)",
    gap: "22px",
    alignItems: "start",
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
  },

  previewButton: {
    height: "46px",
    border: "1px solid #bfdbfe",
    borderRadius: "9px",
    background: "#eff6ff",
    color: "#1d4ed8",
    cursor: "pointer",
    fontWeight: "600",
  },

  saveButton: {
    height: "46px",
    border: "none",
    borderRadius: "9px",
    background: "#16a34a",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "700",
  },

  newBillButton: {
    height: "46px",
    border: "1px solid #fed7aa",
    borderRadius: "9px",
    background: "#fff7ed",
    color: "#c2410c",
    cursor: "pointer",
    fontWeight: "600",
  },

  clearButton: {
    height: "46px",
    border: "1px solid #fecaca",
    borderRadius: "9px",
    background: "#fef2f2",
    color: "#dc2626",
    cursor: "pointer",
    fontWeight: "600",
  },


  // =========================
  // TOTAL
  // =========================

  totalCard: {
    marginBottom: 0,
  },

  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "16px",
    borderBottom: "1px solid #e5e7eb",
  },

  totalLabel: {
    color: "#64748b",
    fontSize: "14px",
  },

  totalValue: {
    color: "#374151",
    fontSize: "16px",
    fontWeight: "700",
  },

  roundOption: {
    padding: "16px 0",
    borderBottom: "1px solid #e5e7eb",
  },

  roundLabel: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    color: "#475569",
    fontSize: "14px",
    cursor: "pointer",
  },

  finalTotal: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 0",
  },

  finalTotalLabel: {
    color: "#1f2937",
    fontSize: "16px",
    fontWeight: "700",
  },

  finalTotalValue: {
    color: "#2563eb",
    fontSize: "26px",
    fontWeight: "800",
  },

  amountWords: {
    padding: "13px",
    background: "#f8fafc",
    borderRadius: "8px",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: "1.5",
  },

};

export default BillEditor;