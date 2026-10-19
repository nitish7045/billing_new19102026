export default function ReportsHeader({
  onAddPayment,
  onUnpaidPdf,
  onExcel,
  onRefresh,
  exporting,
}) {
  return (
    <div className="reports-header">
      <div>
        <h1>Reports</h1>
        <p>
          Billing, paid/unpaid analysis and received-payment tracking.
        </p>
      </div>

      <div className="reports-header-actions">
        <button
          className="report-btn report-btn-primary"
          onClick={onAddPayment}
          type="button"
        >
          + Received Payment
        </button>

        <button
          className="report-btn"
          onClick={onUnpaidPdf}
          type="button"
          disabled={exporting}
        >
          PDF – Unpaid Bills
        </button>

        {/* <button
          className="report-btn"
          onClick={onExcel}
          type="button"
          disabled={exporting}
        >
          Export Excel
        </button> */}

        {/* <button
          className="report-btn"
          onClick={onRefresh}
          type="button"
        >
          Refresh
        </button> */}
      </div>
    </div>
  );
}
