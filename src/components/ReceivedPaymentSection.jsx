import { useMemo } from "react";

export default function ReceivedPaymentSection({
  payments = [],
  companyMap = new Map(),

  onAddPayment,
  onEditPayment,
  onDeletePayment,

  onPdf,
  onExcel,

  exporting = false,
}) {
  const paymentRows = useMemo(() => {
    return payments.map(
      (payment, index) => ({
        ...payment,
        sr_no:
          payment.sr_no ||
          index + 1,
      })
    );
  }, [payments]);

  function formatAmount(value) {
    return Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    );
  }

  function formatDate(value) {
    if (!value) return "-";

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  return (
    <section className="report-card received-payment-section">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="section-title-row">

        <div>
          <h2>
            Received Payment
          </h2>

          <span className="received-payment-count">
            {paymentRows.length} payment
            {paymentRows.length === 1
              ? ""
              : "s"}
          </span>
        </div>

        <div className="section-actions">

          <button
            type="button"
            className="report-btn"
            onClick={onPdf}
            disabled={
              exporting ||
              !paymentRows.length
            }
          >
            PDF
          </button>

          <button
            type="button"
            className="report-btn"
            onClick={onExcel}
            disabled={
              exporting ||
              !paymentRows.length
            }
          >
            Excel
          </button>

          <button
            type="button"
            className="report-btn report-btn-primary"
            onClick={
              onAddPayment
            }
          >
            + Add Payment
          </button>

        </div>

      </div>

      {/* =====================================================
          TABLE
      ====================================================== */}

      <div className="table-wrap">

        <table className="reports-table received-payment-table">

          <thead>

            <tr>

              <th
                style={{
                  width: "70px",
                  textAlign:
                    "center",
                }}
              >
                SR. NO.
              </th>

              <th>
                DATE
              </th>

              <th>
                COMPANY
              </th>

              <th>
                AMOUNT
              </th>

              <th>
                NOTES
              </th>

              <th>
                CYCLE
              </th>

              <th>
                ACTIONS
              </th>

            </tr>

          </thead>

          <tbody>

            {paymentRows.length ===
            0 ? (
              <tr>

                <td
                  colSpan="7"
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "30px",
                  }}
                >
                  No received payments
                  found in this cycle.
                </td>

              </tr>
            ) : (
              paymentRows.map(
                (
                  payment
                ) => {

                  const companyName =
                    payment.company_id
                      ? companyMap.get(
                          payment.company_id
                        )
                      : payment.payment_source ||
                        "-";

                  return (
                    <tr
                      key={
                        payment.id
                      }
                    >

                      {/* SR NO */}

                      <td
                        style={{
                          textAlign:
                            "center",
                          fontWeight:
                            600,
                        }}
                      >
                        {
                          payment.sr_no
                        }
                      </td>

                      {/* DATE */}

                      <td>
                        {formatDate(
                          payment.payment_date
                        )}
                      </td>

                      {/* COMPANY */}

                      <td>
                        {
                          companyName
                        }
                      </td>

                      {/* AMOUNT */}

                      <td>
                        <strong>
                          ₹{" "}
                          {formatAmount(
                            payment.amount
                          )}
                        </strong>
                      </td>

                      {/* NOTES */}

                      <td>
                        {payment.notes ||
                          "-"}
                      </td>

                      {/* CYCLE */}

                      <td>
                        {payment.cycle_number ? (
                          <span className="hisab-cycle-status open">
                            Cycle{" "}
                            {
                              payment.cycle_number
                            }
                          </span>
                        ) : (
                          <span className="hisab-cycle-status">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}

                      <td>

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "8px",
                          }}
                        >

                          <button
                            type="button"
                            className="report-btn"
                            onClick={() =>
                              onEditPayment(
                                payment
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="report-btn"
                            onClick={() =>
                              onDeletePayment(
                                payment.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                }
              )
            )}

          </tbody>

        </table>

      </div>

    </section>
  );
}