import * as XLSX from "xlsx-js-style";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

import {
  dateText,
  money,
  today,
} from "./reportHelpers";


// ============================================================
// COMMON STYLES
// ============================================================

const border = {
  top: {
    style: "thin",
    color: { rgb: "C8C8C8" },
  },

  bottom: {
    style: "thin",
    color: { rgb: "C8C8C8" },
  },

  left: {
    style: "thin",
    color: { rgb: "C8C8C8" },
  },

  right: {
    style: "thin",
    color: { rgb: "C8C8C8" },
  },
};

const teal = "14BEA0";
const white = "FFFFFF";
const black = "000000";


// ============================================================
// AMOUNT HELPERS
// ============================================================

function formatAmount(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  const rounded =
    Math.round(
      (number + Number.EPSILON) * 100
    ) / 100;

  const hasPaise =
    Math.abs(rounded % 1) > 0.000001;

  return rounded.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits:
        hasPaise ? 2 : 0,

      maximumFractionDigits: 2,
    }
  );
}


// ============================================================
// PDF MONEY
// ============================================================

function pdfMoney(value) {
  const number = Number(value || 0);

  return `Rs. ${formatAmount(
    Math.abs(number)
  )}`;
}


// ============================================================
// PDF SIGNED MONEY
// ============================================================

function pdfSignedMoney(value) {
  const number = Number(value || 0);

  if (number < 0) {
    return `- Rs. ${formatAmount(
      Math.abs(number)
    )}`;
  }

  return `Rs. ${formatAmount(
    number
  )}`;
}


// ============================================================
// EXCEL AMOUNT FORMAT
// ============================================================

const excelAmountFormat =
  '₹ #,##0.##';


// ============================================================
// REPORT SUMMARY CALCULATOR
// ============================================================

function getPaymentSummary(
  billingAmount,
  receivedAmount
) {
  const billing =
    Number(billingAmount || 0);

  const received =
    Number(receivedAmount || 0);

  const difference =
    billing - received;

  const hasExtraPayment =
    difference < 0;

  return {
    billingAmount: billing,

    receivedAmount: received,

    difference,

    hasExtraPayment,

    balanceBillingAmount:
      hasExtraPayment
        ? 0
        : difference,

    extraPaymentAdvance:
      hasExtraPayment
        ? Math.abs(difference)
        : 0,
  };
}


// ============================================================
// RECEIVED PAYMENT EXCEL STYLES
// ============================================================

function applyReceivedPaymentStyles(
  sheet,
  rowCount
) {
  if (sheet.A1) {
    sheet.A1.s = {
      font: {
        name: "Calibri",
        sz: 20,
        bold: true,
        color: {
          rgb: black,
        },
      },

      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };
  }


  [
    "A3",
    "B3",
    "C3",
  ].forEach(
    (address) => {
      if (sheet[address]) {
        sheet[address].s = {
          font: {
            name: "Calibri",
            sz: 12,
            bold: true,
            color: {
              rgb: white,
            },
          },

          fill: {
            patternType: "solid",
            fgColor: {
              rgb: teal,
            },
          },

          alignment: {
            horizontal: "center",
            vertical: "center",
          },

          border,
        };
      }
    }
  );


  for (
    let row = 4;
    row <= rowCount + 3;
    row += 1
  ) {
    if (sheet[`A${row}`]) {
      sheet[`A${row}`].s = {
        font: {
          name: "Calibri",
          sz: 11,
          color: {
            rgb: black,
          },
        },

        alignment: {
          horizontal: "center",
          vertical: "center",
        },

        border,
      };
    }


    if (sheet[`B${row}`]) {
      sheet[`B${row}`].s = {
        font: {
          name: "Calibri",
          sz: 11,
          color: {
            rgb: black,
          },
        },

        alignment: {
          horizontal: "left",
          vertical: "center",
        },

        border,
      };
    }


    if (sheet[`C${row}`]) {
      sheet[`C${row}`].s = {
        font: {
          name: "Calibri",
          sz: 11,
          color: {
            rgb: black,
          },
        },

        alignment: {
          horizontal: "right",
          vertical: "center",
        },

        border,

        numFmt:
          excelAmountFormat,
      };
    }
  }


  const totalRow =
    rowCount + 4;


  [
    "A",
    "B",
  ].forEach(
    (column) => {
      if (
        sheet[
          `${column}${totalRow}`
        ]
      ) {
        sheet[
          `${column}${totalRow}`
        ].s = {
          font: {
            name: "Calibri",
            sz: 12,
            bold: true,
            color: {
              rgb: white,
            },
          },

          fill: {
            patternType: "solid",
            fgColor: {
              rgb: teal,
            },
          },

          alignment: {
            horizontal: "center",
            vertical: "center",
          },

          border,
        };
      }
    }
  );


  if (sheet[`C${totalRow}`]) {
    sheet[`C${totalRow}`].s = {
      font: {
        name: "Calibri",
        sz: 12,
        bold: true,
        color: {
          rgb: white,
        },
      },

      fill: {
        patternType: "solid",
        fgColor: {
          rgb: teal,
        },
      },

      alignment: {
        horizontal: "right",
        vertical: "center",
      },

      border,

      numFmt:
        excelAmountFormat,
    };
  }


  sheet["!merges"] = [
    {
      s: {
        r: 0,
        c: 0,
      },

      e: {
        r: 0,
        c: 2,
      },
    },
  ];


  sheet["!cols"] = [
    {
      wch: 16,
    },

    {
      wch: 34,
    },

    {
      wch: 20,
    },
  ];


  sheet["!rows"] = [
    {
      hpt: 34,
    },

    {
      hpt: 10,
    },

    {
      hpt: 27,
    },

    ...Array.from(
      {
        length: rowCount,
      },
      () => ({
        hpt: 24,
      })
    ),

    {
      hpt: 29,
    },
  ];
}

// ============================================================
// RECEIVED PAYMENT EXCEL
// ============================================================

export function exportReceivedPaymentExcel({
  filteredPayments,
  companyMap,
  invoiceFrom,
  invoiceTo,
}) {
  const rows =
    filteredPayments.map(
      (payment, index) => [
        index + 1,

        dateText(
          payment.payment_date
        ),

        payment.payment_source ||
          companyMap.get(
            payment.company_id
          ) ||
          "",

        Number(
          payment.amount || 0
        ),
      ]
    );


  const total =
    filteredPayments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );


  const workbook =
    XLSX.utils.book_new();


  const sheetData = [
    [
      "Received payment",
      "",
      "",
      "",
    ],

    [
      "",
      "",
      "",
      "",
    ],

    [
      "SR NO.",
      "Date",
      "Company",
      "Amount",
    ],

    ...rows,

    [
      "",
      "",
      "Total Received Payment",
      total,
    ],
  ];


  const sheet =
    XLSX.utils.aoa_to_sheet(
      sheetData
    );


  // ==========================================================
  // TITLE
  // ==========================================================

  if (sheet.A1) {
    sheet.A1.s = {
      font: {
        name: "Calibri",
        sz: 20,
        bold: true,
        color: {
          rgb: black,
        },
      },

      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };
  }


  // ==========================================================
  // HEADER
  // ==========================================================

  [
    "A3",
    "B3",
    "C3",
    "D3",
  ].forEach(
    (address) => {
      if (sheet[address]) {
        sheet[address].s = {
          font: {
            name: "Calibri",
            sz: 12,
            bold: true,
            color: {
              rgb: white,
            },
          },

          fill: {
            patternType: "solid",
            fgColor: {
              rgb: teal,
            },
          },

          alignment: {
            horizontal: "center",
            vertical: "center",
          },

          border,
        };
      }
    }
  );


  // ==========================================================
  // DATA ROWS
  // ==========================================================

  for (
    let row = 4;
    row <= rows.length + 3;
    row += 1
  ) {
    // SR NO.
    if (sheet[`A${row}`]) {
      sheet[`A${row}`].s = {
        font: {
          name: "Calibri",
          sz: 11,
          color: {
            rgb: black,
          },
        },

        alignment: {
          horizontal: "center",
          vertical: "center",
        },

        border,
      };
    }


    // DATE
    if (sheet[`B${row}`]) {
      sheet[`B${row}`].s = {
        font: {
          name: "Calibri",
          sz: 11,
          color: {
            rgb: black,
          },
        },

        alignment: {
          horizontal: "center",
          vertical: "center",
        },

        border,
      };
    }


    // COMPANY
    if (sheet[`C${row}`]) {
      sheet[`C${row}`].s = {
        font: {
          name: "Calibri",
          sz: 11,
          color: {
            rgb: black,
          },
        },

        alignment: {
          horizontal: "left",
          vertical: "center",
        },

        border,
      };
    }


    // AMOUNT
    if (sheet[`D${row}`]) {
      sheet[`D${row}`].s = {
        font: {
          name: "Calibri",
          sz: 11,
          color: {
            rgb: black,
          },
        },

        alignment: {
          horizontal: "right",
          vertical: "center",
        },

        border,

        numFmt:
          excelAmountFormat,
      };
    }
  }


  // ==========================================================
  // TOTAL ROW
  // ==========================================================

  const totalRow =
    rows.length + 4;


  [
    "A",
    "B",
    "C",
  ].forEach(
    (column) => {
      if (
        sheet[
          `${column}${totalRow}`
        ]
      ) {
        sheet[
          `${column}${totalRow}`
        ].s = {
          font: {
            name: "Calibri",
            sz: 12,
            bold: true,
            color: {
              rgb: white,
            },
          },

          fill: {
            patternType: "solid",
            fgColor: {
              rgb: teal,
            },
          },

          alignment: {
            horizontal: "center",
            vertical: "center",
          },

          border,
        };
      }
    }
  );


  if (sheet[`D${totalRow}`]) {
    sheet[`D${totalRow}`].s = {
      font: {
        name: "Calibri",
        sz: 12,
        bold: true,
        color: {
          rgb: white,
        },
      },

      fill: {
        patternType: "solid",
        fgColor: {
          rgb: teal,
        },
      },

      alignment: {
        horizontal: "right",
        vertical: "center",
      },

      border,

      numFmt:
        excelAmountFormat,
    };
  }


  // ==========================================================
  // MERGE TITLE
  // ==========================================================

  sheet["!merges"] = [
    {
      s: {
        r: 0,
        c: 0,
      },

      e: {
        r: 0,
        c: 3,
      },
    },
  ];


  // ==========================================================
  // COLUMN WIDTHS
  // ==========================================================

  sheet["!cols"] = [
    {
      wch: 10,
    },

    {
      wch: 16,
    },

    {
      wch: 34,
    },

    {
      wch: 20,
    },
  ];


  // ==========================================================
  // ROW HEIGHTS
  // ==========================================================

  sheet["!rows"] = [
    {
      hpt: 34,
    },

    {
      hpt: 10,
    },

    {
      hpt: 27,
    },

    ...Array.from(
      {
        length: rows.length,
      },
      () => ({
        hpt: 24,
      })
    ),

    {
      hpt: 29,
    },
  ];


  // ==========================================================
  // FILTER
  // ==========================================================

  if (rows.length > 0) {
    sheet["!autofilter"] = {
      ref:
        `A3:D${rows.length + 3}`,
    };
  }


  // ==========================================================
  // EXPORT
  // ==========================================================

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    "Received Payment"
  );


  XLSX.writeFile(
    workbook,

    `Received_Payment_${
      invoiceFrom || "all"
    }_${
      invoiceTo || "all"
    }.xlsx`,

    {
      bookType: "xlsx",
      cellStyles: true,
    }
  );
}


// ============================================================
// RECEIVED PAYMENT PDF
// ============================================================

export function exportReceivedPaymentPdf({
  filteredPayments,
  companyMap,
  invoiceFrom,
  invoiceTo,
}) {
  const doc =
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });


  // ==========================================================
  // DATA
  // ==========================================================

  const rows =
    filteredPayments.map(
      (payment, index) => [
        index + 1,

        dateText(
          payment.payment_date
        ),

        payment.payment_source ||
          companyMap.get(
            payment.company_id
          ) ||
          "",

        pdfMoney(
          payment.amount
        ),
      ]
    );


  const total =
    filteredPayments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );


  // ==========================================================
  // TITLE
  // ==========================================================

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(24);

  doc.text(
    "Received payment",
    105,
    18,
    {
      align: "center",
    }
  );


  // ==========================================================
  // TABLE
  // ==========================================================

  autoTable(doc, {
    startY: 28,

    margin: {
      left: 15,
      right: 15,
    },

    tableWidth: 180,

    head: [
      [
        "SR NO.",
        "Date",
        "Company",
        "Amount",
      ],
    ],

    body: rows,

    foot: [
      [
        "",
        "",
        "Total Received Payment",
        pdfMoney(total),
      ],
    ],

    theme: "grid",

    styles: {
      font: "helvetica",

      fontSize: 10.5,

      cellPadding: 3.5,

      lineWidth: 0.35,

      lineColor: [
        200,
        200,
        200,
      ],

      valign: "middle",

      overflow: "linebreak",

      textColor: [
        35,
        35,
        35,
      ],
    },

    headStyles: {
      fillColor: [
        20,
        190,
        160,
      ],

      textColor: [
        255,
        255,
        255,
      ],

      fontStyle: "bold",

      fontSize: 11,

      halign: "center",

      valign: "middle",

      cellPadding: 4,
    },

    footStyles: {
      fillColor: [
        20,
        190,
        160,
      ],

      textColor: [
        255,
        255,
        255,
      ],

      fontStyle: "bold",

      fontSize: 11,

      cellPadding: 4,
    },

    columnStyles: {
      // SR NO.
      0: {
        cellWidth: 18,
        halign: "center",
      },

      // DATE
      1: {
        cellWidth: 38,
        halign: "center",
      },

      // COMPANY
      2: {
        cellWidth: 74,
        halign: "left",
      },

      // AMOUNT
      3: {
        cellWidth: 50,
        halign: "right",
      },
    },
  });


  // ==========================================================
  // TOTAL INFORMATION
  // ==========================================================

  let y =
    (doc.lastAutoTable?.finalY ||
      28) + 12;


  if (y > 270) {
    doc.addPage();

    y = 18;
  }


  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(13);

  doc.text(
    "Total Received Payment",
    15,
    y
  );


  doc.text(
    pdfMoney(total),
    195,
    y,
    {
      align: "right",
    }
  );


  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9);

  doc.text(
    `Entries: ${filteredPayments.length}`,
    15,
    y + 7
  );


  // ==========================================================
  // DOWNLOAD
  // ==========================================================

  doc.save(
    `Received_Payment_${
      invoiceFrom || "all"
    }_${
      invoiceTo || "all"
    }.pdf`
  );
}

// ============================================================
// BILLING EXCEL
// ============================================================

export function exportBillingExcel({
  summary,
  filteredPayments,
  analysedBills,
  companyMap,
  invoiceFrom,
  invoiceTo,
}) {
  const billRows =
    analysedBills.map(
      (bill, index) => ({
        "SR NO.": index + 1,

        COMPANY:
          bill.company_name ||
          companyMap.get(
            bill.company_id
          ) ||
          "",

        "BILL NO.":
          bill.bill_number || "",

        SITE:
          bill.customer_site || "",

        DATE:
          dateText(
            bill.bill_date
          ),

        "BILL TYPE":
          bill.bill_type || "",

        "BILLING AMOUNT":
          Number(
            bill.grand_total || 0
          ),

        RECEIVED:
          Number(
            bill.received || 0
          ),

        BALANCE:
          Number(
            bill.balance || 0
          ),

        STATUS:
          bill.paymentStatus,
      })
    );


  const paymentRows =
    filteredPayments.map(
      (payment, index) => ({
        "SR NO.": index + 1,

        DATE:
          dateText(
            payment.payment_date
          ),

        COMPANY:
          payment.payment_source ||
          companyMap.get(
            payment.company_id
          ) ||
          "",

        AMOUNT:
          Number(
            payment.amount || 0
          ),

        NOTES:
          payment.notes || "",
      })
    );


  const paymentSummary =
    getPaymentSummary(
      summary.billingAmount,
      summary.receivedAmount
    );


  const summaryRows = [
    [
      "BILLING",
      "",
    ],

    [
      "Billing Amount",
      paymentSummary.billingAmount,
    ],

    [
      "Received Payment",
      -paymentSummary.receivedAmount,
    ],

    [
      paymentSummary.hasExtraPayment
        ? "Extra Payment / Advance"
        : "Balance Billing Amount",

      paymentSummary.hasExtraPayment
        ? paymentSummary.extraPaymentAdvance
        : paymentSummary.balanceBillingAmount,
    ],

    [
      "Paid Bills",
      summary.paidCount,
    ],

    [
      "Unpaid Bills",
      summary.unpaidCount,
    ],
  ];


  const workbook =
    XLSX.utils.book_new();


  const summarySheet =
    XLSX.utils.aoa_to_sheet(
      summaryRows
    );


  const billsSheet =
    XLSX.utils.json_to_sheet(
      billRows
    );


  const paymentsSheet =
    XLSX.utils.json_to_sheet(
      paymentRows
    );


  summarySheet["!cols"] = [
    {
      wch: 30,
    },

    {
      wch: 22,
    },
  ];


  billsSheet["!cols"] = [
    {
      wch: 8,
    },

    {
      wch: 24,
    },

    {
      wch: 12,
    },

    {
      wch: 35,
    },

    {
      wch: 14,
    },

    {
      wch: 14,
    },

    {
      wch: 18,
    },

    {
      wch: 18,
    },

    {
      wch: 18,
    },

    {
      wch: 14,
    },
  ];


  paymentsSheet["!cols"] = [
    {
      wch: 8,
    },

    {
      wch: 14,
    },

    {
      wch: 24,
    },

    {
      wch: 18,
    },

    {
      wch: 40,
    },
  ];


  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    "Summary"
  );


  XLSX.utils.book_append_sheet(
    workbook,
    billsSheet,
    "Bills"
  );


  XLSX.utils.book_append_sheet(
    workbook,
    paymentsSheet,
    "Received Payment"
  );


  XLSX.writeFile(
    workbook,

    `Billing_Report_${
      invoiceFrom || "all"
    }_${
      invoiceTo || "all"
    }.xlsx`,

    {
      bookType: "xlsx",
      cellStyles: true,
    }
  );
}


 // ============================================================
 // UNPAID PDF — A4 PORTRAIT
 // ============================================================

export function exportUnpaidPdf({
  summary,
  analysedBills,
  companyMap,
  invoiceFrom,
  invoiceTo,
  paymentMode,
}) {
  const unpaidRows = (analysedBills || []).filter(
    (bill) =>
      String(bill.paymentStatus || "").toLowerCase() === "unpaid"
  );

  const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const formatAmount = (value) =>
    "Rs. " +
    toNumber(value).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  // Total only the unpaid bills included in this PDF.
  const unpaidBilling = unpaidRows.reduce(
    (total, bill) => total + toNumber(bill.grand_total),
    0
  );

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;

  // Report heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("BILLING", pageWidth / 2, 13, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  doc.text(
    `Invoice period: ${dateText(invoiceFrom)} to ${dateText(invoiceTo)}`,
    pageWidth / 2,
    19,
    { align: "center" }
  );

  doc.text(
    paymentMode === "upto-end"
      ? `Payment basis: all payments up to ${dateText(invoiceTo)}`
      : "Payment basis: selected payment period",
    pageWidth / 2,
    24,
    { align: "center" }
  );

  // Table: seven columns, sized for portrait A4.
  autoTable(doc, {
    startY: 29,

    margin: {
      left: margin,
      right: margin,
      bottom: 12,
    },

    tableWidth: pageWidth - margin * 2,

    head: [[
      "SR",
      "COMPANY",
      "BILL NO.",
      "SITE",
      "DATE",
      "AMOUNT",
      "STATUS",
    ]],

    body: unpaidRows.map((bill, index) => [
      String(index + 1),

      bill.company_name ||
        companyMap?.get(bill.company_id) ||
        "",

      String(bill.bill_number || ""),

      bill.customer_site || "",

      dateText(bill.bill_date),

      formatAmount(bill.grand_total),

      bill.paymentStatus || "Unpaid",
    ]),

    foot: [[
      "",
      "",
      "",
      "",
      "TOTAL",
      formatAmount(unpaidBilling),
      "",
    ]],

    showFoot: "lastPage",
    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: {
        top: 1.5,
        right: 1,
        bottom: 1.5,
        left: 1,
      },
      overflow: "linebreak",
      valign: "middle",
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      textColor: [45, 55, 72],
    },

    headStyles: {
      fillColor: [24, 184, 157],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      valign: "middle",
      cellPadding: 1.5,
    },

    footStyles: {
      fillColor: [24, 184, 157],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      valign: "middle",
    },

    columnStyles: {
      0: {
        cellWidth: 9,
        halign: "center",
      },
      1: {
        cellWidth: 27,
        overflow: "linebreak",
      },
      2: {
        cellWidth: 17,
        halign: "center",
      },
      3: {
        cellWidth: 43,
        overflow: "linebreak",
      },
      4: {
        cellWidth: 21,
        halign: "center",
      },
      5: {
        cellWidth: 39,
        halign: "right",
        overflow: "visible",
      },
      6: {
        cellWidth: 20,
        halign: "center",
      },
    },

    didParseCell(data) {
      // Keep amounts together and right-aligned.
      if (
        [5].includes(data.column.index) &&
        ["body", "foot"].includes(data.section)
      ) {
        data.cell.styles.halign = "right";
        data.cell.styles.overflow = "visible";
        data.cell.styles.fontSize = 7;
      }

      if (
        data.section === "foot" &&
        data.column.index === 4
      ) {
        data.cell.styles.halign = "center";
      }
    },

    rowPageBreak: "avoid",
  });

  // Summary
  let y = (doc.lastAutoTable?.finalY || 29) + 7;

  if (y + 18 > pageHeight - 8) {
    doc.addPage();
    y = 15;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SUMMARY", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.text(
    `Billing Amount: ${formatAmount(unpaidBilling)}`,
    margin,
    y + 7
  );

  doc.text(
    `Unpaid Bills: ${unpaidRows.length}`,
    margin,
    y + 14
  );

  doc.save(
    `Billing_Unpaid_Report_${invoiceTo || today()}.pdf`
  );
}



// ============================================================
// HISAB DATE
// ============================================================

function hisabDate(value) {
  if (!value) {
    return "-";
  }


  const raw =
    String(value).slice(0, 10);


  const parts =
    raw.split("-");


  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }


  return raw;
}


// ============================================================
// HISAB CYCLE EXCEL STYLES
// ============================================================

function applyHisabCycleExcelStyles(
  sheet,
  billRowCount,
  billingAmount,
  receivedAmount,
  balance
) {
  const titleStyle = {
    font: {
      name: "Calibri",
      sz: 20,
      bold: true,
      color: {
        rgb: black,
      },
    },

    alignment: {
      horizontal: "center",
      vertical: "center",
    },
  };


  const cycleStyle = {
    font: {
      name: "Calibri",
      sz: 12,
      bold: true,
      color: {
        rgb: black,
      },
    },

    alignment: {
      horizontal: "left",
      vertical: "center",
    },
  };


  const headerStyle = {
    font: {
      name: "Calibri",
      sz: 11,
      bold: true,
      color: {
        rgb: white,
      },
    },

    fill: {
      patternType: "solid",
      fgColor: {
        rgb: teal,
      },
    },

    alignment: {
      horizontal: "center",
      vertical: "center",
      wrapText: true,
    },

    border,
  };


  const normalCenterStyle = {
    font: {
      name: "Calibri",
      sz: 11,
      color: {
        rgb: black,
      },
    },

    alignment: {
      horizontal: "center",
      vertical: "center",
      wrapText: true,
    },

    border,
  };


  const normalLeftStyle = {
    font: {
      name: "Calibri",
      sz: 11,
      color: {
        rgb: black,
      },
    },

    alignment: {
      horizontal: "left",
      vertical: "center",
      wrapText: true,
    },

    border,
  };


  const normalAmountStyle = {
    font: {
      name: "Calibri",
      sz: 11,
      color: {
        rgb: black,
      },
    },

    alignment: {
      horizontal: "right",
      vertical: "center",
    },

    border,

    numFmt:
      excelAmountFormat,
  };


  const totalLabelStyle = {
    font: {
      name: "Calibri",
      sz: 12,
      bold: true,
      color: {
        rgb: white,
      },
    },

    fill: {
      patternType: "solid",
      fgColor: {
        rgb: teal,
      },
    },

    alignment: {
      horizontal: "right",
      vertical: "center",
      wrapText: true,
    },

    border,
  };


  const totalAmountStyle = {
    font: {
      name: "Calibri",
      sz: 12,
      bold: true,
      color: {
        rgb: white,
      },
    },

    fill: {
      patternType: "solid",
      fgColor: {
        rgb: teal,
      },
    },

    alignment: {
      horizontal: "right",
      vertical: "center",
    },

    border,

    numFmt:
      excelAmountFormat,
  };


  const summaryLabelStyle = {
    font: {
      name: "Calibri",
      sz: 12,
      bold: true,
      color: {
        rgb: black,
      },
    },

    fill: {
      patternType: "solid",
      fgColor: {
        rgb: "E8F8F5",
      },
    },

    alignment: {
      horizontal: "left",
      vertical: "center",
    },

    border,
  };


  const summaryAmountStyle = {
    font: {
      name: "Calibri",
      sz: 12,
      bold: true,
      color: {
        rgb: black,
      },
    },

    fill: {
      patternType: "solid",
      fgColor: {
        rgb: "E8F8F5",
      },
    },

    alignment: {
      horizontal: "right",
      vertical: "center",
    },

    border,

    numFmt:
      excelAmountFormat,
  };


  // ----------------------------------------------------------
  // TITLE
  // ----------------------------------------------------------

  if (sheet.A1) {
    sheet.A1.s =
      titleStyle;
  }


  // ----------------------------------------------------------
  // CYCLE
  // ----------------------------------------------------------

  if (sheet.A2) {
    sheet.A2.s =
      cycleStyle;
  }


  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  [
    "A4",
    "B4",
    "C4",
    "D4",
    "E4",
    "F4",
  ].forEach(
    (address) => {
      if (sheet[address]) {
        sheet[address].s =
          headerStyle;
      }
    }
  );


  // ----------------------------------------------------------
  // BILL ROWS
  // ----------------------------------------------------------

  const firstBillRow = 5;

  const lastBillRow =
    firstBillRow +
    billRowCount -
    1;


  for (
    let row = firstBillRow;
    row <= lastBillRow;
    row += 1
  ) {
    if (sheet[`A${row}`]) {
      sheet[`A${row}`].s =
        normalCenterStyle;
    }


    if (sheet[`B${row}`]) {
      sheet[`B${row}`].s =
        normalLeftStyle;
    }


    if (sheet[`C${row}`]) {
      sheet[`C${row}`].s =
        normalCenterStyle;
    }


    if (sheet[`D${row}`]) {
      sheet[`D${row}`].s =
        normalLeftStyle;
    }


    if (sheet[`E${row}`]) {
      sheet[`E${row}`].s =
        normalCenterStyle;
    }


    if (sheet[`F${row}`]) {
      sheet[`F${row}`].s =
        normalAmountStyle;
    }
  }


  // ----------------------------------------------------------
  // TOTAL BILLING ROW
  // ----------------------------------------------------------

  const totalRow =
    billRowCount + 5;


  if (sheet[`D${totalRow}`]) {
    sheet[`D${totalRow}`].s =
      totalLabelStyle;
  }


  if (sheet[`E${totalRow}`]) {
    sheet[`E${totalRow}`].s =
      totalLabelStyle;
  }


  if (sheet[`F${totalRow}`]) {
    sheet[`F${totalRow}`].s =
      totalAmountStyle;
  }


  // ----------------------------------------------------------
  // SUMMARY ROWS
  // ----------------------------------------------------------

  const summaryBillingRow =
    totalRow + 3;

  const summaryReceivedRow =
    totalRow + 4;

  const summaryFinalRow =
    totalRow + 5;


  function styleSummaryRow(
    row,
    amountValue
  ) {
    if (sheet[`D${row}`]) {
      sheet[`D${row}`].s = {
        ...summaryLabelStyle,
      };
    }


    if (sheet[`E${row}`]) {
      sheet[`E${row}`].s = {
        ...summaryLabelStyle,
      };
    }


    if (sheet[`F${row}`]) {
      sheet[`F${row}`].s = {
        ...summaryAmountStyle,
      };

      sheet[`F${row}`].v =
        Number(amountValue || 0);

      sheet[`F${row}`].t = "n";
    }
  }


  const summary =
    getPaymentSummary(
      billingAmount,
      receivedAmount
    );


  // ----------------------------------------------------------
  // BILLING
  // ----------------------------------------------------------

  styleSummaryRow(
    summaryBillingRow,
    summary.billingAmount
  );


  // ----------------------------------------------------------
  // RECEIVED
  // ----------------------------------------------------------

  styleSummaryRow(
    summaryReceivedRow,
    -summary.receivedAmount
  );


  // ----------------------------------------------------------
  // FINAL:
  // BALANCE OR EXTRA PAYMENT
  // ----------------------------------------------------------

  styleSummaryRow(
    summaryFinalRow,

    summary.hasExtraPayment
      ? summary.extraPaymentAdvance
      : summary.balanceBillingAmount
  );


  // ----------------------------------------------------------
  // MERGES
  // ----------------------------------------------------------

  sheet["!merges"] = [
    // Title
    {
      s: {
        r: 0,
        c: 0,
      },

      e: {
        r: 0,
        c: 5,
      },
    },

    // Cycle
    {
      s: {
        r: 1,
        c: 0,
      },

      e: {
        r: 1,
        c: 5,
      },
    },

    // Total billing label
    {
      s: {
        r: totalRow - 1,
        c: 3,
      },

      e: {
        r: totalRow - 1,
        c: 4,
      },
    },

    // Billing amount
    {
      s: {
        r: summaryBillingRow - 1,
        c: 3,
      },

      e: {
        r: summaryBillingRow - 1,
        c: 4,
      },
    },

    // Received
    {
      s: {
        r: summaryReceivedRow - 1,
        c: 3,
      },

      e: {
        r: summaryReceivedRow - 1,
        c: 4,
      },
    },

    // Balance / Extra
    {
      s: {
        r: summaryFinalRow - 1,
        c: 3,
      },

      e: {
        r: summaryFinalRow - 1,
        c: 4,
      },
    },
  ];


  // ----------------------------------------------------------
  // COLUMN WIDTHS
  // ----------------------------------------------------------

  sheet["!cols"] = [
    {
      wch: 10,
    },

    {
      wch: 27,
    },

    {
      wch: 13,
    },

    {
      wch: 43,
    },

    {
      wch: 16,
    },

    {
      wch: 22,
    },
  ];


  // ----------------------------------------------------------
  // ROW HEIGHTS
  // ----------------------------------------------------------

  sheet["!rows"] = [
    {
      hpt: 38,
    },

    {
      hpt: 25,
    },

    {
      hpt: 10,
    },

    {
      hpt: 30,
    },

    ...Array.from(
      {
        length:
          billRowCount,
      },

      () => ({
        hpt: 28,
      })
    ),

    // Total
    {
      hpt: 32,
    },

    // Blank
    {
      hpt: 12,
    },

    // Blank
    {
      hpt: 12,
    },

    // Billing
    {
      hpt: 32,
    },

    // Received
    {
      hpt: 32,
    },

    // Balance / Extra
    {
      hpt: 32,
    },
  ];


  // ----------------------------------------------------------
  // FILTER
  // ----------------------------------------------------------

  if (billRowCount > 0) {
    sheet["!autofilter"] = {
      ref:
        `A4:F${lastBillRow}`,
    };
  }
}


// ============================================================
// HISAB CYCLE PDF
// ============================================================

export function exportHisabCyclePdf({
  cycle,
  bills = [],
  payments = [],
  companyMap = new Map(),
}) {
  if (!cycle) {
    throw new Error(
      "No Hisab Cycle selected."
    );
  }


  const doc =
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });


  // ==========================================================
  // TOTALS
  // ==========================================================

  const billingAmount =
    bills.reduce(
      (sum, bill) =>
        sum +
        Number(
          bill.grand_total || 0
        ),
      0
    );


  const receivedAmount =
    payments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );


  const summary =
    getPaymentSummary(
      billingAmount,
      receivedAmount
    );


  // ==========================================================
  // PAGE
  // ==========================================================

  const pageWidth = 210;

  const left = 10;

  const right = 10;

  const tableWidth =
    pageWidth -
    left -
    right;


  // ==========================================================
  // TITLE
  // ==========================================================

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(20);

  doc.text(
    "BILLING",
    105,
    16,
    {
      align: "center",
    }
  );


  // ==========================================================
  // CYCLE
  // ==========================================================

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    `Hisab Cycle ${cycle.cycle_number}`,
    left,
    25
  );


  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    `Started: ${hisabDate(
      cycle.started_at
    )}`,

    pageWidth - right,
    25,

    {
      align: "right",
    }
  );


  // ==========================================================
  // BILL ROWS
  // ==========================================================

  const billingRows =
    bills.map(
      (bill, index) => [
        String(index + 1),

        bill.company_name ||
          companyMap.get(
            bill.company_id
          ) ||
          "-",

        String(
          bill.bill_number ||
            "-"
        ),

        bill.customer_site ||
          "-",

        hisabDate(
          bill.bill_date
        ),

        pdfMoney(
          bill.grand_total
        ),
      ]
    );


  // ==========================================================
  // BILLING TABLE
  // ==========================================================

  autoTable(doc, {
    startY: 31,

    margin: {
      left,
      right,
    },

    tableWidth,

    head: [
      [
        "SR NO.",
        "COMPANY",
        "BILL NO.",
        "SITE",
        "DATE",
        "AMOUNT",
      ],
    ],

    body:
      billingRows.length > 0
        ? billingRows
        : [
            [
              "-",
              "-",
              "-",
              "-",
              "-",
              pdfMoney(0),
            ],
          ],

    theme: "grid",

    styles: {
      font: "helvetica",

      fontSize: 8.5,

      textColor: [
        0,
        0,
        0,
      ],

      lineColor: [
        0,
        0,
        0,
      ],

      lineWidth: 0.3,

      cellPadding: {
        top: 2.5,
        right: 2,
        bottom: 2.5,
        left: 2,
      },

      valign: "middle",

      overflow: "linebreak",
    },

    headStyles: {
      font: "helvetica",

      fontStyle: "bold",

      fontSize: 9,

      fillColor: [
        20,
        190,
        160,
      ],

      textColor: [
        255,
        255,
        255,
      ],

      lineColor: [
        0,
        0,
        0,
      ],

      lineWidth: 0.3,

      halign: "center",

      valign: "middle",

      cellPadding: 3,
    },

    columnStyles: {
      0: {
        cellWidth: 16,
        halign: "center",
      },

      1: {
        cellWidth: 32,
        halign: "left",
      },

      2: {
        cellWidth: 20,
        halign: "center",
      },

      3: {
        cellWidth: 51,
        halign: "left",
      },

      4: {
        cellWidth: 25,
        halign: "center",
      },

      5: {
        cellWidth: 46,
        halign: "right",
        overflow: "hidden",
      },
    },
  });


  // ==========================================================
  // TOTAL BILLING ROW
  // ==========================================================

  const billingTableEnd =
    doc.lastAutoTable?.finalY ||
    31;


  const totalRowY =
    billingTableEnd + 1;


  const totalRowHeight = 15;


  doc.setDrawColor(
    0,
    0,
    0
  );

  doc.setLineWidth(
    0.35
  );


  doc.rect(
    left,
    totalRowY,
    tableWidth,
    totalRowHeight
  );


  const totalDividerX =
    left + 144;


  doc.line(
    totalDividerX,
    totalRowY,
    totalDividerX,
    totalRowY +
      totalRowHeight
  );


  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    10.5
  );


  doc.text(
    "TOTAL BILLING AMOUNT",

    totalDividerX - 3,

    totalRowY + 9.5,

    {
      align: "right",
    }
  );


  doc.text(
    pdfMoney(
      summary.billingAmount
    ),

    pageWidth -
      right -
      3,

    totalRowY + 9.5,

    {
      align: "right",
    }
  );


  // ==========================================================
  // SUMMARY
  // ==========================================================

  const summaryY =
    totalRowY +
    totalRowHeight +
    28;


  const summaryWidth = 105;

  const summaryX =
    pageWidth -
    right -
    summaryWidth;


  // ----------------------------------------------------------
  // FINAL SUMMARY LABEL
  // ----------------------------------------------------------

  const finalSummaryLabel =
    summary.hasExtraPayment
      ? "Extra Payment / Advance"
      : "Balance Billing Amount";


  // ----------------------------------------------------------
  // FINAL SUMMARY VALUE
  // ----------------------------------------------------------

  const finalSummaryValue =
    summary.hasExtraPayment
      ? summary.extraPaymentAdvance
      : summary.balanceBillingAmount;


  autoTable(doc, {
    startY: summaryY,

    margin: {
      left: summaryX,
      right,
    },

    tableWidth:
      summaryWidth,

    body: [
      [
        "Billing Amount",

        pdfMoney(
          summary.billingAmount
        ),
      ],

      [
        "Received payment",

        `- ${pdfMoney(
          summary.receivedAmount
        )}`,
      ],

      [
        finalSummaryLabel,

        pdfMoney(
          finalSummaryValue
        ),
      ],
    ],

    theme: "grid",

    styles: {
      font: "helvetica",

      fontSize: 10.5,

      fontStyle: "bold",

      textColor: [
        0,
        0,
        0,
      ],

      lineColor: [
        0,
        0,
        0,
      ],

      lineWidth: 0.3,

      cellPadding: 3.5,

      valign: "middle",
    },

    columnStyles: {
      0: {
        cellWidth: 67,
        halign: "left",
      },

      1: {
        cellWidth: 38,
        halign: "right",
        overflow: "hidden",
      },
    },
  });


  // ==========================================================
  // FOOTER
  // ==========================================================

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.text(
    `Hisab Cycle ${cycle.cycle_number}`,

    105,

    287,

    {
      align: "center",
    }
  );


  doc.save(
    `Hisab_Cycle_${
      cycle.cycle_number
    }.pdf`
  );
}


// ============================================================
// HISAB CYCLE EXCEL
// ============================================================

export function exportHisabCycleExcel({
  cycle,
  bills = [],
  payments = [],
  companyMap = new Map(),
}) {
  if (!cycle) {
    throw new Error(
      "No Hisab Cycle selected."
    );
  }


  const workbook =
    XLSX.utils.book_new();


  // ==========================================================
  // TOTALS
  // ==========================================================

  const billingAmount =
    bills.reduce(
      (sum, bill) =>
        sum +
        Number(
          bill.grand_total || 0
        ),
      0
    );


  const receivedAmount =
    payments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );


  const summary =
    getPaymentSummary(
      billingAmount,
      receivedAmount
    );


  // ==========================================================
  // BILL ROWS
  // ==========================================================

  const rows =
    bills.map(
      (bill, index) => [
        index + 1,

        bill.company_name ||
          companyMap.get(
            bill.company_id
          ) ||
          "",

        bill.bill_number ||
          "",

        bill.customer_site ||
          "",

        hisabDate(
          bill.bill_date
        ),

        Number(
          bill.grand_total || 0
        ),
      ]
    );


  // ==========================================================
  // FINAL SUMMARY LABEL
  // ==========================================================

  const finalSummaryLabel =
    summary.hasExtraPayment
      ? "Extra Payment / Advance"
      : "Balance Billing Amount";


  // ==========================================================
  // FINAL SUMMARY VALUE
  // ==========================================================

  const finalSummaryValue =
    summary.hasExtraPayment
      ? summary.extraPaymentAdvance
      : summary.balanceBillingAmount;


  // ==========================================================
  // SHEET DATA
  // ==========================================================

  const sheetData = [
    [
      "BILLING",
      "",
      "",
      "",
      "",
      "",
    ],

    [
      `Hisab Cycle ${cycle.cycle_number}`,
      "",
      "",
      "",
      "",
      "",
    ],

    [
      "",
      "",
      "",
      "",
      "",
      "",
    ],

    [
      "SR NO.",
      "COMPANY",
      "BILL NO.",
      "SITE",
      "DATE",
      "AMOUNT",
    ],

    ...rows,

    [
      "",
      "",
      "",
      "TOTAL BILLING AMOUNT",
      "",
      summary.billingAmount,
    ],

    [
      "",
      "",
      "",
      "",
      "",
      "",
    ],

    [
      "",
      "",
      "",
      "",
      "",
      "",
    ],

    [
      "",
      "",
      "",
      "Billing Amount",
      "",
      summary.billingAmount,
    ],

    [
      "",
      "",
      "",
      "Received payment",
      "",
      -summary.receivedAmount,
    ],

    [
      "",
      "",
      "",
      finalSummaryLabel,
      "",
      finalSummaryValue,
    ],
  ];


  const sheet =
    XLSX.utils.aoa_to_sheet(
      sheetData
    );


  // ==========================================================
  // APPLY STYLES
  // ==========================================================

  applyHisabCycleExcelStyles(
    sheet,
    rows.length,
    summary.billingAmount,
    summary.receivedAmount,
    summary.difference
  );


  // ==========================================================
  // FREEZE HEADER
  // ==========================================================

  sheet["!freeze"] = {
    xSplit: 0,
    ySplit: 4,
  };


  // ==========================================================
  // ADD SHEET
  // ==========================================================

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    `Cycle ${cycle.cycle_number}`
  );


  // ==========================================================
  // DOWNLOAD
  // ==========================================================

  XLSX.writeFile(
    workbook,

    `Hisab_Cycle_${
      cycle.cycle_number
    }.xlsx`,

    {
      bookType: "xlsx",
      cellStyles: true,
    }
  );
}