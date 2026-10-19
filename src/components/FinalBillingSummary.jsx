import { money } from "../utils/reportHelpers";

export default function FinalBillingSummary({ summary }) {
  const balance = Number(summary?.balance || 0);
  const extraPayment = Number(summary?.extraPayment || 0);

  return (
    <section className="report-card final-summary">
      <h2>BILLING</h2>

      <div className="final-summary-table">
        <div>
          <b>Billing Amount</b>
          <strong>{money(summary?.billingAmount || 0)}</strong>
        </div>

        <div>
          <b>Received payment</b>
          <strong>- {money(summary?.receivedAmount || 0)}</strong>
        </div>

        {balance > 0.009 ? (
          <div>
            <b>Balance Billing Amount</b>
            <strong>{money(balance)}</strong>
          </div>
        ) : extraPayment > 0.009 ? (
          <div>
            <b>Extra Payment / Advance</b>
            <strong>{money(extraPayment)}</strong>
          </div>
        ) : (
          <div>
            <b>Balance Billing Amount</b>
            <strong>{money(0)}</strong>
          </div>
        )}
      </div>

      <div className="settlement-status settlement-pending">
        ⚠ HISAB OPEN
      </div>
    </section>
  );
}