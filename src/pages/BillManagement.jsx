import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import {
  permanentlyDeleteInvoice,
} from "../services/billing/invoiceService";

import BillPreviewModal from "../components/billing/BillPreviewModal";
import "./BillManagement.css";

const BILL_TYPES = ["all", "normal", "gst", "corecutting"];
const PAGE_SIZE = 20;

/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(value) {
  return (Number(value) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getBillTypeLabel(type) {
  if (type === "gst") return "GST";
  if (type === "corecutting") return "Core Cutting";
  if (type === "normal") return "Normal";

  return type || "-";
}

function escapeCsv(value) {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function BillManagement({
  profile,
  onEditBill,
}) {
  const [invoices, setInvoices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [lastRefresh, setLastRefresh] =
    useState(null);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [billTypeFilter, setBillTypeFilter] =
    useState("all");

  const [paymentFilter, setPaymentFilter] =
    useState("all");

  const [deleteFilter, setDeleteFilter] =
    useState("active");

  const [companyFilter, setCompanyFilter] =
    useState("all");

  const [importantOnly, setImportantOnly] =
    useState(false);

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const [sortBy, setSortBy] =
    useState("newest");

  const [page, setPage] =
    useState(1);

  /* =======================================================
     ITEMS MODAL
  ======================================================= */

  const [selectedBill, setSelectedBill] =
    useState(null);

  const [showItems, setShowItems] =
    useState(false);

  const [items, setItems] =
    useState([]);

  const [loadingItems, setLoadingItems] =
    useState(false);

  const [exportingBillId, setExportingBillId] = useState(null);
  const [previewBill, setPreviewBill] = useState(null);

  /* =======================================================
     NOTES
  ======================================================= */

  const [showNotes, setShowNotes] =
    useState(false);

  const [notesBill, setNotesBill] =
    useState(null);

  const [notesText, setNotesText] =
    useState("");

  const [savingNotes, setSavingNotes] =
    useState(false);

  /* =======================================================
     ACTION STATE
  ======================================================= */

  const [actionId, setActionId] =
    useState(null);

  /* =========================================================
     LOAD INVOICES
  ========================================================= */

  const loadInvoices = useCallback(
    async ({ silent = false } = {}) => {
      if (!profile?.id) return;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const {
          data,
          error: fetchError,
        } = await supabase
          .from("invoices")
          .select(`
            id,
            user_id,
            company_id,
            bank_id,
            bill_type,
            bill_number,
            bill_date,
            customer_id,
            customer_to,
            customer_site,
            company_name,
            company_gst_no,
            bank_name,
            bank_account_number,
            bank_ifsc_code,
            bank_branch,
            subtotal,
            sgst_rate,
            sgst_amount,
            cgst_rate,
            cgst_amount,
            grand_total,
            is_rounded,
            round_off,
            amount_in_words,
            notes,
            status,
            signature_path,
            payment_status,
            is_important,
            payment_updated_at,
            isdelete,
            created_at,
            updated_at
          `)
          .eq(
            "user_id",
            profile.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (fetchError) {
          throw fetchError;
        }

        setInvoices(data || []);

        setLastRefresh(
          new Date()
        );
      } catch (fetchError) {
        console.error(
          "Bill Management load error:",
          fetchError
        );

        setError(
          fetchError?.message ||
            "Unable to load bills."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profile?.id]
  );

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  /* =========================================================
     REALTIME
  ========================================================= */

  useEffect(() => {
    if (!profile?.id) return;

    const channel =
      supabase
        .channel(
          `bill-management-${profile.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "invoices",
            filter: `user_id=eq.${profile.id}`,
          },
          () =>
            loadInvoices({
              silent: true,
            })
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    profile?.id,
    loadInvoices,
  ]);

  /* =========================================================
     COMPANY OPTIONS
  ========================================================= */

  const companyOptions = useMemo(() => {
    const map = new Map();

    invoices.forEach(
      (invoice) => {
        if (!invoice.company_id) {
          return;
        }

        if (!map.has(invoice.company_id)) {
          map.set(
            invoice.company_id,
            {
              id: invoice.company_id,
              name:
                invoice.company_name ||
                "Unnamed Company",
            }
          );
        }
      }
    );

    return [...map.values()].sort(
      (a, b) =>
        String(a.name).localeCompare(
          String(b.name)
        )
    );
  }, [invoices]);

  /* =========================================================
     FILTERED INVOICES
  ========================================================= */

  const filteredInvoices =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const result =
        invoices.filter(
          (invoice) => {
            const deleted =
              Number(
                invoice.isdelete
              ) === 1;

            /* DELETE FILTER */

            if (
              deleteFilter ===
                "active" &&
              deleted
            ) {
              return false;
            }

            if (
              deleteFilter ===
                "deleted" &&
              !deleted
            ) {
              return false;
            }

            /* SEARCH */

            if (query) {
              const searchable = [
                invoice.bill_number,
                invoice.company_name,
                invoice.customer_to,
                invoice.customer_site,
                invoice.company_gst_no,
                invoice.bank_name,
                invoice.notes,
                invoice.bill_type,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              if (
                !searchable.includes(
                  query
                )
              ) {
                return false;
              }
            }

            /* BILL TYPE */

            if (
              billTypeFilter !==
                "all" &&
              invoice.bill_type !==
                billTypeFilter
            ) {
              return false;
            }

            /* COMPANY */

            if (
              companyFilter !==
                "all" &&
              invoice.company_id !==
                companyFilter
            ) {
              return false;
            }

            /* PAYMENT */

            const paymentStatus =
              invoice.payment_status ||
              "unpaid";

            if (
              paymentFilter !==
                "all" &&
              paymentStatus !==
                paymentFilter
            ) {
              return false;
            }

            /* IMPORTANT */

            if (
              importantOnly &&
              !invoice.is_important
            ) {
              return false;
            }

            /* DATE */

            if (
              dateFrom &&
              invoice.bill_date <
                dateFrom
            ) {
              return false;
            }

            if (
              dateTo &&
              invoice.bill_date >
                dateTo
            ) {
              return false;
            }

            return true;
          }
        );

      /* SORT */

      result.sort(
        (a, b) => {
          switch (sortBy) {
            case "oldest":
              return (
                new Date(
                  a.created_at
                ) -
                new Date(
                  b.created_at
                )
              );

            case "highest":
              return (
                Number(
                  b.grand_total
                ) -
                Number(
                  a.grand_total
                )
              );

            case "lowest":
              return (
                Number(
                  a.grand_total
                ) -
                Number(
                  b.grand_total
                )
              );

            case "bill-number":
              return (
                Number(
                  b.bill_number
                ) -
                Number(
                  a.bill_number
                )
              );

            default:
              return (
                new Date(
                  b.created_at
                ) -
                new Date(
                  a.created_at
                )
              );
          }
        }
      );

      return result;
    }, [
      invoices,
      search,
      billTypeFilter,
      paymentFilter,
      deleteFilter,
      companyFilter,
      importantOnly,
      dateFrom,
      dateTo,
      sortBy,
    ]);

  /* =========================================================
     PAGINATION
  ========================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredInvoices.length /
          PAGE_SIZE
      )
    );

  const visibleInvoices =
    filteredInvoices.slice(
      (page - 1) *
        PAGE_SIZE,
      page *
        PAGE_SIZE
    );

  useEffect(() => {
    if (
      page >
      totalPages
    ) {
      setPage(totalPages);
    }
  }, [
    page,
    totalPages,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    billTypeFilter,
    paymentFilter,
    deleteFilter,
    companyFilter,
    importantOnly,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const statistics =
    useMemo(() => {
      const total =
        filteredInvoices.length;

      const deleted =
        filteredInvoices.filter(
          (invoice) =>
            Number(
              invoice.isdelete
            ) === 1
        ).length;

      const paid =
        filteredInvoices.filter(
          (invoice) =>
            invoice.payment_status ===
            "paid"
        ).length;

      const amount =
        filteredInvoices.reduce(
          (
            sum,
            invoice
          ) =>
            sum +
            (Number(
              invoice.grand_total
            ) || 0),
          0
        );

      return {
        total,
        active:
          total - deleted,
        deleted,
        paid,
        unpaid:
          total - paid,
        amount,
      };
    }, [
      filteredInvoices,
    ]);

  /* =========================================================
     TOGGLE PAYMENT
  ========================================================= */

  async function togglePayment(
    invoice
  ) {
    if (
      Number(invoice.isdelete) ===
      1
    ) {
      return;
    }

    const nextStatus =
      invoice.payment_status ===
      "paid"
        ? "unpaid"
        : "paid";

    setActionId(
      invoice.id
    );

    try {
      const updatedAt =
        new Date().toISOString();

      const {
        error: updateError,
      } = await supabase
        .from("invoices")
        .update({
          payment_status:
            nextStatus,
          payment_updated_at:
            updatedAt,
          updated_at:
            updatedAt,
        })
        .eq(
          "id",
          invoice.id
        )
        .eq(
          "user_id",
          profile.id
        )
        .eq(
          "isdelete",
          0
        );

      if (updateError) {
        throw updateError;
      }

      setInvoices(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              invoice.id
                ? {
                    ...item,
                    payment_status:
                      nextStatus,
                    payment_updated_at:
                      updatedAt,
                    updated_at:
                      updatedAt,
                  }
                : item
          )
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        error?.message ||
          "Unable to update payment status."
      );
    } finally {
      setActionId(null);
    }
  }

  /* =========================================================
     TOGGLE IMPORTANT
  ========================================================= */

  async function toggleImportant(
    invoice
  ) {
    if (
      Number(invoice.isdelete) ===
      1
    ) {
      return;
    }

    setActionId(
      invoice.id
    );

    try {
      const nextValue =
        !Boolean(
          invoice.is_important
        );

      const updatedAt =
        new Date().toISOString();

      const {
        error: updateError,
      } = await supabase
        .from("invoices")
        .update({
          is_important:
            nextValue,
          updated_at:
            updatedAt,
        })
        .eq(
          "id",
          invoice.id
        )
        .eq(
          "user_id",
          profile.id
        )
        .eq(
          "isdelete",
          0
        );

      if (updateError) {
        throw updateError;
      }

      setInvoices(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              invoice.id
                ? {
                    ...item,
                    is_important:
                      nextValue,
                    updated_at:
                      updatedAt,
                  }
                : item
          )
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        error?.message ||
          "Unable to update important status."
      );
    } finally {
      setActionId(null);
    }
  }

  /* =========================================================
     OPEN ITEMS
  ========================================================= */

  async function openItems(
    invoice
  ) {
    setSelectedBill(
      invoice
    );

    setShowItems(true);

    setLoadingItems(true);

    setItems([]);

    try {
      const {
        data,
        error: itemsError,
      } = await supabase
        .from("invoice_items")
        .select(`
          id,
          invoice_id,
          product_id,
          particular,
          notes,
          qty,
          unit,
          rate,
          amount,
          sort_order,
          is_manual,
          bold,
          center,
          show_sr_no
        `)
        .eq(
          "invoice_id",
          invoice.id
        )
        .order(
          "sort_order",
          {
            ascending: true,
          }
        );

      if (itemsError) {
        throw itemsError;
      }

      setItems(
        (data || []).map(
          (item) => ({
            ...item,

            bold:
              Boolean(
                item.bold
              ),

            center:
              Boolean(
                item.center
              ),

            show_sr_no:
              item.is_manual
                ? String(
                    item.particular ||
                      ""
                  ).trim() ===
                    ""
                  ? false
                  : Boolean(
                      item.show_sr_no
                    )
                : true,
          })
        )
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        error?.message ||
          "Unable to load bill items."
      );
    } finally {
      setLoadingItems(
        false
      );
    }
  }

  /* =========================================================
     EXPORT / PREVIEW SAVED BILL
  ========================================================= */

  async function exportBillPdf(invoice) {
    if (!invoice?.id || exportingBillId) return;

    setExportingBillId(invoice.id);

    try {
      const [
        { data: savedItems, error: itemsError },
        companyResult,
      ] = await Promise.all([
        supabase
          .from("invoice_items")
          .select(`
            id, invoice_id, product_id, particular, notes,
            qty, unit, rate, amount, sort_order, is_manual,
            bold, center, show_sr_no
          `)
          .eq("invoice_id", invoice.id)
          .order("sort_order", { ascending: true }),
        invoice.company_id
          ? supabase
              .from("companies")
              .select("*")
              .eq("id", invoice.company_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (itemsError) throw itemsError;
      if (companyResult?.error) {
        console.warn("Could not load company profile for bill export:", companyResult.error);
      }

      const company = companyResult?.data || {
        company_name: invoice.company_name || "",
        gst_no: invoice.company_gst_no || "",
      };

      const bank = {
        bank_name: invoice.bank_name || "",
        account_number: invoice.bank_account_number || "",
        ifsc_code: invoice.bank_ifsc_code || "",
        branch: invoice.bank_branch || "",
      };

      const subtotal = Number(invoice.subtotal || 0);
      const sgstAmount = Number(invoice.sgst_amount || 0);
      const cgstAmount = Number(invoice.cgst_amount || 0);
      const grandTotal = Number(
        invoice.grand_total ?? subtotal + sgstAmount + cgstAmount
      );

    
setPreviewBill({
  fileName: [
    invoice.company_name || company.company_name,
    invoice.bill_number,
    invoice.customer_to,
    invoice.customer_site,
  ]
    .filter((value) => value != null && String(value).trim() !== "")
    .map((value) => String(value).trim())
    .join(" ")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim(),

  billType:
    invoice.bill_type === "gst"
      ? "gst"
      : invoice.bill_type,

  billNo: invoice.bill_number ?? "",
  billDate: invoice.bill_date ?? "",
  customerTo: invoice.customer_to ?? "",
  site: invoice.customer_site ?? "",
  companyName:
    invoice.company_name ?? company.company_name ?? "",
  companyGstNo: invoice.company_gst_no ?? "",
  company,
  bank,

  items: (savedItems || []).map((item) => ({
    ...item,
    type: item.is_manual ? "manual" : "product",
    showSrNo: item.show_sr_no,
  })),

  subtotal,
  sgstRate: Number(invoice.sgst_rate || 0),
  sgstAmount,
  cgstRate: Number(invoice.cgst_rate || 0),
  cgstAmount,
  grandTotal,
  roundOff: Number(invoice.round_off || 0),
  amountInWords: invoice.amount_in_words || "",
  notes: invoice.notes || "",
  signature: invoice.signature_path
    ? { path: invoice.signature_path }
    : null,
});

    } catch (exportError) {
      console.error("Bill PDF export failed:", exportError);
      alert(exportError?.message || "Unable to prepare this bill for PDF export.");
    } finally {
      setExportingBillId(null);
    }
  }

  /* =========================================================
     EDIT BILL
  ========================================================= */

  function editBill(
    invoice
  ) {
    if (
      Number(invoice?.isdelete) ===
      1
    ) {
      alert(
        "Restore this bill first before editing it."
      );

      return;
    }

    if (
      typeof onEditBill !==
      "function"
    ) {
      alert(
        "Edit action is not connected to Dashboard."
      );

      return;
    }

    onEditBill(
      invoice
    );
  }

  /* =========================================================
     NOTES
  ========================================================= */

  function openNotes(
    invoice
  ) {
    setNotesBill(
      invoice
    );

    setNotesText(
      invoice.notes || ""
    );

    setShowNotes(
      true
    );
  }

  function closeNotes() {
    if (
      savingNotes
    ) {
      return;
    }

    setShowNotes(
      false
    );

    setNotesBill(
      null
    );

    setNotesText(
      ""
    );
  }

  async function saveNotes() {
    if (!notesBill) {
      return;
    }

    if (
      Number(
        notesBill.isdelete
      ) === 1
    ) {
      alert(
        "Restore the bill before editing notes."
      );

      return;
    }

    setSavingNotes(
      true
    );

    try {
      const updatedAt =
        new Date().toISOString();

      const {
        data,
        error: updateError,
      } = await supabase
        .from("invoices")
        .update({
          notes:
            notesText.trim(),
          updated_at:
            updatedAt,
        })
        .eq(
          "id",
          notesBill.id
        )
        .eq(
          "user_id",
          profile.id
        )
        .eq(
          "isdelete",
          0
        )
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setInvoices(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              notesBill.id
                ? {
                    ...item,
                    ...data,
                  }
                : item
          )
      );

      closeNotes();
    } catch (error) {
      console.error(
        error
      );

      alert(
        error?.message ||
          "Unable to save notes."
      );
    } finally {
      setSavingNotes(
        false
      );
    }
  }

  /* =========================================================
     SOFT DELETE BILL
     
     IMPORTANT:
     This does NOT delete the invoice.
     It only changes isdelete = 1.
     
     Therefore Hisab Cycle references remain safe.
  ========================================================= */

  async function softDeleteBill(
    invoice
  ) {
    if (
      Number(invoice?.isdelete) ===
      1
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete Bill ${invoice.bill_number}?\n\n` +
          `It will move to Deleted Bills and can be restored later.\n\n` +
          `Its bill number will remain consumed.`
      );

    if (!confirmed) {
      return;
    }

    setActionId(
      invoice.id
    );

    try {
      const updatedAt =
        new Date().toISOString();

      const {
        data,
        error: updateError,
      } = await supabase
        .from("invoices")
        .update({
          isdelete: 1,
          updated_at:
            updatedAt,
        })
        .eq(
          "id",
          invoice.id
        )
        .eq(
          "user_id",
          profile.id
        )
        .eq(
          "isdelete",
          0
        )
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setInvoices(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              invoice.id
                ? {
                    ...item,
                    ...data,
                    isdelete: 1,
                  }
                : item
          )
      );

      if (
        selectedBill?.id ===
        invoice.id
      ) {
        setShowItems(
          false
        );

        setSelectedBill(
          null
        );

        setItems([]);
      }
    } catch (error) {
      console.error(
        error
      );

      alert(
        error?.message ||
          "Unable to delete bill."
      );
    } finally {
      setActionId(
        null
      );
    }
  }

  /* =========================================================
     RESTORE BILL
  ========================================================= */

  async function restoreBill(
    invoice
  ) {
    if (
      Number(invoice?.isdelete) !==
      1
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Restore Bill ${invoice.bill_number}?\n\n` +
          `It will return to Active Bills.`
      );

    if (!confirmed) {
      return;
    }

    setActionId(
      invoice.id
    );

    try {
      const updatedAt =
        new Date().toISOString();

      const {
        data,
        error: updateError,
      } = await supabase
        .from("invoices")
        .update({
          isdelete: 0,
          updated_at:
            updatedAt,
        })
        .eq(
          "id",
          invoice.id
        )
        .eq(
          "user_id",
          profile.id
        )
        .eq(
          "isdelete",
          1
        )
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setInvoices(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              invoice.id
                ? {
                    ...item,
                    ...data,
                    isdelete: 0,
                  }
                : item
          )
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        error?.message ||
          "Unable to restore bill."
      );
    } finally {
      setActionId(
        null
      );
    }
  }

  /* =========================================================
     PERMANENT DELETE BILL
     
     IMPORTANT:
     DO NOT DIRECTLY DELETE FROM invoices HERE.
     
     invoiceService.permanentlyDeleteInvoice()
     checks whether the invoice belongs to a Hisab Cycle.
     
     If it does:
       ❌ invoice is NOT deleted
       ❌ invoice_items are NOT deleted
       ✅ accounting history is preserved
     
     If it does not:
       ✅ invoice_items are deleted
       ✅ invoice is deleted
  ========================================================= */

  async function permanentlyDeleteBill(
    invoice
  ) {
    if (
      Number(invoice?.isdelete) !==
      1
    ) {
      alert(
        "Only deleted bills can be permanently deleted."
      );

      return;
    }

    const confirmed = window.confirm(
  `PERMANENTLY DELETE Bill ${invoice.bill_number}?\n\n` +
    `The bill and all its items will be permanently deleted.\n` +
    `If this bill belongs to a Hisab Cycle, its bill reference will also be removed from that cycle.\n\n` +
    `This cannot be undone.`
);

    if (!confirmed) {
      return;
    }

    const finalConfirmed = window.confirm(
  `Final confirmation:\n\n` +
    `Permanently delete Bill ${invoice.bill_number}?\n\n` +
    `This action cannot be undone.`
);

    if (!finalConfirmed) {
      return;
    }

    setActionId(
      invoice.id
    );

    try {
      /*
       * IMPORTANT:
       *
       * Do NOT do:
       *
       * supabase.from("invoices").delete()
       *
       * here.
       *
       * The service checks hisab_cycle_bills first.
       */

      await permanentlyDeleteInvoice({
        profile,
        invoiceId:
          invoice.id,
      });

      /*
       * Only reaches here if the invoice
       * was actually deleted successfully.
       */

      setInvoices(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              invoice.id
          )
      );

      if (
        selectedBill?.id ===
        invoice.id
      ) {
        setShowItems(
          false
        );

        setSelectedBill(
          null
        );

        setItems([]);
      }

      alert(
        `Bill ${invoice.bill_number} was permanently deleted.`
      );
    } catch (error) {
      console.error(
        "Permanent delete error:",
        error
      );

      /*
       * If the invoice belongs to a Hisab Cycle,
       * invoiceService intentionally throws an error.
       *
       * Show that message to the user instead
       * of exposing the PostgreSQL FK error.
       */

      alert(
        error?.message ||
          "This bill cannot be permanently deleted."
      );
    } finally {
      setActionId(
        null
      );
    }
  }

  /* =========================================================
     EXPORT
  ========================================================= */

  function exportBills() {
    if (
      !filteredInvoices.length
    ) {
      alert(
        "There are no bills to export."
      );

      return;
    }

    const headers = [
      "Bill Number",
      "Bill Type",
      "Status",
      "Bill Date",
      "Company",
      "GST Number",
      "To",
      "Site",
      "Subtotal",
      "SGST",
      "CGST",
      "Round Off",
      "Grand Total",
      "Payment Status",
      "Important",
      "Notes",
      "Created",
    ];

    const rows =
      filteredInvoices.map(
        (invoice) => [
          invoice.bill_number,
          getBillTypeLabel(
            invoice.bill_type
          ),
          Number(
            invoice.isdelete
          ) === 1
            ? "Deleted"
            : "Active",
          invoice.bill_date,
          invoice.company_name,
          invoice.company_gst_no,
          invoice.customer_to,
          invoice.customer_site,
          invoice.subtotal,
          invoice.sgst_amount,
          invoice.cgst_amount,
          invoice.round_off,
          invoice.grand_total,
          invoice.payment_status ||
            "unpaid",
          invoice.is_important
            ? "Yes"
            : "No",
          invoice.notes,
          invoice.created_at,
        ]
      );

    const csv = [
      headers
        .map(escapeCsv)
        .join(","),
      ...rows.map(
        (row) =>
          row
            .map(
              escapeCsv
            )
            .join(",")
      ),
    ].join("\n");

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `bills-${new Date()
        .toISOString()
        .slice(
          0,
          10
        )}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  }

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  function clearFilters() {
    setSearch("");
    setBillTypeFilter(
      "all"
    );
    setPaymentFilter(
      "all"
    );
    setDeleteFilter(
      "active"
    );
    setCompanyFilter(
      "all"
    );
    setImportantOnly(
      false
    );
    setDateFrom("");
    setDateTo("");
    setSortBy(
      "newest"
    );
  }

  /* =========================================================
     NO PROFILE
  ========================================================= */

  if (!profile?.id) {
    return (
      <div className="bill-management-page">
        <div className="bill-management-empty">
          User profile not found.
        </div>
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="bill-management-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="bm-header">
        <div>
          <h1>
            Bill Management
          </h1>

          <p>
            View, search, edit/update, and manage all saved bills.
          </p>
        </div>

        <div className="bm-header-actions">

          <button
            type="button"
            className="bm-button secondary"
            onClick={() =>
              loadInvoices({
                silent: true,
              })
            }
            disabled={
              refreshing
            }
          >
            {refreshing
              ? "↻ Refreshing..."
              : "↻ Refresh"}
          </button>

          <button
            type="button"
            className="bm-button primary"
            onClick={
              exportBills
            }
            disabled={
              !filteredInvoices.length
            }
          >
            ↓ Export
          </button>

        </div>
      </div>

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <div className="bm-stats">

        <div className="bm-stat-card">
          <span>
            Bills
          </span>

          <strong>
            {statistics.total}
          </strong>
        </div>

        <div className="bm-stat-card">
          <span>
            Active
          </span>

          <strong>
            {statistics.active}
          </strong>
        </div>

        <div className="bm-stat-card">
          <span>
            Deleted
          </span>

          <strong>
            {statistics.deleted}
          </strong>
        </div>

        <div className="bm-stat-card">
          <span>
            Total Amount
          </span>

          <strong>
            ₹
            {formatAmount(
              statistics.amount
            )}
          </strong>
        </div>

        <div className="bm-stat-card">
          <span>
            Paid
          </span>

          <strong>
            {statistics.paid}
          </strong>
        </div>

        <div className="bm-stat-card">
          <span>
            Unpaid
          </span>

          <strong>
            {statistics.unpaid}
          </strong>
        </div>

      </div>

      {/* =====================================================
          SEARCH + FILTERS
      ===================================================== */}

      <section className="bm-card">

        <div className="bm-search-row">

          <div className="bm-search-box">

            <span>
              🔎
            </span>

            <input
              type="text"
              value={search}
              placeholder="Search bill no., company, To, site, GST or notes..."
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
              >
                ×
              </button>
            )}

          </div>

        </div>

        <div className="bm-filter-row">

          <div className="bm-filter-group">
            <label>
              Status
            </label>

            <select
              value={
                deleteFilter
              }
              onChange={(
                event
              ) =>
                setDeleteFilter(
                  event.target.value
                )
              }
            >
              <option value="active">
                Active Bills
              </option>

              <option value="deleted">
                Deleted Bills
              </option>

              <option value="all">
                All Bills
              </option>
            </select>
          </div>

          <div className="bm-filter-group">
            <label>
              Company
            </label>

            <select
              value={
                companyFilter
              }
              onChange={(
                event
              ) =>
                setCompanyFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Companies
              </option>

              {companyOptions.map(
                (company) => (
                  <option
                    key={
                      company.id
                    }
                    value={
                      company.id
                    }
                  >
                    {company.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="bm-filter-group">
            <label>
              Bill Type
            </label>

            <select
              value={
                billTypeFilter
              }
              onChange={(
                event
              ) =>
                setBillTypeFilter(
                  event.target.value
                )
              }
            >
              {BILL_TYPES.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type ===
                    "all"
                      ? "All Bills"
                      : getBillTypeLabel(
                          type
                        )}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="bm-filter-group">
            <label>
              Payment
            </label>

            <select
              value={
                paymentFilter
              }
              onChange={(
                event
              ) =>
                setPaymentFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All
              </option>

              <option value="paid">
                Paid
              </option>

              <option value="unpaid">
                Unpaid
              </option>
            </select>
          </div>

          <div className="bm-filter-group">
            <label>
              From
            </label>

            <input
              type="date"
              value={
                dateFrom
              }
              onChange={(
                event
              ) =>
                setDateFrom(
                  event.target.value
                )
              }
            />
          </div>

          <div className="bm-filter-group">
            <label>
              To
            </label>

            <input
              type="date"
              value={
                dateTo
              }
              onChange={(
                event
              ) =>
                setDateTo(
                  event.target.value
                )
              }
            />
          </div>

          <div className="bm-filter-group">
            <label>
              Sort
            </label>

            <select
              value={
                sortBy
              }
              onChange={(
                event
              ) =>
                setSortBy(
                  event.target.value
                )
              }
            >
              <option value="newest">
                Newest First
              </option>

              <option value="oldest">
                Oldest First
              </option>

              <option value="highest">
                Highest Amount
              </option>

              <option value="lowest">
                Lowest Amount
              </option>

              <option value="bill-number">
                Bill Number
              </option>
            </select>
          </div>

          <button
            type="button"
            className={`bm-important-filter ${
              importantOnly
                ? "active"
                : ""
            }`}
            onClick={() =>
              setImportantOnly(
                (value) =>
                  !value
              )
            }
          >
            ★ Important
          </button>

          <button
            type="button"
            className="bm-clear-filter"
            onClick={
              clearFilters
            }
          >
            Clear
          </button>

        </div>
      </section>

      {/* =====================================================
          RESULT BAR
      ===================================================== */}

      <div className="bm-result-bar">

        <span>
          Showing{" "}
          <strong>
            {
              visibleInvoices.length
            }
          </strong>{" "}
          of{" "}
          <strong>
            {
              filteredInvoices.length
            }
          </strong>{" "}
          bills
        </span>

        <span className="bm-last-refresh">
          {lastRefresh
            ? `Updated ${formatDateTime(
                lastRefresh
              )}`
            : "Updating..."}
        </span>

      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="bm-error">

          {error}

          <button
            type="button"
            onClick={() =>
              loadInvoices()
            }
          >
            Retry
          </button>

        </div>
      )}

      {/* =====================================================
          TABLE
      ===================================================== */}

      <section className="bm-table-card">

        {loading ? (
          <div className="bm-loading">

            <div className="bm-spinner" />

            <span>
              Loading bills...
            </span>

          </div>
        ) : visibleInvoices.length ===
          0 ? (
          <div className="bm-empty">

            <div className="bm-empty-icon">
              🧾
            </div>

            <h3>
              No bills found
            </h3>

            <p>
              Try changing your search or filters.
            </p>

            <button
              type="button"
              className="bm-button secondary"
              onClick={
                clearFilters
              }
            >
              Clear Filters
            </button>

          </div>
        ) : (
          <div className="bm-table-wrapper">

            <table className="bm-table">

              <thead>
                <tr>
                  <th>
                    Important
                  </th>

                  <th>
                    Bill
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Company
                  </th>

                  <th>
                    Customer / Site
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Payment
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Notes
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>

                {visibleInvoices.map(
                  (invoice) => {
                    const deleted =
                      Number(
                        invoice.isdelete
                      ) === 1;

                    const busy =
                      actionId ===
                      invoice.id;

                    return (
                      <tr
                        key={
                          invoice.id
                        }
                        className={`bm-bill-row ${
                          deleted
                            ? "bm-row-deleted"
                            : ""
                        }`}
                        onDoubleClick={() =>
                          openItems(
                            invoice
                          )
                        }
                        title="Double-click to view products/items"
                      >

                        <td>
                          <button
                            type="button"
                            className={`bm-star ${
                              invoice.is_important &&
                              !deleted
                                ? "active"
                                : ""
                            }`}
                            onClick={() =>
                              toggleImportant(
                                invoice
                              )
                            }
                            disabled={
                              deleted ||
                              busy
                            }
                            title={
                              deleted
                                ? "Deleted bill"
                                : "Mark / unmark important"
                            }
                          >
                            ★
                          </button>
                        </td>

                        <td>
                          <div className="bm-bill-number">
                            #
                            {
                              invoice.bill_number
                            }
                          </div>

                          <div className="bm-bill-sub">
                            {
                              invoice.company_gst_no ||
                              "No GST"
                            }
                          </div>
                        </td>

                        <td>
                          {formatDate(
                            invoice.bill_date
                          )}
                        </td>

                        <td>
                          <strong>
                            {
                              invoice.company_name ||
                              "-"
                            }
                          </strong>
                        </td>

                        <td>
                          <div className="bm-customer">
                            {
                              invoice.customer_to ||
                              "-"
                            }
                          </div>

                          {invoice.customer_site && (
                            <div className="bm-site">
                              Site:{" "}
                              {
                                invoice.customer_site
                              }
                            </div>
                          )}
                        </td>

                        <td>
                          <span
                            className={`bm-type bm-type-${invoice.bill_type}`}
                          >
                            {getBillTypeLabel(
                              invoice.bill_type
                            )}
                          </span>
                        </td>

                        <td>
                          <strong className="bm-amount">
                            ₹
                            {formatAmount(
                              invoice.grand_total
                            )}
                          </strong>
                        </td>

                        <td>
                          <button
                            type="button"
                            className={`bm-payment ${
                              invoice.payment_status ===
                              "paid"
                                ? "paid"
                                : "unpaid"
                            }`}
                            onClick={() =>
                              togglePayment(
                                invoice
                              )
                            }
                            disabled={
                              deleted ||
                              busy
                            }
                          >
                            {invoice.payment_status ===
                            "paid"
                              ? "✓ Paid"
                              : "○ Unpaid"}
                          </button>
                        </td>

                        <td>
                          <span
                            className={`bm-status ${
                              deleted
                                ? "deleted"
                                : "active"
                            }`}
                          >
                            {deleted
                              ? "Deleted"
                              : "Active"}
                          </span>
                        </td>

                        <td>
                          <div className="bm-notes-cell">

                            {invoice.notes ? (
                              <span
                                className="bm-notes-preview"
                                title={
                                  invoice.notes
                                }
                              >
                                📝{" "}
                                {
                                  invoice.notes
                                }
                              </span>
                            ) : (
                              <span className="bm-no-notes">
                                No notes
                              </span>
                            )}

                            {!deleted && (
                              <button
                                type="button"
                                className="bm-notes-button"
                                onClick={() =>
                                  openNotes(
                                    invoice
                                  )
                                }
                                disabled={
                                  busy
                                }
                              >
                                {invoice.notes
                                  ? "Edit"
                                  : "+ Add"}
                              </button>
                            )}

                          </div>
                        </td>

                        <td>
                          <div className="bm-actions">

                            <button
                              type="button"
                              className="bm-action view"
                              onClick={() =>
                                openItems(
                                  invoice
                                )
                              }
                              disabled={
                                busy
                              }
                              title="View products"
                            >
                              👁
                            </button>

                            <button
                              type="button"
                              className="bm-action pdf"
                              onClick={() => exportBillPdf(invoice)}
                              disabled={busy || exportingBillId === invoice.id}
                              title="Preview / Export this bill as PDF"
                            >
                              {exportingBillId === invoice.id ? "…" : "PDF"}
                            </button>

                            {!deleted && (
                              <>
                                <button
                                  type="button"
                                  className="bm-action edit"
                                  onClick={() =>
                                    editBill(
                                      invoice
                                    )
                                  }
                                  disabled={
                                    busy
                                  }
                                  title="Edit / Update complete bill"
                                >
                                  ✎
                                </button>

                                <button
                                  type="button"
                                  className="bm-action delete"
                                  onClick={() =>
                                    softDeleteBill(
                                      invoice
                                    )
                                  }
                                  disabled={
                                    busy
                                  }
                                  title="Move to Deleted Bills"
                                >
                                  🗑
                                </button>
                              </>
                            )}

                            {deleted && (
                              <>
                                <button
                                  type="button"
                                  className="bm-action restore"
                                  onClick={() =>
                                    restoreBill(
                                      invoice
                                    )
                                  }
                                  disabled={
                                    busy
                                  }
                                  title="Restore bill"
                                >
                                  ↩
                                </button>

                                <button
                                  type="button"
                                  className="bm-action permanent-delete"
                                  onClick={() =>
                                    permanentlyDeleteBill(
                                      invoice
                                    )
                                  }
                                  disabled={
                                    busy
                                  }
                                  title="Permanently delete bill"
                                >
                                  🗑
                                </button>
                              </>
                            )}

                          </div>
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>
            </table>

          </div>
        )}

      </section>

      {/* =====================================================
          PAGINATION
      ===================================================== */}

      {totalPages > 1 && (
        <div className="bm-pagination">

          <button
            type="button"
            disabled={
              page <= 1
            }
            onClick={() =>
              setPage(
                (value) =>
                  value - 1
              )
            }
          >
            ← Previous
          </button>

          <span>
            Page{" "}
            <strong>
              {page}
            </strong>{" "}
            of{" "}
            <strong>
              {totalPages}
            </strong>
          </span>

          <button
            type="button"
            disabled={
              page >=
              totalPages
            }
            onClick={() =>
              setPage(
                (value) =>
                  value + 1
              )
            }
          >
            Next →
          </button>

        </div>
      )}

      {/* =====================================================
          ITEMS MODAL
      ===================================================== */}

      {showItems && (
        <div
          className="bm-modal-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowItems(
                false
              );
            }
          }}
        >

          <div className="bm-modal bm-items-modal">

            <div className="bm-modal-header">

              <div>

                <h2>
                  Bill #
                  {
                    selectedBill?.bill_number
                  }
                </h2>

                <p>
                  {
                    selectedBill?.company_name
                  }
                </p>

              </div>

              <button
                type="button"
                className="bm-modal-close"
                onClick={() =>
                  setShowItems(
                    false
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="bm-modal-summary">

              <div>
                <span>
                  Bill Date
                </span>

                <strong>
                  {formatDate(
                    selectedBill?.bill_date
                  )}
                </strong>
              </div>

              <div>
                <span>
                  To
                </span>

                <strong>
                  {
                    selectedBill?.customer_to ||
                    "-"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Site
                </span>

                <strong>
                  {
                    selectedBill?.customer_site ||
                    "-"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong>
                  {Number(
                    selectedBill?.isdelete
                  ) === 1
                    ? "Deleted"
                    : "Active"}
                </strong>
              </div>

              <div>
                <span>
                  Total
                </span>

                <strong>
                  ₹
                  {formatAmount(
                    selectedBill?.grand_total
                  )}
                </strong>
              </div>

            </div>

            {loadingItems ? (
              <div className="bm-loading">

                <div className="bm-spinner" />

                Loading products...

              </div>
            ) : (
              <div className="bm-items-wrapper">

                {items.length ===
                0 ? (
                  <div className="bm-no-items">
                    No items found.
                  </div>
                ) : (
                  <table className="bm-items-table">

                    <thead>
                      <tr>
                        <th>
                          #
                        </th>

                        <th>
                          Particular
                        </th>

                        <th>
                          Qty
                        </th>

                        <th>
                          Unit
                        </th>

                        <th>
                          Rate
                        </th>

                        <th>
                          Amount
                        </th>

                        <th>
                          Format
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {items.map(
                        (
                          item,
                          index
                        ) => (
                          <tr
                            key={
                              item.id
                            }
                          >

                            <td>
                              {(() => {
                                if (
                                  !item.show_sr_no
                                ) {
                                  return "";
                                }

                                let serial =
                                  0;

                                for (
                                  let i = 0;
                                  i <=
                                    index;
                                  i += 1
                                ) {
                                  if (
                                    items[
                                      i
                                    ]
                                      ?.show_sr_no
                                  ) {
                                    serial +=
                                      1;
                                  }
                                }

                                return serial;
                              })()}
                            </td>

                            <td
                              className={[
                                item.bold
                                  ? "bm-item-bold"
                                  : "",
                                item.center
                                  ? "bm-item-center"
                                  : "",
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  " "
                                )}
                            >

                              {item.particular ||
                                "(Blank row)"}

                              {item.notes && (
                                <small>
                                  {
                                    item.notes
                                  }
                                </small>
                              )}

                            </td>

                            <td>
                              {item.qty ===
                              null
                                ? ""
                                : item.qty}
                            </td>

                            <td>
                              {
                                item.unit ||
                                ""
                              }
                            </td>

                            <td>
                              {item.rate ===
                              null
                                ? ""
                                : `₹${formatAmount(
                                    item.rate
                                  )}`}
                            </td>

                            <td>
                              {item.is_manual
                                ? ""
                                : `₹${formatAmount(
                                    item.amount
                                  )}`}
                            </td>

                            <td>

                              {item.bold && (
                                <span className="bm-format-tag">
                                  B
                                </span>
                              )}

                              {item.center && (
                                <span className="bm-format-tag">
                                  Center
                                </span>
                              )}

                              {!item.bold &&
                                !item.center &&
                                (item.is_manual &&
                                String(
                                  item.particular ||
                                    ""
                                ).trim() !==
                                  ""
                                  ? item.show_sr_no
                                    ? (
                                      <span className="bm-format-tag">
                                        Sr. No.
                                      </span>
                                    )
                                    : (
                                      <span>
                                        —
                                      </span>
                                    )
                                  : (
                                    <span>
                                      —
                                    </span>
                                  ))}

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>
                )}

              </div>
            )}

            <div className="bm-modal-footer">

              <span>
                Blank rows never consume a Sr. No.; heading rows follow their saved Sr. No. setting. Double-click any bill in the list to open this view.
              </span>

              <button
                type="button"
                className="bm-button secondary"
                onClick={() =>
                  setShowItems(
                    false
                  )
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          NOTES MODAL
      ===================================================== */}

      {showNotes && (
        <div
          className="bm-modal-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeNotes();
            }
          }}
        >

          <div className="bm-modal bm-notes-modal">

            <div className="bm-modal-header">

              <div>

                <h2>
                  {notesBill?.notes
                    ? "Edit Notes"
                    : "Add Notes"}
                </h2>

                <p>
                  Bill #
                  {
                    notesBill?.bill_number
                  }{" "}
                  •{" "}
                  {
                    notesBill?.company_name
                  }
                </p>

              </div>

              <button
                type="button"
                className="bm-modal-close"
                onClick={
                  closeNotes
                }
                disabled={
                  savingNotes
                }
              >
                ×
              </button>

            </div>

            <div className="bm-notes-content">

              <label htmlFor="bill-management-notes">
                Comments / Notes
              </label>

              <textarea
                id="bill-management-notes"
                value={
                  notesText
                }
                onChange={(
                  event
                ) =>
                  setNotesText(
                    event.target.value
                  )
                }
                placeholder="Write notes about this bill..."
                rows={8}
                autoFocus
                disabled={
                  savingNotes
                }
              />

              <div className="bm-notes-help">
                These notes are saved with the invoice and can also be found using Bill Management search.
              </div>

            </div>

            <div className="bm-modal-footer">

              <button
                type="button"
                className="bm-button secondary"
                onClick={
                  closeNotes
                }
                disabled={
                  savingNotes
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="bm-button primary"
                onClick={
                  saveNotes
                }
                disabled={
                  savingNotes
                }
              >
                {savingNotes
                  ? "Saving..."
                  : "Save Notes"}
              </button>

            </div>

          </div>

        </div>
      )}

      {previewBill && (
        <BillPreviewModal
          bill={previewBill}
          onClose={() => setPreviewBill(null)}
        />
      )}

      {/* =====================================================
          DELETED BILLS MANAGER
      ===================================================== */}

      <div className="bm-deleted-manager">

        <div>

          <strong>
            Deleted Bills
          </strong>

          <span>
            {
              invoices.filter(
                (invoice) =>
                  Number(
                    invoice.isdelete
                  ) === 1
              ).length
            }{" "}
            deleted bill(s)
          </span>

        </div>

        <button
          type="button"
          className="bm-button secondary"
          onClick={() => {
            setDeleteFilter(
              "deleted"
            );

            setPage(1);

            window.scrollTo({
              top: 0,
              behavior:
                "smooth",
            });
          }}
        >
          🗑 Open Deleted Bills
        </button>

      </div>

    </div>
  );
}