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

import CustomerSection from "../../components/billing/CustomerSection";
import BankSelector from "../../components/billing/BankSelector";
import SignatureSelector from "../../components/billing/SignatureSelector";
import ProductEntry from "../../components/billing/ProductEntry";
import BillItemsTable from "../../components/billing/BillItemsTable";
import BillActions from "../../components/billing/BillActions";
import BillPreviewModal from "../../components/billing/BillPreviewModal";

import "./BillingPages.css";

const DRAFT_SAVE_DELAY = 200;

const today = () =>
  new Date().toISOString().slice(0, 10);

export default function GstBill({
  profile,
  company,
  draftId,
  draftMode,
  draft,
  invoiceId,
  invoice,
  onBack,
}) {
  const isExistingDraft =
    draftMode === "existing";

  const isEditMode =
    draftMode === "edit" &&
    Boolean(invoiceId);

  /*
   * A bill can be:
   *
   * 1. brand-new
   * 2. an IndexedDB draft
   * 3. an existing Supabase invoice being edited
   *
   * Edit mode is NOT a draft.
   * Therefore edit mode never writes to IndexedDB.
   */

  const isNewBill =
    !isExistingDraft &&
    !isEditMode;

  // ============================================================
  // DRAFT / EDIT SESSION
  // ============================================================

  const [currentDraftId, setCurrentDraftId] =
    useState(
      draftId || (isEditMode ? `edit-${invoiceId}` : createDraftId())
    );

  const createdAtRef = useRef(
    draft?.createdAt ||
      new Date().toISOString()
  );

  const restoringRef = useRef(
    isExistingDraft || isEditMode
  );

  const restoredRef = useRef(
    isNewBill
  );

  const autosaveTimerRef =
    useRef(null);

  const savingDraftRef =
    useRef(false);

  const finalSavingRef =
    useRef(false);

  const originalDraftRef =
    useRef(draft || null);

  // ============================================================
  // BILL
  // ============================================================

  const [billNo, setBillNo] =
    useState("");

  const [editBillNo, setEditBillNo] =
    useState(false);

  const [billDate, setBillDate] =
    useState(today());

  const [
    loadingBillNumber,
    setLoadingBillNumber,
  ] = useState(true);

  const [
    loadingEditInvoice,
    setLoadingEditInvoice,
  ] = useState(isEditMode);

  // ============================================================
  // CUSTOMER
  // ============================================================

  const [customer, setCustomer] =
    useState(null);

  const [toAddress, setToAddress] =
    useState("");

  const [site, setSite] =
    useState("");

  // ============================================================
  // BANK / SIGNATURE
  // ============================================================

  const [bank, setBank] =
    useState(null);

  const [signature, setSignature] =
    useState(null);

  const [
    showBankSelector,
    setShowBankSelector,
  ] = useState(false);

  const [
    showSignatureSelector,
    setShowSignatureSelector,
  ] = useState(false);

  // ============================================================
  // GST / OPTIONS
  // ============================================================

  const [sgstRate, setSgstRate] =
    useState("9");

  const [cgstRate, setCgstRate] =
    useState("9");

  const [roundTotal, setRoundTotal] =
    useState(false);

  const [invoiceNotes, setInvoiceNotes] =
    useState("");

  const [saving, setSaving] =
    useState(false);
  const [previewMode, setPreviewMode] = useState(null);

  // ============================================================
  // ITEMS
  // ============================================================

  const {
    items,
    setItems,
    addItem,
    addManualRow,
    deleteItem,
    updateItem,
    moveItem,
    clearItems,
  } = useBillItems();

  // ============================================================
  // CALCULATIONS
  // ============================================================

  const subtotal = useMemo(
    () =>
      Number(
        items
          .filter(
            (item) =>
              item.type === "product"
          )
          .reduce(
            (sum, item) =>
              sum +
              (Number(item.qty) || 0) *
                (Number(item.rate) || 0),
            0
          )
          .toFixed(2)
      ),
    [items]
  );

  const sgstAmount = useMemo(
    () =>
      Number(
        (
          subtotal *
          (Number(sgstRate) || 0) /
          100
        ).toFixed(2)
      ),
    [subtotal, sgstRate]
  );

  const cgstAmount = useMemo(
    () =>
      Number(
        (
          subtotal *
          (Number(cgstRate) || 0) /
          100
        ).toFixed(2)
      ),
    [subtotal, cgstRate]
  );

  const totalBeforeRounding =
    Number(
      (
        subtotal +
        sgstAmount +
        cgstAmount
      ).toFixed(2)
    );

  const grandTotal = roundTotal
    ? Math.round(
        totalBeforeRounding
      )
    : totalBeforeRounding;

  const roundOff = Number(
    (
      grandTotal -
      totalBeforeRounding
    ).toFixed(2)
  );

  const amountInWords = useMemo(() => {
    try {
      return convertNumberToWordsIndian(
        grandTotal
      );
    } catch {
      return "";
    }
  }, [grandTotal]);

  // ============================================================
  // UPDATE DRAFT ID
  // ============================================================

  useEffect(() => {
    if (!draftId || isEditMode) {
      return;
    }

    setCurrentDraftId(
      draftId
    );
  }, [draftId, isEditMode]);

  // ============================================================
  // RESTORE EXISTING DRAFT
  // ============================================================

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    /*
     * After a reload, a new-bill session retains its draftId even
     * though its mode is still "new". Try restoring that exact ID.
     */
    const id =
      draftId ||
      draft?.id;

    if (!isExistingDraft && !id) {
      restoringRef.current = false;
      restoredRef.current = true;
      return;
    }

    if (!id) {
      console.error(
        "GST existing draft has no ID."
      );

      restoringRef.current = false;
      restoredRef.current = false;
      return;
    }

    let cancelled = false;

    async function restore() {
      restoringRef.current = true;
      restoredRef.current = false;

      try {
        // Always prefer the latest IndexedDB record over the draft
        // snapshot persisted by Dashboard, which may be stale after
        // continuing and editing a draft.
        const latestDraft = await getDraft(id);
        const savedDraft =
          latestDraft ||
          (String(draft?.id) === String(id) ? draft : null);

        if (cancelled) {
          return;
        }

        if (
          !savedDraft ||
          String(savedDraft.id) !==
            String(id)
        ) {
          if (isExistingDraft) {
            console.error(
              "GST draft was not found:",
              id
            );
            restoredRef.current = false;
            restoringRef.current = false;
          } else {
            // A first-time new bill has an ID before its first save.
            restoredRef.current = true;
            restoringRef.current = false;
          }
          return;
        }

        originalDraftRef.current =
          savedDraft;

        setCurrentDraftId(
          savedDraft.id
        );

        createdAtRef.current =
          savedDraft.createdAt ||
          createdAtRef.current;

        setBillDate(
          savedDraft.billDate ||
            today()
        );

        const savedCustomer =
          savedDraft.customer ||
          null;

        setCustomer(
          savedCustomer
        );

        setToAddress(
          savedDraft.customerTo ??
            savedCustomer?.to_address ??
            savedCustomer?.toAddress ??
            ""
        );

        setSite(
          savedDraft.customerSite ??
            savedCustomer?.site ??
            ""
        );

        setBank(
          savedDraft.bank ||
            null
        );

        setSignature(
          savedDraft.signature ||
            null
        );

        setSgstRate(
          String(
            savedDraft.sgstRate ?? 9
          )
        );

        setCgstRate(
          String(
            savedDraft.cgstRate ?? 9
          )
        );

        setRoundTotal(
          Boolean(
            savedDraft.isRounded ??
              savedDraft.roundTotal
          )
        );

        setInvoiceNotes(
          savedDraft.notes ||
            ""
        );

        setItems(
          Array.isArray(
            savedDraft.items
          )
            ? savedDraft.items.map(
                (item) => {
                  const product =
                    item.type ===
                    "product";

                  const qty =
                    product
                      ? Number(
                          item.qty
                        ) || 0
                      : item.qty ?? null;

                  const rate =
                    product
                      ? Number(
                          item.rate
                        ) || 0
                      : item.rate ?? null;

                  return {
                    ...item,

                    id:
                      item.id ||
                      crypto.randomUUID(),

                    productId:
                      item.productId ||
                      null,

                    particular:
                      item.particular ||
                      "",

                    notes:
                      item.notes ||
                      "",

                    unit:
                      item.unit ||
                      "",

                    type:
                      item.type ||
                      "product",

                    showSrNo:
                      item.type === "manual"
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

                    bold:
                      Boolean(
                        item.bold
                      ),

                    center:
                      Boolean(
                        item.center
                      ),

                    qty,

                    rate,

                    amount: product
                      ? Number(
                          (
                            qty *
                            rate
                          ).toFixed(2)
                        )
                      : item.amount ??
                        null,
                  };
                }
              )
            : []
        );

        restoredRef.current = true;
      } catch (error) {
        console.error(
          "Unable to restore GST bill draft:",
          error
        );

        restoredRef.current = false;
      } finally {
        if (!cancelled) {
          setTimeout(() => {
            if (!cancelled) {
              restoringRef.current =
                false;
            }
          }, 0);
        }
      }
    }

    restore();

    return () => {
      cancelled = true;
    };
  }, [
    draftId,
    draftMode,
    draft,
    isExistingDraft,
    isEditMode,
    setItems,
  ]);

  // ============================================================
  // RESTORE EXISTING SUPABASE INVOICE FOR EDIT
  // ============================================================

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    if (!profile?.id || !invoiceId) {
      setLoadingEditInvoice(false);
      restoredRef.current = false;
      restoringRef.current = false;
      return;
    }

    let cancelled = false;

    async function restoreInvoiceForEdit() {
      restoringRef.current = true;
      restoredRef.current = false;
      setLoadingEditInvoice(true);

      try {
        /*
         * Dashboard already supplies the invoice snapshot.
         *
         * It is still safer to use the invoice prop for the
         * header/snapshot values and fetch the authoritative
         * invoice items from Supabase.
         */
        const result =
          await getInvoiceItems({
            profile,
            invoiceId,
          });

        if (cancelled) {
          return;
        }

        const sourceInvoice =
          result?.invoice || invoice || null;

        const savedItems =
          Array.isArray(result?.items)
            ? result.items
            : [];

        if (!sourceInvoice) {
          throw new Error(
            "The GST bill could not be found."
          );
        }

        if (
          Number(sourceInvoice.isdelete) === 1
        ) {
          throw new Error(
            "This bill is deleted. Restore it before editing."
          );
        }

        /*
         * Bill number MUST remain the existing invoice number.
         *
         * Unlike draft mode, edit mode does NOT request
         * bill_number + 1.
         */
        setBillNo(
          String(
            sourceInvoice.bill_number ||
              ""
          )
        );

        setBillDate(
          sourceInvoice.bill_date ||
            today()
        );

        setInvoiceNotes(
          sourceInvoice.notes ||
            ""
        );

        setCustomer(
          sourceInvoice.customer_id
            ? {
                id:
                  sourceInvoice.customer_id,

                to_address:
                  sourceInvoice.customer_to ||
                  "",

                site:
                  sourceInvoice.customer_site ||
                  "",
              }
            : null
        );

        setToAddress(
          sourceInvoice.customer_to ||
            ""
        );

        setSite(
          sourceInvoice.customer_site ||
            ""
        );

        /*
         * Reconstruct the bank snapshot stored on the invoice.
         */
        if (sourceInvoice.bank_id) {
          setBank({
            id:
              sourceInvoice.bank_id ||
              null,

            bank_name:
              sourceInvoice.bank_name ||
              "",

            account_number:
              sourceInvoice.bank_account_number ||
              "",

            ifsc_code:
              sourceInvoice.bank_ifsc_code ||
              "",

            branch:
              sourceInvoice.bank_branch ||
              "",
          });
        } else {
          setBank(null);
        }

        /*
         * Reconstruct signature selection from the stored path.
         */
        if (
          sourceInvoice.signature_path
        ) {
          setSignature({
            path:
              sourceInvoice.signature_path,

            storage_path:
              sourceInvoice.signature_path,
          });
        } else {
          setSignature(null);
        }

        /*
         * Restore GST rates from the saved invoice.
         */
        setSgstRate(
          String(
            sourceInvoice.sgst_rate ??
              9
          )
        );

        setCgstRate(
          String(
            sourceInvoice.cgst_rate ??
              9
          )
        );

        setRoundTotal(
          Boolean(
            sourceInvoice.is_rounded
          )
        );

        /*
         * Load the authoritative item rows returned with the invoice.
         */
        setItems(
          savedItems.map(
                (item) => {
                  const product =
                    item.is_manual !==
                      true;

                  const qty =
                    product
                      ? Number(
                          item.qty
                        ) || 0
                      : item.qty ?? null;

                  const rate =
                    product
                      ? Number(
                          item.rate
                        ) || 0
                      : item.rate ?? null;

                  return {
                    /*
                     * useBillItems uses camelCase IDs.
                     */
                    id:
                      item.id ||
                      crypto.randomUUID(),

                    productId:
                      item.product_id ||
                      null,

                    particular:
                      item.particular ||
                      "",

                    notes:
                      item.notes ||
                      "",

                    qty,

                    unit:
                      item.unit ||
                      "",

                    rate,

                    amount: product
                      ? Number(
                          (
                            qty *
                            rate
                          ).toFixed(2)
                        )
                      : item.amount ??
                        null,

                    type:
                      product
                        ? "product"
                        : "manual",

                    is_manual:
                      Boolean(
                        item.is_manual
                      ),

                    showSrNo:
                      item.is_manual
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

                    bold:
                      Boolean(
                        item.bold
                      ),

                    center:
                      Boolean(
                        item.center
                      ),
                  };
                }
              )
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
          if (editDraft.sgstRate != null) setSgstRate(String(editDraft.sgstRate));
          if (editDraft.cgstRate != null) setCgstRate(String(editDraft.cgstRate));
          setInvoiceNotes(editDraft.notes || editDraft.invoiceNotes || "");
          if (Array.isArray(editDraft.items)) setItems(editDraft.items);
        }
        restoredRef.current = true;
      } catch (error) {
        console.error(
          "Unable to load GST invoice for edit:",
          error
        );

        alert(
          error?.message ||
            "Unable to load this GST bill for editing."
        );

        restoredRef.current = false;
      } finally {
        if (!cancelled) {
          restoringRef.current =
            false;

          setLoadingEditInvoice(
            false
          );
        }
      }
    }

    restoreInvoiceForEdit();

    return () => {
      cancelled = true;
    };
  }, [
    isEditMode,
    invoiceId,
    profile?.id,
    setItems,
  ]);

  // ============================================================
  // BILL NUMBER
  // ============================================================

  useEffect(() => {
    /*
     * Edit mode already has the final invoice number.
     *
     * NEVER replace it with next bill number.
     */
    if (isEditMode) {
      setLoadingBillNumber(false);
      return;
    }

    let cancelled = false;

    async function loadNumber() {
      setLoadingBillNumber(true);

      if (
        !profile?.id ||
        !company?.id
      ) {
        if (!cancelled) {
          setBillNo("01");
          setLoadingBillNumber(false);
        }

        return;
      }

      try {
        const number =
          await getNextBillNumber({
            userId:
              profile.id,

            companyId:
              company.id,

            billType:
              "gst",
          });

        if (!cancelled) {
          setBillNo(
            String(
              number || "01"
            )
          );
        }
      } catch (error) {
        console.error(
          "GST bill number error:",
          error
        );

        if (!cancelled) {
          setBillNo("01");
        }
      } finally {
        if (!cancelled) {
          setLoadingBillNumber(false);
        }
      }
    }

    loadNumber();

    return () => {
      cancelled = true;
    };
  }, [
    profile?.id,
    company?.id,
    isEditMode,
  ]);

  // ============================================================
  // CUSTOMER
  // ============================================================

  function handleCustomerChange(
    value
  ) {
    setCustomer(
      value || null
    );

    if (value) {
      setToAddress(
        value.to_address ||
          ""
      );

      setSite(
        value.site ||
          ""
      );
    }
  }

  // ============================================================
  // AUTOMATIC DRAFT SAVE
  // ============================================================

  useEffect(() => {
    /*
     * Edit mode NEVER writes to IndexedDB.
     */

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

    clearTimeout(
      autosaveTimerRef.current
    );

    autosaveTimerRef.current =
      setTimeout(
        async () => {
          if (
            savingDraftRef.current ||
            finalSavingRef.current
          ) {
            return;
          }

          const draftToSave =
            buildGstDraft({
              profile,
              company,
              billNo,
              billDate,
              customer,
              toAddress,
              site,
              bank,
              signature,
              sgstRate,
              cgstRate,
              roundTotal,
              items,
              subtotal,
              sgstAmount,
              cgstAmount,
              grandTotal,
              roundOff,
              amountInWords,
              invoiceNotes,
              draftId:
                currentDraftId,

              originalDraft:
                originalDraftRef.current,

              createdAt:
                createdAtRef.current,
            });

          draftToSave.invoiceId = isEditMode ? invoiceId : null;
          draftToSave.draftMode = isEditMode ? "edit" : "new";

          if (
            !hasMeaningfulDraftData(
              draftToSave
            )
          ) {
            return;
          }

          try {
            if (
              finalSavingRef.current
            ) {
              return;
            }

            savingDraftRef.current =
              true;

            await saveDraft(
              draftToSave
            );

            console.log(
              "GST draft saved:",
              draftToSave.id
            );
          } catch (error) {
            console.error(
              "GST draft save failed:",
              error
            );
          } finally {
            savingDraftRef.current =
              false;
          }
        },
        DRAFT_SAVE_DELAY
      );

    const saveDraftOnExit = () => {
      if (finalSavingRef.current || restoringRef.current || !restoredRef.current) return;
      const draftData = buildGstDraft({
        profile, company, billNo, billDate, customer, toAddress, site, bank, signature,
        sgstRate, cgstRate, roundTotal, items, subtotal, sgstAmount, cgstAmount,
        grandTotal, roundOff, amountInWords, invoiceNotes,
        draftId: currentDraftId, originalDraft: originalDraftRef.current,
        createdAt: createdAtRef.current,
      });
      draftData.invoiceId = isEditMode ? invoiceId : null;
      draftData.draftMode = isEditMode ? "edit" : "new";
      if (hasMeaningfulDraftData(draftData)) {
        void saveDraft(draftData).catch((error) => console.error("GST bill exit-save failed:", error));
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
    isEditMode,
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
    sgstRate,
    cgstRate,
    roundTotal,
    items,
    subtotal,
    sgstAmount,
    cgstAmount,
    grandTotal,
    roundOff,
    amountInWords,
    invoiceNotes,
  ]);

  // ============================================================
  // VALIDATION
  // ============================================================

  function validateBill() {
    if (!profile?.id) {
      return "User profile not found.";
    }

    if (!company?.id) {
      return "Company not selected.";
    }

    if (!company?.gst_no?.trim()) {
      return "Company GST number is required.";
    }

    const number =
      String(
        billNo || ""
      ).trim();

    if (!number) {
      return "Bill number is required.";
    }

    if (!/^\d+$/.test(number)) {
      return "Bill number must contain numbers only.";
    }

    if (!billDate) {
      return "Bill date is required.";
    }

    if (
      !toAddress.trim() &&
      !site.trim()
    ) {
      return "Please enter To or Site.";
    }

    if (!items.length) {
      return "Please add at least one item.";
    }

    if (
      !items.some(
        (item) =>
          item.type ===
          "product"
      )
    ) {
      return "Please add at least one product item.";
    }

    // if (
    //   items.some(
    //     (item) =>
    //       item.type ===
    //         "product" &&
    //       !item.productId
    //   )
    // ) {
    //   return "Every product row must have a product selected.";
    // }

    if (
      !Number.isFinite(
        Number(sgstRate)
      ) ||
      Number(sgstRate) < 0
    ) {
      return "Please enter a valid SGST percentage.";
    }

    if (
      !Number.isFinite(
        Number(cgstRate)
      ) ||
      Number(cgstRate) < 0
    ) {
      return "Please enter a valid CGST percentage.";
    }

    return null;
  }

  // ============================================================
  // START NEXT NEW BILL
  // ============================================================

  async function startNextBill() {
    const newDraftId =
      createDraftId();

    setCurrentDraftId(
      newDraftId
    );

    createdAtRef.current =
      new Date().toISOString();

    restoredRef.current = true;
    restoringRef.current = false;

    originalDraftRef.current =
      null;

    clearItems();

    setCustomer(null);
    setToAddress("");
    setSite("");

    setBank(null);
    setSignature(null);

    setShowBankSelector(false);
    setShowSignatureSelector(false);

    setSgstRate("9");
    setCgstRate("9");

    setRoundTotal(false);
    setInvoiceNotes("");

    setEditBillNo(false);
    setBillDate(today());
    setBillNo("");
    setLoadingBillNumber(true);

    try {
      const number =
        await getNextBillNumber({
          userId:
            profile.id,

          companyId:
            company.id,

          billType:
            "gst",
        });

      setBillNo(
        String(
          number || "01"
        )
      );
    } catch (error) {
      console.error(
        "Next GST bill number error:",
        error
      );

      setBillNo("01");
    } finally {
      setLoadingBillNumber(false);
    }
  }

  // ============================================================
  // SAVE
  // ============================================================

  async function handleSave() {
    if (saving) {
      return;
    }

    const error =
      validateBill();

    if (error) {
      alert(error);
      return;
    }

    try {
      setSaving(true);

      finalSavingRef.current =
        true;

      clearTimeout(
        autosaveTimerRef.current
      );

      /*
       * ========================================================
       * EDIT EXISTING INVOICE
       * ========================================================
       */

      if (isEditMode) {
        const invoiceResult =
          await updateInvoice({
            profile,
            invoiceId,

            company,
            bank,

            customer: {
              ...(customer || {}),

              to_address:
                toAddress,

              site,
            },

            signaturePath:
              signature?.path ||
              signature?.storage_path ||
              invoice?.signature_path ||
              null,

            billType:
              "gst",

            /*
             * In edit mode this is the existing bill number.
             * It may only change when the user explicitly
             * enables Edit.
             */
            billNumber:
              String(
                billNo || ""
              ).trim(),

            billDate,

            items,

            subtotal,

            sgstRate:
              Number(
                sgstRate
              ) || 0,

            sgstAmount,

            cgstRate:
              Number(
                cgstRate
              ) || 0,

            cgstAmount,

            grandTotal,

            isRounded:
              roundTotal,

            roundOff,

            amountInWords,

            notes:
              invoiceNotes ||
              "",
          });

        if (!invoiceResult?.id) {
          throw new Error(
            "GST bill update failed."
          );
        }

        try {
          await deleteDraft(`edit-${invoiceId}`);
        } catch (draftCleanupError) {
          console.warn("Invoice updated, but its local edit draft could not be removed:", draftCleanupError);
        }

        alert(
          `GST Bill ${
            invoiceResult.bill_number ||
            billNo
          } updated successfully.`
        );

        onBack?.();

        return;
      }

      /*
       * ========================================================
       * NEW BILL / EXISTING DRAFT
       * ========================================================
       */

      let finalBillNo;

      if (!editBillNo) {
        try {
          finalBillNo =
            String(
              await getNextBillNumber({
                userId:
                  profile.id,

                companyId:
                  company.id,

                billType:
                  "gst",
              })
            );

          setBillNo(
            finalBillNo
          );
        } catch (error) {
          console.error(
            "Latest GST bill number error:",
            error
          );

          alert(
            "Unable to get the latest bill number. Bill was not saved."
          );

          return;
        }
      } else {
        finalBillNo =
          String(
            billNo || ""
          ).trim();
      }

      const invoiceResult =
        await saveInvoice({
          profile,

          company,

          bank,

          customer: {
            ...(customer || {}),

            to_address:
              toAddress,

            site,
          },

          signaturePath:
            signature?.path ||
            signature?.storage_path ||
            null,

          billType:
            "gst",

          billNumber:
            finalBillNo,

          billDate,

          items,

          subtotal,

          sgstRate:
            Number(
              sgstRate
            ) || 0,

          sgstAmount,

          cgstRate:
            Number(
              cgstRate
            ) || 0,

          cgstAmount,

          grandTotal,

          isRounded:
            roundTotal,

          roundOff,

          amountInWords,

          notes:
            invoiceNotes ||
            "",

          draftId:
            currentDraftId,
        });

      if (!invoiceResult?.id) {
        throw new Error(
          "Invoice was not saved."
        );
      }

      alert(
        `GST Bill ${
          invoiceResult.bill_number ||
          invoiceResult.billNumber ||
          finalBillNo
        } saved successfully.`
      );

      await startNextBill();
    } catch (error) {
      console.error(
        "GST save/update error:",
        error
      );

      alert(
        error?.message ||
          "Something went wrong while saving the GST bill."
      );
    } finally {
      finalSavingRef.current =
        false;

      setSaving(false);
    }
  }

  async function saveCurrentDraftImmediately() {
    if (
      !profile?.id || !company?.id || !currentDraftId ||
      restoringRef.current || !restoredRef.current || finalSavingRef.current
    ) return;

    const draftData = buildGstDraft({
      profile, company, billNo, billDate, customer, toAddress, site, bank, signature,
      sgstRate, cgstRate, roundTotal, items, subtotal, sgstAmount, cgstAmount,
      grandTotal, roundOff, amountInWords, invoiceNotes,
      draftId: currentDraftId,
      originalDraft: originalDraftRef.current,
      createdAt: createdAtRef.current,
    });
    draftData.invoiceId = isEditMode ? invoiceId : null;
    draftData.draftMode = isEditMode ? "edit" : "new";

    if (!hasMeaningfulDraftData(draftData)) return;
    clearTimeout(autosaveTimerRef.current);
    await saveDraft(draftData);
  }

  // ============================================================
  // BACK
  // ============================================================

  async function handleBack() {
    if (saving) {
      return;
    }

    clearTimeout(
      autosaveTimerRef.current
    );

    /*
     * EDIT MODE:
     *
     * Never create an IndexedDB draft.
     *
     * The existing Supabase invoice remains unchanged until
     * the user clicks Update Bill.
     */
    if (isEditMode) {
      try {
        await saveCurrentDraftImmediately();
      } catch (error) {
        console.error("Unable to save the GST edit draft before leaving:", error);
      }
      onBack?.();
      return;
    }

    if (
      isExistingDraft &&
      !restoredRef.current
    ) {
      onBack?.();
      return;
    }

    if (
      finalSavingRef.current
    ) {
      return;
    }

    if (
      profile?.id &&
      company?.id &&
      currentDraftId
    ) {
      const draftToSave =
        buildGstDraft({
          profile,
          company,
          billNo,
          billDate,
          customer,
          toAddress,
          site,
          bank,
          signature,
          sgstRate,
          cgstRate,
          roundTotal,
          items,
          subtotal,
          sgstAmount,
          cgstAmount,
          grandTotal,
          roundOff,
          amountInWords,
          invoiceNotes,

          draftId:
            currentDraftId,

          originalDraft:
            originalDraftRef.current,

          createdAt:
            createdAtRef.current,
        });

      if (
        hasMeaningfulDraftData(
          draftToSave
        )
      ) {
        try {
          await saveDraft(
            draftToSave
          );
        } catch (error) {
          console.error(
            "GST draft save before Back failed:",
            error
          );
        }
      }
    }

    onBack?.();
  }

  // ============================================================
  // BANK / SIGNATURE
  // ============================================================

  function toggleBank() {
    if (saving) {
      return;
    }

    setShowBankSelector(
      (value) => !value
    );

    setShowSignatureSelector(
      false
    );
  }

  function handleBankChange(
    value
  ) {
    setBank(
      value || null
    );

    if (value) {
      setShowBankSelector(
        false
      );
    }
  }

  function toggleSignature() {
    if (saving) {
      return;
    }

    setShowSignatureSelector(
      (value) => !value
    );

    setShowBankSelector(
      false
    );
  }

  function handleSignatureChange(
    value
  ) {
    setSignature(
      value || null
    );

    if (value) {
      setShowSignatureSelector(
        false
      );
    }
  }

  // ============================================================
  // DISPLAY
  // ============================================================

  const companyName =
    company?.company_name ||
    "Company";

  const gstNo =
    company?.gst_no ||
    "—";

  const bankName =
    bank?.bank_name ||
    company?.bank_name ||
    "—";

  const accountNo =
    bank?.account_number ||
    company?.account_no ||
    "—";

  const ifsc =
    bank?.ifsc_code ||
    company?.ifsc_code ||
    "—";

  // ============================================================
  // EDIT LOADING
  // ============================================================

  if (
    isEditMode &&
    loadingEditInvoice
  ) {
    return (
      <div className="billing-page gst-billing-page">
        <div className="billing-loading">
          Loading GST Bill for editing...
        </div>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="billing-page gst-billing-page">

      <header className="gst-company-header">
        <h1 className="gst-company-title">
          {isEditMode
            ? `✏️ UPDATE GST BILL - ${companyName}`
            : `🧾 GST BILLING - ${companyName}`}
        </h1>

        <div className="gst-company-details">
          <div>
            <b>GST No.:</b>{" "}
            {gstNo}
          </div>

          <div>
            <b>Bank:</b>{" "}
            {bankName}
          </div>

          <div>
            <b>Acc No.:</b>{" "}
            {accountNo}
          </div>

          <div>
            <b>IFSC Code:</b>{" "}
            {ifsc}
          </div>
        </div>
      </header>

      {isEditMode && (
        <div className="billing-edit-banner">
          <strong>Update GST Bill</strong>
          <span>
            Editing Bill No. {billNo || "—"} for {companyName}
          </span>
        </div>
      )}

      {/* ======================================================
          BILL INFORMATION
          ====================================================== */}

      <section className="gst-bill-info">

        <div className="gst-bill-info-grid">

          <div className="gst-field">
            <label className="gst-field-label">
              Bill No.
            </label>

            <div className="gst-bill-number-wrapper">

              <input
                className="gst-input"
                value={billNo}
                disabled={
                  (!editBillNo &&
                    !isEditMode) ||
                  loadingBillNumber ||
                  saving
                }
                onChange={(e) =>
                  setBillNo(
                    e.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
              />

              <label className="gst-edit-label">
                <input
                  type="checkbox"
                  checked={
                    editBillNo
                  }
                  disabled={saving}
                  onChange={(e) =>
                    setEditBillNo(
                      e.target.checked
                    )
                  }
                />

                Edit
              </label>

            </div>

            {isEditMode && (
              <small className="billing-edit-help">
                Existing bill number is loaded.
                Enable Edit only if you intentionally
                want to change it.
              </small>
            )}

          </div>

          <div className="gst-field">

            <label className="gst-field-label">
              Date
            </label>

            <input
              type="date"
              className="gst-input"
              value={billDate}
              disabled={saving}
              onChange={(e) =>
                setBillDate(
                  e.target.value
                )
              }
            />

          </div>

        </div>

        <CustomerSection
          userId={profile?.id}
          customer={customer}
          toAddress={toAddress}
          site={site}
          onCustomerChange={
            handleCustomerChange
          }
          onToAddressChange={
            setToAddress
          }
          onSiteChange={
            setSite
          }
        />

        <div className="gst-rate-row">

          <div className="gst-rate-field">

            <label className="gst-field-label">
              SGST %
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              className="gst-input"
              value={sgstRate}
              disabled={saving}
              onChange={(e) =>
                setSgstRate(
                  e.target.value
                )
              }
            />

          </div>

          <div className="gst-rate-field">

            <label className="gst-field-label">
              CGST %
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              className="gst-input"
              value={cgstRate}
              disabled={saving}
              onChange={(e) =>
                setCgstRate(
                  e.target.value
                )
              }
            />

          </div>

        </div>

      </section>

      {/* ======================================================
          PRODUCT ENTRY
          ====================================================== */}

      <ProductEntry
        userId={profile?.id}
        onAddItem={addItem}
      />

      {/* Always show the items table, even before any products are added. */}
      <BillItemsTable
        items={items}
        onDeleteItem={deleteItem}
        onUpdateItem={updateItem}
        onAddManualRow={addManualRow}
        onMoveItem={moveItem}
        userId={profile?.id}
      />

      {/* ======================================================
          TOTALS
          ====================================================== */}

      <section className="gst-total-section">

        <div className="gst-total-top">

          <div className="gst-total-box">
            <b>TOTAL:</b>

            <span>
              ₹ {subtotal.toFixed(2)}
            </span>
          </div>

          <div className="gst-total-box">
            <b>SGST:</b>

            <span>
              ₹{" "}
              {sgstAmount.toFixed(
                2
              )}
            </span>
          </div>

          <div className="gst-total-box">
            <b>CGST:</b>

            <span>
              ₹{" "}
              {cgstAmount.toFixed(
                2
              )}
            </span>
          </div>

        </div>

        <div className="gst-grand-total-row">

          <b className="gst-grand-total-label">
            GRAND TOTAL:
          </b>

          <span className="gst-grand-total-value">
            ₹{" "}
            {grandTotal.toFixed(
              2
            )}
          </span>

          <span>
            Amount in words:
          </span>

          <i>
            {amountInWords ||
              "Zero Only"}
          </i>

          <label className="gst-round-button">

            <input
              type="checkbox"
              checked={
                roundTotal
              }
              disabled={saving}
              onChange={(e) =>
                setRoundTotal(
                  e.target.checked
                )
              }
            />

            Use Rounded Total

          </label>

          {roundTotal && (
            <span>
              Round Off: ₹{" "}
              {roundOff.toFixed(
                2
              )}
            </span>
          )}

        </div>

      </section>

      {/* ======================================================
          BANK / SIGNATURE
          ====================================================== */}

      <section className="gst-bottom-options">

        <button
          type="button"
          className="gst-bottom-button"
          onClick={
            toggleBank
          }
          disabled={saving}
        >
          🏦

          <span className="gst-bottom-content">

            <strong>
              {bank
                ? "Bank Selected"
                : "Bank Details"}
            </strong>

            <small>
              {bank?.bank_name ||
                "Select bank details"}
            </small>

          </span>

          {showBankSelector
            ? "▲"
            : "▼"}

        </button>

        <button
          type="button"
          className="gst-bottom-button"
          onClick={
            toggleSignature
          }
          disabled={saving}
        >
          ✍

          <span className="gst-bottom-content">

            <strong>
              {signature
                ? "Signature Selected"
                : "Signature"}
            </strong>

            <small>
              {signature?.name ||
                signature?.file_name ||
                "Select saved signature"}
            </small>

          </span>

          {showSignatureSelector
            ? "▲"
            : "▼"}

        </button>

      </section>

      {showBankSelector && (
        <section className="billing-bottom-panel">

          <BankSelector
            userId={
              profile?.id
            }
            selectedBank={
              bank
            }
            onBankChange={
              handleBankChange
            }
          />

        </section>
      )}

      {showSignatureSelector && (
        <section className="billing-bottom-panel">

          <SignatureSelector
            userId={
              profile?.id
            }
            selectedSignature={
              signature
            }
            onSignatureChange={
              handleSignatureChange
            }
          />

        </section>
      )}

      {/* ======================================================
          ACTIONS
          ====================================================== */}

      <BillActions
        onPreview={() => setPreviewMode("preview")}
        onExport={() => setPreviewMode("print")}
        onSave={
          handleSave
        }
        onClear={
          handleBack
        }
        onBack={
          handleBack
        }
        saving={
          saving
        }
        saveLabel={
          isEditMode
            ? "Update Bill"
            : "Save Bill"
        }
      />


      {previewMode && (
        <BillPreviewModal
          bill={{
            billType: "gst",
            company,
            companyName: company?.company_name || company?.companyName || "",
            bank: bank || (
              company?.bank_name ||
              company?.account_no ||
              company?.ifsc_code ||
              company?.bank_branch
                ? {
                    bank_name: company?.bank_name || "",
                    account_number: company?.account_no || "",
                    ifsc_code: company?.ifsc_code || "",
                    branch: company?.bank_branch || company?.branch || "",
                  }
                : null
            ),
            signature,
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
            sgstRate: Number(sgstRate) || 0,
            cgstRate: Number(cgstRate) || 0,
            sgstAmount,
            cgstAmount,
            bankName: bank?.bank_name || bank?.bankName || company?.bank_name || "",
            bankAccountNumber: bank?.account_number || bank?.account_no || bank?.accountNumber || company?.account_no || "",
            bankIfscCode: bank?.ifsc_code || bank?.ifscCode || company?.ifsc_code || "",
            bankBranch: bank?.branch || company?.bank_branch || company?.branch || "",
          }}
          autoPrint={previewMode === "print"}
          onClose={() => setPreviewMode(null)}
        />
      )}

    </div>
  );
}


// ============================================================
// GST DRAFT BUILDER
// ============================================================

function buildGstDraft({
  profile,
  company,
  billNo,
  billDate,
  customer,
  toAddress,
  site,
  bank,
  signature,
  sgstRate,
  cgstRate,
  roundTotal,
  items,
  subtotal,
  sgstAmount,
  cgstAmount,
  grandTotal,
  roundOff,
  amountInWords,
  invoiceNotes,
  draftId,
  originalDraft,
  createdAt,
}) {
  return {
    id:
      draftId,

    userId:
      profile?.id ||
      null,

    companyId:
      company?.id ||
      null,

    billType:
      "gst",

    challanType:
      null,

    company:
      company
        ? {
            ...company,
          }
        : null,

    companyName:
      company?.company_name ||
      company?.companyName ||
      "",

    companyGstNo:
      company?.gst_no ||
      company?.gstNo ||
      "",

    billNumber:
      String(
        billNo || ""
      ).trim(),

    billDate:
      billDate ||
      today(),

    customer:
      customer
        ? {
            ...customer,

            to_address:
              toAddress,

            site,
          }
        : {
            to_address:
              toAddress,

            site,
          },

    customerId:
      customer?.id ||
      null,

    customerTo:
      toAddress,

    customerSite:
      site,

    bank:
      bank
        ? {
            ...bank,
          }
        : null,

    bankId:
      bank?.id ||
      null,

    bankName:
      bank?.bank_name ||
      bank?.bankName ||
      "",

    bankAccountNumber:
      bank?.account_number ||
      bank?.accountNumber ||
      bank?.account_no ||
      "",

    bankIfscCode:
      bank?.ifsc_code ||
      bank?.ifscCode ||
      "",

    bankBranch:
      bank?.branch ||
      "",

    signature:
      signature
        ? {
            ...signature,
          }
        : null,

    signaturePath:
      signature?.path ||
      signature?.storage_path ||
      null,

    sgstRate:
      Number(
        sgstRate
      ) || 0,

    sgstAmount:
      Number(
        sgstAmount
      ) || 0,

    cgstRate:
      Number(
        cgstRate
      ) || 0,

    cgstAmount:
      Number(
        cgstAmount
      ) || 0,

    items:
      (items || []).map(
        (item) => {
          const product =
            item.type ===
            "product";

          const qty =
            product
              ? Number(
                  item.qty
                ) || 0
              : item.qty ?? null;

          const rate =
            product
              ? Number(
                  item.rate
                ) || 0
              : item.rate ?? null;

          return {
            ...item,

            id:
              item.id ||
              crypto.randomUUID(),

            productId:
              item.productId ||
              null,

            particular:
              item.particular ||
              "",

            notes:
              item.notes ||
              "",

            unit:
              item.unit ||
              "",

            type:
              item.type ||
              "product",

            showSrNo:
              item.type === "manual"
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

            bold:
              Boolean(
                item.bold
              ),

            center:
              Boolean(
                item.center
              ),

            qty,

            rate,

            amount:
              product
                ? Number(
                    (
                      qty *
                      rate
                    ).toFixed(2)
                  )
                : item.amount ??
                  null,
          };
        }
      ),

    subtotal:
      Number(
        subtotal
      ) || 0,

    grandTotal:
      Number(
        grandTotal
      ) || 0,

    isRounded:
      Boolean(
        roundTotal
      ),

    roundOff:
      Number(
        roundOff
      ) || 0,

    amountInWords:
      amountInWords ||
      "",

    notes:
      invoiceNotes ||
      "",

    isImportant:
      originalDraft?.isImportant ??
      false,

    createdAt:
      originalDraft?.createdAt ||
      createdAt ||
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  };
}
