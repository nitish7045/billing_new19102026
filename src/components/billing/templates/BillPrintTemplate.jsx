
import React from "react";
import NormalCoreBillTemplate from "./NormalCoreBillTemplate";
import GstBillTemplate from "./GstBillTemplate";

export default function BillPrintTemplate({ bill }) {
  const billType = String(bill?.billType || "").toLowerCase();
  const isGst = billType === "gst";

  return (
    <div id="bill-print-root">
      {isGst ? (
        <GstBillTemplate bill={bill} />
      ) : (
        <NormalCoreBillTemplate bill={bill} />
      )}
    </div>
  );
}
