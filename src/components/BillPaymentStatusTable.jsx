import { dateText, money } from "../utils/reportHelpers";

export default function BillPaymentStatusTable({
  bills,
  companyMap,
}) {
  return (
    <section className="report-card">
      <div className="section-title-row">
        <h2>Bill Payment Status</h2>
        <span>Payment allocation: FIFO by bill date</span>
      </div>

      <div className="table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              <th>SR NO.</th>
              <th>COMPANY</th>
              <th>BILL NO.</th>
              <th>SITE</th>
              <th>DATE</th>
              <th>AMOUNT</th>
              <th>RECEIVED</th>
              <th>BALANCE</th>
              <th>STATUS</th>
            </tr>
          </thead>

          <tbody>
            {bills.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-cell">
                  No bills found for these filters.
                </td>
              </tr>
            ) : (
              bills.map((bill, index) => (
                <tr key={bill.id}>
                  <td>{index + 1}</td>
                  <td>
                    {bill.company_name ||
                      companyMap.get(bill.company_id) ||
                      "-"}
                  </td>
                  <td>{bill.bill_number}</td>
                  <td>{bill.customer_site || "-"}</td>
                  <td>{dateText(bill.bill_date)}</td>
                  <td>{money(bill.grand_total)}</td>
                  <td>{money(bill.received)}</td>
                  <td>{money(bill.balance)}</td>
                  <td>
                    <span
                      className={`status-badge status-${bill.paymentStatus.toLowerCase()}`}
                    >
                      {bill.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
