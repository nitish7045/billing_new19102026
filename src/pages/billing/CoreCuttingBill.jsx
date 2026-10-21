import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useBillItems } from "../../hooks/useBillItems";
import { convertNumberToWordsIndian } from "../../utils/numToWordsIndian";

import {
  getInvoiceItems,
  getNextBillNumber,
  saveInvoice,
  updateInvoice,
} from "../../services/billing/invoiceService";

import {
  createDraftId,
  deleteDraft,
  getDraft,
  hasMeaningfulDraftData,
  saveDraft,
} from "../../services/billing/draftService";

import BillHeader from "../../components/billing/BillHeader";
import CustomerSection from "../../components/billing/CustomerSection";
import BankSelector from "../../components/billing/BankSelector";
import SignatureSelector from "../../components/billing/SignatureSelector";
import ProductEntry from "../../components/billing/ProductEntry";
import BillItemsTable from "../../components/billing/BillItemsTable";
import BillTotals from "../../components/billing/BillTotals";
import BillActions from "../../components/billing/BillActions";
import BillPreviewModal from "../../components/billing/BillPreviewModal";

import "./BillingPages.css";

const getToday = () =>
  new Date().toISOString().slice(0, 10);

const DRAFT_SAVE_DELAY = 200;

export default function CoreCuttingBill({
  profile,
  company,
  draftId,
  draftMode = "new",
  draft,
  invoiceId,
  invoice,
  onBack,
}) {
  const isExistingDraft = draftMode === "existing";
  const isEditMode = draftMode === "edit" && Boolean(invoiceId);

  // ==================================================
  // DRAFT / EDIT SESSION
  // ==================================================

  const [currentDraftId, setCurrentDraftId] = useState(
    draftId || (isEditMode ? `edit-${invoiceId}` : createDraftId())
  );

  const createdAtRef = useRef(
    draft?.createdAt || new Date().toISOString()
  );
  const originalDraftRef = useRef(draft || null);
  const restoringRef = useRef(isExistingDraft || isEditMode);
  const restoredRef = useRef(!isExistingDraft && !isEditMode);
  const autosaveTimerRef = useRef(null);
  const finalSavingRef = useRef(false);
  const savingDraftRef = useRef(false);

  // ==================================================
  // BILL
  // ==================================================

  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(getToday());
  const [editBillNo, setEditBillNo] = useState(false);
  const [loadingBillNumber, setLoadingBillNumber] = useState(!isEditMode);
  const [loadingInvoice, setLoadingInvoice] = useState(isEditMode);

  // ==================================================
  // CUSTOMER
  // ==================================================

  const [customer, setCustomer] = useState(null);
  const [toAddress, setToAddress] = useState("");
  const [site, setSite] = useState("");

  // ==================================================
  // BANK / SIGNATURE
  // ==================================================

  const [bank, setBank] = useState(null);
  const [signature, setSignature] = useState(null);
  const [showBankSelector, setShowBankSelector] = useState(false);
  const [showSignatureSelector, setShowSignatureSelector] = useState(false);

  // ==================================================
  // OTHER
  // ==================================================

  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(null);
  const [roundTotal, setRoundTotal] = useState(false);
  const [deepMode, setDeepMode] = useState(false);

  // ==================================================
  // ITEMS
  // ==================================================

  const {
    items,
    addItem,
    addManualRow,
    deleteItem,
    updateItem,
    moveItem,
    clearItems,
    setItems,
  } = useBillItems();

  const busy = saving || loadingInvoice;

  // ==================================================
  // TOTALS
  // ==================================================

  const subtotal = useMemo(() => {
    return Number(
      items
        .filter((item) => item.type === "product")
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
        .toFixed(2)
    );
  }, [items]);

  const grandTotal = useMemo(() => {
    if (roundTotal) return Math.round(subtotal);
    return Number(subtotal.toFixed(2));
  }, [subtotal, roundTotal]);

  const roundOff = Number((grandTotal - subtotal).toFixed(2));

  const amountInWords = useMemo(() => {
    try {
      return convertNumberToWordsIndian(grandTotal);
    } catch {
      return "";
    }
  }, [grandTotal]);

  // ==================================================
  // KEEP DRAFT ID IN SYNC
  // ==================================================

  useEffect(() => {
    if (isEditMode) return;
    if (draftId) setCurrentDraftId(draftId);
  }, [draftId, isEditMode]);

  // ==================================================
  // RESTORE EXISTING DRAFT
  // ==================================================

  useEffect(() => {
    if (isEditMode) return;

    /*
     * The new-bill setup persists draftId across reloads. Restore
     * an existing IndexedDB record for that ID even when the mode
     * is still "new"; a genuinely new bill simply has no record yet.
     */
    const exactDraftId = draftId || draft?.id;

    if (!isExistingDraft && !exactDraftId) {
      restoringRef.current = false;
      restoredRef.current = true;
      return;
    }

    if (!exactDraftId) {
      restoringRef.current = false;
      restoredRef.current = false;
      console.error("Core Cutting existing draft has no draft ID.");
      return;
    }

    let cancelled = false;

    async function restoreDraft() {
      restoringRef.current = true;
      restoredRef.current = false;

      try {
        // IndexedDB contains the latest autosaved state. The `draft`
        // prop can be an older Dashboard/localStorage snapshot, so
        // only use it as a fallback if the record is not in IndexedDB.
        const latestDraft = await getDraft(exactDraftId);
        const savedDraft =
          latestDraft ||
          (String(draft?.id) === String(exactDraftId) ? draft : null);

        if (cancelled) return;

        if (!savedDraft || String(savedDraft.id) !== String(exactDraftId)) {
          if (isExistingDraft) {
            console.error("Core Cutting draft was not found:", exactDraftId);
            restoredRef.current = false;
            restoringRef.current = false;
          } else {
            restoredRef.current = true;
            restoringRef.current = false;
          }
          return;
        }

        originalDraftRef.current = savedDraft;
        createdAtRef.current =
          savedDraft.createdAt || createdAtRef.current;
        setCurrentDraftId(savedDraft.id);

        setBillDate(savedDraft.billDate || getToday());
        setDeepMode(Boolean(savedDraft.deepMode || savedDraft.items?.some((item) => item.deepMode)));
        setEditBillNo(false);

        const savedCustomer = savedDraft.customer || null;
        setCustomer(savedCustomer);
        setToAddress(
          savedDraft.customerTo ?? savedCustomer?.to_address ?? ""
        );
        setSite(savedDraft.customerSite ?? savedCustomer?.site ?? "");

        setBank(savedDraft.bank || null);
        setSignature(
          savedDraft.signature ||
            (savedDraft.signaturePath
              ? { path: savedDraft.signaturePath }
              : null)
        );

        setItems(
          Array.isArray(savedDraft.items)
            ? savedDraft.items.map((item, index) => ({
                ...item,
                id: item.id || crypto.randomUUID(),
                sort_order: item.sort_order ?? index,
                showSrNo:
                  item.type === "manual" || item.is_manual === true
                    ? (
                        String(item.particular || "").trim() === ""
                          ? false
                          : Boolean(
                              item.showSrNo ??
                              item.show_sr_no ??
                              false
                            )
                      )
                    : true,
                bold: Boolean(item.bold),
                center: Boolean(item.center),
              }))
            : []
        );

        setRoundTotal(Boolean(savedDraft.isRounded));
        restoredRef.current = true;
      } catch (error) {
        console.error("Core Cutting draft restore error:", error);
        restoredRef.current = false;
      } finally {
        if (!cancelled) {
          restoringRef.current = false;
        }
      }
    }

    restoreDraft();

    return () => {
      cancelled = true;
    };
  }, [draftId, draft, isExistingDraft, isEditMode, setItems]);

  // ==================================================
  // LOAD EXISTING INVOICE FOR EDIT
  // ==================================================

  useEffect(() => {
    if (!isEditMode) {
      setLoadingInvoice(false);
      return;
    }

    if (!profile?.id || !invoiceId) {
      setLoadingInvoice(false);
      restoredRef.current = false;
      return;
    }

    let cancelled = false;

    async function loadInvoiceForEdit() {
      setLoadingInvoice(true);
      restoringRef.current = true;
      restoredRef.current = false;

      try {
        const result = await getInvoiceItems({
          profile,
          invoiceId,
        });

        if (cancelled) return;

        const savedInvoice = result?.invoice;
        const savedItems = result?.items || [];

        if (!savedInvoice) {
          throw new Error("The Core Cutting bill could not be found.");
        }

        // Existing bill number must be preserved while editing.
        setBillNo(String(savedInvoice.bill_number || ""));
        setBillDate(savedInvoice.bill_date || getToday());
        setEditBillNo(false);

        const restoredCustomer = {
          id: savedInvoice.customer_id || null,
          to_address: savedInvoice.customer_to || "",
          site: savedInvoice.customer_site || "",
        };

        setCustomer(
          savedInvoice.customer_id ? restoredCustomer : null
        );
        setToAddress(savedInvoice.customer_to || "");
        setSite(savedInvoice.customer_site || "");

        if (savedInvoice.bank_id) {
          setBank({
            id: savedInvoice.bank_id || null,
            bank_name: savedInvoice.bank_name || "",
            account_number: savedInvoice.bank_account_number || "",
            ifsc_code: savedInvoice.bank_ifsc_code || "",
            branch: savedInvoice.bank_branch || "",
          });
        } else {
          setBank(null);
        }

        setSignature(
          savedInvoice.signature_path
            ? {
                path: savedInvoice.signature_path,
                storage_path: savedInvoice.signature_path,
              }
            : null
        );

        setRoundTotal(Boolean(savedInvoice.is_rounded));
        setDeepMode(Boolean(savedInvoice.deep_mode));

        setItems(
          savedItems.map((item, index) => {
            const isManual = Boolean(item.is_manual);
            const qty = isManual
              ? item.qty ?? null
              : Number(item.qty) || 0;
            const rate = isManual
              ? item.rate ?? null
              : Number(item.rate) || 0;
            const deep = isManual ? item.deep ?? null : Number(item.deep) || 0;
            const itemDeepMode = Boolean(item.deepMode);
            const amount = isManual
              ? item.amount ?? null
              : Number(((itemDeepMode ? deep : 1) * (Number(qty) || 0) * (Number(rate) || 0)).toFixed(2));

            return {
              id: item.id || crypto.randomUUID(),
              type: isManual ? "manual" : "product",
              productId: item.product_id || null,
              particular: item.particular || "",
              notes: item.notes || "",
              qty,
              unit: item.unit || "",
              rate,
              deep,
              deepMode: itemDeepMode,
              amount,
              sort_order: item.sort_order ?? index,
              isManual,
              showSrNo:
                isManual
                  ? (
                      String(item.particular || "").trim() === ""
                        ? false
                        : Boolean(
                            item.show_sr_no ??
                            item.showSrNo ??
                            false
                          )
                    )
                  : true,
              bold: Boolean(item.bold),
              center: Boolean(item.center),
            };
          })
        );

        // Resume the same unfinished edit for this invoice, if one exists.
        const editDraft = await getDraft(`edit-${invoiceId}`);
        if (cancelled) return;
        if (editDraft && String(editDraft.invoiceId || "") === String(invoiceId)) {
          originalDraftRef.current = editDraft;
          createdAtRef.current = editDraft.createdAt || createdAtRef.current;
          setBillNo(String(editDraft.billNumber || billNo || ""));
          setBillDate(editDraft.billDate || billDate);
          setCustomer(editDraft.customer || null);
          setToAddress(editDraft.customerTo ?? editDraft.customer?.to_address ?? toAddress);
          setSite(editDraft.customerSite ?? editDraft.customer?.site ?? site);
          setBank(editDraft.bank || null);
          setSignature(editDraft.signature || (editDraft.signaturePath ? { path: editDraft.signaturePath } : null));
          setRoundTotal(Boolean(editDraft.isRounded ?? editDraft.roundTotal));
          if (Array.isArray(editDraft.items)) setItems(editDraft.items);
        }
        restoredRef.current = true;
      } catch (error) {
        console.error("Unable to load Core Cutting bill for editing:", error);
        restoredRef.current = false;
        if (!cancelled) {
          alert(error?.message || "Unable to load this Core Cutting bill.");
        }
      } finally {
        if (!cancelled) {
          restoringRef.current = false;
          setLoadingInvoice(false);
        }
      }
    }

    loadInvoiceForEdit();

    return () => {
      cancelled = true;
    };
  }, [isEditMode, invoiceId, profile?.id, setItems]);

  // ==================================================
  // BILL NUMBER FOR NEW / EXISTING DRAFT ONLY
  // ==================================================

  useEffect(() => {
    if (isEditMode) {
      setLoadingBillNumber(false);
      return;
    }

    let cancelled = false;

    async function loadNumber() {
      if (!profile?.id || !company?.id) {
        setBillNo("01");
        setLoadingBillNumber(false);
        return;
      }

      setLoadingBillNumber(true);

      try {
        const number = await getNextBillNumber({
          userId: profile.id,
          companyId: company.id,
          billType: "corecutting",
        });

        if (!cancelled && !editBillNo) {
          setBillNo(String(number || "01"));
        }
      } catch (error) {
        console.error("Core Cutting bill number error:", error);
        if (!cancelled) setBillNo("01");
      } finally {
        if (!cancelled) setLoadingBillNumber(false);
      }
    }

    loadNumber();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, company?.id, isExistingDraft, isEditMode, editBillNo]);

  // ==================================================
  // AUTOMATIC DRAFT SAVE
  // ==================================================

  useEffect(() => {
    // Editing a final invoice never uses IndexedDB drafts.

    if (
      !profile?.id ||
      !company?.id ||
      !currentDraftId ||
      restoringRef.current ||
      !restoredRef.current ||
      finalSavingRef.current
    ) {
      return;
    }

    clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      if (savingDraftRef.current || finalSavingRef.current) return;

      const draftData = buildDraftData({
        profile,
        company,
        currentDraftId,
        billNo,
        billDate,
        customer,
        toAddress,
        site,
        bank,
        signature,
        items,
        deepMode,
        subtotal,
        grandTotal,
        roundTotal,
        roundOff,
        amountInWords,
        originalDraft: originalDraftRef.current,
        createdAt: createdAtRef.current,
      });

      draftData.invoiceId = isEditMode ? invoiceId : null;
      draftData.draftMode = isEditMode ? "edit" : "new";
      if (!hasMeaningfulDraftData(draftData)) return;

      try {
        savingDraftRef.current = true;
        await saveDraft(draftData);
      } catch (error) {
        console.error("Core Cutting draft auto-save error:", error);
      } finally {
        savingDraftRef.current = false;
      }
    }, DRAFT_SAVE_DELAY);

    const saveDraftOnExit = () => {
      if (finalSavingRef.current || restoringRef.current || !restoredRef.current) return;
      const draftData = buildDraftData({
        profile, company, currentDraftId, billNo, billDate, customer, toAddress, site,
        bank, signature, items, deepMode, subtotal, grandTotal, roundTotal, roundOff, amountInWords,
        originalDraft: originalDraftRef.current, createdAt: createdAtRef.current,
      });
      draftData.invoiceId = isEditMode ? invoiceId : null;
      draftData.draftMode = isEditMode ? "edit" : "new";
      if (hasMeaningfulDraftData(draftData)) {
        void saveDraft(draftData).catch((error) => console.error("Core Cutting exit-save failed:", error));
      }
    };
    window.addEventListener("pagehide", saveDraftOnExit);
    window.addEventListener("beforeunload", saveDraftOnExit);
    return () => {
      clearTimeout(autosaveTimerRef.current);
      window.removeEventListener("pagehide", saveDraftOnExit);
      window.removeEventListener("beforeunload", saveDraftOnExit);
    };
  }, [
    profile?.id,
    company?.id,
    currentDraftId,
    billNo,
    billDate,
    customer,
    toAddress,
    site,
    bank,
    signature,
    items,
    deepMode,
    subtotal,
    grandTotal,
    roundTotal,
    roundOff,
    amountInWords,
    isEditMode,
  ]);

  // ==================================================
  // CUSTOMER
  // ==================================================

  function handleCustomerChange(value) {
    setCustomer(value || null);

    if (value) {
      setToAddress(value.to_address || "");
      setSite(value.site || "");
    }
  }

  // ==================================================
  // VALIDATION
  // ==================================================

  function validateBill() {
    if (!profile?.id) return "User profile not found.";
    if (!company?.id) return "Company not selected.";

    const number = String(billNo || "").trim();
    if (!number) return "Bill number is required.";
    if (!/^\d+$/.test(number)) {
      return "Bill number must contain numbers only.";
    }
    if (!billDate) return "Bill date is required.";

    if (!toAddress.trim() && !site.trim()) {
      return "Please enter To or Site.";
    }

    if (!items.length) return "Please add at least one item.";

    if (!items.some((item) => item.type === "product")) {
      return "Please add at least one product item.";
    }

    // if (
    //   items.some(
    //     (item) => item.type === "product" && !item.productId
    //   )
    // ) {
    //   return "Every product row must be selected from the product list.";
    // }

    return null;
  }

  // ==================================================
  // START NEXT BILL - NEW BILL ONLY
  // ==================================================

  async function startNextBill() {
    if (isEditMode) return;

    const newDraftId = createDraftId();
    setCurrentDraftId(newDraftId);
    createdAtRef.current = new Date().toISOString();
    originalDraftRef.current = null;
    restoringRef.current = false;
    restoredRef.current = true;

    clearItems();
    setCustomer(null);
    setToAddress("");
    setSite("");
    setBank(null);
    setSignature(null);
    setShowBankSelector(false);
    setShowSignatureSelector(false);
    setRoundTotal(false);
    setEditBillNo(false);
    setBillDate(getToday());
    setBillNo("");
    setLoadingBillNumber(true);

    try {
      const nextNumber = await getNextBillNumber({
        userId: profile.id,
        companyId: company.id,
        billType: "corecutting",
      });
      setBillNo(String(nextNumber || "01"));
    } catch (error) {
      console.error("Next Core Cutting bill number error:", error);
      setBillNo("01");
    } finally {
      setLoadingBillNumber(false);
    }
  }

  // ==================================================
  // SAVE FINAL BILL / UPDATE EXISTING BILL
  // ==================================================

  async function handleSave() {
    if (saving) return;

    if (isEditMode && loadingInvoice) {
      alert("Please wait while the bill is being loaded.");
      return;
    }

    if (isEditMode && !restoredRef.current) {
      alert("The existing bill could not be loaded. It was not updated.");
      return;
    }

    const validationError = validateBill();
    if (validationError) {
      alert(validationError);
      return;
    }

    finalSavingRef.current = true;
    clearTimeout(autosaveTimerRef.current);

    try {
      setSaving(true);

      // ------------------------------------------------
      // UPDATE EXISTING FINAL INVOICE
      // ------------------------------------------------

      if (isEditMode) {
        const finalBillNo = String(billNo || "").trim();

        const updatedInvoice = await updateInvoice({
          profile,
          invoiceId,
          company,
          bank,
          customer: {
            ...(customer || {}),
            to_address: toAddress,
            site,
          },
          signaturePath:
            signature?.path ||
            signature?.storage_path ||
            invoice?.signature_path ||
            null,
          billType: "corecutting",
          deepMode,
          billNumber: finalBillNo,
          billDate,
          items,
          subtotal,
          sgstRate: 0,
          sgstAmount: 0,
          cgstRate: 0,
          cgstAmount: 0,
          grandTotal,
          isRounded: roundTotal,
          roundOff,
          amountInWords,
          // There is no notes field in the current Core Cutting UI.
          // Preserve the existing invoice notes instead of clearing them.
          notes: invoice?.notes || "",
        });

        if (!updatedInvoice?.id) {
          throw new Error("The Core Cutting bill was not updated.");
        }

        try {
          await deleteDraft(`edit-${invoiceId}`);
        } catch (draftCleanupError) {
          console.warn("Invoice updated, but its local edit draft could not be removed:", draftCleanupError);
        }

        alert(
          `Core Cutting Bill ${
            updatedInvoice.bill_number || finalBillNo
          } updated successfully.`
        );

        // Editing a final invoice never creates a new draft.
        onBack?.();
        return;
      }

      // ------------------------------------------------
      // SAVE NEW FINAL INVOICE
      // ------------------------------------------------

      let finalBillNo = String(billNo || "").trim();

      if (!editBillNo) {
        try {
          const latestNumber = await getNextBillNumber({
            userId: profile.id,
            companyId: company.id,
            billType: "corecutting",
          });

          finalBillNo = String(latestNumber || "01");
          setBillNo(finalBillNo);
        } catch (numberError) {
          console.error(
            "Core Cutting latest bill number error:",
            numberError
          );
          alert(
            "Unable to get the latest bill number. Bill was not saved."
          );
          return;
        }
      }

      const savedInvoice = await saveInvoice({
        profile,
        company,
        bank,
        customer: {
          ...(customer || {}),
          to_address: toAddress,
          site,
        },
        signaturePath:
          signature?.path || signature?.storage_path || null,
        billType: "corecutting",
        deepMode,
        billNumber: finalBillNo,
        billDate,
        items,
        sgstRate: 0,
        sgstAmount: 0,
        cgstRate: 0,
        cgstAmount: 0,
        subtotal,
        grandTotal,
        isRounded: roundTotal,
        roundOff,
        amountInWords,
        notes: "",
        draftId: currentDraftId,
      });

      if (!savedInvoice?.id) {
        throw new Error("Invoice was not saved.");
      }

      alert(
        `Core Cutting Bill ${
          savedInvoice.bill_number || finalBillNo
        } saved successfully.`
      );

      await startNextBill();
    } catch (error) {
      console.error(
        isEditMode
          ? "Core Cutting bill update error:"
          : "Core Cutting bill save error:",
        error
      );

      alert(
        error?.message ||
          (isEditMode
            ? "Something went wrong while updating the Core Cutting Bill."
            : "Something went wrong while saving the Core Cutting Bill.")
      );
    } finally {
      setSaving(false);
      finalSavingRef.current = false;
    }
  }

  // ==================================================
  // SAVE CURRENT DRAFT BEFORE LEAVING
  // ==================================================

  async function saveCurrentDraftImmediately() {
    if (
      !profile?.id ||
      !company?.id ||
      !currentDraftId ||
      restoringRef.current ||
      !restoredRef.current ||
      finalSavingRef.current
    ) {
      return;
    }

    const draftData = buildDraftData({
      profile,
      company,
      currentDraftId,
      billNo,
      billDate,
      customer,
      toAddress,
      site,
      bank,
      signature,
      items,
      subtotal,
      grandTotal,
      roundTotal,
      roundOff,
      amountInWords,
      originalDraft: originalDraftRef.current,
      createdAt: createdAtRef.current,
    });

    draftData.invoiceId = isEditMode ? invoiceId : null;
    draftData.draftMode = isEditMode ? "edit" : "new";
    if (!hasMeaningfulDraftData(draftData)) return;

    clearTimeout(autosaveTimerRef.current);
    await saveDraft(draftData);
  }

  // ==================================================
  // BACK
  // ==================================================

  async function handleBack() {
    if (saving) return;

    // Preserve unfinished edits before leaving the editor.
    if (isEditMode) {
      try {
        await saveCurrentDraftImmediately();
      } catch (error) {
        console.error("Unable to save the Core Cutting edit draft before leaving:", error);
      }
      onBack?.();
      return;
    }

    if (isExistingDraft && !restoredRef.current) {
      onBack?.();
      return;
    }

    const hasData =
      Boolean(toAddress.trim()) ||
      Boolean(site.trim()) ||
      Boolean(customer) ||
      Boolean(bank) ||
      Boolean(signature) ||
      Boolean(roundTotal) ||
      Boolean(editBillNo) ||
      items.length > 0;

    if (!hasData) {
      onBack?.();
      return;
    }

    try {
      await saveCurrentDraftImmediately();
      onBack?.();
    } catch (error) {
      console.error(
        "Core Cutting draft save before back error:",
        error
      );
      alert(
        "Unable to save the unfinished bill. Please try again."
      );
    }
  }

  // ==================================================
  // BANK / SIGNATURE
  // ==================================================

  function toggleBank() {
    if (busy) return;
    setShowBankSelector((value) => !value);
    setShowSignatureSelector(false);
  }

  function handleBankChange(value) {
    setBank(value || null);
    if (value) setShowBankSelector(false);
  }

  function toggleSignature() {
    if (busy) return;
    setShowSignatureSelector((value) => !value);
    setShowBankSelector(false);
  }

  function handleSignatureChange(value) {
    setSignature(value || null);
    if (value) setShowSignatureSelector(false);
  }

  // ==================================================
  // EDIT LOADING SCREEN
  // ==================================================

  if (isEditMode && loadingInvoice) {
    return (
      <div className="billing-page">
        <section className="billing-card">
          <div
            style={{
              minHeight: "300px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid #e5e7eb",
                borderTop: "4px solid #2563eb",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                marginBottom: "16px",
              }}
            />
            <h2>Loading Bill</h2>
            <p>Please wait while the existing Core Cutting bill is loaded.</p>
          </div>
        </section>
      </div>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="billing-page">
      <BillHeader
        title={
          isEditMode
            ? `Update Core Cutting Bill - ${
                company?.company_name || "Company"
              }`
            : "Core Cutting Bill"
        }
        company={company}
      />

      {isEditMode && (
        <div className="billing-edit-banner">
          <strong>Update Core Cutting Bill</strong>
          <span>
            Editing Bill No. {billNo || "—"} for {company?.company_name || "Company"}.
          </span>
        </div>
      )}

      {/* BILL INFORMATION */}
      <section className="billing-card">
        <div className="section-heading">Bill Information</div>

        <div className="bill-information-grid">
          <div>
            <label className="billing-label">Bill No.</label>

            <div className="bill-number-editor">
              <input
                type="text"
                inputMode="numeric"
                className="billing-input bill-number-input"
                value={billNo}
                disabled={
                  (!editBillNo && !isEditMode) ||
                  loadingBillNumber ||
                  busy
                }
                onChange={(event) =>
                  setBillNo(
                    event.target.value.replace(/\D/g, "")
                  )
                }
              />

              <label className="edit-bill-number-option">
                <input
                  type="checkbox"
                  checked={editBillNo}
                  disabled={busy}
                  onChange={(event) =>
                    setEditBillNo(event.target.checked)
                  }
                />
                <span>Edit Bill No.</span>
              </label>
            </div>

            <div className="billing-help-text">
              {isEditMode
                ? "Existing bill number is preserved unless you choose to edit it."
                : loadingBillNumber
                  ? "Loading next Core Cutting Bill number..."
                  : "Next bill number generated from the previous Core Cutting Bill."}
            </div>
          </div>

          <div className="bill-information-date">
            <label className="billing-label">Date</label>
            <input
              type="date"
              className="billing-input"
              value={billDate}
              disabled={busy}
              onChange={(event) => setBillDate(event.target.value)}
            />
          </div>
        </div>
      </section>

      {/* CUSTOMER */}
      <CustomerSection
        userId={profile?.id}
        customer={customer}
        toAddress={toAddress}
        site={site}
        onCustomerChange={handleCustomerChange}
        onToAddressChange={setToAddress}
        onSiteChange={setSite}
      />

      {/* PRODUCT ENTRY */}
      <div className="corecutting-deep-mode-toggle" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"12px 14px",margin:"12px 0",border:"1px solid #dbe3ef",borderRadius:10,background:deepMode ? "#eff6ff" : "#fff"}}>
        <div>
          <strong>Deep (in inch) × Rate per inch mode</strong>
          <div style={{fontSize:12,color:"#64748b",marginTop:3}}>Amount = Deep (in inch) × Rate per inch × Qty</div>
        </div>
        <button type="button" aria-pressed={deepMode} onClick={() => {
          const next = !deepMode;
          setDeepMode(next);
          setItems((previous) => previous.map((item) => item.type === "product" ? ({...item, deepMode: next, amount: (next ? (Number(item.deep) || 0) : 1) * (Number(item.qty) || 0) * (Number(item.rate) || 0)}) : item));
        }} style={{border:0,borderRadius:8,padding:"9px 14px",fontWeight:700,cursor:"pointer",background:deepMode ? "#2563eb" : "#e2e8f0",color:deepMode ? "#fff" : "#334155"}}>{deepMode ? "ON" : "OFF"}</button>
      </div>
      <ProductEntry
        userId={profile?.id}
        deepMode={deepMode}
        onAddItem={(item) => addItem({...item, deepMode})}
      />

      {/* ITEMS: Always render the table, including when the bill is empty. */}
      <BillItemsTable
        items={items}
        onDeleteItem={deleteItem}
        onUpdateItem={updateItem}
        onAddManualRow={addManualRow}
        onMoveItem={moveItem}
        userId={profile?.id}
        deepMode={deepMode}
      />

      {/* TOTALS */}
      <BillTotals
        subtotal={subtotal}
        sgstRate={0}
        sgstAmount={0}
        cgstRate={0}
        cgstAmount={0}
        grandTotal={grandTotal}
        roundOff={roundOff}
        roundTotal={roundTotal}
        setRoundTotal={setRoundTotal}
        amountInWords={amountInWords}
        isGst={false}
      />

      {/* BANK / SIGNATURE */}
      <section className="billing-bottom-options">
        <button
          type="button"
          className={`billing-bottom-option ${
            bank ? "has-selection" : ""
          }`}
          onClick={toggleBank}
          disabled={busy}
        >
          <span className="billing-bottom-option-icon">🏦</span>
          <span className="billing-bottom-option-content">
            <strong>{bank ? "Bank Selected" : "Bank Details"}</strong>
            <small>
              {bank
                ? bank.bank_name || "Selected bank"
                : "Select or add bank details"}
            </small>
          </span>
          <span className="billing-bottom-option-arrow">
            {showBankSelector ? "▲" : "▼"}
          </span>
        </button>

        <button
          type="button"
          className={`billing-bottom-option ${
            signature ? "has-selection" : ""
          }`}
          onClick={toggleSignature}
          disabled={busy}
        >
          <span className="billing-bottom-option-icon">✍</span>
          <span className="billing-bottom-option-content">
            <strong>
              {signature ? "Signature Selected" : "Signature"}
            </strong>
            <small>
              {signature
                ? signature.name ||
                  signature.file_name ||
                  "Selected signature"
                : "Select saved signature"}
            </small>
          </span>
          <span className="billing-bottom-option-arrow">
            {showSignatureSelector ? "▲" : "▼"}
          </span>
        </button>
      </section>

      {showBankSelector && (
        <section className="billing-bottom-panel">
          <BankSelector
            userId={profile?.id}
            selectedBank={bank}
            onBankChange={handleBankChange}
          />
        </section>
      )}

      {showSignatureSelector && (
        <section className="billing-bottom-panel">
          <SignatureSelector
            userId={profile?.id}
            selectedSignature={signature}
            onSignatureChange={handleSignatureChange}
          />
        </section>
      )}

      {/* ACTIONS */}
      <BillActions
        onPreview={() => setPreviewMode("preview")}
        onExport={() => setPreviewMode("print")}
        onSave={handleSave}
        onClear={handleBack}
        onBack={handleBack}
        saving={saving}
        saveLabel={isEditMode ? "Update Bill" : "Save Bill"}
      />

      {previewMode && (
        <BillPreviewModal
          bill={{
            billType: "corecutting",
            deepMode,
            company,
            companyName: company?.company_name || company?.companyName || "",
            bank,
            signature,
            // Add only this line:
signatureUrl: signature?.previewUrl || "",
            billNo,
            billDate,
            customer,
            customerTo: toAddress,
            site,
            items,
            subtotal,
            grandTotal,
            roundOff,
            amountInWords,
            sgstRate: 0,
            cgstRate: 0,
            sgstAmount: 0,
            cgstAmount: 0,
            bankName: bank?.bank_name || bank?.bankName || "",
            bankAccountNumber: bank?.account_number || bank?.account_no || bank?.accountNumber || "",
            bankIfscCode: bank?.ifsc_code || bank?.ifscCode || "",
            bankBranch: bank?.branch || "",
          }}
          autoPrint={previewMode === "print"}
          onClose={() => setPreviewMode(null)}
        />
      )}

    </div>
  );
}

// ============================================================
// DRAFT BUILDER
// ============================================================

function buildDraftData({
  profile,
  company,
  currentDraftId,
  billNo,
  billDate,
  customer,
  toAddress,
  site,
  bank,
  signature,
  items,
  deepMode = false,
  subtotal,
  grandTotal,
  roundTotal,
  roundOff,
  amountInWords,
  originalDraft,
  createdAt,
}) {
  return {
    id: currentDraftId,
    userId: profile?.id || null,
    companyId: company?.id || null,
    billType: "corecutting",
    deepMode: Boolean(deepMode),
    challanType: null,
    company: company ? { ...company } : null,
    companyName:
      company?.company_name || company?.companyName || "",
    companyGstNo:
      company?.gst_no || company?.gstNo || "",
    billNumber: String(billNo || "").trim(),
    billDate: billDate || getToday(),
    customer: customer
      ? { ...customer, to_address: toAddress, site }
      : { to_address: toAddress, site },
    customerId: customer?.id || null,
    customerTo: toAddress,
    customerSite: site,
    bank: bank ? { ...bank } : null,
    bankId: bank?.id || null,
    bankName: bank?.bank_name || bank?.bankName || "",
    bankAccountNumber:
      bank?.account_number ||
      bank?.accountNumber ||
      bank?.account_no ||
      "",
    bankIfscCode:
      bank?.ifsc_code || bank?.ifscCode || "",
    bankBranch: bank?.branch || "",
    signature: signature ? { ...signature } : null,
    signaturePath:
      signature?.path || signature?.storage_path || null,
    items: (items || []).map((item, index) => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      qty:
        item.qty == null ? null : Number(item.qty),
      rate:
        item.rate == null ? null : Number(item.rate),
      deep: item.deep == null ? null : Number(item.deep),
      deepMode: Boolean(item.deepMode || deepMode),
      amount:
        item.amount == null ? null : Number(item.amount),
      sort_order: item.sort_order ?? index,
      showSrNo:
        item.type === "manual" || item.is_manual === true
          ? (
              String(item.particular || "").trim() === ""
                ? false
                : Boolean(
                    item.showSrNo ??
                    item.show_sr_no ??
                    false
                  )
            )
          : true,
      bold: Boolean(item.bold),
      center: Boolean(item.center),
    })),
    subtotal: Number(subtotal) || 0,
    sgstRate: 0,
    sgstAmount: 0,
    cgstRate: 0,
    cgstAmount: 0,
    grandTotal: Number(grandTotal) || 0,
    isRounded: Boolean(roundTotal),
    roundOff: Number(roundOff) || 0,
    amountInWords: amountInWords || "",
    notes: "",
    isImportant: originalDraft?.isImportant ?? false,
    createdAt:
      originalDraft?.createdAt ||
      createdAt ||
      new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
