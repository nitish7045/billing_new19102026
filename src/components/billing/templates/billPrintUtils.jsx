
import React from "react";

/* General helpers */

export const billValue = (...items) =>
  items.find(
    (item) =>
      item !== undefined &&
      item !== null &&
      String(item).trim() !== ""
  ) ?? "";

export const billMoney = (amount) =>
  Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const billDateLabel = (date) => {
  if (!date) return "";

  const dateString = String(date);
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(dateString)
      ? `${dateString}T00:00:00`
      : dateString
  );

  if (Number.isNaN(parsed.getTime())) return dateString;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/* Prepare bill data for printing */

export const getBillPrintData = (bill = {}) => {
  const company = bill.company || {};
  const bank = bill.bank || {};
  const isGst = String(bill.billType || "").toLowerCase() === "gst";

  const companyName = billValue(
    company.company_name,
    company.companyName,
    bill.companyName,
    "COMPANY NAME"
  );

  return {
    company,
    bank,
    deepMode: Boolean(bill.deepMode || bill.items?.some((item) => item.deepMode)),
    companyName,

    address: billValue(
      company.address,
      company.company_address,
      company.companyAddress,
      company.full_address,
      company.billing_address,
      company.billingAddress,
      company.address_line1,
      company.address_line_1,
      company.address_line_2,
      company.registered_address,
      company.office_address,
      bill.companyAddress,
      bill.company_address,
      bill.address
    ),

    // contact: billValue(
    //   company.contact_number,
    //   company.phone,
    //   company.mobile,
    //   company.phone_number,
    //   company.contact_no,
    //   !isGst ? "+91 9766968555" : ""
    // ),

    gstNo: billValue(
      company.gst_no,
      company.gst_number,
      company.gstin,
      company.company_gst_no,
      bill.companyGstNo,
      "GST NUMBER"
    ),

    proprietor: billValue(
      company.proprietor_name,
      company.proprietor,
      company.owner_name,
      company.ownerName,
      company.authorized_person,
      "Proprietor"
    ),

    // Bank details are invoice-specific: never fall back to company profile
    // or legacy invoice aliases when no bank was explicitly selected.
    bankName: billValue(bank.bank_name, bank.bankName),

    account: billValue(
      bank.account_number,
      bank.account_no,
      bank.accountNumber
    ),

    ifsc: billValue(bank.ifsc_code, bank.ifscCode),

    branch: billValue(bank.branch),

    items: Array.isArray(bill.items) ? bill.items : [],

    customerTo: billValue(
      bill.customerTo,
      bill.to_address,
      bill.customer_to,
      bill.customer?.to_address,
      bill.customer?.toAddress
    ),

    site: billValue(bill.site, bill.customer?.site),
    billNo: billValue(bill.billNo),
    billDate: billDateLabel(bill.billDate),
    amountInWords: billValue(bill.amountInWords),

    subtotal: Number(bill.subtotal || 0),
    sgstAmount: Number(bill.sgstAmount || 0),
    cgstAmount: Number(bill.cgstAmount || 0),

    grandTotal: Number(
      bill.grandTotal ??
        (
          Number(bill.subtotal || 0) +
          Number(bill.sgstAmount || 0) +
          Number(bill.cgstAmount || 0)
        )
    ),

    sgstRate: Number(bill.sgstRate || 0),
    cgstRate: Number(bill.cgstRate || 0),
  };
};

/**
 * Print row rules:
 * - Blank rows: no serial number or amount.
 * - Explicit headings: no amount.
 * - Headings with serial numbers count in the sequence.
 * - Headings without serial numbers do not count.
 * - Product rows retain their saved amount or calculate qty × rate.
 */

export const BillItemRows = ({ items = [], prefix = "bill", deepMode = false }) => {
  let serialNumber = 0;

  return items.map((item, index) => {
    const rowType = String(
      item?.type ??
        item?.rowType ??
        item?.row_type ??
        item?.kind ??
        ""
    )
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    const particular = item
      ? billValue(item.particular, item.name, item.description)
      : "";

    const notes = item ? billValue(item.notes) : "";

    const displayParticular = [
      particular,
      notes ? `(${notes})` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const qty = item?.qty ?? item?.quantity;
    const rate = item?.rate ?? item?.unit_rate;
    const deep = item?.deep;

    const isManual =
      item?.type === "manual" ||
      item?.is_manual === true;

    const explicitSerialSetting =
      item?.showSrNo ?? item?.show_sr_no;

    const hasQty =
      qty !== undefined && qty !== null && qty !== "";

    const hasRate =
      rate !== undefined && rate !== null && rate !== "";

    const hasAmount =
      item?.amount !== undefined &&
      item?.amount !== null &&
      item?.amount !== "";

    /*
     * FIX:
     * A row without particular, quantity or rate is blank,
     * even when the saved amount is 0.
     */
    const isBlankRow =
      !item ||
      ["blank", "blank_line", "empty", "spacer"].includes(rowType) ||
      (
        !String(displayParticular).trim() &&
        !hasQty &&
        !hasRate
      );

    const isHeadingType = [
      "heading",
      "heading_with_srno",
      "heading_without_srno",
      "heading_with_sr_no",
      "heading_without_sr_no",
      "section_heading",
      "title",
    ].includes(rowType);

    const isHeading =
      isHeadingType ||
      item?.is_heading === true ||
      item?.isHeading === true ||
      item?.is_heading_row === true;

    /* Fallback for older saved headings. */
    const isLegacyHeading =
      !isBlankRow &&
      Boolean(String(displayParticular).trim()) &&
      !hasQty &&
      !hasRate &&
      (!hasAmount || Number(item?.amount) === 0) &&
      (
        item?.bold === true ||
        item?.center === true ||
        explicitSerialSetting !== undefined
      );

    const isSpecialRow =
      isBlankRow || isHeading || isLegacyHeading;

    let showSerial = false;

    if (!isBlankRow) {
      if (
        explicitSerialSetting !== undefined &&
        explicitSerialSetting !== null
      ) {
        showSerial = Boolean(explicitSerialSetting);
      } else if (isHeading || isLegacyHeading) {
        showSerial = [
          "heading_with_srno",
          "heading_with_sr_no",
        ].includes(rowType);
      } else {
        showSerial = !isManual;
      }
    }

    const currentSerial = showSerial
      ? ++serialNumber
      : "";

    const amount = isSpecialRow
      ? ""
      : hasAmount
        ? item.amount
        : hasQty && hasRate
          ? (deepMode ? (Number(deep) || 0) : 1) * (Number(qty) || 0) * (Number(rate) || 0)
          : "";

    const rateDisplay =
      isSpecialRow || !hasRate
        ? ""
        : billMoney(rate);

    const amountDisplay =
      amount === "" || amount === null || amount === undefined
        ? ""
        : billMoney(amount);

    const rowClasses = [
      item?.bold ? "bill-print-bold-row" : "",
      isBlankRow ? "bill-print-blank-row" : "",
      isHeading || isLegacyHeading
        ? "bill-print-heading-row"
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <tr
        key={item?.id || `${prefix}-${index}`}
        className={rowClasses}
      >
        <td>{currentSerial}</td>

        <td
          className={
            item?.center
              ? "bill-print-center"
              : "bill-print-particular"
          }
        >
          {displayParticular}
        </td>

        {deepMode && <td className="bill-print-center">{isSpecialRow ? "" : deep ?? ""}</td>}

        <td className="bill-print-center">
          {isSpecialRow ? "" : qty ?? ""}
        </td>

        <td className="bill-print-center">
          {isSpecialRow ? "" : billValue(item?.unit)}
        </td>

        <td className="bill-print-right">
          {rateDisplay}
        </td>

        <td className="bill-print-right">
          {amountDisplay}
        </td>
      </tr>
    );
  });
};
