import { supabase } from "../../lib/supabase";

// ============================================================
// HISAB CYCLE SERVICE
// ============================================================
//
// Responsibilities:
//
// 1. Get all cycles
// 2. Get one cycle
// 3. Get/create current open cycle
// 4. Create a new cycle
// 5. Settle a cycle
// 6. Get bills assigned to a cycle
// 7. Get payments assigned to a cycle
// 8. Get unassigned bills
// 9. Assign selected bills to a cycle
// 10. Remove a bill from an OPEN cycle
//
// IMPORTANT:
//
// invoices table is NOT changed.
//
// Relationship:
//
// hisab_cycles
//      ↓
// hisab_cycle_bills
//      ↓
// invoices
//
// hisab_cycles
//      ↓
// hisab_cycle_payments
//      ↓
// received_payments
//
// A bill can belong to ONLY ONE cycle.
// ============================================================


// ============================================================
// CYCLE SELECT
// ============================================================

const CYCLE_SELECT = `
  id,
  user_id,
  cycle_number,
  client_name,
  status,
  started_at,
  settled_at,
  notes,
  created_at,
  updated_at
`;


// ============================================================
// BILL SELECT
// ============================================================

const BILL_SELECT = `
  id,
  user_id,
  bill_number,
  bill_date,
  company_id,
  company_name,
  customer_to,
  customer_site,
  grand_total,
  payment_status,
  bill_type,
  isdelete
`;


// ============================================================
// PAYMENT SELECT
// ============================================================

const PAYMENT_SELECT = `
  id,
  user_id,
  company_id,
  payment_date,
  amount,
  payment_source,
  notes,
  created_at
`;


// ============================================================
// GET ALL CYCLES
// ============================================================

export async function getHisabCycles(
  userId
) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("hisab_cycles")
    .select(CYCLE_SELECT)
    .eq(
      "user_id",
      userId
    )
    .order(
      "cycle_number",
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}


// ============================================================
// GET ONE CYCLE
// ============================================================

export async function getHisabCycle(
  cycleId,
  userId
) {
  if (!cycleId) {
    throw new Error(
      "Cycle ID is required."
    );
  }

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("hisab_cycles")
    .select(CYCLE_SELECT)
    .eq(
      "id",
      cycleId
    )
    .eq(
      "user_id",
      userId
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// ============================================================
// GET OPEN CYCLE
// ============================================================
//
// There should normally be only ONE open cycle.
//
// If old data contains multiple open cycles,
// the oldest one is returned.
//

export async function getOpenHisabCycle(
  userId
) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("hisab_cycles")
    .select(CYCLE_SELECT)
    .eq(
      "user_id",
      userId
    )
    .eq(
      "status",
      "open"
    )
    .order(
      "started_at",
      {
        ascending: true,
      }
    )
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}


// ============================================================
// GET NEXT CYCLE NUMBER
// ============================================================

export async function getNextHisabCycleNumber(
  userId
) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("hisab_cycles")
    .select(
      "cycle_number"
    )
    .eq(
      "user_id",
      userId
    )
    .order(
      "cycle_number",
      {
        ascending: false,
      }
    )
    .limit(1);

  if (error) {
    throw error;
  }

  const highestNumber =
    Number(
      data?.[0]
        ?.cycle_number || 0
    );

  return (
    highestNumber + 1
  );
}


// ============================================================
// CREATE HISAB CYCLE
// ============================================================
//
// Normally you don't need to call this manually.
// getOrCreateOpenHisabCycle() is preferred.
//

export async function createHisabCycle(
  userId,
  {
    notes = null,
  } = {}
) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  // ----------------------------------------------------------
  // NEVER CREATE A SECOND OPEN CYCLE
  // ----------------------------------------------------------

  const existing =
    await getOpenHisabCycle(
      userId
    );

  if (existing) {
    return existing;
  }

  const cycleNumber =
    await getNextHisabCycleNumber(
      userId
    );

  const {
    data,
    error,
  } = await supabase
    .from(
      "hisab_cycles"
    )
    .insert({
      user_id:
        userId,

      cycle_number:
        cycleNumber,

      client_name: "General",

      status:
        "open",

      started_at:
        new Date().toISOString(),

      notes:
        notes || null,
    })
    .select(
      CYCLE_SELECT
    )
    .single();

  if (error) {
    /*
     * If another tab/browser created the
     * open cycle at the same time, try
     * returning that cycle.
     */

    if (
      error.code ===
      "23505"
    ) {
      const retry =
        await getOpenHisabCycle(
          userId
        );

      if (retry) {
        return retry;
      }
    }

    throw error;
  }

  return data;
}


// ============================================================
// GET OR CREATE OPEN CYCLE
// ============================================================

export async function getOrCreateOpenHisabCycle(
  userId
) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const existing =
    await getOpenHisabCycle(
      userId
    );

  if (existing) {
    return existing;
  }

  return createHisabCycle(
    userId
  );
}


// ============================================================
// SETTLE HISAB CYCLE
// ============================================================
//
// Important:
//
// Settlement does NOT:
// - delete bills
// - delete payments
// - move bills
// - move payments
// - modify invoices
//
// It only changes:
//
// open → settled
//
// After this, the next new payment or manually
// created cycle will use the next cycle number.
//

export async function settleHisabCycle(
  cycleId,
  userId
) {
  if (!cycleId) {
    throw new Error(
      "Cycle ID is required."
    );
  }

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const cycle =
    await getHisabCycle(
      cycleId,
      userId
    );

  if (
    cycle.status !==
    "open"
  ) {
    throw new Error(
      "This Hisab Cycle is already settled."
    );
  }

  const settledAt =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from(
      "hisab_cycles"
    )
    .update({
      status:
        "settled",

      settled_at:
        settledAt,

      updated_at:
        settledAt,
    })
    .eq(
      "id",
      cycleId
    )
    .eq(
      "user_id",
      userId
    )
    .eq(
      "status",
      "open"
    )
    .select(
      CYCLE_SELECT
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// ============================================================
// UPDATE CYCLE NOTES
// ============================================================

export async function updateHisabCycleNotes(
  cycleId,
  userId,
  notes
) {
  if (!cycleId) {
    throw new Error(
      "Cycle ID is required."
    );
  }

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "hisab_cycles"
    )
    .update({
      notes:
        String(
          notes || ""
        ).trim() || null,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      cycleId
    )
    .eq(
      "user_id",
      userId
    )
    .eq(
      "status",
      "open"
    )
    .select(
      CYCLE_SELECT
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// ============================================================
// GET CYCLE BILL REFERENCES
// ============================================================

export async function getHisabCycleBillReferences(
  cycleId
) {
  if (!cycleId) {
    throw new Error(
      "Cycle ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "hisab_cycle_bills"
    )
    .select(`
      id,
      cycle_id,
      invoice_id,
      created_at
    `)
    .eq(
      "cycle_id",
      cycleId
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}


// ============================================================
// GET CYCLE BILLS
// ============================================================

export async function getHisabCycleBills(
  cycleId,
  userId
) {
  if (!cycleId) {
    throw new Error(
      "Cycle ID is required."
    );
  }

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const references =
    await getHisabCycleBillReferences(
      cycleId
    );

  const invoiceIds =
    references.map(
      (row) =>
        row.invoice_id
    );

  if (!invoiceIds.length) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from("invoices")
    .select(
      BILL_SELECT
    )
    .eq(
      "user_id",
      userId
    )
    .in(
      "id",
      invoiceIds
    )
    .order(
      "bill_date",
      {
        ascending: true,
      }
    );

  if (error) {
    throw error;
  }

  /*
   * Keep cycle-reference order.
   */

  const billMap =
    new Map(
      (data || []).map(
        (bill) => [
          bill.id,
          bill,
        ]
      )
    );

  return references
    .map(
      (reference) => {
        const bill =
          billMap.get(
            reference.invoice_id
          );

        if (!bill) {
          return null;
        }

        return {
          ...bill,

          cycle_id:
            cycleId,

          cycle_reference_id:
            reference.id,
        };
      }
    )
    .filter(Boolean);
}


// ============================================================
// GET CYCLE PAYMENT REFERENCES
// ============================================================

export async function getHisabCyclePaymentReferences(
  cycleId
) {
  if (!cycleId) {
    throw new Error(
      "Cycle ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "hisab_cycle_payments"
    )
    .select(`
      id,
      cycle_id,
      payment_id,
      created_at
    `)
    .eq(
      "cycle_id",
      cycleId
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}


// ============================================================
// GET CYCLE PAYMENTS
// ============================================================

export async function getHisabCyclePayments(
  cycleId,
  userId
) {
  if (!cycleId) {
    throw new Error(
      "Cycle ID is required."
    );
  }

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const references =
    await getHisabCyclePaymentReferences(
      cycleId
    );

  const paymentIds =
    references.map(
      (row) =>
        row.payment_id
    );

  if (!paymentIds.length) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "received_payments"
    )
    .select(
      PAYMENT_SELECT
    )
    .eq(
      "user_id",
      userId
    )
    .in(
      "id",
      paymentIds
    )
    .order(
      "payment_date",
      {
        ascending: true,
      }
    );

  if (error) {
    throw error;
  }

  const paymentMap =
    new Map(
      (data || []).map(
        (payment) => [
          payment.id,
          payment,
        ]
      )
    );

  return references
    .map(
      (reference) => {
        const payment =
          paymentMap.get(
            reference.payment_id
          );

        if (!payment) {
          return null;
        }

        return {
          ...payment,

          cycle_id:
            cycleId,

          cycle_reference_id:
            reference.id,
        };
      }
    )
    .filter(Boolean);
}


// ============================================================
// GET AVAILABLE / UNASSIGNED BILLS
// ============================================================
//
// This is the important function for:
//
// Company
// Bill Type
// Bill selection
//
// A bill already assigned to Cycle 1 is NOT
// returned here, so it cannot accidentally
// enter Cycle 2.
//

export async function getUnassignedHisabBills(
  userId,
  {
    companyId = "all",
    billType = "all",
    search = "",
  } = {}
) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  // ==========================================================
  // LOAD USER BILLS
  // ==========================================================

  let invoiceQuery =
    supabase
      .from("invoices")
      .select(
        BILL_SELECT
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "isdelete",
        0
      )
      .order(
        "bill_date",
        {
          ascending: true,
        }
      );

  if (
    companyId &&
    companyId !== "all"
  ) {
    invoiceQuery =
      invoiceQuery.eq(
        "company_id",
        companyId
      );
  }

  if (
    billType &&
    billType !== "all"
  ) {
    invoiceQuery =
      invoiceQuery.eq(
        "bill_type",
        billType
      );
  }

  const {
    data: invoices,
    error: invoiceError,
  } = await invoiceQuery;

  if (invoiceError) {
    throw invoiceError;
  }

  const safeInvoices =
    invoices || [];

  if (!safeInvoices.length) {
    return [];
  }

  // ==========================================================
  // FIND ALL BILLS ALREADY ASSIGNED
  // ==========================================================

  const invoiceIds =
    safeInvoices.map(
      (invoice) =>
        invoice.id
    );

  const {
    data: assignedRows,
    error: assignedError,
  } = await supabase
    .from(
      "hisab_cycle_bills"
    )
    .select(`
      invoice_id,
      cycle_id
    `)
    .in(
      "invoice_id",
      invoiceIds
    );

  if (assignedError) {
    throw assignedError;
  }

  const assignedInvoiceIds =
    new Set(
      (
        assignedRows ||
        []
      ).map(
        (row) =>
          row.invoice_id
      )
    );

  // ==========================================================
  // SEARCH
  // ==========================================================

  const query =
    String(
      search || ""
    )
      .trim()
      .toLowerCase();

  // ==========================================================
  // ONLY UNASSIGNED BILLS
  // ==========================================================

  return safeInvoices.filter(
    (invoice) => {
      /*
       * CORE RULE:
       *
       * If invoice exists in
       * hisab_cycle_bills,
       * it is already assigned.
       *
       * Therefore it cannot appear
       * in the next cycle.
       */

      if (
        assignedInvoiceIds.has(
          invoice.id
        )
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        invoice.bill_number,
        invoice.company_name,
        invoice.customer_to,
        invoice.customer_site,
        invoice.bill_type,
      ]
        .map(
          (value) =>
            String(
              value || ""
            ).toLowerCase()
        )
        .join(" ");

      return searchable.includes(
        query
      );
    }
  );
}


// ============================================================
// CHECK IF BILLS ARE ALREADY ASSIGNED
// ============================================================

export async function getExistingCycleAssignments(
  invoiceIds
) {
  const ids = [
    ...new Set(
      (
        invoiceIds ||
        []
      ).filter(Boolean)
    ),
  ];

  if (!ids.length) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "hisab_cycle_bills"
    )
    .select(`
      id,
      cycle_id,
      invoice_id,
      created_at
    `)
    .in(
      "invoice_id",
      ids
    );

  if (error) {
    throw error;
  }

  return data || [];
}


// ============================================================
// ASSIGN BILLS TO CYCLE
// ============================================================
//
// This function is intentionally explicit.
//
// It does NOT run when an invoice is created.
//
// It runs only when the user selects bills
// and clicks "Add to Hisab Cycle".
//

export async function assignBillsToHisabCycle(
  cycleId,
  invoiceIds,
  userId
) {
  if (!cycleId) {
    throw new Error(
      "Cycle ID is required."
    );
  }

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const ids = [
    ...new Set(
      (
        invoiceIds ||
        []
      ).filter(Boolean)
    ),
  ];

  if (!ids.length) {
    throw new Error(
      "Please select at least one bill."
    );
  }

  // ==========================================================
  // CHECK CYCLE
  // ==========================================================

  const cycle =
    await getHisabCycle(
      cycleId,
      userId
    );

  if (
    cycle.status !==
    "open"
  ) {
    throw new Error(
      "Bills can only be added to an open Hisab Cycle."
    );
  }

  // ==========================================================
  // VERIFY BILL OWNERSHIP
  // ==========================================================

  const {
    data: ownedBills,
    error: ownedBillsError,
  } = await supabase
    .from(
      "invoices"
    )
    .select(`
      id,
      isdelete
    `)
    .eq(
      "user_id",
      userId
    )
    .eq(
      "isdelete",
      0
    )
    .in(
      "id",
      ids
    );

  if (ownedBillsError) {
    throw ownedBillsError;
  }

  const ownedIds =
    new Set(
      (
        ownedBills ||
        []
      ).map(
        (bill) =>
          bill.id
      )
    );

  const validIds =
    ids.filter(
      (id) =>
        ownedIds.has(id)
    );

  if (!validIds.length) {
    throw new Error(
      "No valid bills were found."
    );
  }

  // ==========================================================
  // CHECK EXISTING ASSIGNMENTS
  // ==========================================================

  const existingAssignments =
    await getExistingCycleAssignments(
      validIds
    );

  const alreadyAssigned =
    new Set(
      existingAssignments.map(
        (row) =>
          row.invoice_id
      )
    );

  const unassignedIds =
    validIds.filter(
      (id) =>
        !alreadyAssigned.has(
          id
        )
    );

  // ==========================================================
  // NOTHING TO ADD
  // ==========================================================

  if (!unassignedIds.length) {
    throw new Error(
      "All selected bills are already assigned to a Hisab Cycle."
    );
  }

  // ==========================================================
  // INSERT REFERENCES
  // ==========================================================

  const rows =
    unassignedIds.map(
      (invoiceId) => ({
        cycle_id:
          cycleId,

        invoice_id:
          invoiceId,
      })
    );

  const {
    data,
    error,
  } = await supabase
    .from(
      "hisab_cycle_bills"
    )
    .insert(rows)
    .select(`
      id,
      cycle_id,
      invoice_id,
      created_at
    `);

  if (error) {
    /*
     * If the database has the unique
     * invoice_id index, another tab/browser
     * may have assigned one of these bills
     * at the same time.
     */

    if (
      error.code ===
      "23505"
    ) {
      throw new Error(
        "One or more selected bills were already assigned to another Hisab Cycle."
      );
    }

    throw error;
  }

  return data || [];
}


// ============================================================
// REMOVE BILL FROM CYCLE
// ============================================================
//
// Only OPEN cycles can be modified.
//
// Settled cycles are historical records.
//

export async function removeBillFromHisabCycle(
  cycleId,
  invoiceId,
  userId
) {
  if (!cycleId) {
    throw new Error(
      "Cycle ID is required."
    );
  }

  if (!invoiceId) {
    throw new Error(
      "Invoice ID is required."
    );
  }

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const cycle =
    await getHisabCycle(
      cycleId,
      userId
    );

  if (
    cycle.status !==
    "open"
  ) {
    throw new Error(
      "A settled Hisab Cycle cannot be changed."
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "hisab_cycle_bills"
    )
    .delete()
    .eq(
      "cycle_id",
      cycleId
    )
    .eq(
      "invoice_id",
      invoiceId
    );

  if (error) {
    throw error;
  }

  return true;
}


// ============================================================
// GET CYCLE TOTALS
// ============================================================

export async function getHisabCycleTotals(
  cycleId,
  userId
) {
  if (!cycleId) {
    throw new Error(
      "Cycle ID is required."
    );
  }

  const [
    bills,
    payments,
  ] =
    await Promise.all([
      getHisabCycleBills(
        cycleId,
        userId
      ),

      getHisabCyclePayments(
        cycleId,
        userId
      ),
    ]);

  const billingAmount =
    bills.reduce(
      (
        total,
        bill
      ) =>
        total +
        (
          Number(
            bill.grand_total
          ) || 0
        ),
      0
    );

  const receivedAmount =
    payments.reduce(
      (
        total,
        payment
      ) =>
        total +
        (
          Number(
            payment.amount
          ) || 0
        ),
      0
    );

  const balance =
    billingAmount -
    receivedAmount;

  return {
    billingAmount,

    receivedAmount,

    balance,

    /*
     * Positive balance:
     * office still owes billing amount.
     *
     * Negative balance:
     * received more than billing.
     */

    extraPayment:
      balance < 0
        ? Math.abs(
            balance
          )
        : 0,

    billCount:
      bills.length,

    paymentCount:
      payments.length,

    bills,

    payments,
  };
}


// ============================================================
// GET COMPLETE CYCLE
// ============================================================

export async function getHisabCycleDetails(
  cycleId,
  userId
) {
  const cycle =
    await getHisabCycle(
      cycleId,
      userId
    );

  const totals =
    await getHisabCycleTotals(
      cycleId,
      userId
    );

  return {
    ...cycle,

    ...totals,
  };
}


// ============================================================
// DELETE CYCLE
// ============================================================
//
// Normally we should NOT delete Hisab cycles.
//
// Historical cycles should remain.
//
// This function is intentionally NOT exported.
// ============================================================


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  getHisabCycles,

  getHisabCycle,

  getOpenHisabCycle,

  getNextHisabCycleNumber,

  createHisabCycle,

  getOrCreateOpenHisabCycle,

  settleHisabCycle,

  updateHisabCycleNotes,

  getHisabCycleBillReferences,

  getHisabCycleBills,

  getHisabCyclePaymentReferences,

  getHisabCyclePayments,

  getUnassignedHisabBills,

  getExistingCycleAssignments,

  assignBillsToHisabCycle,

  removeBillFromHisabCycle,

  getHisabCycleTotals,

  getHisabCycleDetails,
};