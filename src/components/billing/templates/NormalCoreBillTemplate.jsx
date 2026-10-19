
import React from "react";
import "./NormalCoreBillTemplate.css";
import {
  billMoney,
  getBillPrintData,
  BillItemRows,
} from "./billPrintUtils";

export default function NormalCoreBillTemplate({ bill }) {
  const data = getBillPrintData({
    ...bill,
    billType: "normal",
  });

  const {
    companyName,
    address,
    contact,
    customerTo,
    site,
    billNo,
    billDate,
    items,
    amountInWords,
    grandTotal,
    bankName,
    branch,
    account,
    ifsc,
    proprietor,
  } = data;

  // Show bank details only when at least one detail exists.
  const hasBankDetails = [
    bankName,
    branch,
    account,
    ifsc,
  ].some((value) => String(value ?? "").trim() !== "");

  // Read a signature URL if one is included in the bill object.
  // No signature is required; physical signing remains possible.
  
const signatureUrl =
  bill?.signatureUrl ||
  bill?.signature?.previewUrl ||
  bill?.signature?.preview_url ||
  bill?.signature?.url ||
  bill?.signature?.publicUrl ||
  bill?.signature?.public_url ||
  "";


  const safeSignatureUrl =
    typeof signatureUrl === "string" &&
    signatureUrl.trim() !== ""
      ? signatureUrl.trim()
      : "";

  return (
    <article
      className="bill-print-sheet bill-print-normal"
    >
      <div className="normal-bill-label">BILL</div>

      <header className="bill-print-company normal-company">
        <h1>{companyName}</h1>
        <p>{address}</p>
        <p>CONTACT NO- {contact}</p>
      </header>

      <section className="normal-info">
        <div className="normal-customer">
          <div className="normal-to">
            <strong>TO:</strong>
            <span>{customerTo}</span>
          </div>

          <div className="normal-site">
            <strong>SITE:</strong>
            <span>{site}</span>
          </div>
        </div>

        <div className="normal-meta">
          <div>
            <strong>BILL NO:</strong>
            <span>
              <strong>{billNo}</strong>
            </span>
          </div>

          <div>
            <strong>DATE:</strong>
            <span>
              <strong>{billDate}</strong>
            </span>
          </div>
        </div>
      </section>

      <table className="bill-print-items normal-items">
        <colgroup>
          <col className="normal-col-sr" />
          <col className="normal-col-particular" />
          <col className="normal-col-qty" />
          <col className="normal-col-unit" />
          <col className="normal-col-rate" />
          <col className="normal-col-amount" />
        </colgroup>

        <thead>
          <tr>
            <th>
              SR
              <br />
              NO.
            </th>
            <th>PARTICULAR</th>
            <th>QTY</th>
            <th>UNIT</th>
            <th>RATE</th>
            <th>AMOUNT</th>
          </tr>
        </thead>

        <tbody>
          <BillItemRows items={items} prefix="normal-item" />
        </tbody>
      </table>

      <section className="normal-summary">
        <div className="normal-words">
          <strong>
            Amount in words: <span>{amountInWords}</span>
          </strong>
        </div>

        <div className="normal-total-label">
          <strong>TOTAL</strong>
        </div>

        <div className="normal-total-value">
          <strong>₹ {billMoney(grandTotal)}</strong>
        </div>
      </section>

      <footer
        className={`bill-print-footer normal-footer ${
          hasBankDetails ? "" : "normal-footer-no-bank"
        }`}
      >
        {hasBankDetails && (
          <div className="bill-print-bank">
            <strong>Our Bank Details:</strong>

            {bankName && (
              <p>
                BANK: {bankName}
                {branch ? `, ${branch}` : ""}
              </p>
            )}

            {account && <p>ACC NO: {account}</p>}

            {ifsc && <p>IFSC CODE: {ifsc}</p>}
          </div>
        )}

        <div className="bill-print-signature">
          <strong>FOR {companyName}</strong>

          {safeSignatureUrl ? (
            <img
              className="bill-print-signature-image"
              src={safeSignatureUrl}
              alt="Authorized signature"
            />
          ) : (
            <div className="bill-print-sign-space" />
          )}

          <span>{proprietor || "PROPRIETOR"}</span>
        </div>
      </footer>
    </article>
  );
}
