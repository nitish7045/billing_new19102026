
import React from "react";
import "./GstBillTemplate.css";
import {
  billMoney,
  getBillPrintData,
  BillItemRows,
} from "./billPrintUtils";

export default function GstBillTemplate({ bill }) {
  const data = getBillPrintData({
    ...bill,
    billType: "gst",
  });

  const {
    companyName,
    address,
    gstNo,
    customerTo,
    site,
    billNo,
    billDate,
    items,
    amountInWords,
    subtotal,
    sgstAmount,
    cgstAmount,
    grandTotal,
    sgstRate,
    cgstRate,
    bankName,
    branch,
    account,
    ifsc,
    proprietor,
  } = data;

  // Get the selected signature URL.
  const signatureUrl =
    bill?.signatureUrl ||
    bill?.signature?.previewUrl ||
    bill?.signature?.url ||
    "";

  return (
    <article
      className="bill-print-sheet bill-print-gst"
    >
      <header className="bill-print-company gst-company">
        <h1>{companyName}</h1>
        <p>{address}</p>
        <p>GST No.: {gstNo}</p>
      </header>

      <div className="gst-invoice-title">
        TAX INVOICE
      </div>

      <section className="gst-info">
        <div className="gst-customer">
          <div className="gst-to">
            <strong>To:</strong>
            <span>{customerTo}</span>
          </div>

          <div className="gst-site">
            <strong>Site:</strong>
            <span>{site}</span>
          </div>
        </div>

        <div className="gst-meta">
          <div className="gst-meta-row">
            <strong>Bill No.</strong>
            <span>{billNo}</span>
          </div>

          <div className="gst-meta-row">
            <strong>Date:</strong>
            <span>{billDate}</span>
          </div>
        </div>
      </section>

      <table className="bill-print-items gst-items">
        <colgroup>
          <col className="gst-col-sr" />
          <col className="gst-col-particular" />
          <col className="gst-col-qty" />
          <col className="gst-col-unit" />
          <col className="gst-col-rate" />
          <col className="gst-col-amount" />
        </colgroup>

        <thead>
          <tr>
            <th>Sr</th>
            <th>Particulars</th>
            <th>Qty</th>
            <th>UNIT</th>
            <th>Unit Rate</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          <BillItemRows items={items} prefix="gst-item" />
        </tbody>
      </table>

      <section className="gst-summary">
        <div className="gst-words">
          <strong>Amount in Words:</strong>
          <span>{amountInWords}</span>
        </div>

        <table className="gst-totals">
          <tbody>
            <tr>
              <th>TOTAL</th>
              <td>₹ {billMoney(subtotal)}</td>
            </tr>

            <tr>
              <th>SGST - @ {sgstRate.toFixed(1)}%</th>
              <td>₹ {billMoney(sgstAmount)}</td>
            </tr>

            <tr>
              <th>CGST - @ {cgstRate.toFixed(1)}%</th>
              <td>₹ {billMoney(cgstAmount)}</td>
            </tr>

            <tr>
              <th>GRAND TOTAL</th>
              <td>₹ {billMoney(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="bill-print-footer gst-footer">
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

        <div className="bill-print-signature">
          <strong>FOR {companyName}</strong>

          <div className="bill-print-sign-space">
            {signatureUrl && (
              <img
                src={signatureUrl}
                alt="Authorized signature"
                className="bill-print-signature-image"
              />
            )}
          </div>

          <span>({proprietor})</span>
        </div>
      </footer>
    </article>
  );
}
