import { money } from "../utils/reportHelpers";

export default function ReportsSummary({ summary }) {
  return (
    <section className="summary-grid">
      <div className="summary-card">
        <span>Total Billing</span>
        <strong>{money(summary.billingAmount)}</strong>
      </div>

      <div className="summary-card">
        <span>Received Payment</span>
        <strong>{money(summary.receivedAmount)}</strong>
      </div>

      <div
        className={`summary-card ${
          summary.balance >= 0
            ? "summary-danger"
            : "summary-credit"
        }`}
      >
        <span>
          {summary.balance >= 0
            ? "Balance Billing Amount"
            : "Extra Payment / Advance"}
        </span>
        <strong>{money(Math.abs(summary.balance))}</strong>
      </div>

      <div className="summary-card">
        <span>Paid / Unpaid</span>
        <strong>
          {summary.paidCount} / {summary.unpaidCount}
        </strong>
      </div>
    </section>
  );
}
