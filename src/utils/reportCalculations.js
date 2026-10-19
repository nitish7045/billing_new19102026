export function allocatePaymentsToBills(bills, payments) {
  const orderedBills = [...bills].sort((a, b) => {
    const dateCompare = String(a.bill_date || "").localeCompare(
      String(b.bill_date || "")
    );

    if (dateCompare !== 0) return dateCompare;

    return String(a.bill_number || "").localeCompare(
      String(b.bill_number || ""),
      undefined,
      { numeric: true }
    );
  });

  const orderedPayments = [...payments].sort((a, b) => {
    const dateCompare = String(
      a.payment_date || ""
    ).localeCompare(String(b.payment_date || ""));

    if (dateCompare !== 0) return dateCompare;

    return String(a.created_at || "").localeCompare(
      String(b.created_at || "")
    );
  });

  const remainingByBill = new Map();
  const receivedByBill = new Map();

  orderedBills.forEach((bill) => {
    remainingByBill.set(
      bill.id,
      Number(bill.grand_total || 0)
    );
    receivedByBill.set(bill.id, 0);
  });

  for (const payment of orderedPayments) {
    let remainingPayment = Number(payment.amount || 0);

    for (const bill of orderedBills) {
      if (remainingPayment <= 0) break;

      const outstanding = remainingByBill.get(bill.id) || 0;
      if (outstanding <= 0) continue;

      const applied = Math.min(
        outstanding,
        remainingPayment
      );

      remainingByBill.set(
        bill.id,
        outstanding - applied
      );

      receivedByBill.set(
        bill.id,
        (receivedByBill.get(bill.id) || 0) + applied
      );

      remainingPayment -= applied;
    }
  }

  return orderedBills.map((bill) => {
    const total = Number(bill.grand_total || 0);
    const received = receivedByBill.get(bill.id) || 0;
    const balance = Math.max(0, total - received);

    const dbStatus = String(
      bill.payment_status || ""
    ).trim().toLowerCase();

    let paymentStatus;

    if (dbStatus === "paid") {
      paymentStatus = "Paid";
    } else if (dbStatus === "unpaid") {
      paymentStatus = "Unpaid";
    } else {
      paymentStatus =
        total > 0 && balance <= 0.009
          ? "Paid"
          : "Unpaid";
    }

    return {
      ...bill,
      received,
      balance,
      paymentStatus,
    };
  });
}
