import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import "./Reports.css";
import "./Reports.components.css";
import "./Reports.hisab-filters.css";

import { useReportsData } from "../hooks/useReportsData";

import { allocatePaymentsToBills } from "../utils/reportCalculations";

import {
  exportBillingExcel,
  exportReceivedPaymentExcel,
  exportReceivedPaymentPdf,
  exportUnpaidPdf,
  exportHisabCyclePdf,
  exportHisabCycleExcel,
} from "../utils/reportExports";

import ReportsHeader from "../components/ReportsHeader";
import ReportsFilters from "../components/ReportsFilters";
import ReportsSummary from "../components/ReportsSummary";
import PaymentAnalysis from "../components/PaymentAnalysis";
import BillPaymentStatusTable from "../components/BillPaymentStatusTable";
import ReceivedPaymentSection from "../components/ReceivedPaymentSection";
import ReceivedPaymentModal from "../components/ReceivedPaymentModal";
import FinalBillingSummary from "../components/FinalBillingSummary";
import ReportsTabs from "../components/ReportsTabs";

export default function Reports({ profile }) {
  const data = useReportsData(profile);

  const {
    bills,
    payments,
    companies,

    loading,
    savingPayment,

    message,
    setMessage,

    search,
    setSearch,

    // Company and bill-type multi-select filters are local to Reports.jsx.
    // They intentionally do not control Received Payment or Hisab tabs.

    statusFilter,
    setStatusFilter,

    invoiceFrom,
    setInvoiceFrom,

    invoiceTo,
    setInvoiceTo,

    paymentMode,
    setPaymentMode,

    paymentFrom,
    setPaymentFrom,

    paymentTo,
    setPaymentTo,

    showPaymentForm,
    editingPaymentId,

    paymentForm,
    setPaymentForm,

    openAddPaymentForm,
    openEditPaymentForm,
    closePaymentForm,

    saveReceivedPayment,
    deletePayment,

    resetFilters,
    loadData,

    cycles,
    activeCycle,
    loadingCycles,
    savingCycle,
    loadCycles,
  } = data;

  const [exporting, setExporting] =
    useState(false);

  // Empty arrays mean "All". These multi-select filters are used only
  // by Overview and Bills.
  const [companyFilter, setCompanyFilter] = useState([]);
  const [billTypeFilter, setBillTypeFilter] = useState([]);

  function handleResetReportFilters() {
    resetFilters();
    setCompanyFilter([]);
    setBillTypeFilter([]);
  }

  // Remember each cycle's custom bill order in this browser. The same ordered
  // cycleBills array is used by the on-screen table and PDF/Excel exports.
  const HISAB_BILL_ORDER_STORAGE_KEY =
    `billing_hisab_bill_order_${profile?.id || "guest"}`;

  const [hisabBillOrderByCycle, setHisabBillOrderByCycle] = useState(() => {
    try {
      const saved = localStorage.getItem(
        `billing_hisab_bill_order_${profile?.id || "guest"}`
      );
      const parsed = saved ? JSON.parse(saved) : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        HISAB_BILL_ORDER_STORAGE_KEY,
        JSON.stringify(hisabBillOrderByCycle)
      );
    } catch (error) {
      console.warn("Could not save custom Hisab bill order:", error);
    }
  }, [HISAB_BILL_ORDER_STORAGE_KEY, hisabBillOrderByCycle]);

  const REPORT_TAB_STORAGE_KEY =
    `billing_reports_active_tab_${profile?.id || "guest"}`;

  const REPORT_SCROLL_STORAGE_KEY =
    `billing_reports_scroll_${profile?.id || "guest"}`;

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem(
        `billing_reports_active_tab_${profile?.id || "guest"}`
      );
      return ["overview", "bills", "payments", "hisab"].includes(savedTab)
        ? savedTab
        : "overview";
    } catch {
      return "overview";
    }
  });

  // Remember the selected Reports tab across reloads.
  useEffect(() => {
    try {
      localStorage.setItem(
        REPORT_TAB_STORAGE_KEY,
        activeTab
      );
    } catch (error) {
      console.warn("Could not persist Reports tab:", error);
    }
  }, [REPORT_TAB_STORAGE_KEY, activeTab]);

  // Save the page scroll position so refreshing Reports does not
  // unexpectedly return the user to the top of the page.
  useEffect(() => {
    const saveScrollPosition = () => {
      try {
        sessionStorage.setItem(
          REPORT_SCROLL_STORAGE_KEY,
          String(window.scrollY || window.pageYOffset || 0)
        );
      } catch {
        // Storage can be unavailable in private/restricted contexts.
      }
    };

    window.addEventListener("scroll", saveScrollPosition, {
      passive: true,
    });

    return () => {
      saveScrollPosition();
      window.removeEventListener("scroll", saveScrollPosition);
    };
  }, [REPORT_SCROLL_STORAGE_KEY]);

  // Restore scroll only after the initial report load finishes.
  // Subsequent bill/payment actions no longer replace the whole page
  // with the loading screen, so scroll position stays in place.
  useEffect(() => {
    if (loading) return;

    let savedPosition = 0;
    try {
      savedPosition = Number(
        sessionStorage.getItem(REPORT_SCROLL_STORAGE_KEY) || 0
      );
    } catch {
      savedPosition = 0;
    }

    if (!Number.isFinite(savedPosition) || savedPosition < 0) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: savedPosition,
        left: 0,
        behavior: "auto",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [loading, REPORT_SCROLL_STORAGE_KEY]);
  const [newHisabClient, setNewHisabClient] = useState("");
  const [creatingHisabCycle, setCreatingHisabCycle] = useState(false);
  const [selectedHisabBillIds, setSelectedHisabBillIds] = useState([]);
  // Filters for the unassigned bills picker inside Hisab cycles.
  const [hisabBillSearch, setHisabBillSearch] = useState("");
  const [hisabBillStatusFilter, setHisabBillStatusFilter] = useState("unpaid");
  const [hisabBillCompanyFilter, setHisabBillCompanyFilter] = useState("all");
  const [hisabBillTypeFilter, setHisabBillTypeFilter] = useState("all");

  /*
   * ============================================================
   * SELECTED HISAB CYCLE FOR RECEIVED PAYMENTS
   * ============================================================
   *
   * By default:
   *
   * Current open cycle
   *
   * Previous cycles are hidden until the user selects them.
   */

  const [selectedPaymentCycleId, setSelectedPaymentCycleId] =
    useState("");

  /*
   * When the current open cycle changes,
   * automatically select it.
   */

  useEffect(() => {
    // Choose the default open cycle only once. Do not override
    // a client/cycle explicitly selected by the user.
    if (activeCycle?.id && !selectedPaymentCycleId) {
      setSelectedPaymentCycleId(activeCycle.id);
    }
  }, [activeCycle?.id, selectedPaymentCycleId]);

  /*
   * If there is no open cycle, select
   * the newest cycle from history.
   */

  useEffect(() => {
    if (
      activeCycle?.id ||
      selectedPaymentCycleId ||
      !cycles?.length
    ) {
      return;
    }

    const newestCycle =
      [...cycles].sort(
        (a, b) =>
          Number(b.cycle_number || 0) -
          Number(a.cycle_number || 0)
      )[0];

    if (newestCycle?.id) {
      setSelectedPaymentCycleId(
        newestCycle.id
      );
    }
  }, [
    activeCycle?.id,
    selectedPaymentCycleId,
    cycles,
  ]);

  /*
   * ============================================================
   * CYCLE REFERENCE TABLES
   * ============================================================
   */

  const [cycleBillLinks, setCycleBillLinks] =
    useState([]);

  const [cyclePaymentLinks, setCyclePaymentLinks] =
    useState([]);

  const [loadingCycleLinks, setLoadingCycleLinks] =
    useState(false);

  /*
   * ============================================================
   * LOAD CYCLE REFERENCES
   * ============================================================
   */

  async function loadCycleReferences() {
    if (!profile?.id) {
      setCycleBillLinks([]);
      setCyclePaymentLinks([]);
      return;
    }

    setLoadingCycleLinks(true);

    try {
      /*
       * --------------------------------------------------------
       * BILL LINKS
       * --------------------------------------------------------
       */

      const {
        data: billLinks,
        error: billLinksError,
      } = await supabase
        .from("hisab_cycle_bills")
        .select(`
          id,
          cycle_id,
          invoice_id,
          created_at
        `);

      if (billLinksError) {
        throw billLinksError;
      }

      /*
       * --------------------------------------------------------
       * PAYMENT LINKS
       * --------------------------------------------------------
       */

      const {
        data: paymentLinks,
        error: paymentLinksError,
      } = await supabase
        .from("hisab_cycle_payments")
        .select(`
          id,
          cycle_id,
          payment_id,
          created_at
        `);

      if (paymentLinksError) {
        throw paymentLinksError;
      }

      setCycleBillLinks(
        billLinks || []
      );

      setCyclePaymentLinks(
        paymentLinks || []
      );
    } catch (error) {
      console.error(
        "Cycle reference load error:",
        error
      );

      setMessage(
        `Failed to load hisab records: ${
          error?.message ||
          "Unknown error"
        }`
      );
    } finally {
      setLoadingCycleLinks(false);
    }
  }

  useEffect(() => {
    loadCycleReferences();
  }, [
    profile?.id,
    bills.length,
    payments.length,
  ]);

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   */

  async function refreshReports() {
    try {
      setMessage("");

      await loadData();
      await loadCycleReferences();

      if (typeof loadCycles === "function") {
        await loadCycles();
      }
    } catch (error) {
      console.error(
        "Reports refresh error:",
        error
      );
    }
  }

  /*
   * ============================================================
   * CYCLE MAP
   * ============================================================
   */

  const cycleMap = useMemo(() => {
    const map = new Map();

    for (const cycle of cycles || []) {
      map.set(cycle.id, cycle);
    }

    return map;
  }, [cycles]);

  /*
   * ============================================================
   * INVOICE -> CYCLE
   * ============================================================
   */

  const invoiceCycleMap = useMemo(() => {
    const map = new Map();

    for (const link of cycleBillLinks) {
      const cycle =
        cycleMap.get(link.cycle_id);

      if (!cycle) continue;

      map.set(
        link.invoice_id,
        cycle
      );
    }

    return map;
  }, [
    cycleBillLinks,
    cycleMap,
  ]);

  /*
   * ============================================================
   * PAYMENT -> CYCLE
   * ============================================================
   */

  const paymentCycleMap = useMemo(() => {
    const map = new Map();

    for (const link of cyclePaymentLinks) {
      const cycle =
        cycleMap.get(link.cycle_id);

      if (!cycle) continue;

      map.set(
        link.payment_id,
        cycle
      );
    }

    return map;
  }, [
    cyclePaymentLinks,
    cycleMap,
  ]);

  /*
   * ============================================================
   * BILLS WITH CYCLE
   * ============================================================
   */

  const billsWithCycle = useMemo(() => {
    return bills.map((bill) => {
      const cycle =
        invoiceCycleMap.get(
          bill.id
        );

      return {
        ...bill,

        cycle_id:
          cycle?.id || null,

        cycle_number:
          cycle?.cycle_number ?? null,

        cycle_status:
          cycle?.status || null,
      };
    });
  }, [
    bills,
    invoiceCycleMap,
  ]);

  /*
   * ============================================================
   * PAYMENTS WITH CYCLE
   * ============================================================
   */

  const paymentsWithCycle =
    useMemo(() => {
      return payments.map(
        (payment) => {
          const cycle =
            paymentCycleMap.get(
              payment.id
            );

          return {
            ...payment,

            cycle_id:
              cycle?.id || null,

            cycle_number:
              cycle?.cycle_number ??
              null,

            cycle_status:
              cycle?.status || null,
          };
        }
      );
    }, [
      payments,
      paymentCycleMap,
    ]);

  /*
   * ============================================================
   * COMPANY MAP
   * ============================================================
   */

  const companyMap = useMemo(
    () =>
      new Map(
        companies.map(
          (company) => [
            company.id,
            company.company_name,
          ]
        )
      ),
    [companies]
  );

  /*
   * ============================================================
   * PAYMENT COMPANY SUGGESTIONS
   * ============================================================
   */

  const paymentCompanySuggestions =
    useMemo(() => {
      const unique = new Map();

      for (const company of companies) {
        const value = String(
          company?.company_name || ""
        ).trim();

        if (value) {
          unique.set(
            value.toLowerCase(),
            value
          );
        }
      }

      for (const payment of payments) {
        const value = String(
          payment?.payment_source || ""
        ).trim();

        if (value) {
          unique.set(
            value.toLowerCase(),
            value
          );
        }
      }

      return Array.from(
        unique.values()
      ).sort((a, b) =>
        a.localeCompare(b)
      );
    }, [
      companies,
      payments,
    ]);

  /*
   * ============================================================
   * NORMAL BILL FILTER
   * ============================================================
   */

  const invoiceFilteredBills =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return billsWithCycle.filter(
        (bill) => {
          if (
            invoiceFrom &&
            String(
              bill.bill_date || ""
            ) < invoiceFrom
          ) {
            return false;
          }

          if (
            invoiceTo &&
            String(
              bill.bill_date || ""
            ) > invoiceTo
          ) {
            return false;
          }

          if (
            companyFilter.length > 0 &&
            !companyFilter.includes(bill.company_id)
          ) {
            return false;
          }

          if (
            billTypeFilter.length > 0 &&
            !billTypeFilter.includes(bill.bill_type)
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            bill.bill_number,
            bill.company_name,
            bill.customer_to,
            bill.customer_site,
            bill.bill_type,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      billsWithCycle,
      invoiceFrom,
      invoiceTo,
      companyFilter,
      billTypeFilter,
      search,
    ]);

  /*
   * ============================================================
   * NORMAL PAYMENT FILTER
   * ============================================================
   */

  const filteredPayments =
    useMemo(() => {
      return paymentsWithCycle.filter(
        (payment) => {
          if (
            paymentMode ===
            "report-range"
          ) {
            if (
              invoiceFrom &&
              String(
                payment.payment_date ||
                  ""
              ) < invoiceFrom
            ) {
              return false;
            }

            if (
              invoiceTo &&
              String(
                payment.payment_date ||
                  ""
              ) > invoiceTo
            ) {
              return false;
            }
          }

          if (
            paymentMode ===
            "upto-end"
          ) {
            if (
              invoiceTo &&
              String(
                payment.payment_date ||
                  ""
              ) > invoiceTo
            ) {
              return false;
            }
          }

          if (
            paymentMode ===
            "custom"
          ) {
            if (
              paymentFrom &&
              String(
                payment.payment_date ||
                  ""
              ) < paymentFrom
            ) {
              return false;
            }

            if (
              paymentTo &&
              String(
                payment.payment_date ||
                  ""
              ) > paymentTo
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      paymentsWithCycle,
      paymentMode,
      paymentFrom,
      paymentTo,
      invoiceFrom,
      invoiceTo,
    ]);

  /*
   * ============================================================
   * PAYMENT DISPLAY FOR RECEIVED PAYMENT TAB
   * ============================================================
   *
   * IMPORTANT:
   *
   * Default = current/open cycle.
   *
   * User can select another cycle from
   * the dropdown.
   */

  const selectedPaymentCycle =
    useMemo(() => {
      if (!selectedPaymentCycleId) {
        return null;
      }

      return (
        cycleMap.get(
          selectedPaymentCycleId
        ) || null
      );
    }, [
      selectedPaymentCycleId,
      cycleMap,
    ]);

  const cycleFilteredPayments =
    useMemo(() => {
      if (
        !selectedPaymentCycleId
      ) {
        return [];
      }

      // Received Payment tab shows every payment assigned to the selected
      // cycle. Overview/Bills date and payment-period filters do not apply here.
      return paymentsWithCycle.filter(
        (payment) =>
          payment.cycle_id ===
          selectedPaymentCycleId
      );
    }, [
      paymentsWithCycle,
      selectedPaymentCycleId,
    ]);

  /*
   * ============================================================
   * SERIAL NUMBER FOR PAYMENTS
   * ============================================================
   */

  const receivedPaymentRows =
    useMemo(() => {
      return cycleFilteredPayments.map(
        (payment, index) => ({
          ...payment,

          sr_no: index + 1,

          cycle:
            payment.cycle_id
              ? cycleMap.get(
                  payment.cycle_id
                )
              : null,
        })
      );
    }, [
      cycleFilteredPayments,
      cycleMap,
    ]);

  /*
   * ============================================================
   * BILL PAYMENT ANALYSIS
   * ============================================================
   */

  const allAnalysedBills =
    useMemo(
      () =>
        allocatePaymentsToBills(
          invoiceFilteredBills,
          filteredPayments
        ),
      [
        invoiceFilteredBills,
        filteredPayments,
      ]
    );

  const analysedBills =
    useMemo(() => {
      if (
        statusFilter ===
        "all"
      ) {
        return allAnalysedBills;
      }

      return allAnalysedBills.filter(
        (bill) =>
          String(
            bill.paymentStatus ||
              ""
          ).toLowerCase() ===
          statusFilter
      );
    }, [
      allAnalysedBills,
      statusFilter,
    ]);

  // Payment status for the Hisab bill picker must use all bills and all
  // payments, not the Overview/Bills tab's date/search filters.
  const hisabBillPaymentStatusMap = useMemo(() => {
    const analysed = allocatePaymentsToBills(billsWithCycle, paymentsWithCycle);
    return new Map(
      analysed.map((bill) => [
        String(bill.id),
        String(bill.paymentStatus || "Unpaid").toLowerCase(),
      ])
    );
  }, [billsWithCycle, paymentsWithCycle]);

  const hisabAvailableBills = useMemo(() => {
    const query = hisabBillSearch.trim().toLowerCase();
    return billsWithCycle.filter((bill) => {
      if (bill.cycle_id) return false;

      const status = hisabBillPaymentStatusMap.get(String(bill.id)) || "unpaid";
      const isPaid = status === "paid";
      if (hisabBillStatusFilter === "paid" && !isPaid) return false;
      // Unpaid includes unpaid and partially paid bills because they still
      // have an outstanding amount.
      if (hisabBillStatusFilter === "unpaid" && isPaid) return false;

      if (hisabBillCompanyFilter !== "all" && String(bill.company_id || "") !== String(hisabBillCompanyFilter)) return false;
      if (hisabBillTypeFilter !== "all" && String(bill.bill_type || "") !== hisabBillTypeFilter) return false;

      if (query) {
        const searchable = [
          bill.bill_number,
          bill.company_name,
          companyMap.get(bill.company_id),
          bill.customer_to,
          bill.customer_site,
          bill.bill_type,
          status,
        ].some((value) => String(value || "").toLowerCase().includes(query));
        if (!searchable) return false;
      }
      return true;
    });
  }, [
    billsWithCycle,
    hisabBillPaymentStatusMap,
    hisabBillSearch,
    hisabBillStatusFilter,
    hisabBillCompanyFilter,
    hisabBillTypeFilter,
    companyMap,
  ]);

  const hisabBillTypes = useMemo(
    () => Array.from(new Set(billsWithCycle.filter((bill) => !bill.cycle_id).map((bill) => String(bill.bill_type || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [billsWithCycle]
  );

  /*
   * ============================================================
   * NORMAL REPORT SUMMARY
   * ============================================================
   */

  const summary = useMemo(() => {
    const billingAmount =
      invoiceFilteredBills.reduce(
        (sum, bill) =>
          sum +
          Number(
            bill.grand_total || 0
          ),
        0
      );

    const receivedAmount =
      filteredPayments.reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

    const balance =
      billingAmount -
      receivedAmount;

    const paidCount =
      allAnalysedBills.filter(
        (bill) =>
          bill.paymentStatus ===
          "Paid"
      ).length;

    const unpaidCount =
      allAnalysedBills.filter(
        (bill) =>
          bill.paymentStatus ===
          "Unpaid"
      ).length;

    return {
      billingAmount,
      receivedAmount,
      balance,

      paidCount,
      unpaidCount,

      outstanding:
        Math.max(0, balance),

      extraPayment:
        Math.max(0, -balance),

      paymentCount:
        filteredPayments.length,

      allocation:
        allAnalysedBills,
    };
  }, [
    invoiceFilteredBills,
    filteredPayments,
    allAnalysedBills,
  ]);

  /*
   * ============================================================
   * CURRENT / SELECTED CYCLE BILLS
   * ============================================================
   */

  const cycleBills =
    useMemo(() => {
      if (!selectedPaymentCycleId) return [];

      const assignedBills = billsWithCycle.filter(
        (bill) => bill.cycle_id === selectedPaymentCycleId
      );
      const savedOrder = hisabBillOrderByCycle[selectedPaymentCycleId] || [];
      const orderIndex = new Map(
        savedOrder.map((billId, index) => [String(billId), index])
      );

      // Bills not yet present in the saved order stay after ordered bills,
      // preserving their current source order until the user repositions them.
      return assignedBills
        .map((bill, sourceIndex) => ({ bill, sourceIndex }))
        .sort((a, b) => {
          const aIndex = orderIndex.has(String(a.bill.id))
            ? orderIndex.get(String(a.bill.id))
            : Number.MAX_SAFE_INTEGER;
          const bIndex = orderIndex.has(String(b.bill.id))
            ? orderIndex.get(String(b.bill.id))
            : Number.MAX_SAFE_INTEGER;
          return aIndex - bIndex || a.sourceIndex - b.sourceIndex;
        })
        .map(({ bill }) => bill);
    }, [
      billsWithCycle,
      selectedPaymentCycleId,
      hisabBillOrderByCycle,
    ]);

  function moveHisabBill(billId, direction) {
    if (!selectedPaymentCycleId || cycleBills.length < 2) return;

    const currentIds = cycleBills.map((bill) => String(bill.id));
    const currentIndex = currentIds.indexOf(String(billId));
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentIds.length) return;

    [currentIds[currentIndex], currentIds[targetIndex]] = [
      currentIds[targetIndex],
      currentIds[currentIndex],
    ];

    setHisabBillOrderByCycle((previous) => ({
      ...previous,
      [selectedPaymentCycleId]: currentIds,
    }));
    setMessage("Bill order updated. PDF and Excel exports will use this order.");
  }

  /*
   * ============================================================
   * CURRENT / SELECTED CYCLE PAYMENTS
   * ============================================================
   */

  const cyclePayments =
    useMemo(() => {
      if (
        !selectedPaymentCycleId
      ) {
        return [];
      }

      return paymentsWithCycle.filter(
        (payment) =>
          payment.cycle_id ===
          selectedPaymentCycleId
      );
    }, [
      paymentsWithCycle,
      selectedPaymentCycleId,
    ]);

  /*
   * ============================================================
   * CYCLE SUMMARY
   * ============================================================
   *
   * This NEVER uses the Company/Bill Type report filters.
   *
   * It uses the selected cycle directly.
   */

  const cycleSummary =
    useMemo(() => {
      const billingAmount =
        cycleBills.reduce(
          (sum, bill) =>
            sum +
            Number(
              bill.grand_total || 0
            ),
          0
        );

      const receivedAmount =
        cyclePayments.reduce(
          (sum, payment) =>
            sum +
            Number(
              payment.amount || 0
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

        outstanding:
          Math.max(0, balance),

        extraPayment:
          Math.max(0, -balance),

        paidCount: 0,
        unpaidCount: 0,

        paymentCount:
          cyclePayments.length,

        allocation: [],
      };
    }, [
      cycleBills,
      cyclePayments,
    ]);

  /*
   * ============================================================
   * EXPORT
   * ============================================================
   */

  const exportContext = {
    summary,

    filteredPayments:
      receivedPaymentRows,

    analysedBills:
      allAnalysedBills,

    invoiceFrom,
    invoiceTo,

    paymentMode,

    companyMap,
  };

  async function runExport(fn) {
    try {
      setExporting(true);
      setMessage("");

      await fn(exportContext);
    } catch (error) {
      console.error(
        "Report export error:",
        error
      );

      setMessage(
        `Export failed: ${
          error?.message ||
          "Unknown error"
        }`
      );
    } finally {
      setExporting(false);
    }
  }

  async function createClientCycle(event) {
    event.preventDefault();
    const clientName = newHisabClient.trim();
    if (!clientName || !profile?.id) {
      setMessage("Enter a client/boss name first.");
      return;
    }
    setCreatingHisabCycle(true);
    try {
      const { data: existing, error: listError } = await supabase
        .from("hisab_cycles")
        .select("cycle_number,status")
        .eq("user_id", profile.id)
        .eq("client_name", clientName)
        .order("cycle_number", { ascending: false })
        .limit(1);
      if (listError) throw listError;
      const { data: open, error: openError } = await supabase
        .from("hisab_cycles")
        .select("id")
        .eq("user_id", profile.id)
        .eq("client_name", clientName)
        .eq("status", "open")
        .limit(1);
      if (openError) throw openError;
      if (open?.length) throw new Error(`${clientName} already has an active cycle. Close it before starting another.`);
      const cycleNumber = Number(existing?.[0]?.cycle_number || 0) + 1;
      const { data: created, error: createError } = await supabase
        .from("hisab_cycles")
        .insert({ user_id: profile.id, client_name: clientName, cycle_number: cycleNumber, status: "open", started_at: new Date().toISOString() })
        .select("id,client_name,cycle_number,status,started_at,settled_at,notes,user_id,created_at,updated_at")
        .single();
      if (createError) throw createError;
      setNewHisabClient("");
      setMessage(`${clientName} — Cycle ${cycleNumber} created.`);
      await refreshReports();
      setSelectedPaymentCycleId(created.id);
    } catch (error) {
      setMessage(`Could not create Hisab cycle: ${error?.message || "Unknown error"}`);
    } finally {
      setCreatingHisabCycle(false);
    }
  }

  async function assignSelectedBills() {
    if (!selectedPaymentCycle?.id || selectedPaymentCycle.status !== "open") {
      setMessage("Select an active cycle before assigning bills.");
      return;
    }
    if (!selectedHisabBillIds.length) {
      setMessage("Select at least one unassigned bill.");
      return;
    }
    try {
      setMessage("");
      const rows = selectedHisabBillIds.map((invoice_id) => ({ cycle_id: selectedPaymentCycle.id, invoice_id }));
      const { error } = await supabase.from("hisab_cycle_bills").insert(rows);
      if (error) throw error;
      setSelectedHisabBillIds([]);
      setMessage(`${rows.length} bill(s) assigned to ${(selectedPaymentCycle.client_name || "General")} — Cycle ${selectedPaymentCycle.cycle_number}.`);
      await refreshReports();
    } catch (error) {
      setMessage(`Could not assign bills: ${error?.message || "A bill may already belong to another cycle."}`);
    }
  }

  // Edit the client name across every cycle belonging to this client.
  async function editHisabClient() {
    if (!selectedPaymentCycle || !profile?.id) {
      setMessage("Select a client first.");
      return;
    }

    const oldName = String(selectedPaymentCycle.client_name || "General");
    const enteredName = window.prompt("Edit client / boss name:", oldName);
    if (enteredName === null) return;

    const newName = enteredName.trim();
    if (!newName) {
      setMessage("Client name cannot be empty.");
      return;
    }
    if (newName.toLowerCase() === oldName.toLowerCase()) return;

    const confirmed = window.confirm(
      `Rename "${oldName}" to "${newName}" for all of this client's Hisab cycles?`
    );
    if (!confirmed) return;

    try {
      setMessage("");
      const { error } = await supabase
        .from("hisab_cycles")
        .update({
          client_name: newName,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", profile.id)
        .eq("client_name", oldName);

      if (error) throw error;
      setMessage(`Client renamed to "${newName}".`);
      await refreshReports();
    } catch (error) {
      console.error("Edit Hisab client error:", error);
      setMessage(`Could not edit client: ${error?.message || "Unknown error. The new name may conflict with another client."}`);
    }
  }

  // Deletion is deliberately blocked if any cycle has bill/payment
  // assignments, preserving the accounting history and original records.
  async function deleteHisabClient() {
    if (!selectedPaymentCycle || !profile?.id) {
      setMessage("Select a client first.");
      return;
    }

    const clientName = String(selectedPaymentCycle.client_name || "General");
    const confirmed = window.confirm(
      `Delete client "${clientName}" and its empty Hisab cycles?\n\nThis will not delete invoices or received-payment records. A client with assigned bills or payments cannot be deleted.`
    );
    if (!confirmed) return;

    try {
      setMessage("");
      const { data: clientCycles, error: cyclesError } = await supabase
        .from("hisab_cycles")
        .select("id")
        .eq("user_id", profile.id)
        .eq("client_name", clientName);

      if (cyclesError) throw cyclesError;

      const cycleIds = (clientCycles || []).map((cycle) => cycle.id);
      if (!cycleIds.length) {
        setMessage("No cycles were found for this client.");
        return;
      }

      const [
        { data: billLinks, error: billsError },
        { data: paymentLinks, error: paymentsError },
      ] = await Promise.all([
        supabase.from("hisab_cycle_bills").select("id").in("cycle_id", cycleIds).limit(1),
        supabase.from("hisab_cycle_payments").select("id").in("cycle_id", cycleIds).limit(1),
      ]);

      if (billsError) throw billsError;
      if (paymentsError) throw paymentsError;

      if ((billLinks || []).length || (paymentLinks || []).length) {
        setMessage("This client has bills or payments assigned to its cycles. Remove/reassign those records first; original invoices and payment records will never be deleted by this action.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("hisab_cycles")
        .delete()
        .eq("user_id", profile.id)
        .in("id", cycleIds);

      if (deleteError) throw deleteError;

      setSelectedPaymentCycleId("");
      setMessage(`Client "${clientName}" and its empty cycles were deleted.`);
      await refreshReports();
    } catch (error) {
      console.error("Delete Hisab client error:", error);
      setMessage(`Could not delete client: ${error?.message || "Unknown error"}`);
    }
  }

  async function removeBillFromSelectedCycle(bill) {
    if (!selectedPaymentCycle?.id || selectedPaymentCycle.status !== "open") {
      setMessage("Bills can only be removed from an active cycle.");
      return;
    }
    const billLabel = bill.bill_number || bill.id;
    if (!window.confirm(
      `Remove Bill ${billLabel} from ${selectedPaymentCycle.client_name} — Cycle ${selectedPaymentCycle.cycle_number}?\n\nThe original invoice will remain unchanged and can be assigned to another cycle.`
    )) return;

    try {
      setMessage("");
      const { error } = await supabase
        .from("hisab_cycle_bills")
        .delete()
        .eq("cycle_id", selectedPaymentCycle.id)
        .eq("invoice_id", bill.id);

      if (error) throw error;
      setMessage(`Bill ${billLabel} was removed from this Hisab cycle. The original invoice was not deleted.`);
      await refreshReports();
    } catch (error) {
      console.error("Remove Hisab bill error:", error);
      setMessage(`Could not remove bill: ${error?.message || "Unknown error"}`);
    }
  }

  /*
   * ============================================================
   * SETTLE HISAB
   * ============================================================
   */

  async function handleSettleHisab() {
    if (
      !selectedPaymentCycle?.id
    ) {
      setMessage(
        "There is no open hisab cycle."
      );
      return;
    }

    if (
      selectedPaymentCycle.status !==
      "open"
    ) {
      setMessage(
        "This cycle is already settled."
      );
      return;
    }

    const billingAmount =
      Number(
        cycleSummary.billingAmount ||
          0
      );

    const receivedAmount =
      Number(
        cycleSummary.receivedAmount ||
          0
      );

    const balance =
      Number(
        cycleSummary.balance ||
          0
      );

    const confirmed =
      window.confirm(
        `Settle Hisab Cycle ${selectedPaymentCycle.cycle_number}?\n\n` +
          `Billing Amount: ₹${billingAmount.toFixed(
            2
          )}\n` +
          `Received Payment: ₹${receivedAmount.toFixed(
            2
          )}\n` +
          `Balance: ₹${balance.toFixed(
            2
          )}\n\n` +
          `This will close Cycle ${selectedPaymentCycle.cycle_number}.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setMessage("");

      const settledAt =
        new Date().toISOString();

      const {
        error,
      } = await supabase
        .from("hisab_cycles")
        .update({
          status: "settled",
          settled_at:
            settledAt,
          updated_at:
            settledAt,
        })
        .eq(
          "id",
          selectedPaymentCycle.id
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
        `Hisab Cycle ${selectedPaymentCycle.cycle_number} settled successfully.`
      );

      await refreshReports();
    } catch (error) {
      console.error(
        "Settle hisab error:",
        error
      );

      setMessage(
        `Failed to settle hisab: ${
          error?.message ||
          "Unknown error"
        }`
      );
    }
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="reports-page reports-loading">
        Loading report...
      </div>
    );
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  async function exportCurrentHisab(format) {
  if (!selectedPaymentCycle) {
    setMessage(
      "Please select a Hisab Cycle first."
    );
    return;
  }

  try {
    setExporting(true);
    setMessage("");

    const exportData = {
      cycle: selectedPaymentCycle,

      bills: cycleBills,

      payments: cyclePayments,

      companyMap,
    };

    if (format === "pdf") {
      exportHisabCyclePdf(
        exportData
      );
    } else {
      exportHisabCycleExcel(
        exportData
      );
    }
  } catch (error) {
    console.error(
      "Hisab export error:",
      error
    );

    setMessage(
      `Hisab export failed: ${
        error?.message ||
        "Unknown error"
      }`
    );
  } finally {
    setExporting(false);
  }
}
  return (
    <div className="reports-page">

      <ReportsHeader
        onAddPayment={
          openAddPaymentForm
        }

        onUnpaidPdf={() =>
          runExport(
            exportUnpaidPdf
          )
        }

        onExcel={() =>
          runExport(
            exportBillingExcel
          )
        }

        onRefresh={
          refreshReports
        }

        exporting={
          exporting
        }
      />

      {message && (
        <div className="report-message">
          {message}
        </div>
      )}

      <ReportsTabs
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {(activeTab === "overview" || activeTab === "bills") && (
      <ReportsFilters
        search={search}
        setSearch={setSearch}

        companyFilter={
          companyFilter
        }
        setCompanyFilter={
          setCompanyFilter
        }

        billTypeFilter={
          billTypeFilter
        }
        setBillTypeFilter={
          setBillTypeFilter
        }

        statusFilter={
          statusFilter
        }
        setStatusFilter={
          setStatusFilter
        }

        invoiceFrom={
          invoiceFrom
        }
        setInvoiceFrom={
          setInvoiceFrom
        }

        invoiceTo={
          invoiceTo
        }
        setInvoiceTo={
          setInvoiceTo
        }

        paymentMode={
          paymentMode
        }
        setPaymentMode={
          setPaymentMode
        }

        paymentFrom={
          paymentFrom
        }
        setPaymentFrom={
          setPaymentFrom
        }

        paymentTo={
          paymentTo
        }
        setPaymentTo={
          setPaymentTo
        }

        companies={
          companies
        }

        onReset={
          handleResetReportFilters
        }
      />
      )}

      <div className="report-section-content">

        {/* =====================================================
            OVERVIEW
        ====================================================== */}

        {activeTab ===
          "overview" && (
          <>
            <ReportsSummary
              summary={summary}
            />

            <PaymentAnalysis
              summary={summary}
              billCount={
                analysedBills.length
              }
            />
          </>
        )}

        {/* =====================================================
            BILLS
        ====================================================== */}

        {activeTab ===
          "bills" && (
          <BillPaymentStatusTable
            bills={
              analysedBills
            }
            companyMap={
              companyMap
            }
          />
        )}

        {/* =====================================================
            RECEIVED PAYMENTS
        ====================================================== */}

        {activeTab ===
          "payments" && (
          <>

            {/* CYCLE SELECTOR */}

            <div className="report-card received-payment-cycle-filter">

              <div className="received-payment-cycle-filter-inner">

                <div>
                  <label
                    htmlFor="received-payment-cycle"
                  >
                    Hisab Cycle
                  </label>

                  <small>
                    Showing received payments
                    from the selected cycle only.
                  </small>
                </div>

                <select
                  id="received-payment-cycle"
                  value={
                    selectedPaymentCycleId
                  }
                  onChange={(event) =>
                    setSelectedPaymentCycleId(
                      event.target.value
                    )
                  }
                >

                  {cycles
                    .slice()
                    .sort(
                      (a, b) =>
                        Number(
                          b.cycle_number ||
                            0
                        ) -
                        Number(
                          a.cycle_number ||
                            0
                        )
                    )
                    .map(
                      (cycle) => (
                        <option
                          key={
                            cycle.id
                          }
                          value={
                            cycle.id
                          }
                        >
                          {cycle.client_name || "General"} — Cycle{" "}
                          {
                            cycle.cycle_number
                          }{" "}
                          —{" "}
                          {cycle.status ===
                          "open"
                            ? "OPEN"
                            : "SETTLED"}
                        </option>
                      )
                    )}

                </select>

                {selectedPaymentCycle && (
                  <span className="received-payment-cycle-info">
                    {cycleFilteredPayments.length} payment(s)
                  </span>
                )}

              </div>

            </div>

            <ReceivedPaymentSection
              payments={
                receivedPaymentRows
              }

              companyMap={
                companyMap
              }

              onAddPayment={
                openAddPaymentForm
              }

              onEditPayment={
                openEditPaymentForm
              }

              onDeletePayment={
                deletePayment
              }

              onPdf={() =>
                runExport(
                  exportReceivedPaymentPdf
                )
              }

              onExcel={() =>
                runExport(
                  exportReceivedPaymentExcel
                )
              }

              exporting={
                exporting
              }
            />

          </>
        )}

        {/* =====================================================
            HISAB
        ====================================================== */}

        {activeTab ===
          "hisab" && (
          <>
            <div className="report-card hisab-client-manager">
              <div className="section-title-row">
                <div>
                  <h2>Clients & Hisab Cycles</h2>
                  <p>Create a separate cycle for each boss/client. Only one cycle per client can be open at a time.</p>
                </div>
              </div>
              <form className="hisab-create-cycle-form" onSubmit={createClientCycle}>
                <label>
                  Client / Boss Name
                  <input value={newHisabClient} onChange={(event) => setNewHisabClient(event.target.value)} placeholder="e.g. Save Fire, Guddu Fire" required />
                </label>
                <button type="submit" className="report-btn report-btn-primary" disabled={creatingHisabCycle}>
                  {creatingHisabCycle ? "Creating..." : "＋ Create Client / Start Cycle"}
                </button>
              </form>
              <div className="hisab-client-cycle-list">
                {(cycles || []).slice().sort((a,b) => String(a.client_name || "General").localeCompare(String(b.client_name || "General")) || Number(b.cycle_number || 0)-Number(a.cycle_number || 0)).map((cycle) => (
                  <button type="button" key={cycle.id} className={`hisab-client-cycle-option ${selectedPaymentCycleId === cycle.id ? "selected" : ""}`} onClick={() => setSelectedPaymentCycleId(cycle.id)}>
                    <span><strong>{cycle.client_name || "General"}</strong><small>Cycle {cycle.cycle_number}</small></span>
                    <span className={`hisab-cycle-status ${cycle.status === "settled" ? "settled" : "open"}`}>{cycle.status === "settled" ? "CLOSED" : "ACTIVE"}</span>
                  </button>
                ))}
              </div>
              {selectedPaymentCycle && (
                <div className="hisab-client-actions">
                  <button
                    type="button"
                    className="report-btn"
                    onClick={editHisabClient}
                  >
                    Edit Client Name
                  </button>
                  <button
                    type="button"
                    className="report-btn report-btn-danger"
                    onClick={deleteHisabClient}
                  >
                    Delete Client
                  </button>
                </div>
              )}
            </div>

            {selectedPaymentCycle?.status === "open" && (
              <div className="report-card hisab-assign-bills">
                <div className="section-title-row">
                  <div><h2>Add Bills to {selectedPaymentCycle.client_name || "General"} — Cycle {selectedPaymentCycle.cycle_number}</h2><p>Only unassigned bills are shown. Original invoice records are not changed.</p></div>
                </div>
                <div className="hisab-bill-picker-filters" role="search" aria-label="Search and filter unassigned bills">
                  <label className="hisab-bill-search-field">
                    <span>Search bills</span>
                    <input
                      type="search"
                      value={hisabBillSearch}
                      onChange={(event) => setHisabBillSearch(event.target.value)}
                      placeholder="Search bill number, company, customer..."
                      aria-label="Search bill number, company, customer, or bill type"
                    />
                  </label>
                  <label>
                    <span>Payment status</span>
                    <select value={hisabBillStatusFilter} onChange={(event) => setHisabBillStatusFilter(event.target.value)}>
                      <option value="all">All bills</option>
                      <option value="paid">Paid bills</option>
                      <option value="unpaid">Unpaid bills (including partial)</option>
                    </select>
                  </label>
                  <label>
                    <span>Company name</span>
                    <select value={hisabBillCompanyFilter} onChange={(event) => setHisabBillCompanyFilter(event.target.value)}>
                      <option value="all">All companies</option>
                      {companies.map((company) => <option key={company.id} value={company.id}>{company.company_name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Bill type</span>
                    <select value={hisabBillTypeFilter} onChange={(event) => setHisabBillTypeFilter(event.target.value)}>
                      <option value="all">All bill types</option>
                      {hisabBillTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <button type="button" className="report-btn hisab-bill-filter-reset" onClick={() => { setHisabBillSearch(""); setHisabBillStatusFilter("all"); setHisabBillCompanyFilter("all"); setHisabBillTypeFilter("all"); }}>Clear filters</button>
                </div>
                <div className="hisab-bill-picker-count">
                  <span>{hisabAvailableBills.length} bill(s) match your filters</span>
                  <span>{selectedHisabBillIds.filter((id) => hisabAvailableBills.some((bill) => String(bill.id) === String(id))).length} visible bill(s) selected</span>
                </div>
                <div className="hisab-available-bills">
                  {hisabAvailableBills.map((bill) => {
                    const paymentStatus = hisabBillPaymentStatusMap.get(String(bill.id)) || "unpaid";
                    const isPaid = paymentStatus === "paid";
                    return (
                      <label className="hisab-available-bill" key={bill.id}>
                        <input type="checkbox" checked={selectedHisabBillIds.includes(bill.id)} onChange={(event) => setSelectedHisabBillIds((old) => event.target.checked ? [...old, bill.id] : old.filter((id) => id !== bill.id))} />
                        <span className="hisab-available-bill-details">
                          <strong>Bill {bill.bill_number || "—"}</strong>
                          <small>{bill.company_name || companyMap.get(bill.company_id) || bill.customer_to || "Customer not specified"} · {bill.bill_date || "No date"} · {bill.bill_type || "Type not specified"}</small>
                        </span>
                        <span className={`hisab-bill-payment-badge ${isPaid ? "paid" : "unpaid"}`}>{isPaid ? "PAID" : paymentStatus.includes("partial") ? "PARTIALLY PAID" : "UNPAID"}</span>
                        <strong className="hisab-available-bill-amount">₹{Number(bill.grand_total || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
                      </label>
                    );
                  })}
                  {!billsWithCycle.some((bill) => !bill.cycle_id) && <p className="hisab-bill-empty-state">All existing bills are already assigned to a Hisab cycle.</p>}
                  {billsWithCycle.some((bill) => !bill.cycle_id) && hisabAvailableBills.length === 0 && <p className="hisab-bill-empty-state">No unassigned bills match these filters. Try changing the search or clearing filters.</p>}
                </div>
                <button type="button" className="report-btn report-btn-primary" onClick={assignSelectedBills} disabled={!selectedHisabBillIds.length}>Assign Selected Bills ({selectedHisabBillIds.length})</button>
              </div>
            )}

            {selectedPaymentCycle && (
              <div className="report-card hisab-assigned-bills">
                <div className="section-title-row">
                  <div>
                    <h2>Bills in {selectedPaymentCycle.client_name || "General"} — Cycle {selectedPaymentCycle.cycle_number}</h2>
                    <p>
                      {selectedPaymentCycle.status === "open"
                        ? "You can remove a bill mistakenly assigned to this active cycle. The original invoice will not be deleted."
                        : "This cycle is closed. Its bill assignments are read-only."}
                    </p>
                  </div>
                </div>
                {cycleBills.length ? (
                  <div className="table-wrap">
                    <table className="reports-table">
                      <thead>
                        <tr>
                          <th>Bill No.</th>
                          <th>Date</th>
                          <th>Company / Customer</th>
                          <th>Bill Type</th>
                          <th>Amount</th>
                          <th>Rearrange / Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cycleBills.map((bill) => (
                          <tr key={bill.id}>
                            <td>{bill.bill_number || "—"}</td>
                            <td>{bill.bill_date || "—"}</td>
                            <td>{bill.company_name || bill.customer_to || "—"}</td>
                            <td>{bill.bill_type || "—"}</td>
                            <td>₹{Number(bill.grand_total || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                            <td>
                              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                                <button
                                  type="button"
                                  className="report-btn"
                                  title="Move bill up"
                                  aria-label={`Move Bill ${bill.bill_number || ""} up`}
                                  onClick={() => moveHisabBill(bill.id, -1)}
                                  disabled={cycleBills.findIndex((item) => item.id === bill.id) === 0}
                                >
                                  ↑ Up
                                </button>
                                <button
                                  type="button"
                                  className="report-btn"
                                  title="Move bill down"
                                  aria-label={`Move Bill ${bill.bill_number || ""} down`}
                                  onClick={() => moveHisabBill(bill.id, 1)}
                                  disabled={cycleBills.findIndex((item) => item.id === bill.id) === cycleBills.length - 1}
                                >
                                  ↓ Down
                                </button>
                                {selectedPaymentCycle.status === "open" && (
                                  <button
                                    type="button"
                                    className="report-btn report-btn-danger"
                                    onClick={() => removeBillFromSelectedCycle(bill)}
                                  >
                                    Remove Bill
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No bills are assigned to this cycle yet.</p>
                )}
              </div>
            )}

            <div className="hisab-cycle-card">

              <div className="hisab-cycle-header">
                <div className="hisab-export-actions">

  <button
    type="button"
    className="report-btn"
    onClick={() =>
      exportCurrentHisab("pdf")
    }
    disabled={
      exporting ||
      !selectedPaymentCycle
    }
  >
    PDF
  </button>

  <button
    type="button"
    className="report-btn"
    onClick={() =>
      exportCurrentHisab("excel")
    }
    disabled={
      exporting ||
      !selectedPaymentCycle
    }
  >
    Excel
  </button>

</div>

                <div>
                  <span className="hisab-cycle-label">
                    CURRENT HISAB
                  </span>

                  <h2>
                    {selectedPaymentCycle
                      ? `${selectedPaymentCycle.client_name || "General"} — Cycle ${selectedPaymentCycle.cycle_number}`
                      : "Select a Hisab Cycle"}
                  </h2>
                </div>

                {selectedPaymentCycle && (
                  <span
                    className={
                      selectedPaymentCycle.status ===
                      "settled"
                        ? "hisab-cycle-status settled"
                        : "hisab-cycle-status open"
                    }
                  >
                    {selectedPaymentCycle.status ===
                    "settled"
                      ? "SETTLED"
                      : "OPEN"}
                  </span>
                )}

              </div>

              {loadingCycles ||
              loadingCycleLinks ? (
                <div className="hisab-cycle-loading">
                  Loading cycle...
                </div>
              ) : selectedPaymentCycle ? (
                <>

                  <div className="hisab-cycle-info">

                    <div>
                      <span>
                        Cycle Started
                      </span>

                      <strong>
                        {new Date(
                          selectedPaymentCycle.started_at
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Bills
                      </span>

                      <strong>
                        {
                          cycleBills.length
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Payments
                      </span>

                      <strong>
                        {
                          cyclePayments.length
                        }
                      </strong>
                    </div>

                  </div>

                  <FinalBillingSummary
                    summary={
                      cycleSummary
                    }
                  />

                  <div className="hisab-settle-area">

                    <button
                      type="button"
                      className="report-btn report-btn-primary"
                      onClick={
                        handleSettleHisab
                      }
                      disabled={
                        savingCycle
                      }
                    >
                      {savingCycle
                        ? "Settling..."
                        : "✓ Settle Hisab"}
                    </button>

                    <p>
                      Settling manually
                      closes this cycle.
                      New bills and
                      payments will then
                      start the next cycle.
                    </p>

                  </div>

                </>
              ) : (
                <div className="hisab-empty">

                  <strong>
                    No open hisab cycle
                  </strong>

                  <p>
                    A new cycle will
                    automatically be
                    created when you
                    create a new bill or
                    add a new received
                    payment.
                  </p>

                </div>
              )}

            </div>

            {/* =================================================
                SELECTED CYCLE SUMMARY
            ================================================== */}

            {selectedPaymentCycle && (
              <div className="report-card hisab-history-card">

                <div className="section-title-row">
                  <h2>
                    Cycle{" "}
                    {
                      selectedPaymentCycle.cycle_number
                    }{" "}
                    Summary
                  </h2>
                </div>

                <div className="hisab-cycle-record-summary">

                  <div>
                    <span>
                      Billing
                    </span>

                    <strong>
                      ₹
                      {Number(
                        cycleSummary.billingAmount ||
                          0
                      ).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Received
                    </span>

                    <strong>
                      ₹
                      {Number(
                        cycleSummary.receivedAmount ||
                          0
                      ).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Balance
                    </span>

                    <strong>
                      ₹
                      {Number(
                        cycleSummary.balance ||
                          0
                      ).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </strong>
                  </div>

                </div>

              </div>
            )}

            {/* =================================================
                HISAB HISTORY
            ================================================== */}

            {cycles?.length >
              0 && (
              <div className="report-card hisab-history-card">

                <div className="section-title-row">
                  <h2>
                    Hisab History
                  </h2>
                </div>

                <div className="table-wrap">

                  <table className="reports-table">

                    <thead>
                      <tr>
                        <th>
                          SR. NO.
                        </th>

                        <th>
                          CYCLE
                        </th>

                        <th>
                          STARTED
                        </th>

                        <th>
                          SETTLED
                        </th>

                        <th>
                          STATUS
                        </th>

                        <th>
                          BILLS
                        </th>

                        <th>
                          PAYMENTS
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {cycles
                        .slice()
                        .sort(
                          (a, b) =>
                            Number(
                              b.cycle_number ||
                                0
                            ) -
                            Number(
                              a.cycle_number ||
                                0
                            )
                        )
                        .map(
                          (
                            cycle,
                            index
                          ) => {

                            const billCount =
                              cycleBillLinks.filter(
                                (
                                  link
                                ) =>
                                  link.cycle_id ===
                                  cycle.id
                              ).length;

                            const paymentCount =
                              cyclePaymentLinks.filter(
                                (
                                  link
                                ) =>
                                  link.cycle_id ===
                                  cycle.id
                              ).length;

                            return (
                              <tr
                                key={
                                  cycle.id
                                }
                              >

                                <td>
                                  {index +
                                    1}
                                </td>

                                <td>
                                  {(cycle.client_name || "General")} — Cycle{" "}
                                  {
                                    cycle.cycle_number
                                  }
                                </td>

                                <td>
                                  {cycle.started_at
                                    ? new Date(
                                        cycle.started_at
                                      ).toLocaleDateString(
                                        "en-IN"
                                      )
                                    : "-"}
                                </td>

                                <td>
                                  {cycle.settled_at
                                    ? new Date(
                                        cycle.settled_at
                                      ).toLocaleDateString(
                                        "en-IN"
                                      )
                                    : "-"}
                                </td>

                                <td>
                                  <span
                                    className={
                                      cycle.status ===
                                      "settled"
                                        ? "hisab-cycle-status settled"
                                        : "hisab-cycle-status open"
                                    }
                                  >
                                    {cycle.status ===
                                    "settled"
                                      ? "SETTLED"
                                      : "OPEN"}
                                  </span>
                                </td>

                                <td>
                                  {
                                    billCount
                                  }
                                </td>

                                <td>
                                  {
                                    paymentCount
                                  }
                                </td>

                              </tr>
                            );
                          }
                        )}

                    </tbody>

                  </table>

                </div>

              </div>
            )}

          </>
        )}

      </div>

      {/* =======================================================
          RECEIVED PAYMENT MODAL
      ======================================================== */}

      <ReceivedPaymentModal
        open={
          showPaymentForm
        }

        editingPaymentId={
          editingPaymentId
        }

        paymentForm={
          paymentForm
        }

        setPaymentForm={
          setPaymentForm
        }

        suggestions={
          paymentCompanySuggestions
        }

        cycles={cycles}

        saving={
          savingPayment
        }

        onClose={
          closePaymentForm
        }

        onSubmit={
          saveReceivedPayment
        }
      />

    </div>
  );
}