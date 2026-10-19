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

const today = () =>
  new Date().toISOString().slice(0, 10);

const DRAFT_SAVE_DELAY = 200;


/* ============================================================
   NORMAL BILL
   ============================================================ */

export default function NormalBill({
  profile,
  company,

  draftId,
  draftMode,
  draft,

  /*
   * Used only when:
   *
   * draftMode === "edit"
   */
  invoiceId,
  invoice,

  onBack,
}) {
  // ==========================================================
  // MODES
  // ==========================================================

  const isExistingDraft =
    draftMode === "existing";

  const isEditMode =
    draftMode === "edit" &&
    Boolean(invoiceId);

  const isNewBill =
    !isExistingDraft &&
    !isEditMode;


  // ==========================================================
  // DRAFT
  // ==========================================================

  /*
   * Every NEW billing session receives a unique draft ID.
   *
   * IMPORTANT:
   *
   * Edit mode does NOT use IndexedDB drafts.
   */
  const [currentDraftId, setCurrentDraftId] =
    useState(
      draftId ||
        (isEditMode ? `edit-${invoiceId}` : createDraftId())
    );

  const createdAtRef =
    useRef(
      draft?.createdAt ||
        new Date().toISOString()
    );

  /*
   * Existing draft OR edit invoice must be restored
   * before any autosave can happen.
   */
  const restoringRef =
    useRef(
      isExistingDraft ||
        isEditMode
    );

  const restoredRef =
    useRef(
      !isExistingDraft &&
        !isEditMode
    );

  const autosaveTimerRef =
    useRef(null);

  const savingDraftRef =
    useRef(false);

  /*
   * Prevent autosave while final invoice is being saved.
   */
  const finalSavingRef =
    useRef(false);

  /*
   * Preserve the original IndexedDB draft.
   *
   * Used for:
   * - createdAt
   * - isImportant
   */
  const originalDraftRef =
    useRef(
      draft || null
    );


  // ==========================================================
  // BILL
  // ==========================================================

  const [billNo, setBillNo] =
    useState("");

  const [billDate, setBillDate] =
    useState(
      today()
    );

  const [editBillNo, setEditBillNo] =
    useState(false);

  const [
    loadingBillNumber,
    setLoadingBillNumber,
  ] = useState(
    !isEditMode
  );

  /*
   * Important when opening an existing invoice.
   */
  const [
    loadingInvoice,
    setLoadingInvoice,
  ] = useState(
    isEditMode
  );


  // ==========================================================
  // CUSTOMER
  // ==========================================================

  const [customer, setCustomer] =
    useState(null);

  const [toAddress, setToAddress] =
    useState("");

  const [site, setSite] =
    useState("");


  // ==========================================================
  // BANK / SIGNATURE
  // ==========================================================

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


  // ==========================================================
  // OPTIONS
  // ==========================================================

  const [roundTotal, setRoundTotal] =
    useState(false);

  const [saving, setSaving] =
    useState(false);
  const [previewMode, setPreviewMode] = useState(null);


  // ==========================================================
  // ITEMS
  // ==========================================================

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


  // ==========================================================
  // TOTALS
  // ==========================================================

  const subtotal = useMemo(
    () =>
      Number(
        items
          .filter(
            (item) =>
              item.type ===
              "product"
          )
          .reduce(
            (sum, item) =>
              sum +
              (Number(
                item.amount
              ) || 0),
            0
          )
          .toFixed(2)
      ),
    [items]
  );

  const grandTotal =
    roundTotal
      ? Math.round(
          subtotal
        )
      : subtotal;

  const roundOff =
    Number(
      (
        grandTotal -
        subtotal
      ).toFixed(2)
    );

  const amountInWords =
    useMemo(() => {
      try {
        return convertNumberToWordsIndian(
          grandTotal
        );
      } catch {
        return "";
      }
    }, [grandTotal]);


  // ==========================================================
  // KEEP DRAFT ID IN SYNC
  // ==========================================================

  useEffect(() => {
    /*
     * Edit mode never needs a draft ID.
     */
    if (isEditMode) {
      return;
    }

    if (!draftId) {
      return;
    }

    setCurrentDraftId(
      draftId
    );
  }, [
    draftId,
    isEditMode,
  ]);


  // ==========================================================
  // RESTORE EXISTING DRAFT
  // ==========================================================

  useEffect(() => {
    /*
     * This effect is ONLY for IndexedDB drafts.
     *
     * Edit mode has its own invoice-loading effect below.
     */
    if (isEditMode) {
      return;
    }

    /*
     * A new-bill setup can survive a browser refresh with the
     * same draftId while draftMode remains "new". Check IndexedDB
     * for that exact ID before treating it as a blank new bill.
     */
    const id =
      draftId ||
      draft?.id;

    if (!isExistingDraft && !id) {
      restoredRef.current = true;
      restoringRef.current = false;
      return;
    }

    if (!id) {
      console.error(
        "Normal bill draft ID is missing."
      );

      restoredRef.current =
        false;

      restoringRef.current =
        false;

      return;
    }

    let cancelled = false;

    async function restore() {
      restoringRef.current =
        true;

      restoredRef.current =
        false;

      try {
        /*
         * IndexedDB is the source of truth. Dashboard stores a draft
         * snapshot in localStorage for navigation, but that snapshot
         * can be stale after the user continues editing. Always read
         * the latest record first; use the supplied snapshot only if
         * no IndexedDB record exists yet.
         */
        const latestDraft = await getDraft(id);
        const savedDraft =
          latestDraft ||
          (String(draft?.id) === String(id) ? draft : null);

        if (cancelled) {
          return;
        }

        /*
         * Never create a replacement draft when
         * requested draft is missing.
         */
        if (
          !savedDraft ||
          String(
            savedDraft.id
          ) !==
            String(id)
        ) {
          if (isExistingDraft) {
            console.error(
              "Normal bill draft was not found:",
              id
            );
            restoredRef.current = false;
            restoringRef.current = false;
          } else {
            // No saved record yet is normal for a genuinely new bill.
            restoredRef.current = true;
            restoringRef.current = false;
          }

          return;
        }

        /*
         * Preserve exact original draft.
         */
        originalDraftRef.current =
          savedDraft;

        setCurrentDraftId(
          savedDraft.id
        );

        createdAtRef.current =
          savedDraft.createdAt ||
          createdAtRef.current;

        /*
         * IMPORTANT:
         *
         * Do NOT restore savedDraft.billNumber.
         *
         * The bill-number effect calculates the latest
         * final invoice number.
         */

        setBillDate(
          savedDraft.billDate ||
            today()
        );

        // ------------------------------------------------------
        // CUSTOMER
        // ------------------------------------------------------

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
            savedDraft.toAddress ??
            ""
        );

        setSite(
          savedDraft.customerSite ??
            savedCustomer?.site ??
            savedDraft.site ??
            ""
        );

        // ------------------------------------------------------
        // BANK
        // ------------------------------------------------------

        setBank(
          savedDraft.bank ||
            null
        );

        // ------------------------------------------------------
        // SIGNATURE
        // ------------------------------------------------------

        setSignature(
          savedDraft.signature ||
            null
        );

        // ------------------------------------------------------
        // ROUND TOTAL
        // ------------------------------------------------------

        setRoundTotal(
          Boolean(
            savedDraft.isRounded ??
              savedDraft.roundTotal
          )
        );

        // ------------------------------------------------------
        // ITEMS
        // ------------------------------------------------------

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
                      : item.qty ??
                        null;

                  const rate =
                    product
                      ? Number(
                          item.rate
                        ) || 0
                      : item.rate ??
                        null;

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

                    qty,

                    unit:
                      item.unit ||
                      "",

                    rate,

                    type:
                      item.type ||
                      "product",

                    rowType:
                      item.rowType ||
                      undefined,

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

                    amount:
                      product
                        ? Number(
                            (
                              qty *
                              rate
                            ).toFixed(
                              2
                            )
                          )
                        : item.amount ??
                          null,
                  };
                }
              )
            : []
        );

        restoredRef.current =
          true;
      } catch (error) {
        console.error(
          "Unable to restore normal bill draft:",
          error
        );

        /*
         * Keep false so autosave cannot create a
         * replacement draft.
         */
        restoredRef.current =
          false;
      } finally {
        if (!cancelled) {
          setTimeout(
            () => {
              if (!cancelled) {
                restoringRef.current =
                  false;
              }
            },
            0
          );
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


  // ==========================================================
  // LOAD EXISTING INVOICE FOR EDIT
  // ==========================================================

  useEffect(() => {
    /*
     * Only edit mode uses invoice loading.
     */
    if (!isEditMode) {
      setLoadingInvoice(
        false
      );

      return;
    }

    if (!profile?.id) {
      return;
    }

    if (!invoiceId) {
      console.error(
        "Normal bill edit mode requires invoiceId."
      );

      setLoadingInvoice(
        false
      );

      return;
    }

    let cancelled = false;

    async function loadInvoiceForEdit() {
      setLoadingInvoice(
        true
      );

      /*
       * Prevent autosave during invoice restoration.
       */
      restoringRef.current =
        true;

      restoredRef.current =
        false;

      try {
        const result =
          await getInvoiceItems({
            profile,
            invoiceId,
          });

        if (cancelled) {
          return;
        }

        const savedInvoice =
          result?.invoice;

        const savedItems =
          result?.items || [];

        if (!savedInvoice) {
          throw new Error(
            "The invoice could not be found."
          );
        }

        /*
         * ----------------------------------------------------
         * BILL NUMBER
         * ----------------------------------------------------
         *
         * Edit mode MUST use the existing bill number.
         */
        setBillNo(
          String(
            savedInvoice.bill_number ||
              ""
          )
        );

        /*
         * Existing bill number should not be replaced
         * by the automatic next number.
         */
        setEditBillNo(
          false
        );

        setBillDate(
          savedInvoice.bill_date ||
            today()
        );

        // ------------------------------------------------------
        // CUSTOMER
        // ------------------------------------------------------

        const restoredCustomer = {
          id:
            savedInvoice.customer_id ||
            null,

          to_address:
            savedInvoice.customer_to ||
            "",

          site:
            savedInvoice.customer_site ||
            "",
        };

        setCustomer(
          savedInvoice.customer_id
            ? restoredCustomer
            : null
        );

        setToAddress(
          savedInvoice.customer_to ||
            ""
        );

        setSite(
          savedInvoice.customer_site ||
            ""
        );

        // ------------------------------------------------------
        // BANK
        // ------------------------------------------------------

        /*
         * Invoice stores a bank snapshot.
         *
         * This means editing an old invoice does not
         * accidentally replace its historical bank details
         * with today's company bank.
         */
        if (
          savedInvoice.bank_id ||
          savedInvoice.bank_name ||
          savedInvoice.bank_account_number ||
          savedInvoice.bank_ifsc_code ||
          savedInvoice.bank_branch
        ) {
          setBank({
            id:
              savedInvoice.bank_id ||
              null,

            bank_name:
              savedInvoice.bank_name ||
              "",

            account_number:
              savedInvoice.bank_account_number ||
              "",

            ifsc_code:
              savedInvoice.bank_ifsc_code ||
              "",

            branch:
              savedInvoice.bank_branch ||
              "",
          });
        } else {
          setBank(null);
        }

        // ------------------------------------------------------
        // SIGNATURE
        // ------------------------------------------------------

        /*
         * SignatureSelector may normally return a complete
         * signature object.
         *
         * For an existing invoice we at least preserve the
         * saved storage path.
         */
        if (
          savedInvoice.signature_path
        ) {
          setSignature({
            path:
              savedInvoice.signature_path,

            storage_path:
              savedInvoice.signature_path,
          });
        } else {
          setSignature(null);
        }

        // ------------------------------------------------------
        // ROUNDING
        // ------------------------------------------------------

        setRoundTotal(
          Boolean(
            savedInvoice.is_rounded
          )
        );

        // ------------------------------------------------------
        // ITEMS
        // ------------------------------------------------------

        const restoredItems =
          savedItems.map(
            (item) => {
              const isManual =
                Boolean(
                  item.is_manual
                );

              const quantity =
                isManual
                  ? item.qty ??
                    null
                  : Number(
                      item.qty
                    ) || 0;

              const rate =
                isManual
                  ? item.rate ??
                    null
                  : Number(
                      item.rate
                    ) || 0;

              const amount =
                isManual
                  ? item.amount ??
                    0
                  : Number(
                      (
                        quantity *
                        rate
                      ).toFixed(
                        2
                      )
                    );

              return {
                id:
                  item.id ||
                  crypto.randomUUID(),

                type:
                  isManual
                    ? "manual"
                    : "product",

                productId:
                  item.product_id ||
                  null,

                particular:
                  item.particular ||
                  "",

                notes:
                  item.notes ||
                  "",

                qty:
                  quantity,

                unit:
                  item.unit ||
                  "",

                /*
                 * IMPORTANT:
                 *
                 * Rate comes from invoice_items.
                 *
                 * We do NOT load current product master
                 * price here.
                 */
                rate:
                  rate,

                amount:
                  amount,

                sortOrder:
                  item.sort_order,

                isManual:
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
          );

        setItems(
          restoredItems
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
        console.error(
          "Unable to load normal bill for editing:",
          error
        );

        if (!cancelled) {
          alert(
            error?.message ||
              "Unable to load this bill for editing."
          );

          restoredRef.current =
            false;
        }
      } finally {
        if (!cancelled) {
          restoringRef.current =
            false;

          setLoadingInvoice(
            false
          );
        }
      }
    }

    loadInvoiceForEdit();

    return () => {
      cancelled = true;
    };
  }, [
    isEditMode,
    invoiceId,
    profile?.id,
    setItems,
  ]);


  // ==========================================================
  // BILL NUMBER FOR NEW / EXISTING DRAFT
  // ==========================================================

  useEffect(() => {
    /*
     * EDIT MODE:
     *
     * Never calculate a new number.
     *
     * The invoice-loading effect sets the existing number.
     */
    if (isEditMode) {
      setLoadingBillNumber(
        false
      );

      return;
    }

    let cancelled = false;

    async function loadNumber() {
      setLoadingBillNumber(
        true
      );

      if (
        !profile?.id ||
        !company?.id
      ) {
        if (!cancelled) {
          setBillNo("01");

          setLoadingBillNumber(
            false
          );
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
              "normal",
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
          "Bill number error:",
          error
        );

        if (!cancelled) {
          setBillNo("01");
        }
      } finally {
        if (!cancelled) {
          setLoadingBillNumber(
            false
          );
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
    isExistingDraft,
    isEditMode,
  ]);


  // ==========================================================
  // CUSTOMER
  // ==========================================================

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


  // ==========================================================
  // AUTOMATIC DRAFT SAVE
  // ==========================================================

  useEffect(() => {
    /*
     * EDIT MODE MUST NEVER USE DRAFT AUTOSAVE.
     */

    /*
     * Do not save while:
     *
     * - profile/company unavailable
     * - existing draft is restoring
     * - existing draft failed to restore
     * - final invoice is being saved
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
            buildDraftFromState({
              profile,
              company,
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
              roundOff,
              amountInWords,
              roundTotal,

              draftId:
                currentDraftId,

              originalDraft:
                originalDraftRef.current,

              createdAt:
                createdAtRef.current,
            });

          /*
           * Blank bill must not create a draft.
           */
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
              "Normal bill draft saved:",
              draftToSave.id
            );
          } catch (error) {
            console.error(
              "Normal bill draft save failed:",
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
      const draftData = buildDraftFromState({
        profile, company, billNo, billDate, customer, toAddress, site, bank, signature,
        items, subtotal, grandTotal, roundOff, amountInWords, roundTotal,
        draftId: currentDraftId, originalDraft: originalDraftRef.current,
        createdAt: createdAtRef.current,
      });
      draftData.invoiceId = isEditMode ? invoiceId : null;
      draftData.draftMode = isEditMode ? "edit" : "new";
      if (hasMeaningfulDraftData(draftData)) {
        void saveDraft(draftData).catch((error) => console.error("Normal bill exit-save failed:", error));
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
    subtotal,
    grandTotal,
    roundOff,
    amountInWords,
    roundTotal,
    isEditMode,
  ]);


  // ==========================================================
  // VALIDATION
  // ==========================================================

  function validateBill() {
    if (!profile?.id) {
      return "User profile not found.";
    }

    if (!company?.id) {
      return "Company not selected.";
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
    //   return "Every product row must be selected from the product list.";
    // }

    return null;
  }


  // ==========================================================
  // RESET / NEXT BILL
  // ==========================================================

  async function startNextBill() {
    /*
     * This function is only for NEW bills.
     *
     * It is never used after editing an invoice.
     */
    const newId =
      createDraftId();

    clearItems();

    setCustomer(null);
    setToAddress("");
    setSite("");

    setBank(null);
    setSignature(null);

    setShowBankSelector(
      false
    );

    setShowSignatureSelector(
      false
    );

    setRoundTotal(false);
    setEditBillNo(false);

    setBillDate(
      today()
    );

    setCurrentDraftId(
      newId
    );

    createdAtRef.current =
      new Date().toISOString();

    originalDraftRef.current =
      null;

    restoredRef.current =
      true;

    restoringRef.current =
      false;

    setBillNo("");

    setLoadingBillNumber(
      true
    );

    try {
      const number =
        await getNextBillNumber({
          userId:
            profile.id,

          companyId:
            company.id,

          billType:
            "normal",
        });

      setBillNo(
        String(
          number || "01"
        )
      );
    } catch (error) {
      console.error(
        "Next bill number error:",
        error
      );

      setBillNo("01");
    } finally {
      setLoadingBillNumber(
        false
      );
    }
  }


  // ==========================================================
  // SAVE / UPDATE BILL
  // ==========================================================

  async function handleSave() {
    if (saving) {
      return;
    }

    /*
     * Do not allow saving while an edit invoice is still
     * being loaded.
     */
    if (isEditMode && loadingInvoice) {
      alert(
        "Please wait while the bill is being loaded."
      );

      return;
    }

    /*
     * Do not allow saving if edit-mode invoice failed
     * to restore.
     */
    if (
      isEditMode &&
      !restoredRef.current
    ) {
      alert(
        "The existing bill could not be loaded. It was not updated."
      );

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

      /*
       * Stop draft autosave before final operation.
       */
      finalSavingRef.current =
        true;

      clearTimeout(
        autosaveTimerRef.current
      );


      // ======================================================
      // EDIT EXISTING INVOICE
      // ======================================================

      if (isEditMode) {
        if (!invoiceId) {
          throw new Error(
            "Invoice ID is missing."
          );
        }

        /*
         * IMPORTANT:
         *
         * In edit mode we NEVER call getNextBillNumber().
         *
         * The current bill number is preserved unless the
         * user deliberately enables "Edit Bill No."
         */
        const finalBillNo =
          String(
            billNo || ""
          ).trim();

        const updatedInvoice =
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
              "normal",

            /*
             * Existing number.
             */
            billNumber:
              finalBillNo,

            billDate,

            items,

            subtotal,

            sgstRate: 0,
            sgstAmount: 0,

            cgstRate: 0,
            cgstAmount: 0,

            grandTotal,

            isRounded:
              roundTotal,

            roundOff,

            amountInWords,

            notes:
              invoice?.notes || "",
          });

        if (
          !updatedInvoice?.id
        ) {
          throw new Error(
            "The bill was not updated."
          );
        }

        try {
          await deleteDraft(`edit-${invoiceId}`);
        } catch (draftCleanupError) {
          console.warn("Invoice updated, but its local edit draft could not be removed:", draftCleanupError);
        }

        alert(
          `Bill ${
            updatedInvoice.bill_number ||
            updatedInvoice.billNumber ||
            finalBillNo
          } updated successfully.`
        );

        /*
         * IMPORTANT:
         *
         * Do NOT create a new draft.
         * Do NOT call startNextBill().
         *
         * Return to Bill Management.
         */
        onBack?.();

        return;
      }


      // ======================================================
      // NEW BILL
      // ======================================================

      /*
       * Get latest final number immediately before save.
       *
       * Draft bill number is never trusted.
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
                  "normal",
              })
            );

          setBillNo(
            finalBillNo
          );
        } catch (error) {
          console.error(
            "Latest bill number error:",
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


      // ======================================================
      // SAVE NEW INVOICE
      // ======================================================

      const savedInvoice =
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
            "normal",

          billNumber:
            finalBillNo,

          billDate,

          items,

          subtotal,

          sgstRate: 0,
          sgstAmount: 0,

          cgstRate: 0,
          cgstAmount: 0,

          grandTotal,

          isRounded:
            roundTotal,

          roundOff,

          amountInWords,

          notes: "",

          /*
           * Exact IndexedDB draft.
           */
          draftId:
            currentDraftId,
        });

      if (
        !savedInvoice?.id
      ) {
        throw new Error(
          "Invoice was not saved."
        );
      }

      alert(
        `Bill ${
          savedInvoice.bill_number ||
          savedInvoice.billNumber ||
          finalBillNo
        } saved successfully.`
      );

      /*
       * Create a completely fresh bill session.
       *
       * saveInvoice() has already deleted the exact
       * completed IndexedDB draft.
       */
      await startNextBill();
    } catch (error) {
      console.error(
        isEditMode
          ? "Update normal bill error:"
          : "Save normal bill error:",
        error
      );

      alert(
        error?.message ||
          (
            isEditMode
              ? "Something went wrong while updating the bill."
              : "Something went wrong while saving the bill."
          )
      );
    } finally {
      finalSavingRef.current =
        false;

      setSaving(false);
    }
  }


  // ==========================================================
  // BACK
  // ==========================================================

  async function handleBack() {
    if (saving) {
      return;
    }

    clearTimeout(
      autosaveTimerRef.current
    );

    /*
     * ========================================================
     * EDIT MODE
     * ========================================================
     *
     * NEVER create an IndexedDB draft when editing.
     *
     * The saved invoice is already in Supabase.
     */
    if (isEditMode) {
      try {
        const editDraft = buildDraftFromState({
          profile, company, billNo, billDate, customer, toAddress, site, bank, signature,
          items, subtotal, grandTotal, roundOff, amountInWords, roundTotal,
          draftId: currentDraftId, originalDraft: originalDraftRef.current,
          createdAt: createdAtRef.current,
        });
        editDraft.invoiceId = invoiceId;
        editDraft.draftMode = "edit";
        if (hasMeaningfulDraftData(editDraft)) await saveDraft(editDraft);
      } catch (error) {
        console.error("Unable to save the invoice edit draft before leaving:", error);
      }
      onBack?.();
      return;
    }

    /*
     * Never recreate an existing draft that failed to restore.
     */
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

    /*
     * For new/existing draft mode, save the current state
     * before leaving.
     */
    if (
      profile?.id &&
      company?.id &&
      currentDraftId
    ) {
      const draftToSave =
        buildDraftFromState({
          profile,
          company,
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
          roundOff,
          amountInWords,
          roundTotal,

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
            "Draft save before back failed:",
            error
          );
        }
      }
    }

    onBack?.();
  }


  // ==========================================================
  // BANK / SIGNATURE
  // ==========================================================

  function toggleBank() {
    if (saving) {
      return;
    }

    setShowBankSelector(
      (value) =>
        !value
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
      (value) =>
        !value
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


  // ==========================================================
  // LOADING EDIT INVOICE
  // ==========================================================

  if (
    isEditMode &&
    loadingInvoice
  ) {
    return (
      <div className="billing-page">

        <section className="billing-card">

          <div
            style={{
              minHeight:
                "300px",

              display:
                "flex",

              flexDirection:
                "column",

              alignItems:
                "center",

              justifyContent:
                "center",

              textAlign:
                "center",
            }}
          >
            <div
              style={{
                width:
                  "40px",

                height:
                  "40px",

                border:
                  "4px solid #e5e7eb",

                borderTop:
                  "4px solid #2563eb",

                borderRadius:
                  "50%",

                animation:
                  "spin 0.8s linear infinite",

                marginBottom:
                  "16px",
              }}
            />

            <h2>
              Loading Bill
            </h2>

            <p>
              Please wait while the
              existing bill is loaded.
            </p>
          </div>

        </section>

      </div>
    );
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="billing-page">

      <BillHeader
        title={
          isEditMode
            ? `Update Normal Bill - ${
                company?.company_name ||
                company?.companyName ||
                "Company"
              }`
            : "Normal Bill"
        }
        company={
          company
        }
      />

      {isEditMode && (
        <section
          className="billing-card"
          style={{
            marginBottom: "16px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "4px",
                }}
              >
                Update Billing
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#4b5563",
                }}
              >
                Company: {
                  company?.company_name ||
                  company?.companyName ||
                  "Company"
                }
              </div>
            </div>

            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#2563eb",
              }}
            >
              Editing saved bill #{billNo || "-"}
            </div>
          </div>
        </section>
      )}


      {/* ======================================================
          BILL INFORMATION
          ====================================================== */}

      <section className="billing-card">

        <div className="section-heading">
          {isEditMode
            ? "Update Bill Information"
            : "Bill Information"}
        </div>


        <div className="bill-information-grid">

          {/* ==================================================
              BILL NUMBER
              ================================================== */}

          <div>

            <label className="billing-label">
              Bill No.
            </label>

            <div className="bill-number-editor">

              <input
                type="text"
                inputMode="numeric"
                className="billing-input bill-number-input"
                value={
                  billNo
                }
                disabled={
                  (
                    !editBillNo &&
                    !isEditMode
                  ) ||
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


              <label className="edit-bill-number-option">

                <input
                  type="checkbox"
                  checked={
                    editBillNo
                  }
                  disabled={
                    saving
                  }
                  onChange={(e) =>
                    setEditBillNo(
                      e.target.checked
                    )
                  }
                />

                <span>
                  Edit Bill No.
                </span>

              </label>

            </div>


            <div className="billing-help-text">

              {isEditMode
                ? "Existing bill number is preserved unless you choose to edit it."
                : loadingBillNumber
                  ? "Loading bill number..."
                  : "Automatically generated from the previous bill."}

            </div>

          </div>


          {/* ==================================================
              DATE
              ================================================== */}

          <div className="bill-information-date">

            <label className="billing-label">
              Date
            </label>

            <input
              type="date"
              className="billing-input"
              value={
                billDate
              }
              disabled={
                saving
              }
              onChange={(e) =>
                setBillDate(
                  e.target.value
                )
              }
            />

          </div>

        </div>

      </section>


      {/* ======================================================
          CUSTOMER
          ====================================================== */}

      <CustomerSection
        userId={
          profile?.id
        }

        customer={
          customer
        }

        toAddress={
          toAddress
        }

        site={
          site
        }

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


      {/* ======================================================
          PRODUCT ENTRY
          ====================================================== */}

      <ProductEntry
        userId={
          profile?.id
        }

        onAddItem={
          addItem
        }
      />


      {/* ======================================================
          ITEMS TABLE
          ====================================================== */}

      {/* Always show the items table, even when the bill has no items yet. */}
      <BillItemsTable
        items={
          items
        }

        onDeleteItem={
          deleteItem
        }

        onUpdateItem={
          updateItem
        }

        onAddManualRow={
          addManualRow
        }

        onMoveItem={
          moveItem
        }

        userId={
          profile?.id
        }
      />


      {/* ======================================================
          TOTALS
          ====================================================== */}

      <BillTotals
        subtotal={
          subtotal
        }

        sgstRate={
          0
        }

        sgstAmount={
          0
        }

        cgstRate={
          0
        }

        cgstAmount={
          0
        }

        grandTotal={
          grandTotal
        }

        roundOff={
          roundOff
        }

        roundTotal={
          roundTotal
        }

        setRoundTotal={
          setRoundTotal
        }

        amountInWords={
          amountInWords
        }

        isGst={
          false
        }
      />


      {/* ======================================================
          BANK / SIGNATURE
          ====================================================== */}

      <section className="billing-bottom-options">

        {/* ====================================================
            BANK
            ==================================================== */}

        <button
          type="button"
          className={`billing-bottom-option ${
            bank
              ? "has-selection"
              : ""
          }`}
          onClick={
            toggleBank
          }
          disabled={
            saving
          }
        >

          <span className="billing-bottom-option-icon">
            🏦
          </span>

          <span className="billing-bottom-option-content">

            <strong>
              {bank
                ? "Bank Selected"
                : "Bank Details"}
            </strong>

            <small>
              {bank
                ? bank.bank_name ||
                  bank.bankName ||
                  "Selected bank"
                : "Select or add bank details"}
            </small>

          </span>

          <span className="billing-bottom-option-arrow">
            {showBankSelector
              ? "▲"
              : "▼"}
          </span>

        </button>


        {/* ====================================================
            SIGNATURE
            ==================================================== */}

        <button
          type="button"
          className={`billing-bottom-option ${
            signature
              ? "has-selection"
              : ""
          }`}
          onClick={
            toggleSignature
          }
          disabled={
            saving
          }
        >

          <span className="billing-bottom-option-icon">
            ✍
          </span>

          <span className="billing-bottom-option-content">

            <strong>
              {signature
                ? "Signature Selected"
                : "Signature"}
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
            {showSignatureSelector
              ? "▲"
              : "▼"}
          </span>

        </button>

      </section>


      {/* ======================================================
          BANK SELECTOR
          ====================================================== */}

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


      {/* ======================================================
          SIGNATURE SELECTOR
          ====================================================== */}

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
            billType: "normal",
            company,
            companyName: company?.company_name || company?.companyName || "",
            bank,
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


/* ============================================================
   DRAFT BUILDER
   ============================================================ */

function buildDraftFromState({
  profile,
  company,

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
  roundOff,

  amountInWords,
  roundTotal,

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
      "normal",

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

    /*
     * Stored for draft information.
     *
     * IMPORTANT:
     *
     * This is not trusted for final bill numbering.
     */
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

    items:
      (
        items ||
        []
      ).map(
        (item) => ({
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

          qty:
            item.qty == null
              ? null
              : Number(
                  item.qty
                ),

          unit:
            item.unit ||
            "",

          /*
           * Snapshot current rate.
           *
           * Product master changes will NOT affect
           * this draft.
           */
          rate:
            item.rate == null
              ? null
              : Number(
                  item.rate
                ),

          amount:
            item.type ===
            "product"
              ? Number(
                  (
                    (
                      Number(
                        item.qty
                      ) || 0
                    ) *
                    (
                      Number(
                        item.rate
                      ) || 0
                    )
                  ).toFixed(
                    2
                  )
                )
              : item.amount ??
                null,

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

          type:
            item.type ||
            "product",

          rowType:
            item.rowType ||
            undefined,

          /*
           * Preserve formatting.
           */
          bold:
            Boolean(
              item.bold
            ),

          center:
            Boolean(
              item.center
            ),
        })
      ),

    subtotal:
      Number(
        subtotal
      ) || 0,

    sgstRate:
      0,

    sgstAmount:
      0,

    cgstRate:
      0,

    cgstAmount:
      0,

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
      "",

    /*
     * Preserve Home's Important/star status.
     */
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