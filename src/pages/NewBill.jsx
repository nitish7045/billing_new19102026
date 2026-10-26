// src/pages/NewBill.jsx

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import {
  createDraftId,
  findDraftsByCompanyAndBillType,
} from "../services/billing/draftService";

function NewBill({ profile, onProceed }) {
  // =========================
  // BILL STATES
  // =========================

  const [billType, setBillType] = useState("normal");
  const [challanType, setChallanType] = useState("normal");

  // =========================
  // COMPANY STATES
  // =========================

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");

  const [loadingCompanies, setLoadingCompanies] =
    useState(true);

  const [showAddCompany, setShowAddCompany] =
    useState(false);

  const [showEditCompany, setShowEditCompany] =
    useState(false);

  const [editingCompany, setEditingCompany] =
    useState(null);

  const [savingCompany, setSavingCompany] =
    useState(false);

  const [deletingCompany, setDeletingCompany] =
    useState(false);

  // =========================
  // DRAFT STATES
  // =========================

  const [matchingDrafts, setMatchingDrafts] =
    useState([]);

  const [showDraftChoice, setShowDraftChoice] =
    useState(false);

  const [checkingDrafts, setCheckingDrafts] =
    useState(false);

  const [selectedDraftId, setSelectedDraftId] =
    useState(null);

  const [pendingBillData, setPendingBillData] =
    useState(null);

  // =========================
  // MESSAGE
  // =========================

  const [message, setMessage] = useState("");

  // =========================
  // COMPANY FORM
  // =========================

  const [companyName, setCompanyName] =
    useState("");

  const [companyAddress, setCompanyAddress] =
    useState("");

  const [copyAddressCompanyId, setCopyAddressCompanyId] =
    useState("");

  const [gstNo, setGstNo] =
    useState("");

  const [bankName, setBankName] =
    useState("");

  const [accountNo, setAccountNo] =
    useState("");

  const [ifscCode, setIfscCode] =
    useState("");

  // =========================
  // LOAD COMPANIES
  // =========================

  async function loadCompanies(showLoading = true) {
    if (!profile?.id) {
      return;
    }

    if (showLoading) {
      setLoadingCompanies(true);
    }

    setMessage("");

    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", profile.id)
        .order("company_name", {
          ascending: true,
        });

      if (error) {
        console.error(error);

        setMessage(
          `❌ Failed to load companies: ${error.message}`
        );

        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error(error);

      setMessage(
        "❌ Something went wrong while loading companies."
      );
    } finally {
      if (showLoading) {
        setLoadingCompanies(false);
      }
    }
  }

  useEffect(() => {
    if (profile?.id) {
      loadCompanies();
    }
  }, [profile?.id]);

  // =========================
  // RESET COMPANY FORM
  // =========================

  function resetCompanyForm() {
    setCompanyName("");
    setCompanyAddress("");
    setCopyAddressCompanyId("");
    setGstNo("");
    setBankName("");
    setAccountNo("");
    setIfscCode("");
  }

  // =========================
  // OPEN ADD COMPANY
  // =========================

  function openAddCompany() {
    resetCompanyForm();

    setEditingCompany(null);

    setShowAddCompany(true);

    setMessage("");
  }

  // =========================
  // CLOSE ADD COMPANY
  // =========================

  function closeAddCompany() {
    if (savingCompany) {
      return;
    }

    setShowAddCompany(false);

    resetCompanyForm();
  }

  // =========================
  // OPEN EDIT COMPANY
  // =========================

  function openEditCompany(company) {
    setEditingCompany(company);

    setCompanyName(
      company.company_name || ""
    );

    setCompanyAddress(
      company.address || company.company_address || company.companyAddress || ""
    );

    setGstNo(
      company.gst_no || ""
    );

    setBankName(
      company.bank_name || ""
    );

    setAccountNo(
      company.account_no || ""
    );

    setIfscCode(
      company.ifsc_code || ""
    );

    setShowEditCompany(true);

    setMessage("");
  }

  // =========================
  // CLOSE EDIT COMPANY
  // =========================

  function closeEditCompany() {
    if (savingCompany) {
      return;
    }

    setShowEditCompany(false);

    setEditingCompany(null);

    resetCompanyForm();
  }

  // =========================
  // DOES BILL REQUIRE GST
  // =========================

  function requiresGstDetails() {
    if (billType === "gst") {
      return true;
    }

    if (
      billType === "challan" &&
      challanType === "gst"
    ) {
      return true;
    }

    return false;
  }

  // =========================
  // ADD COMPANY
  // =========================

  async function handleAddCompany(e) {
    e.preventDefault();

    setMessage("");

    if (!companyName.trim()) {
      setMessage(
        "❌ Please enter the company name."
      );

      return;
    }

    if (requiresGstDetails()) {
      if (
        !gstNo.trim() ||
        !bankName.trim() ||
        !accountNo.trim() ||
        !ifscCode.trim()
      ) {
        setMessage(
          "❌ Please fill all GST and bank details."
        );

        return;
      }
    }

    setSavingCompany(true);

    try {
      const companyData = {
        user_id: profile.id,

        company_name:
          companyName.trim(),

        address:
          companyAddress.trim() || null,

        gst_no:
          gstNo.trim() || null,

        bank_name:
          bankName.trim() || null,

        account_no:
          accountNo.trim() || null,

        ifsc_code:
          ifscCode.trim() || null,
      };

      const { data, error } =
        await supabase
          .from("companies")
          .insert(companyData)
          .select()
          .single();

      if (error) {
        console.error(error);

        setMessage(
          `❌ Failed to add company: ${error.message}`
        );

        return;
      }

      setCompanies((previous) =>
        [...previous, data].sort(
          (a, b) =>
            a.company_name.localeCompare(
              b.company_name
            )
        )
      );

      setSelectedCompany(data.id);

      setShowAddCompany(false);

      resetCompanyForm();

      setMessage(
        "✅ Company added successfully."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "❌ Something went wrong while adding the company."
      );
    } finally {
      setSavingCompany(false);
    }
  }

  // =========================
  // UPDATE COMPANY
  // =========================

  async function handleUpdateCompany(e) {
    e.preventDefault();

    if (!editingCompany) {
      return;
    }

    setMessage("");

    if (!companyName.trim()) {
      setMessage(
        "❌ Please enter the company name."
      );

      return;
    }

    setSavingCompany(true);

    try {
      const updateData = {
        company_name:
          companyName.trim(),

        address:
          companyAddress.trim() || null,

        gst_no:
          gstNo.trim() || null,

        bank_name:
          bankName.trim() || null,

        account_no:
          accountNo.trim() || null,

        ifsc_code:
          ifscCode.trim() || null,
      };

      const { data, error } =
        await supabase
          .from("companies")
          .update(updateData)
          .eq("id", editingCompany.id)
          .eq("user_id", profile.id)
          .select()
          .single();

      if (error) {
        console.error(error);

        setMessage(
          `❌ Failed to update company: ${error.message}`
        );

        return;
      }

      setCompanies((previous) =>
        previous
          .map((company) =>
            company.id === data.id
              ? data
              : company
          )
          .sort((a, b) =>
            a.company_name.localeCompare(
              b.company_name
            )
          )
      );

      setShowEditCompany(false);

      setEditingCompany(null);

      resetCompanyForm();

      setMessage(
        "✅ Company updated successfully."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "❌ Something went wrong while updating the company."
      );
    } finally {
      setSavingCompany(false);
    }
  }

  // =========================
  // DELETE COMPANY
  // =========================

  async function handleDeleteCompany(company) {
    if (!company) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${company.company_name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    setDeletingCompany(true);

    try {
      const { error } =
        await supabase
          .from("companies")
          .delete()
          .eq("id", company.id)
          .eq("user_id", profile.id);

      if (error) {
        console.error(error);

        setMessage(
          `❌ Failed to delete company: ${error.message}`
        );

        return;
      }

      setCompanies((previous) =>
        previous.filter(
          (item) =>
            item.id !== company.id
        )
      );

      if (
        selectedCompany === company.id
      ) {
        setSelectedCompany("");
      }

      setMessage(
        "✅ Company deleted successfully."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "❌ Something went wrong while deleting the company."
      );
    } finally {
      setDeletingCompany(false);
    }
  }

  // =========================
  // FILTER COMPANY DETAILS BY BILL TYPE
  // =========================

  function getCompanyForBill(company, type) {
    if (!company) return company;

    // Normal and Core Cutting bills must not receive bank details.
    // This only filters the object passed to the billing page; it does
    // not change or delete the company's saved bank details in Supabase.
    if (type === "normal" || type === "corecutting") {
      const {
        bank_name,
        account_no,
        ifsc_code,
        ...companyWithoutBankDetails
      } = company;

      return companyWithoutBankDetails;
    }

    // Keep existing behavior for GST and Challan bill types.
    return company;
  }

  // =========================
  // CREATE BILL DATA
  // =========================

  function buildBillData(company) {
    return {
      billType,

      challanType:
        billType === "challan"
          ? challanType
          : null,

      company: getCompanyForBill(company, billType),
    };
  }

  // =========================
  // START NEW BILL
  // =========================

  function startNewBill(company) {
    if (!onProceed) {
      return;
    }

    const billData = buildBillData(company);

    /*
     * Every new bill gets its own unique draft ID.
     *
     * This ID is only an identity for the current billing
     * session at this point.
     *
     * The actual IndexedDB draft will be created when the
     * user enters meaningful information on the billing page.
     */
    const draftId = createDraftId();

    onProceed({
      ...billData,

      draftId,

      draftMode: "new",

      draft: null,
    });
  }

  // =========================
  // WORK ON SELECTED DRAFT
  // =========================

  function handleWorkOnSelectedDraft() {
    if (!selectedDraftId) {
      setMessage(
        "❌ Please select a draft first."
      );

      return;
    }

    const draft =
      matchingDrafts.find(
        (item) =>
          item.id === selectedDraftId
      );

    if (!draft) {
      setMessage(
        "❌ Selected draft could not be found."
      );

      return;
    }

    if (!onProceed) {
      return;
    }

    const company = companies.find(
      (item) =>
        String(item.id) ===
        String(draft.companyId)
    );

    /*
     * The company should normally exist because the draft
     * was originally created using this company.
     */
    if (!company) {
      setMessage(
        "❌ The company associated with this draft no longer exists."
      );

      return;
    }

    setShowDraftChoice(false);

    setMatchingDrafts([]);

    setSelectedDraftId(null);

    setPendingBillData(null);

    onProceed({
      billType: draft.billType,

      challanType:
        draft.challanType ||
        (draft.billType === "challan"
          ? "normal"
          : null),

      company: getCompanyForBill(company, draft.billType),

      // IMPORTANT:
      // This is the exact draft that was selected.
      draftId: draft.id,

      draftMode: "existing",

      draft,
    });
  }

  // =========================
  // CREATE NEW FROM DRAFT MODAL
  // =========================

  function handleCreateNewFromDraftPrompt() {
    if (!pendingBillData?.company) {
      return;
    }

    const company =
      pendingBillData.company;

    /*
     * IMPORTANT:
     * We do NOT delete or modify any existing draft here.
     *
     * startNewBill() generates a completely different UUID.
     */
    setShowDraftChoice(false);

    setMatchingDrafts([]);

    setSelectedDraftId(null);

    setPendingBillData(null);

    startNewBill(company);
  }

  // =========================
  // CLOSE DRAFT CHOICE
  // =========================

  function closeDraftChoice() {
    if (checkingDrafts) {
      return;
    }

    setShowDraftChoice(false);

    setMatchingDrafts([]);

    setSelectedDraftId(null);

    setPendingBillData(null);
  }

  // =========================
  // FORMAT DRAFT DATE
  // =========================

  function formatDraftDate(value) {
    if (!value) {
      return "Unknown";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // =========================
  // FORMAT DRAFT DESCRIPTION
  // =========================

  function getDraftDescription(draft) {
    if (!draft) {
      return "Unfinished bill";
    }

    // Customer / To
    if (
      draft.customerTo &&
      String(draft.customerTo).trim()
    ) {
      return String(
        draft.customerTo
      ).trim();
    }

    // Site
    if (
      draft.customerSite &&
      String(draft.customerSite).trim()
    ) {
      return String(
        draft.customerSite
      ).trim();
    }

    // Product/item
    if (
      Array.isArray(draft.items) &&
      draft.items.length > 0
    ) {
      const firstItem =
        draft.items.find(
          (item) =>
            item?.particular &&
            String(
              item.particular
            ).trim()
        );

      if (firstItem) {
        return String(
          firstItem.particular
        ).trim();
      }

      return `${draft.items.length} item${
        draft.items.length === 1
          ? ""
          : "s"
      } added`;
    }

    return "Unfinished bill";
  }

  // =========================
  // PROCEED
  // =========================

  async function handleProceed() {
    setMessage("");

    if (!billType) {
      setMessage(
        "❌ Please select a bill type."
      );

      return;
    }

    if (!selectedCompany) {
      setMessage(
        "❌ Please select a company."
      );

      return;
    }

    const company = companies.find(
      (item) =>
        item.id === selectedCompany
    );

    if (!company) {
      setMessage(
        "❌ Selected company was not found."
      );

      return;
    }

    // =========================
    // VALIDATE GST COMPANY
    // =========================

    if (requiresGstDetails()) {
      const missingDetails = [];

      if (!company.gst_no) {
        missingDetails.push(
          "GST Number"
        );
      }

      if (!company.bank_name) {
        missingDetails.push(
          "Bank Name"
        );
      }

      if (!company.account_no) {
        missingDetails.push(
          "Account Number"
        );
      }

      if (!company.ifsc_code) {
        missingDetails.push(
          "IFSC Code"
        );
      }

      if (missingDetails.length > 0) {
        setMessage(
          `❌ Selected company is missing: ${missingDetails.join(
            ", "
          )}. Please edit the company and add the missing details.`
        );

        return;
      }
    }

    // =========================
    // CHECK USER
    // =========================

    if (!profile?.id) {
      setMessage(
        "❌ User profile was not found."
      );

      return;
    }

    // =========================
    // CHECK INDEXEDDB DRAFTS
    // =========================

    setCheckingDrafts(true);

    try {
      const drafts =
        await findDraftsByCompanyAndBillType({
          userId: profile.id,
          companyId: company.id,
          billType,
        });

      // =========================
      // NO DRAFTS
      // =========================

      if (!drafts || drafts.length === 0) {
        startNewBill(company);

        return;
      }

      // =========================
      // DRAFTS FOUND
      // =========================

      setMatchingDrafts(drafts);

      /*
       * Don't automatically select one.
       *
       * The user must explicitly choose which draft
       * they want to continue.
       */
      setSelectedDraftId(null);

      setPendingBillData(
        buildBillData(company)
      );

      setShowDraftChoice(true);
    } catch (error) {
      console.error(
        "Draft check failed:",
        error
      );

      /*
       * IndexedDB failure should not prevent the user
       * from creating a new bill.
       */
      setMessage(
        "⚠️ Could not check existing drafts. Starting a new bill."
      );

      startNewBill(company);
    } finally {
      setCheckingDrafts(false);
    }
  }

  // =========================
  // BILL TYPES
  // =========================

  const billTypes = [
    {
      id: "normal",
      icon: "🧾",
      title: "Normal Bill",
      description:
        "Standard bill using company information.",
    },

    {
      id: "gst",
      icon: "📄",
      title: "Tax Invoice",
      description:
        "GST invoice with GST and bank details.",
    },

    {
      id: "corecutting",
      icon: "✂️",
      title: "CoreCutting",
      description:
        "Core cutting billing format.",
    },

    {
      id: "challan",
      icon: "🚚",
      title: "Challan",
      description:
        "Delivery challan with Normal or GST format.",
    },
  ];

  // =========================
  // SELECTED COMPANY
  // =========================

  const selectedCompanyData =
    companies.find(
      (company) =>
        company.id === selectedCompany
    );

  // =========================
  // UI
  // =========================

  return (
    <div style={styles.container}>

      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <div style={styles.header}>

        <div style={styles.headerTop}>

          <span style={styles.headerIcon}>
            🧾
          </span>

          <div>

            <h1 style={styles.title}>
              Create New Bill
            </h1>

            <p style={styles.subtitle}>
              Select the bill type and company to continue.
            </p>

          </div>

        </div>

      </div>

      {/* ========================= */}
      {/* MESSAGE */}
      {/* ========================= */}

      {message && (
        <div
          style={{
            ...styles.message,

            ...(message.startsWith("❌")
              ? styles.errorMessage
              : styles.successMessage),
          }}
        >
          {message}
        </div>
      )}

      {/* ========================= */}
      {/* STEP 1 */}
      {/* ========================= */}

      <div style={styles.section}>

        <div style={styles.sectionHeader}>

          <div style={styles.stepNumber}>
            1
          </div>

          <div>

            <h2 style={styles.sectionTitle}>
              Select Bill Type
            </h2>

            <p style={styles.sectionSubtitle}>
              Choose the type of document you want to create.
            </p>

          </div>

        </div>

        <div style={styles.billTypeGrid}>

          {billTypes.map((item) => {

            const selected =
              billType === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setBillType(item.id);
                  setMessage("");
                }}
                style={{
                  ...styles.billTypeCard,

                  ...(selected
                    ? styles.billTypeCardActive
                    : {}),
                }}
              >

                <div
                  style={{
                    ...styles.billIcon,

                    ...(selected
                      ? styles.billIconActive
                      : {}),
                  }}
                >
                  {item.icon}
                </div>

                <div style={styles.billText}>

                  <h3
                    style={{
                      ...styles.billTitle,

                      ...(selected
                        ? styles.billTitleActive
                        : {}),
                    }}
                  >
                    {item.title}
                  </h3>

                  <p style={styles.billDescription}>
                    {item.description}
                  </p>

                </div>

                {selected && (
                  <div style={styles.selectedCheck}>
                    ✓
                  </div>
                )}

              </button>
            );
          })}

        </div>

        {/* CHALLAN TYPE */}

        {billType === "challan" && (

          <div style={styles.challanBox}>

            <h3 style={styles.challanTitle}>
              Challan Type
            </h3>

            <div style={styles.challanOptions}>

              <button
                type="button"
                onClick={() => {
                  setChallanType("normal");
                  setMessage("");
                }}
                style={{
                  ...styles.challanOption,

                  ...(challanType === "normal"
                    ? styles.challanOptionActive
                    : {}),
                }}
              >
                <span style={styles.radioCircle}>
                  {challanType === "normal"
                    ? "●"
                    : "○"}
                </span>

                Normal Challan
              </button>

              <button
                type="button"
                onClick={() => {
                  setChallanType("gst");
                  setMessage("");
                }}
                style={{
                  ...styles.challanOption,

                  ...(challanType === "gst"
                    ? styles.challanOptionActive
                    : {}),
                }}
              >
                <span style={styles.radioCircle}>
                  {challanType === "gst"
                    ? "●"
                    : "○"}
                </span>

                GST Challan
              </button>

            </div>

          </div>

        )}

      </div>

      {/* ========================= */}
      {/* STEP 2 */}
      {/* ========================= */}

      <div style={styles.section}>

        <div style={styles.sectionHeader}>

          <div style={styles.stepNumber}>
            2
          </div>

          <div>

            <h2 style={styles.sectionTitle}>
              Select Company
            </h2>

            <p style={styles.sectionSubtitle}>
              Choose an existing company or add a new one.
            </p>

          </div>

        </div>

        <div style={styles.companySelection}>

          <div style={styles.companyInputWrapper}>

            <label style={styles.label}>
              Company
            </label>

            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(
                  e.target.value
                );

                setMessage("");
              }}
              disabled={loadingCompanies}
              style={styles.select}
            >

              <option value="">
                {loadingCompanies
                  ? "Loading companies..."
                  : "Select a company"}
              </option>

              {companies.map((company) => (
                <option
                  key={company.id}
                  value={company.id}
                >
                  {company.company_name}
                </option>
              ))}

            </select>

          </div>

          <button
            type="button"
            onClick={openAddCompany}
            style={styles.addCompanyButton}
          >
            <span style={styles.plus}>
              +
            </span>

            Add New Company
          </button>

        </div>

        {/* SELECTED COMPANY PREVIEW */}

        {selectedCompanyData && (

          <div style={styles.companyPreview}>

            <div style={styles.previewHeader}>

              <div style={styles.previewCompanyInfo}>

                <div style={styles.previewIcon}>
                  🏢
                </div>

                <div>

                  <p style={styles.previewLabel}>
                    Selected Company
                  </p>

                  <h3 style={styles.previewCompanyName}>
                    {selectedCompanyData.company_name}
                  </h3>

                </div>

              </div>

              <div style={styles.companyActions}>

                <button
                  type="button"
                  onClick={() =>
                    openEditCompany(
                      selectedCompanyData
                    )
                  }
                  style={styles.editCompanyButton}
                >
                  ✏️ Edit
                </button>

                <button
                  type="button"
                  disabled={deletingCompany}
                  onClick={() =>
                    handleDeleteCompany(
                      selectedCompanyData
                    )
                  }
                  style={{
                    ...styles.deleteCompanyButton,

                    opacity:
                      deletingCompany
                        ? 0.6
                        : 1,

                    cursor:
                      deletingCompany
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {deletingCompany
                    ? "Deleting..."
                    : "🗑 Delete"}
                </button>

              </div>

            </div>

            {/* GST DETAILS */}

            {requiresGstDetails() ? (

              <div style={styles.companyDetails}>

                <DetailItem
                  label="GST Number"
                  value={
                    selectedCompanyData.gst_no
                  }
                />

                <DetailItem
                  label="Bank Name"
                  value={
                    selectedCompanyData.bank_name
                  }
                />

                <DetailItem
                  label="Account Number"
                  value={
                    selectedCompanyData.account_no
                  }
                />

                <DetailItem
                  label="IFSC Code"
                  value={
                    selectedCompanyData.ifsc_code
                  }
                />

              </div>

            ) : (

              <p style={styles.normalBillInfo}>
                This bill type will use the company name.
              </p>

            )}

          </div>

        )}

      </div>

      {/* ========================= */}
      {/* CONTINUE */}
      {/* ========================= */}

      <div style={styles.proceedArea}>

        <button
          type="button"
          onClick={handleProceed}
          disabled={
            checkingDrafts ||
            loadingCompanies
          }
          style={{
            ...styles.proceedButton,

            opacity:
              checkingDrafts ||
              loadingCompanies
                ? 0.7
                : 1,

            cursor:
              checkingDrafts ||
              loadingCompanies
                ? "not-allowed"
                : "pointer",
          }}
        >

          <span>
            {checkingDrafts
              ? "Checking drafts..."
              : "Continue"}
          </span>

          {!checkingDrafts && (
            <span style={styles.arrow}>
              →
            </span>
          )}

        </button>

      </div>

      {/* ========================= */}
      {/* EXISTING DRAFT MODAL */}
      {/* ========================= */}

      {showDraftChoice && (

        <div
          style={styles.modalOverlay}
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              closeDraftChoice();
            }
          }}
        >

          <div style={styles.draftModal}>

            {/* HEADER */}

            <div style={styles.modalHeader}>

              <div>

                <h2 style={styles.modalTitle}>
                  Existing Drafts Found
                </h2>

                <p style={styles.modalSubtitle}>
                  Select the unfinished bill you want
                  to continue, or create a new bill.
                </p>

              </div>

              <button
                type="button"
                onClick={closeDraftChoice}
                style={styles.closeButton}
              >
                ×
              </button>

            </div>

            {/* COMPANY / BILL INFO */}

            <div style={styles.draftInfoBox}>

              <div style={styles.draftInfoIcon}>
                📝
              </div>

              <div style={styles.draftInfoColumn}>

                <div style={styles.draftInfoLabel}>
                  Company
                </div>

                <div style={styles.draftInfoValue}>
                  {pendingBillData?.company
                    ?.company_name ||
                    "Selected company"}
                </div>

              </div>

              <div style={styles.draftInfoDivider} />

              <div style={styles.draftInfoColumn}>

                <div style={styles.draftInfoLabel}>
                  Bill Type
                </div>

                <div style={styles.draftInfoValue}>
                  {billTypes.find(
                    (item) =>
                      item.id ===
                      pendingBillData?.billType
                  )?.title ||
                    pendingBillData?.billType ||
                    "Bill"}
                </div>

              </div>

              <div style={styles.draftCountBadge}>
                {matchingDrafts.length}{" "}
                {matchingDrafts.length === 1
                  ? "Draft"
                  : "Drafts"}
              </div>

            </div>

            {/* SELECTION INSTRUCTION */}

            <div style={styles.selectionInstruction}>
              <span style={styles.selectionInstructionIcon}>
                ℹ️
              </span>

              <span>
                Select one draft below to continue
                exactly where you left off.
              </span>
            </div>

            {/* DRAFT LIST */}

            <div style={styles.draftList}>

              {matchingDrafts.map(
                (draft, index) => {

                  const isSelected =
                    selectedDraftId ===
                    draft.id;

                  const description =
                    getDraftDescription(
                      draft
                    );

                  return (
                    <button
                      key={draft.id}
                      type="button"
                      onClick={() =>
                        setSelectedDraftId(
                          draft.id
                        )
                      }
                      style={{
                        ...styles.draftCard,

                        ...(isSelected
                          ? styles.draftCardSelected
                          : {}),
                      }}
                    >

                      {/* RADIO */}

                      <div
                        style={{
                          ...styles.draftRadio,

                          ...(isSelected
                            ? styles.draftRadioSelected
                            : {}),
                        }}
                      >
                        {isSelected
                          ? "✓"
                          : ""}
                      </div>

                      {/* ICON */}

                      <div
                        style={{
                          ...styles.draftCardIcon,

                          ...(isSelected
                            ? styles.draftCardIconSelected
                            : {}),
                        }}
                      >
                        📝
                      </div>

                      {/* CONTENT */}

                      <div
                        style={
                          styles.draftCardContent
                        }
                      >

                        <div
                          style={
                            styles.draftCardHeader
                          }
                        >

                          <div
                            style={
                              styles.draftCardTitle
                            }
                          >
                            {description}
                          </div>

                          <div
                            style={
                              styles.draftNumber
                            }
                          >
                            Draft {index + 1}
                          </div>

                        </div>

                        <div
                          style={
                            styles.draftCardMeta
                          }
                        >
                          {draft.billNumber
                            ? `Bill No. ${draft.billNumber}`
                            : "Bill number not assigned"}
                        </div>

                        <div
                          style={
                            styles.draftCardDate
                          }
                        >
                          Last updated:{" "}
                          {formatDraftDate(
                            draft.updatedAt
                          )}
                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>

            {/* SELECTED DRAFT ACTION */}

            <div style={styles.selectedDraftArea}>

              <button
                type="button"
                disabled={!selectedDraftId}
                onClick={
                  handleWorkOnSelectedDraft
                }
                style={{
                  ...styles.workSelectedButton,

                  opacity:
                    selectedDraftId
                      ? 1
                      : 0.5,

                  cursor:
                    selectedDraftId
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {selectedDraftId
                  ? "✓ Work on Selected Draft"
                  : "Select a Draft to Continue"}
              </button>

            </div>

            {/* CREATE NEW */}

            <div style={styles.newBillArea}>

              <div style={styles.newBillText}>

                <div style={styles.newBillTitle}>
                  Start a completely new bill
                </div>

                <div style={styles.newBillSubtitle}>
                  All existing drafts will remain
                  untouched.
                </div>

              </div>

              <button
                type="button"
                onClick={
                  handleCreateNewFromDraftPrompt
                }
                style={styles.createNewButton}
              >
                + Create New Bill
              </button>

            </div>

            {/* CANCEL */}

            <div style={styles.draftModalFooter}>

              <button
                type="button"
                onClick={closeDraftChoice}
                style={styles.cancelButton}
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ========================= */}
      {/* ADD COMPANY MODAL */}
      {/* ========================= */}

      {showAddCompany && (

        <div style={styles.modalOverlay}>

          <div style={styles.modal}>

            <div style={styles.modalHeader}>

              <div>

                <h2 style={styles.modalTitle}>
                  Add New Company
                </h2>

                <p style={styles.modalSubtitle}>
                  {requiresGstDetails()
                    ? "Enter the company and GST details."
                    : "Enter the company name to continue."}
                </p>

              </div>

              <button
                type="button"
                onClick={closeAddCompany}
                style={styles.closeButton}
              >
                ×
              </button>

            </div>

            <form onSubmit={handleAddCompany}>

              <CompanyForm
                companyName={companyName}
                setCompanyName={
                  setCompanyName
                }

                companyAddress={companyAddress}
                setCompanyAddress={setCompanyAddress}
                companies={companies}
                copyAddressCompanyId={copyAddressCompanyId}
                setCopyAddressCompanyId={setCopyAddressCompanyId}

                gstNo={gstNo}
                setGstNo={setGstNo}

                bankName={bankName}
                setBankName={setBankName}

                accountNo={accountNo}
                setAccountNo={setAccountNo}

                ifscCode={ifscCode}
                setIfscCode={setIfscCode}

                showGst={
                  requiresGstDetails()
                }
              />

              <div style={styles.modalFooter}>

                <button
                  type="button"
                  onClick={closeAddCompany}
                  disabled={savingCompany}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingCompany}
                  style={{
                    ...styles.saveButton,

                    opacity:
                      savingCompany
                        ? 0.7
                        : 1,
                  }}
                >
                  {savingCompany
                    ? "Saving..."
                    : "Save Company"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ========================= */}
      {/* EDIT COMPANY MODAL */}
      {/* ========================= */}

      {showEditCompany && (

        <div style={styles.modalOverlay}>

          <div style={styles.modal}>

            <div style={styles.modalHeader}>

              <div>

                <h2 style={styles.modalTitle}>
                  Edit Company
                </h2>

                <p style={styles.modalSubtitle}>
                  Update company and GST details.
                </p>

              </div>

              <button
                type="button"
                onClick={closeEditCompany}
                style={styles.closeButton}
              >
                ×
              </button>

            </div>

            <form onSubmit={handleUpdateCompany}>

              <CompanyForm
                companyName={companyName}
                setCompanyName={
                  setCompanyName
                }

                companyAddress={companyAddress}
                setCompanyAddress={setCompanyAddress}
                companies={companies}
                copyAddressCompanyId={copyAddressCompanyId}
                setCopyAddressCompanyId={setCopyAddressCompanyId}

                gstNo={gstNo}
                setGstNo={setGstNo}

                bankName={bankName}
                setBankName={setBankName}

                accountNo={accountNo}
                setAccountNo={setAccountNo}

                ifscCode={ifscCode}
                setIfscCode={setIfscCode}

                showGst={true}
              />

              <div style={styles.modalFooter}>

                <button
                  type="button"
                  onClick={closeEditCompany}
                  disabled={savingCompany}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingCompany}
                  style={{
                    ...styles.saveButton,

                    opacity:
                      savingCompany
                        ? 0.7
                        : 1,
                  }}
                >
                  {savingCompany
                    ? "Updating..."
                    : "Update Company"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


// =========================
// COMPANY FORM COMPONENT
// =========================

function CompanyForm({
  companyName,
  setCompanyName,
  companyAddress,
  setCompanyAddress,
  companies = [],
  copyAddressCompanyId,
  setCopyAddressCompanyId,

  gstNo,
  setGstNo,

  bankName,
  setBankName,

  accountNo,
  setAccountNo,

  ifscCode,
  setIfscCode,

  showGst,
}) {
  return (
    <>
      {/* COMPANY NAME */}

      <div style={styles.field}>

        <label style={styles.label}>
          Company Name *
        </label>

        <input
          type="text"
          value={companyName}
          onChange={(e) =>
            setCompanyName(
              e.target.value
            )
          }
          placeholder="Enter company name"
          style={styles.input}
          required
        />

      </div>

      {/* COMPANY ADDRESS */}
      <div style={styles.field}>
        <label style={styles.label}>Company Address</label>
        <textarea
          value={companyAddress}
          onChange={(e) => setCompanyAddress(e.target.value)}
          placeholder={"Enter company address. Press Enter to keep each line separate.\nExample: Shop No. 12, Main Road\nMumbai, Maharashtra - 400001"}
          rows={4}
          style={{ ...styles.input, minHeight: "100px", resize: "vertical", fontFamily: "inherit", whiteSpace: "pre-wrap", lineHeight: 1.5 }}
        />
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "8px" }}>
          <select
            value={copyAddressCompanyId}
            onChange={(e) => setCopyAddressCompanyId(e.target.value)}
            style={{ ...styles.input, flex: "1 1 220px", minWidth: 0 }}
            aria-label="Choose company to copy address from"
          >
            <option value="">Copy address from existing company...</option>
            {companies.filter((item) => item.address || item.company_address || item.companyAddress).map((item) => (
              <option key={item.id} value={item.id}>{item.company_name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!copyAddressCompanyId}
            onClick={() => {
              const source = companies.find((item) => String(item.id) === String(copyAddressCompanyId));
              if (source) setCompanyAddress(source.address || source.company_address || source.companyAddress || "");
            }}
            style={{ ...styles.cancelButton, padding: "10px 14px", whiteSpace: "nowrap", opacity: copyAddressCompanyId ? 1 : 0.55 }}
          >
            Copy Address
          </button>
        </div>
        <small style={{ color: "#64748b" }}>Use this to quickly reuse an address for another company.</small>
      </div>

      {/* GST DETAILS */}

      {showGst && (
        <>
          <div style={styles.field}>

            <label style={styles.label}>
              GST Number *
            </label>

            <input
              type="text"
              value={gstNo}
              onChange={(e) =>
                setGstNo(
                  e.target.value.toUpperCase()
                )
              }
              placeholder="Enter GST number"
              style={styles.input}
            />

          </div>

          <div style={styles.twoColumn}>

            <div style={styles.field}>

              <label style={styles.label}>
                Bank Name *
              </label>

              <input
                type="text"
                value={bankName}
                onChange={(e) =>
                  setBankName(
                    e.target.value
                  )
                }
                placeholder="Enter bank name"
                style={styles.input}
              />

            </div>

            <div style={styles.field}>

              <label style={styles.label}>
                Account Number *
              </label>

              <input
                type="text"
                value={accountNo}
                onChange={(e) =>
                  setAccountNo(
                    e.target.value
                  )
                }
                placeholder="Enter account number"
                style={styles.input}
              />

            </div>

          </div>

          <div style={styles.field}>

            <label style={styles.label}>
              IFSC Code *
            </label>

            <input
              type="text"
              value={ifscCode}
              onChange={(e) =>
                setIfscCode(
                  e.target.value.toUpperCase()
                )
              }
              placeholder="Enter IFSC code"
              style={styles.input}
            />

          </div>
        </>
      )}
    </>
  );
}


// =========================
// DETAIL ITEM
// =========================

function DetailItem({
  label,
  value,
}) {
  return (
    <div style={styles.detailItem}>

      <span style={styles.detailLabel}>
        {label}
      </span>

      <span
        style={{
          ...styles.detailValue,

          ...(!value
            ? styles.missingValue
            : {}),
        }}
      >
        {value || "Not Added"}
      </span>

    </div>
  );
}


// =========================
// STYLES
// =========================

const styles = {
  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    paddingBottom: "50px",
    boxSizing: "border-box",
  },

  header: {
    marginBottom: "28px",
  },

  headerTop: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  headerIcon: {
    width: "52px",
    height: "52px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "26px",
    background: "#eaf3ff",
    borderRadius: "14px",
    flexShrink: 0,
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "700",
    color: "#1f2937",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: "15px",
  },

  message: {
    padding: "14px 18px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "14px",
    fontWeight: "500",
  },

  errorMessage: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
  },

  successMessage: {
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    color: "#047857",
  },

  section: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "28px",
    marginBottom: "22px",
    border: "1px solid #e5e7eb",
    boxShadow:
      "0 4px 16px rgba(15, 23, 42, 0.04)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "24px",
  },

  stepNumber: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "#2563eb",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "16px",
    flexShrink: 0,
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#1f2937",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    fontSize: "14px",
    color: "#6b7280",
  },

  billTypeGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },

  billTypeCard: {
    position: "relative",
    width: "100%",
    minHeight: "145px",
    padding: "20px",
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    textAlign: "left",
    cursor: "pointer",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  },

  billTypeCardActive: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
    boxShadow:
      "0 6px 18px rgba(37, 99, 235, 0.12)",
  },

  billIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    flexShrink: 0,
  },

  billIconActive: {
    background: "#dbeafe",
  },

  billText: {
    paddingRight: "10px",
  },

  billTitle: {
    margin: "2px 0 7px",
    fontSize: "16px",
    fontWeight: "700",
    color: "#374151",
  },

  billTitleActive: {
    color: "#1d4ed8",
  },

  billDescription: {
    margin: 0,
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "1.5",
  },

  selectedCheck: {
    position: "absolute",
    top: "14px",
    right: "14px",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "#2563eb",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "13px",
  },

  challanBox: {
    marginTop: "22px",
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },

  challanTitle: {
    margin: "0 0 14px",
    fontSize: "15px",
    color: "#374151",
  },

  challanOptions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  challanOption: {
    padding: "12px 18px",
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#374151",
  },

  challanOptionActive: {
    border: "1px solid #2563eb",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: "600",
  },

  radioCircle: {
    marginRight: "8px",
  },

  companySelection: {
    display: "flex",
    alignItems: "flex-end",
    gap: "14px",
    flexWrap: "wrap",
  },

  companyInputWrapper: {
    flex: 1,
    minWidth: "250px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
  },

  select: {
    width: "100%",
    height: "48px",
    padding: "0 14px",
    borderRadius: "9px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    fontSize: "15px",
    color: "#374151",
    boxSizing: "border-box",
    outline: "none",
  },

  addCompanyButton: {
    height: "48px",
    padding: "0 20px",
    borderRadius: "9px",
    border: "1px solid #2563eb",
    background: "#ffffff",
    color: "#2563eb",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  plus: {
    fontSize: "21px",
    marginRight: "7px",
    verticalAlign: "-1px",
  },

  companyPreview: {
    marginTop: "22px",
    padding: "20px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
  },

  previewHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },

  previewCompanyInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  previewIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "10px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    flexShrink: 0,
  },

  previewLabel: {
    margin: 0,
    fontSize: "12px",
    color: "#6b7280",
  },

  previewCompanyName: {
    margin: "3px 0 0",
    fontSize: "18px",
    color: "#1f2937",
  },

  companyActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  editCompanyButton: {
    height: "38px",
    padding: "0 13px",
    borderRadius: "8px",
    border: "1px solid #2563eb",
    background: "#ffffff",
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: "600",
  },

  deleteCompanyButton: {
    height: "38px",
    padding: "0 13px",
    borderRadius: "8px",
    border: "1px solid #dc2626",
    background: "#ffffff",
    color: "#dc2626",
    cursor: "pointer",
    fontWeight: "600",
  },

  companyDetails: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginTop: "20px",
    paddingTop: "18px",
    borderTop: "1px solid #e5e7eb",
  },

  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  detailLabel: {
    fontSize: "12px",
    color: "#6b7280",
  },

  detailValue: {
    fontSize: "14px",
    color: "#1f2937",
    fontWeight: "600",
    wordBreak: "break-word",
  },

  missingValue: {
    color: "#dc2626",
  },

  normalBillInfo: {
    margin: "18px 0 0",
    paddingTop: "16px",
    borderTop: "1px solid #e5e7eb",
    color: "#6b7280",
    fontSize: "13px",
  },

  proceedArea: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "10px",
  },

  proceedButton: {
    minWidth: "190px",
    height: "52px",
    padding: "0 24px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
    boxShadow:
      "0 6px 15px rgba(37, 99, 235, 0.2)",
  },

  arrow: {
    fontSize: "21px",
  },

  // =========================
  // MODAL
  // =========================

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 2000,
  },

  modal: {
    width: "100%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "28px",
    boxSizing: "border-box",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.2)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "24px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "23px",
    color: "#1f2937",
  },

  modalSubtitle: {
    margin: "7px 0 0",
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "1.5",
  },

  closeButton: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    border: "none",
    background: "#f3f4f6",
    cursor: "pointer",
    fontSize: "24px",
    color: "#4b5563",
    flexShrink: 0,
  },

  // =========================
  // DRAFT MODAL
  // =========================

  draftModal: {
    width: "100%",
    maxWidth: "700px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "28px",
    boxSizing: "border-box",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.2)",
  },

  draftInfoBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "15px",
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    borderRadius: "11px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },

  draftInfoIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "9px",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0,
  },

  draftInfoColumn: {
    minWidth: "120px",
  },

  draftInfoLabel: {
    fontSize: "11px",
    color: "#6b7280",
    marginBottom: "3px",
  },

  draftInfoValue: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#1f2937",
  },

  draftInfoDivider: {
    width: "1px",
    height: "35px",
    background: "#bfdbfe",
    margin: "0 4px",
  },

  draftCountBadge: {
    marginLeft: "auto",
    padding: "6px 10px",
    borderRadius: "20px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: "700",
  },

  selectionInstruction: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    marginBottom: "14px",
    borderRadius: "8px",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: "12px",
  },

  selectionInstructionIcon: {
    fontSize: "14px",
  },

  draftList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxHeight: "330px",
    overflowY: "auto",
    paddingRight: "3px",
  },

  draftCard: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textAlign: "left",
    padding: "14px",
    borderRadius: "11px",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    cursor: "pointer",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  },

  draftCardSelected: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
    boxShadow:
      "0 4px 12px rgba(37, 99, 235, 0.10)",
  },

  draftRadio: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    border: "2px solid #cbd5e1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "700",
    boxSizing: "border-box",
  },

  draftRadioSelected: {
    border: "2px solid #2563eb",
    background: "#2563eb",
  },

  draftCardIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "9px",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0,
  },

  draftCardIconSelected: {
    background: "#dbeafe",
  },

  draftCardContent: {
    flex: 1,
    minWidth: 0,
  },

  draftCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  draftCardTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#1f2937",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  draftNumber: {
    padding: "3px 7px",
    borderRadius: "5px",
    background: "#f1f5f9",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "700",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  draftCardMeta: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#4b5563",
  },

  draftCardDate: {
    marginTop: "3px",
    fontSize: "11px",
    color: "#9ca3af",
  },

  selectedDraftArea: {
    marginTop: "16px",
  },

  workSelectedButton: {
    width: "100%",
    height: "46px",
    borderRadius: "9px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
  },

  newBillArea: {
    marginTop: "18px",
    padding: "16px",
    borderRadius: "11px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
  },

  newBillText: {
    minWidth: 0,
  },

  newBillTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#374151",
  },

  newBillSubtitle: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#6b7280",
  },

  createNewButton: {
    height: "40px",
    padding: "0 16px",
    borderRadius: "8px",
    border: "1px solid #2563eb",
    background: "#ffffff",
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  draftModalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "18px",
    paddingTop: "18px",
    borderTop: "1px solid #e5e7eb",
  },

  // =========================
  // FORM
  // =========================

  field: {
    marginBottom: "18px",
  },

  input: {
    width: "100%",
    height: "46px",
    padding: "0 13px",
    borderRadius: "9px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  },

  twoColumn: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },

  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "28px",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
  },

  cancelButton: {
    height: "44px",
    padding: "0 18px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#374151",
    cursor: "pointer",
    fontWeight: "600",
  },

  saveButton: {
    height: "44px",
    padding: "0 20px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default NewBill;