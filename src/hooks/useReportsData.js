import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import {
  firstDayOfYear,
  today,
} from "../utils/reportHelpers";

// ============================================================
// PERSISTENT REPORT FILTER STORAGE
// ============================================================

const REPORT_FILTER_STORAGE_KEY =
  "billing_reports_filters";

// ============================================================
// EMPTY RECEIVED PAYMENT FORM
// ============================================================

const emptyPaymentForm = () => ({
  companyName: "",
  paymentDate: today(),
  amount: "",
  notes: "",
  cycleId: "",
});

// ============================================================
// GET SAVED REPORT FILTERS
// ============================================================

function getSavedReportFilters() {
  try {
    const saved = localStorage.getItem(
      REPORT_FILTER_STORAGE_KEY
    );

    if (!saved) {
      return {
        companyFilter: "all",
        billTypeFilter: "all",
      };
    }

    const parsed = JSON.parse(saved);

    return {
      companyFilter:
        parsed?.companyFilter || "all",

      billTypeFilter:
        parsed?.billTypeFilter || "all",
    };
  } catch (error) {
    console.warn(
      "Could not read saved report filters:",
      error
    );

    return {
      companyFilter: "all",
      billTypeFilter: "all",
    };
  }
}

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
// REPORTS DATA HOOK
// ============================================================

export function useReportsData(profile) {
  // ==========================================================
  // MAIN DATA
  // ==========================================================

  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(true);

  // Prevent data refreshes after add/remove/edit actions from
  // replacing the entire Reports page with the initial loading view.
  const hasLoadedOnce = useRef(false);

  const [savingPayment, setSavingPayment] =
    useState(false);

  const [message, setMessage] = useState("");

  // ==========================================================
  // REMEMBERED FILTERS
  // ==========================================================

  const savedFilters = getSavedReportFilters();

  // ==========================================================
  // BILL FILTERS
  // ==========================================================

  const [search, setSearch] = useState("");

  const [companyFilter, setCompanyFilter] =
    useState(savedFilters.companyFilter);

  const [billTypeFilter, setBillTypeFilter] =
    useState(savedFilters.billTypeFilter);

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [invoiceFrom, setInvoiceFrom] =
    useState(firstDayOfYear());

  const [invoiceTo, setInvoiceTo] =
    useState(today());

  // ==========================================================
  // PAYMENT DATE FILTER
  // ==========================================================

  const [paymentMode, setPaymentMode] =
    useState("upto-end");

  const [paymentFrom, setPaymentFrom] =
    useState(firstDayOfYear());

  const [paymentTo, setPaymentTo] =
    useState(today());

  // ==========================================================
  // RECEIVED PAYMENT FORM
  // ==========================================================

  const [showPaymentForm, setShowPaymentForm] =
    useState(false);

  const [editingPaymentId, setEditingPaymentId] =
    useState(null);

  const [paymentForm, setPaymentForm] =
    useState(emptyPaymentForm());

  // ==========================================================
  // HISAB CYCLE DATA
  // ==========================================================

  const [cycles, setCycles] = useState([]);

  const [activeCycle, setActiveCycle] =
    useState(null);

  const [loadingCycles, setLoadingCycles] =
    useState(false);

  const [savingCycle, setSavingCycle] =
    useState(false);

  // ==========================================================
  // SAVE COMPANY + BILL TYPE FILTER
  // ==========================================================

  useEffect(() => {
    try {
      localStorage.setItem(
        REPORT_FILTER_STORAGE_KEY,
        JSON.stringify({
          companyFilter,
          billTypeFilter,
        })
      );
    } catch (error) {
      console.warn(
        "Could not save report filters:",
        error
      );
    }
  }, [
    companyFilter,
    billTypeFilter,
  ]);

  // ==========================================================
  // LOAD CYCLE REFERENCES
  //
  // This is the important missing part.
  //
  // hisab_cycles
  //       ↓
  // hisab_cycle_bills
  //       ↓
  // invoices
  //
  // hisab_cycles
  //       ↓
  // hisab_cycle_payments
  //       ↓
  // received_payments
  // ==========================================================

  const loadCycleReferences =
    useCallback(
      async (
        cycleList,
        invoiceList,
        paymentList
      ) => {
        if (!profile?.id) {
          return {
            billsWithCycles: invoiceList || [],
            paymentsWithCycles: paymentList || [],
            cyclesWithCounts:
              cycleList || [],
          };
        }

        const safeCycles =
          cycleList || [];

        const safeInvoices =
          invoiceList || [];

        const safePayments =
          paymentList || [];

        if (!safeCycles.length) {
          return {
            billsWithCycles:
              safeInvoices,
            paymentsWithCycles:
              safePayments,
            cyclesWithCounts: [],
          };
        }

        const cycleIds =
          safeCycles.map(
            (cycle) => cycle.id
          );

        // ====================================================
        // LOAD BILL REFERENCES
        // ====================================================

        const {
          data: cycleBillRows,
          error: cycleBillError,
        } = await supabase
          .from("hisab_cycle_bills")
          .select(`
            id,
            cycle_id,
            invoice_id,
            created_at
          `)
          .in(
            "cycle_id",
            cycleIds
          );

        if (cycleBillError) {
          throw cycleBillError;
        }

        // ====================================================
        // LOAD PAYMENT REFERENCES
        // ====================================================

        const {
          data: cyclePaymentRows,
          error: cyclePaymentError,
        } = await supabase
          .from("hisab_cycle_payments")
          .select(`
            id,
            cycle_id,
            payment_id,
            created_at
          `)
          .in(
            "cycle_id",
            cycleIds
          );

        if (cyclePaymentError) {
          throw cyclePaymentError;
        }

        // ====================================================
        // MAP ID → CYCLE
        // ====================================================

        const cycleById =
          new Map();

        safeCycles.forEach(
          (cycle) => {
            cycleById.set(
              cycle.id,
              cycle
            );
          }
        );

        const invoiceCycleMap =
          new Map();

        (
          cycleBillRows || []
        ).forEach((row) => {
          const cycle =
            cycleById.get(
              row.cycle_id
            );

          if (!cycle) return;

          invoiceCycleMap.set(
            row.invoice_id,
            {
              cycle_id:
                cycle.id,

              cycle_number:
                cycle.cycle_number,

              cycle_status:
                cycle.status,

              cycle_started_at:
                cycle.started_at,

              cycle_settled_at:
                cycle.settled_at,
            }
          );
        });

        const paymentCycleMap =
          new Map();

        (
          cyclePaymentRows || []
        ).forEach((row) => {
          const cycle =
            cycleById.get(
              row.cycle_id
            );

          if (!cycle) return;

          paymentCycleMap.set(
            row.payment_id,
            {
              cycle_id:
                cycle.id,

              cycle_number:
                cycle.cycle_number,

              cycle_status:
                cycle.status,

              cycle_started_at:
                cycle.started_at,

              cycle_settled_at:
                cycle.settled_at,
            }
          );
        });

        // ====================================================
        // ATTACH CYCLE INFORMATION TO BILLS
        // ====================================================

        const billsWithCycles =
          safeInvoices.map(
            (invoice) => {
              const cycle =
                invoiceCycleMap.get(
                  invoice.id
                );

              return {
                ...invoice,

                cycle_id:
                  cycle?.cycle_id ||
                  null,

                cycle_number:
                  cycle?.cycle_number ||
                  null,

                cycle_status:
                  cycle?.cycle_status ||
                  null,

                cycle_started_at:
                  cycle?.cycle_started_at ||
                  null,

                cycle_settled_at:
                  cycle?.cycle_settled_at ||
                  null,
              };
            }
          );

        // ====================================================
        // ATTACH CYCLE INFORMATION TO PAYMENTS
        // ====================================================

        const paymentsWithCycles =
          safePayments.map(
            (payment) => {
              const cycle =
                paymentCycleMap.get(
                  payment.id
                );

              return {
                ...payment,

                cycle_id:
                  cycle?.cycle_id ||
                  null,

                cycle_number:
                  cycle?.cycle_number ||
                  null,

                cycle_status:
                  cycle?.cycle_status ||
                  null,

                cycle_started_at:
                  cycle?.cycle_started_at ||
                  null,

                cycle_settled_at:
                  cycle?.cycle_settled_at ||
                  null,
              };
            }
          );

        // ====================================================
        // CALCULATE COUNTS FOR EACH CYCLE
        // ====================================================

        const cyclesWithCounts =
          safeCycles.map(
            (cycle) => {
              const cycleBills =
                (
                  cycleBillRows ||
                  []
                ).filter(
                  (row) =>
                    row.cycle_id ===
                    cycle.id
                );

              const cyclePayments =
                (
                  cyclePaymentRows ||
                  []
                ).filter(
                  (row) =>
                    row.cycle_id ===
                    cycle.id
                );

              const billIds =
                new Set(
                  cycleBills.map(
                    (row) =>
                      row.invoice_id
                  )
                );

              const paymentIds =
                new Set(
                  cyclePayments.map(
                    (row) =>
                      row.payment_id
                  )
                );

              const cycleBillRecords =
                safeInvoices.filter(
                  (invoice) =>
                    billIds.has(
                      invoice.id
                    )
                );

              const cyclePaymentRecords =
                safePayments.filter(
                  (payment) =>
                    paymentIds.has(
                      payment.id
                    )
                );

              const billingAmount =
                cycleBillRecords.reduce(
                  (
                    total,
                    invoice
                  ) =>
                    total +
                    (Number(
                      invoice.grand_total
                    ) || 0),
                  0
                );

              const receivedAmount =
                cyclePaymentRecords.reduce(
                  (
                    total,
                    payment
                  ) =>
                    total +
                    (Number(
                      payment.amount
                    ) || 0),
                  0
                );

              return {
                ...cycle,

                bills:
                  cycleBillRecords,

                payments:
                  cyclePaymentRecords,

                bill_count:
                  cycleBillRecords.length,

                payment_count:
                  cyclePaymentRecords.length,

                billing_amount:
                  billingAmount,

                received_amount:
                  receivedAmount,

                balance:
                  billingAmount -
                  receivedAmount,
              };
            }
          );

        return {
          billsWithCycles,
          paymentsWithCycles,
          cyclesWithCounts,
        };
      },
      [profile?.id]
    );

  // ==========================================================
  // LOAD CYCLES
  // ==========================================================

  const loadCycles =
    useCallback(
      async ({
        invoiceList = null,
        paymentList = null,
      } = {}) => {
        if (!profile?.id) {
          setCycles([]);
          setActiveCycle(null);

          return {
            cycles: [],
            activeCycle: null,
          };
        }

        setLoadingCycles(true);

        try {
          // ==================================================
          // LOAD CYCLES
          // ==================================================

          const {
            data,
            error,
          } = await supabase
            .from("hisab_cycles")
            .select(CYCLE_SELECT)
            .eq(
              "user_id",
              profile.id
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

          const cycleList =
            data || [];

          // ==================================================
          // USE PROVIDED DATA OR FETCH IT
          // ==================================================

          let invoices =
            invoiceList;

          let paymentsData =
            paymentList;

          if (
            !invoices ||
            !paymentsData
          ) {
            const [
              invoiceResult,
              paymentResult,
            ] = await Promise.all([
              supabase
                .from("invoices")
                .select(`
                  id,
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
                `)
                .eq(
                  "user_id",
                  profile.id
                )
                .eq(
                  "isdelete",
                  0
                ),

              supabase
                .from(
                  "received_payments"
                )
                .select(`
                  id,
                  user_id,
                  company_id,
                  payment_date,
                  amount,
                  payment_source,
                  notes,
                  created_at
                `)
                .eq(
                  "user_id",
                  profile.id
                ),
            ]);

            if (
              invoiceResult.error
            ) {
              throw invoiceResult.error;
            }

            if (
              paymentResult.error
            ) {
              throw paymentResult.error;
            }

            invoices =
              invoiceResult.data ||
              [];

            paymentsData =
              paymentResult.data ||
              [];
          }

          // ==================================================
          // ADD REFERENCES + COUNTS
          // ==================================================

          const {
            billsWithCycles,
            paymentsWithCycles,
            cyclesWithCounts,
          } =
            await loadCycleReferences(
              cycleList,
              invoices,
              paymentsData
            );

          // ==================================================
          // SET BILL / PAYMENT STATE
          // ==================================================

          if (
            invoiceList === null
          ) {
            setBills(
              billsWithCycles
            );
          }

          if (
            paymentList === null
          ) {
            setPayments(
              paymentsWithCycles
            );
          }

          setCycles(
            cyclesWithCounts
          );

          // ==================================================
          // FIND CURRENT OPEN CYCLE
          // ==================================================

          const openCycles =
            cyclesWithCounts.filter(
              (cycle) =>
                cycle.status ===
                "open"
            );

          /*
           * Normally there must be only
           * one open cycle.
           *
           * If old/manual data has more
           * than one, use the oldest one.
           */

          const currentOpenCycle =
            [...openCycles].sort(
              (a, b) =>
                new Date(
                  a.started_at
                ) -
                new Date(
                  b.started_at
                )
            )[0] || null;

          setActiveCycle(
            currentOpenCycle
          );

          return {
            cycles:
              cyclesWithCounts,

            activeCycle:
              currentOpenCycle,

            bills:
              billsWithCycles,

            payments:
              paymentsWithCycles,
          };
        } catch (error) {
          console.error(
            "Hisab cycle load error:",
            error
          );

          setMessage(
            `Failed to load hisab cycles: ${
              error?.message ||
              "Unknown error"
            }`
          );

          return {
            cycles: [],
            activeCycle: null,
            bills: [],
            payments: [],
          };
        } finally {
          setLoadingCycles(false);
        }
      },
      [
        profile?.id,
        loadCycleReferences,
      ]
    );

  // ==========================================================
  // GET / CREATE CURRENT OPEN CYCLE
  // ==========================================================

  const getOrCreateOpenCycle =
    useCallback(
      async () => {
        if (!profile?.id) {
          throw new Error(
            "User is not logged in."
          );
        }

        // ----------------------------------------------------
        // CHECK EXISTING OPEN CYCLE
        // ----------------------------------------------------

        const {
          data: openCycles,
          error: openError,
        } = await supabase
          .from("hisab_cycles")
          .select(CYCLE_SELECT)
          .eq(
            "user_id",
            profile.id
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

        if (openError) {
          throw openError;
        }

        if (
          openCycles &&
          openCycles.length > 0
        ) {
          const existing =
            openCycles[0];

          setActiveCycle(
            existing
          );

          return existing;
        }

        // ----------------------------------------------------
        // FIND LAST CYCLE NUMBER
        // ----------------------------------------------------

        const {
          data: latestCycles,
          error: latestError,
        } = await supabase
          .from("hisab_cycles")
          .select(
            "cycle_number"
          )
          .eq(
            "user_id",
            profile.id
          )
          .order(
            "cycle_number",
            {
              ascending: false,
            }
          )
          .limit(1);

        if (latestError) {
          throw latestError;
        }

        const highestCycleNumber =
          Number(
            latestCycles?.[0]
              ?.cycle_number || 0
          );

        const nextCycleNumber =
          highestCycleNumber + 1;

        // ----------------------------------------------------
        // CREATE NEXT CYCLE
        // ----------------------------------------------------

        const {
          data: newCycle,
          error: createError,
        } = await supabase
          .from("hisab_cycles")
          .insert({
            user_id:
              profile.id,

            cycle_number:
              nextCycleNumber,

            client_name: "General",

            status:
              "open",

            started_at:
              new Date().toISOString(),
          })
          .select(CYCLE_SELECT)
          .single();

        if (createError) {
          throw createError;
        }

        setActiveCycle(
          newCycle
        );

        return newCycle;
      },
      [profile?.id]
    );

  // ==========================================================
  // LOAD ALL REPORT DATA
  // ==========================================================

  const loadData =
    useCallback(
      async () => {
        if (!profile?.id) {
          setLoading(false);
          return;
        }

        if (!hasLoadedOnce.current) {
          setLoading(true);
        }
        setMessage("");

        try {
          const [
            invoiceResult,
            paymentResult,
            companyResult,
          ] = await Promise.all([
            // ================================================
            // INVOICES
            // ================================================

            supabase
              .from("invoices")
              .select(`
                id,
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
              `)
              .eq(
                "user_id",
                profile.id
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
              ),

            // ================================================
            // RECEIVED PAYMENTS
            // ================================================

            supabase
              .from(
                "received_payments"
              )
              .select(`
                id,
                user_id,
                company_id,
                payment_date,
                amount,
                payment_source,
                notes,
                created_at
              `)
              .eq(
                "user_id",
                profile.id
              )
              .order(
                "payment_date",
                {
                  ascending: true,
                }
              ),

            // ================================================
            // COMPANIES
            // ================================================

            supabase
              .from("companies")
              .select(
                "id, company_name"
              )
              .eq(
                "user_id",
                profile.id
              )
              .order(
                "company_name",
                {
                  ascending: true,
                }
              ),
          ]);

          // ==================================================
          // ERRORS
          // ==================================================

          if (
            invoiceResult.error
          ) {
            throw invoiceResult.error;
          }

          if (
            paymentResult.error
          ) {
            throw paymentResult.error;
          }

          if (
            companyResult.error
          ) {
            throw companyResult.error;
          }

          const invoiceList =
            invoiceResult.data ||
            [];

          const paymentList =
            paymentResult.data ||
            [];

          const companyList =
            companyResult.data ||
            [];

          // ==================================================
          // LOAD CYCLES + REFERENCES
          // ==================================================

          const cycleResult =
            await loadCycles({
              invoiceList,
              paymentList,
            });

          // ==================================================
          // IMPORTANT:
          // loadCycles() receives the actual lists and
          // therefore we explicitly store the enriched
          // versions returned by it.
          // ==================================================

          setBills(
            cycleResult.bills ||
              invoiceList
          );

          setPayments(
            cycleResult.payments ||
              paymentList
          );

          setCompanies(
            companyList
          );
        } catch (error) {
          console.error(
            "Reports load error:",
            error
          );

          setMessage(
            `Failed to load report data: ${
              error?.message ||
              "Unknown error"
            }`
          );
        } finally {
          hasLoadedOnce.current = true;
          setLoading(false);
        }
      },
      [
        profile?.id,
        loadCycles,
      ]
    );

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================================
  // OPEN NEW PAYMENT FORM
  // ==========================================================

  function openAddPaymentForm() {
    setEditingPaymentId(null);

    setPaymentForm(
      emptyPaymentForm()
    );

    setShowPaymentForm(true);
  }

  // ==========================================================
  // OPEN EDIT PAYMENT FORM
  // ==========================================================

  function openEditPaymentForm(
    payment
  ) {
    if (!payment) {
      return;
    }

    setEditingPaymentId(
      payment.id
    );

    setPaymentForm({
      companyName: String(
        payment?.payment_source ||
          ""
      ).trim(),

      paymentDate: String(
        payment?.payment_date ||
          today()
      ).slice(0, 10),

      amount: String(
        payment?.amount ?? ""
      ),

      notes:
        payment?.notes || "",
      cycleId: String(payment?.cycle_id || ""),
    });

    setShowPaymentForm(true);
  }

  // ==========================================================
  // CLOSE PAYMENT FORM
  // ==========================================================

  function closePaymentForm() {
    if (savingPayment) {
      return;
    }

    setShowPaymentForm(false);

    setEditingPaymentId(null);

    setPaymentForm(
      emptyPaymentForm()
    );
  }

  // ==========================================================
  // SAVE / UPDATE RECEIVED PAYMENT
  // ==========================================================

  async function saveReceivedPayment(
    event
  ) {
    event.preventDefault();

    setMessage("");

    const amount = Number(
      paymentForm.amount || 0
    );

    const enteredCompany =
      String(
        paymentForm.companyName || ""
      ).trim();

    if (!enteredCompany) {
      setMessage(
        "Please enter a company or received-from name, for example BOB."
      );

      return;
    }

    if (!paymentForm.paymentDate) {
      setMessage(
        "Please select payment date."
      );

      return;
    }

    if (!(amount > 0)) {
      setMessage(
        "Payment amount must be greater than 0."
      );

      return;
    }

    // ========================================================
    // FIND COMPANY
    // ========================================================

    const matchedCompany =
      companies.find(
        (company) =>
          String(
            company?.company_name ||
              ""
          )
            .trim()
            .toLowerCase() ===
          enteredCompany.toLowerCase()
      );

    setSavingPayment(true);

    try {
      const paymentData = {
        company_id:
          matchedCompany?.id ||
          null,

        payment_date:
          paymentForm.paymentDate,

        amount,

        payment_source:
          enteredCompany,

        notes:
          String(
            paymentForm.notes || ""
          ).trim() || null,
      };

      // ======================================================
      // UPDATE EXISTING PAYMENT
      // ======================================================

      if (editingPaymentId) {
        const {
          error,
        } = await supabase
          .from(
            "received_payments"
          )
          .update(paymentData)
          .eq(
            "id",
            editingPaymentId
          )
          .eq(
            "user_id",
            profile.id
          );

        if (error) {
          throw error;
        }

        /*
         * IMPORTANT:
         * Existing payment's cycle is NOT changed.
         */

        setMessage(
          "Received payment updated successfully."
        );
      }

      // ======================================================
      // CREATE NEW PAYMENT
      // ======================================================

      else {
        /*
         * Only create/get an open cycle for
         * a NEW payment.
         *
         * Editing an old payment must not
         * accidentally create Cycle 2.
         */

        let cycle = null;
        if (paymentForm.cycleId) {
          const { data: chosenCycle, error: chosenCycleError } = await supabase
            .from("hisab_cycles")
            .select(CYCLE_SELECT)
            .eq("id", paymentForm.cycleId)
            .eq("user_id", profile.id)
            .single();
          if (chosenCycleError) throw chosenCycleError;
          if (!chosenCycle || chosenCycle.status !== "open") {
            throw new Error("Choose an active Hisab cycle. Closed cycles cannot receive new payments.");
          }
          cycle = chosenCycle;
        } else {
          cycle = await getOrCreateOpenCycle();
        }

        const {
          data: insertedPayment,
          error,
        } = await supabase
          .from(
            "received_payments"
          )
          .insert({
            user_id:
              profile.id,

            ...paymentData,
          })
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        // ====================================================
        // ATTACH PAYMENT TO CURRENT CYCLE
        // ====================================================

        const {
          error:
            cyclePaymentError,
        } = await supabase
          .from(
            "hisab_cycle_payments"
          )
          .insert({
            cycle_id:
              cycle.id,

            payment_id:
              insertedPayment.id,
          });

        if (
          cyclePaymentError
        ) {
          /*
           * Roll back newly created payment
           * if cycle reference fails.
           */

          await supabase
            .from(
              "received_payments"
            )
            .delete()
            .eq(
              "id",
              insertedPayment.id
            )
            .eq(
              "user_id",
              profile.id
            );

          throw cyclePaymentError;
        }

        setMessage(
          `Received payment saved to Hisab Cycle ${cycle.cycle_number}.`
        );
      }

      // ======================================================
      // RESET FORM
      // ======================================================

      setShowPaymentForm(false);

      setEditingPaymentId(null);

      setPaymentForm(
        emptyPaymentForm()
      );

      // ======================================================
      // REFRESH
      // ======================================================

      await loadData();
    } catch (error) {
      console.error(
        "Payment save/update error:",
        error
      );

      setMessage(
        `${
          editingPaymentId
            ? "Failed to update received payment"
            : "Failed to save received payment"
        }: ${
          error?.message ||
          "Unknown error"
        }`
      );
    } finally {
      setSavingPayment(false);
    }
  }

  // ==========================================================
  // DELETE RECEIVED PAYMENT
  // ==========================================================

  async function deletePayment(
    id
  ) {
    if (!id) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this received payment permanently?"
      );

    if (!confirmed) {
      return;
    }

    try {
      // ------------------------------------------------------
      // REMOVE CYCLE REFERENCE FIRST
      // ------------------------------------------------------

      const {
        error:
          cyclePaymentError,
      } = await supabase
        .from(
          "hisab_cycle_payments"
        )
        .delete()
        .eq(
          "payment_id",
          id
        );

      if (
        cyclePaymentError
      ) {
        throw cyclePaymentError;
      }

      // ------------------------------------------------------
      // DELETE PAYMENT
      // ------------------------------------------------------

      const { error } =
        await supabase
          .from(
            "received_payments"
          )
          .delete()
          .eq(
            "id",
            id
          )
          .eq(
            "user_id",
            profile.id
          );

      if (error) {
        throw error;
      }

      setMessage(
        "Received payment deleted successfully."
      );

      await loadData();
    } catch (error) {
      console.error(
        "Payment delete error:",
        error
      );

      setMessage(
        `Failed to delete payment: ${
          error?.message ||
          "Unknown error"
        }`
      );
    }
  }

  // ==========================================================
  // SETTLE HISAB CYCLE
  // ==========================================================

  const settleHisabCycle =
    useCallback(
      async (cycleId = null) => {
        if (!profile?.id) {
          return;
        }

        const targetCycleId =
          cycleId ||
          activeCycle?.id;

        if (!targetCycleId) {
          setMessage(
            "No open Hisab Cycle found."
          );

          return;
        }

        const cycle =
          cycles.find(
            (item) =>
              item.id ===
              targetCycleId
          );

        if (
          cycle &&
          cycle.status !==
            "open"
        ) {
          setMessage(
            "This Hisab Cycle is already settled."
          );

          return;
        }

        const confirmed =
          window.confirm(
            `Settle Hisab Cycle ${
              cycle?.cycle_number ??
              ""
            }?\n\n` +
              "This will close this cycle.\n" +
              "Existing bills and payments will remain in history.\n\n" +
              "New bills and payments will start the next cycle."
          );

        if (!confirmed) {
          return;
        }

        setSavingCycle(true);

        try {
          const {
            error,
          } = await supabase
            .from(
              "hisab_cycles"
            )
            .update({
              status:
                "settled",

              settled_at:
                new Date().toISOString(),

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              targetCycleId
            )
            .eq(
              "user_id",
              profile.id
            )
            .eq(
              "status",
              "open"
            );

          if (error) {
            throw error;
          }

          setMessage(
            `Hisab Cycle ${
              cycle?.cycle_number ??
              ""
            } settled successfully.`
          );

          await loadData();
        } catch (error) {
          console.error(
            "Settle Hisab error:",
            error
          );

          setMessage(
            `Failed to settle Hisab Cycle: ${
              error?.message ||
              "Unknown error"
            }`
          );
        } finally {
          setSavingCycle(false);
        }
      },
      [
        profile?.id,
        activeCycle,
        cycles,
        loadData,
      ]
    );

  // ==========================================================
  // RESET CURRENT FILTERS
  // ==========================================================

  function resetFilters() {
    setSearch("");

    /*
     * Company and Bill Type intentionally
     * remain unchanged.
     */

    setStatusFilter("all");

    setInvoiceFrom(
      firstDayOfYear()
    );

    setInvoiceTo(
      today()
    );

    setPaymentMode(
      "upto-end"
    );

    setPaymentFrom(
      firstDayOfYear()
    );

    setPaymentTo(
      today()
    );
  }

  // ==========================================================
  // FORGET SAVED COMPANY / BILL TYPE FILTERS
  // ==========================================================

  function clearSavedReportFilters() {
    try {
      localStorage.removeItem(
        REPORT_FILTER_STORAGE_KEY
      );
    } catch (error) {
      console.warn(
        "Could not clear saved report filters:",
        error
      );
    }

    setCompanyFilter("all");
    setBillTypeFilter("all");
  }

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    // --------------------------------------------------------
    // DATA
    // --------------------------------------------------------

    bills,
    payments,
    companies,

    // --------------------------------------------------------
    // HISAB CYCLES
    // --------------------------------------------------------

    cycles,

    activeCycle,

    loadingCycles,

    savingCycle,

    loadCycles,

    getOrCreateOpenCycle,

    settleHisabCycle,

    // --------------------------------------------------------
    // LOADING / MESSAGE
    // --------------------------------------------------------

    loading,

    savingPayment,

    message,

    setMessage,

    // --------------------------------------------------------
    // BILL FILTERS
    // --------------------------------------------------------

    search,
    setSearch,

    companyFilter,
    setCompanyFilter,

    billTypeFilter,
    setBillTypeFilter,

    statusFilter,
    setStatusFilter,

    invoiceFrom,
    setInvoiceFrom,

    invoiceTo,
    setInvoiceTo,

    // --------------------------------------------------------
    // PAYMENT FILTERS
    // --------------------------------------------------------

    paymentMode,
    setPaymentMode,

    paymentFrom,
    setPaymentFrom,

    paymentTo,
    setPaymentTo,

    // --------------------------------------------------------
    // PAYMENT FORM
    // --------------------------------------------------------

    showPaymentForm,

    editingPaymentId,

    paymentForm,

    setPaymentForm,

    // --------------------------------------------------------
    // PAYMENT ACTIONS
    // --------------------------------------------------------

    openAddPaymentForm,

    openEditPaymentForm,

    closePaymentForm,

    saveReceivedPayment,

    deletePayment,

    // --------------------------------------------------------
    // FILTER ACTIONS
    // --------------------------------------------------------

    resetFilters,

    clearSavedReportFilters,

    // --------------------------------------------------------
    // DATA ACTIONS
    // --------------------------------------------------------

    loadData,
  };
}