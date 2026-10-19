import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function BankManagement() {
  // =========================
  // STATES
  // =========================

  const [banks, setBanks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");

  const [selectedBank, setSelectedBank] = useState(null);

  const [formData, setFormData] = useState({
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    branch: "",
  });

  // =========================
  // LOAD BANKS
  // =========================

  async function loadBanks(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("❌ User not logged in.");
        setBanks([]);
        return;
      }

      const { data, error } = await supabase
        .from("banks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("Bank loading error:", error);

        setMessage(`❌ ${error.message}`);
        return;
      }

      setBanks(data || []);

    } catch (error) {
      console.error("Load banks error:", error);

      setMessage(
        "❌ Something went wrong while loading banks."
      );

    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    loadBanks();
  }, []);

  // =========================
  // HANDLE INPUT
  // =========================

  function handleChange(e) {
    const { name, value } = e.target;

    let finalValue = value;

    // IFSC ALWAYS UPPERCASE
    if (name === "ifsc_code") {
      finalValue = value.toUpperCase();
    }

    setFormData((previous) => ({
      ...previous,
      [name]: finalValue,
    }));
  }

  // =========================
  // RESET FORM
  // =========================

  function resetForm() {
    setFormData({
      bank_name: "",
      account_number: "",
      ifsc_code: "",
      branch: "",
    });

    setSelectedBank(null);
  }

  // =========================
  // CLEAR FORM
  // =========================

  function handleClearForm() {
    resetForm();
    setMessage("");
  }

  // =========================
  // ADD BANK
  // =========================

  async function handleAddBank(e) {
    e.preventDefault();

    setMessage("");

    const bankName = formData.bank_name.trim();
    const accountNumber =
      formData.account_number.trim();
    const ifscCode =
      formData.ifsc_code.trim().toUpperCase();
    const branch =
      formData.branch.trim();

    // VALIDATION

    if (!bankName) {
      setMessage("❌ Please enter bank name.");
      return;
    }

    if (!accountNumber) {
      setMessage(
        "❌ Please enter account number."
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("❌ User not logged in.");
        return;
      }

      // =========================
      // CHECK DUPLICATE ACCOUNT
      // =========================

      const { data: existingBank, error: checkError } =
        await supabase
          .from("banks")
          .select("id")
          .eq("user_id", user.id)
          .eq("account_number", accountNumber)
          .maybeSingle();

      if (checkError) {
        console.error(
          "Duplicate check error:",
          checkError
        );
      }

      if (existingBank) {
        setMessage(
          "❌ This account number already exists."
        );
        return;
      }

      // =========================
      // INSERT BANK
      // =========================

      const { error } = await supabase
        .from("banks")
        .insert([
          {
            user_id: user.id,
            bank_name: bankName,
            account_number: accountNumber,
            ifsc_code: ifscCode || null,
            branch: branch || null,
          },
        ]);

      if (error) {
        console.error("Add bank error:", error);

        setMessage(`❌ ${error.message}`);
        return;
      }

      resetForm();

      setMessage(
        "✅ Bank added successfully."
      );

      await loadBanks(false);

    } catch (error) {
      console.error("Add bank error:", error);

      setMessage(
        "❌ Something went wrong while adding bank."
      );

    } finally {
      setSaving(false);
    }
  }

  // =========================
  // SELECT BANK
  // =========================

  function handleSelectBank(bank) {
    setSelectedBank(bank);

    setFormData({
      bank_name: bank.bank_name || "",
      account_number:
        bank.account_number || "",
      ifsc_code: bank.ifsc_code || "",
      branch: bank.branch || "",
    });

    setMessage("");
  }

  // =========================
  // UPDATE BANK
  // =========================

  async function handleUpdateBank() {
    setMessage("");

    if (!selectedBank) {
      setMessage(
        "❌ Please select a bank first."
      );
      return;
    }

    const bankName = formData.bank_name.trim();
    const accountNumber =
      formData.account_number.trim();
    const ifscCode =
      formData.ifsc_code.trim().toUpperCase();
    const branch =
      formData.branch.trim();

    if (!bankName) {
      setMessage("❌ Please enter bank name.");
      return;
    }

    if (!accountNumber) {
      setMessage(
        "❌ Please enter account number."
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("❌ User not logged in.");
        return;
      }

      // =========================
      // UPDATE BANK
      // =========================

      const { error } = await supabase
        .from("banks")
        .update({
          bank_name: bankName,
          account_number: accountNumber,
          ifsc_code: ifscCode || null,
          branch: branch || null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", selectedBank.id)
        .eq("user_id", user.id);

      if (error) {
        console.error(
          "Update bank error:",
          error
        );

        setMessage(`❌ ${error.message}`);
        return;
      }

      resetForm();

      setMessage(
        "✅ Bank updated successfully."
      );

      await loadBanks(false);

    } catch (error) {
      console.error(error);

      setMessage(
        "❌ Something went wrong while updating bank."
      );

    } finally {
      setSaving(false);
    }
  }

  // =========================
  // DELETE BANK
  // =========================

  async function handleDeleteBank() {
    setMessage("");

    if (!selectedBank) {
      setMessage(
        "❌ Please select a bank first."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${selectedBank.bank_name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("❌ User not logged in.");
        return;
      }

      const { error } = await supabase
        .from("banks")
        .delete()
        .eq("id", selectedBank.id)
        .eq("user_id", user.id);

      if (error) {
        console.error(
          "Delete bank error:",
          error
        );

        setMessage(`❌ ${error.message}`);
        return;
      }

      resetForm();

      setMessage(
        "✅ Bank deleted successfully."
      );

      await loadBanks(false);

    } catch (error) {
      console.error(error);

      setMessage(
        "❌ Something went wrong while deleting bank."
      );

    } finally {
      setSaving(false);
    }
  }

  // =========================
  // FILTER BANKS
  // =========================

  const filteredBanks = banks.filter(
    (bank) => {
      const searchText =
        search.toLowerCase().trim();

      if (!searchText) {
        return true;
      }

      return (
        bank.bank_name
          ?.toLowerCase()
          .includes(searchText) ||

        bank.account_number
          ?.toLowerCase()
          .includes(searchText) ||

        bank.ifsc_code
          ?.toLowerCase()
          .includes(searchText) ||

        bank.branch
          ?.toLowerCase()
          .includes(searchText)
      );
    }
  );

  // =========================
  // UI
  // =========================

  return (
    <div style={styles.container}>

      {/* ========================= */}
      {/* PAGE HEADER */}
      {/* ========================= */}

      <div style={styles.header}>

        <div>
          <h1 style={styles.title}>
            🏦 Bank Management
          </h1>

          <p style={styles.subtitle}>
            Manage bank accounts used while
            creating bills.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadBanks()}
          disabled={loading || saving}
          style={styles.refreshButton}
        >
          🔄 Refresh
        </button>

      </div>

      {/* ========================= */}
      {/* BANK FORM */}
      {/* ========================= */}

      <div style={styles.formCard}>

        <div style={styles.formHeader}>

          <div>
            <h2 style={styles.sectionTitle}>
              {selectedBank
                ? "Edit Bank Details"
                : "Add Bank Details"}
            </h2>

            <p style={styles.formDescription}>
              {selectedBank
                ? "Update the selected bank account."
                : "Add a bank account to use in your bills."}
            </p>
          </div>

          {selectedBank && (
            <div style={styles.editBadge}>
              Editing
            </div>
          )}

        </div>

        <form
          onSubmit={handleAddBank}
        >

          <div style={styles.formGrid}>

            {/* BANK NAME */}

            <div style={styles.field}>

              <label style={styles.label}>
                Bank Name *
              </label>

              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="Example: State Bank of India"
                style={styles.input}
                disabled={saving}
              />

            </div>

            {/* ACCOUNT NUMBER */}

            <div style={styles.field}>

              <label style={styles.label}>
                Account Number *
              </label>

              <input
                type="text"
                name="account_number"
                value={
                  formData.account_number
                }
                onChange={handleChange}
                placeholder="Enter account number"
                style={styles.input}
                disabled={saving}
              />

            </div>

            {/* IFSC */}

            <div style={styles.field}>

              <label style={styles.label}>
                IFSC Code
              </label>

              <input
                type="text"
                name="ifsc_code"
                value={formData.ifsc_code}
                onChange={handleChange}
                placeholder="Example: SBIN0001234"
                style={styles.input}
                disabled={saving}
              />

            </div>

            {/* BRANCH */}

            <div style={styles.field}>

              <label style={styles.label}>
                Branch
              </label>

              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                placeholder="Example: Kanjurmarg West"
                style={styles.input}
                disabled={saving}
              />

            </div>

          </div>

          {/* ACTION BUTTONS */}

          <div style={styles.buttonRow}>

            {!selectedBank && (

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...styles.addButton,
                  ...(saving
                    ? styles.disabledButton
                    : {}),
                }}
              >
                {saving
                  ? "Saving..."
                  : "➕ Add Bank"}
              </button>

            )}

            {selectedBank && (

              <button
                type="button"
                onClick={handleUpdateBank}
                disabled={saving}
                style={{
                  ...styles.updateButton,
                  ...(saving
                    ? styles.disabledButton
                    : {}),
                }}
              >
                {saving
                  ? "Updating..."
                  : "💾 Update Bank"}
              </button>

            )}

            {selectedBank && (

              <button
                type="button"
                onClick={handleDeleteBank}
                disabled={saving}
                style={{
                  ...styles.deleteButton,
                  ...(saving
                    ? styles.disabledButton
                    : {}),
                }}
              >
                🗑 Delete Bank
              </button>

            )}

            <button
              type="button"
              onClick={handleClearForm}
              disabled={saving}
              style={styles.clearButton}
            >
              {selectedBank
                ? "✕ Cancel Edit"
                : "✕ Clear"}
            </button>

          </div>

        </form>

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
      {/* BANK LIST */}
      {/* ========================= */}

      <div style={styles.listCard}>

        <div style={styles.listHeader}>

          <div>

            <h2 style={styles.sectionTitle}>
              Saved Banks
            </h2>

            <p style={styles.countText}>
              {banks.length} bank
              {banks.length !== 1 ? "s" : ""}{" "}
              saved
            </p>

          </div>

          <input
            type="text"
            placeholder="🔍 Search bank, account, IFSC..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={styles.searchInput}
          />

        </div>

        {/* LOADING */}

        {loading && (

          <div style={styles.emptyState}>
            <div style={styles.loadingIcon}>
              ⏳
            </div>

            <p>
              Loading bank accounts...
            </p>
          </div>

        )}

        {/* EMPTY */}

        {!loading &&
          filteredBanks.length === 0 && (

          <div style={styles.emptyState}>

            <div style={styles.emptyIcon}>
              🏦
            </div>

            <h3 style={styles.emptyTitle}>
              {search
                ? "No matching banks found"
                : "No banks added yet"}
            </h3>

            <p style={styles.emptyText}>
              {search
                ? "Try a different search."
                : "Add your first bank account using the form above."}
            </p>

          </div>

        )}

        {/* TABLE */}

        {!loading &&
          filteredBanks.length > 0 && (

          <div style={styles.tableWrapper}>

            <table style={styles.table}>

              <thead>

                <tr>

                  <th style={styles.th}>
                    #
                  </th>

                  <th style={styles.th}>
                    Bank Name
                  </th>

                  <th style={styles.th}>
                    Account Number
                  </th>

                  <th style={styles.th}>
                    IFSC Code
                  </th>

                  <th style={styles.th}>
                    Branch
                  </th>

                  <th style={styles.th}>
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredBanks.map(
                  (bank, index) => (

                    <tr
                      key={bank.id}
                      style={{
                        ...styles.row,

                        ...(selectedBank?.id ===
                        bank.id
                          ? styles.selectedRow
                          : {}),
                      }}
                    >

                      <td style={styles.td}>
                        {index + 1}
                      </td>

                      <td style={styles.td}>
                        <strong>
                          {bank.bank_name}
                        </strong>
                      </td>

                      <td style={styles.td}>
                        {bank.account_number}
                      </td>

                      <td style={styles.td}>
                        {bank.ifsc_code || "-"}
                      </td>

                      <td style={styles.td}>
                        {bank.branch || "-"}
                      </td>

                      <td style={styles.td}>

                        <button
                          type="button"
                          onClick={() =>
                            handleSelectBank(bank)
                          }
                          style={styles.editButton}
                        >
                          ✏️ Edit
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}


// =========================
// STYLES
// =========================

const styles = {

  container: {
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "25px",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    color: "#1f2937",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: "15px",
  },

  refreshButton: {
    padding: "10px 16px",
    border: "1px solid #d1d5db",
    background: "white",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },

  formCard: {
    background: "white",
    borderRadius: "14px",
    padding: "25px",
    marginBottom: "20px",
    border: "1px solid #e5e7eb",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.04)",
    boxSizing: "border-box",
  },

  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#1f2937",
  },

  formDescription: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  editBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginTop: "25px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },

  buttonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "25px",
  },

  addButton: {
    padding: "11px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#16a34a",
    color: "white",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
  },

  updateButton: {
    padding: "11px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
  },

  deleteButton: {
    padding: "11px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#dc2626",
    color: "white",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
  },

  clearButton: {
    padding: "11px 20px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "white",
    cursor: "pointer",
    fontSize: "15px",
  },

  editButton: {
    padding: "7px 12px",
    border: "1px solid #bfdbfe",
    borderRadius: "7px",
    background: "#eff6ff",
    color: "#2563eb",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  message: {
    padding: "14px 18px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "15px",
    fontWeight: "500",
  },

  successMessage: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
  },

  errorMessage: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
  },

  listCard: {
    background: "white",
    borderRadius: "14px",
    padding: "25px",
    border: "1px solid #e5e7eb",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.04)",
    boxSizing: "border-box",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },

  countText: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  searchInput: {
    width: "100%",
    maxWidth: "350px",
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    boxSizing: "border-box",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
  },

  table: {
    width: "100%",
    minWidth: "850px",
    borderCollapse: "collapse",
  },

  th: {
    background: "#f8fafc",
    padding: "14px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "700",
    color: "#374151",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "14px",
    color: "#374151",
    whiteSpace: "nowrap",
  },

  row: {
    background: "white",
  },

  selectedRow: {
    background: "#eff6ff",
  },

  emptyState: {
    minHeight: "250px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    color: "#6b7280",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  loadingIcon: {
    fontSize: "35px",
    marginBottom: "10px",
  },

  emptyTitle: {
    margin: "5px 0",
    color: "#374151",
  },

  emptyText: {
    margin: "5px 0",
    fontSize: "14px",
  },

};

export default BankManagement;