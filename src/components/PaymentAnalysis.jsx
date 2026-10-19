import { money } from "../utils/reportHelpers";

export default function PaymentAnalysis({
  summary,
  billCount,
}) {
  const total = summary.allocation.length;

  const paidPercent = total
    ? (summary.paidCount / total) * 100
    : 0;

  const unpaidPercent = total
    ? (summary.unpaidCount / total) * 100
    : 0;

  return (
    <section className="report-card">
      <div className="section-title-row">
        <h2>Payment Analysis</h2>
        <span>{billCount} bills</span>
      </div>

      <div className="analysis-grid">
        <div className="analysis-block">
          <h3>Bill Status</h3>

          <div className="bar-row">
            <span>Paid</span>
            <div className="bar">
              <i style={{ width: `${paidPercent}%` }} />
            </div>
            <b>{summary.paidCount}</b>
          </div>

          <div className="bar-row">
            <span>Unpaid</span>
            <div className="bar">
              <i style={{ width: `${unpaidPercent}%` }} />
            </div>
            <b>{summary.unpaidCount}</b>
          </div>
        </div>

        <div className="analysis-total">
          <div>
            <span>Outstanding</span>
            <strong>{money(summary.outstanding)}</strong>
          </div>

          <div>
            <span>Extra / Advance</span>
            <strong>{money(summary.extraPayment)}</strong>
          </div>

          <div>
            <span>Payments Count</span>
            <strong>{summary.paymentCount}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
