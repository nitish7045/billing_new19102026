import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  getAllDrafts,
  saveDraft,
  deleteDraft,
} from "../services/billing/draftService";

function Home({ profile, onOpenDraft }) {
  const [productCount, setProductCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);

  const [accountInfo, setAccountInfo] = useState({
    name: "",
    email: "",
    phone: "",
    lastLogin: "",
  });

  const [loadingStats, setLoadingStats] = useState(true);

  const [currentTime, setCurrentTime] = useState(
    new Date()
  );

  // =====================================
  // DRAFT STATE
  // =====================================

  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);

  const [draftSearch, setDraftSearch] = useState("");
  const [draftFilter, setDraftFilter] = useState("all");

  const [deletingDraftId, setDeletingDraftId] = useState(null);

  // =====================================
  // LOAD DASHBOARD DATA
  // =====================================

  async function loadDashboardData() {
    try {
      setLoadingStats(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "User loading error:",
          userError
        );

        return;
      }

      // ===============================
      // PRODUCT COUNT
      // ===============================

      const {
        count: productsTotal,
        error: productsError,
      } = await supabase
        .from("products")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_id",
          user.id
        );

      if (productsError) {
        console.error(
          "Products count error:",
          productsError
        );
      } else {
        setProductCount(
          productsTotal || 0
        );
      }

      // ===============================
      // CUSTOMER COUNT
      // ===============================

      const {
        count: customersTotal,
        error: customersError,
      } = await supabase
        .from("customers")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_id",
          user.id
        );

      if (customersError) {
        console.error(
          "Customers count error:",
          customersError
        );
      } else {
        setCustomerCount(
          customersTotal || 0
        );
      }

      // ===============================
      // ACCOUNT INFORMATION
      // ===============================

      const metadata =
        user.user_metadata || {};

      const profileName =
        profile?.full_name ||
        metadata.full_name ||
        metadata.name ||
        "";

      const phoneNumber =
        user.phone ||
        metadata.phone ||
        metadata.phone_number ||
        profile?.phone ||
        "";

      setAccountInfo({
        name:
          profileName ||
          "User",

        email:
          user.email ||
          profile?.email ||
          "",

        phone:
          phoneNumber,

        lastLogin:
          user.last_sign_in_at ||
          "",
      });

      // ===============================
      // LOAD DRAFTS
      // ===============================

      await loadDrafts(user.id);

    } catch (error) {
      console.error(
        "Dashboard data error:",
        error
      );
    } finally {
      setLoadingStats(false);
    }
  }

  // =====================================
  // LOAD DRAFTS
  // =====================================

  async function loadDrafts(userId) {
    try {
      setLoadingDrafts(true);

      const data =
        await getAllDrafts({
          userId,
        });

      setDrafts(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {
      console.error(
        "Draft loading error:",
        error
      );

      setDrafts([]);
    } finally {
      setLoadingDrafts(false);
    }
  }

  // =====================================
  // INITIAL LOAD
  // =====================================

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  // =====================================
  // UPDATE LIVE TIME
  // =====================================

  useEffect(() => {
    const interval =
      setInterval(() => {
        setCurrentTime(
          new Date()
        );
      }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // =====================================
  // GET TIME GREETING
  // =====================================

  function getGreeting() {
    const hour =
      currentTime.getHours();

    if (hour < 12) {
      return "Good Morning";
    }

    if (hour < 17) {
      return "Good Afternoon";
    }

    return "Good Evening";
  }

  // =====================================
  // FORMAT DATE
  // =====================================

  function formatDate(date) {
    return date.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  }

  // =====================================
  // FORMAT TIME
  // =====================================

  function formatTime(date) {
    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );
  }

  // =====================================
  // FORMAT LAST LOGIN
  // =====================================

  function formatLastLogin(value) {
    if (!value) {
      return "Not available";
    }

    try {
      const date =
        new Date(value);

      return date.toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",

          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "Not available";
    }
  }

  // =====================================
  // FORMAT DRAFT DATE
  // =====================================

  function formatDraftUpdated(value) {
    if (!value) {
      return "Not available";
    }

    try {
      const date =
        new Date(value);

      return date.toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "Not available";
    }
  }

  // =====================================
  // BILL TYPE LABEL
  // =====================================

  function getBillTypeLabel(type) {
    switch (type) {
      case "gst":
        return "GST Invoice";

      case "normal":
        return "Normal Bill";

      case "corecutting":
        return "Core Cutting";

      case "challan":
        return "Challan";

      default:
        return type || "Bill";
    }
  }

  // =====================================
  // BILL TYPE SHORT LABEL
  // =====================================

  function getBillTypeShort(type) {
    switch (type) {
      case "gst":
        return "GST";

      case "normal":
        return "Normal";

      case "corecutting":
        return "Core Cutting";

      case "challan":
        return "Challan";

      default:
        return "Bill";
    }
  }

  // =====================================
  // DRAFT DESCRIPTION
  // =====================================

  function getDraftCustomer(draft) {
    return (
      draft?.customer?.to_address ||
      draft?.customer?.toAddress ||
      draft?.customer_to ||
      draft?.customerTo ||
      draft?.customer?.name ||
      draft?.customerName ||
      ""
    );
  }

  function getDraftSite(draft) {
    return (
      draft?.customer?.site ||
      draft?.customerSite ||
      draft?.customer_site ||
      draft?.site ||
      ""
    );
  }

  function getDraftCompany(draft) {
    return (
      draft?.company?.company_name ||
      draft?.company?.name ||
      draft?.companyName ||
      "Company not selected"
    );
  }

  // =====================================
  // SEARCH + FILTER
  // =====================================

  const filteredDrafts = useMemo(() => {
    const search =
      draftSearch
        .trim()
        .toLowerCase();

    return drafts.filter((draft) => {
      // ===============================
      // FILTER
      // ===============================

      if (
        draftFilter === "important" &&
        !draft.isImportant
      ) {
        return false;
      }

      if (
        draftFilter !== "all" &&
        draftFilter !== "important"
      ) {
        if (
          draft.billType !==
          draftFilter
        ) {
          return false;
        }
      }

      // ===============================
      // SEARCH
      // ===============================

      if (!search) {
        return true;
      }

      const searchableText = [
        draft.billNumber,
        draft.bill_number,

        draft.companyName,
        draft.company?.company_name,
        draft.company?.name,

        getDraftCompany(draft),

        getDraftCustomer(draft),

        getDraftSite(draft),

        draft.billType,

        getBillTypeLabel(
          draft.billType
        ),

        getBillTypeShort(
          draft.billType
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        search
      );
    });
  }, [
    drafts,
    draftSearch,
    draftFilter,
  ]);

  // =====================================
  // TOGGLE IMPORTANT
  // =====================================

  async function handleToggleImportant(
    draft
  ) {
    try {
      const updatedDraft = {
        ...draft,
        isImportant:
          !Boolean(
            draft.isImportant
          ),
      };

      await saveDraft(
        updatedDraft
      );

      setDrafts(
        previous =>
          previous.map(item =>
            item.id === draft.id
              ? updatedDraft
              : item
          )
      );

    } catch (error) {
      console.error(
        "Unable to update draft importance:",
        error
      );
    }
  }

  // =====================================
  // DELETE DRAFT
  // =====================================

  async function handleDeleteDraft(
    draft
  ) {
    const confirmed =
      window.confirm(
        `Delete this ${getBillTypeLabel(
          draft.billType
        )} draft?\n\nThis unfinished bill will be permanently removed from this browser.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingDraftId(
        draft.id
      );

      await deleteDraft(
        draft.id
      );

      setDrafts(
        previous =>
          previous.filter(
            item =>
              item.id !==
              draft.id
          )
      );

    } catch (error) {
      console.error(
        "Draft deletion error:",
        error
      );

      window.alert(
        "Unable to delete this draft."
      );
    } finally {
      setDeletingDraftId(null);
    }
  }

  // =====================================
  // OPEN DRAFT
  // =====================================

  function handleOpenDraft(draft) {
    if (
      typeof onOpenDraft ===
      "function"
    ) {
      onOpenDraft(draft);
      return;
    }

    console.warn(
      "Home: onOpenDraft was not provided."
    );
  }

  // =====================================
  // DISPLAY NAME
  // =====================================

  const displayName =
    accountInfo.name ||
    profile?.full_name ||
    "User";

  // =====================================
  // RENDER
  // =====================================

  return (
    <div style={styles.container}>

      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <div style={styles.header}>

        <div style={styles.userHeader}>

          <div style={styles.dashboardIcon}>
            🏢
          </div>

          <div>

            <p style={styles.greeting}>
              {getGreeting()}
            </p>

            <h1 style={styles.title}>
              {displayName}
            </h1>

            <p style={styles.subtitle}>
              Welcome back to your Billing Dashboard
            </p>

          </div>

        </div>

        {/* DATE TIME */}

        <div style={styles.dateCard}>

          <div style={styles.dateRow}>
            📅

            <span>
              {formatDate(
                currentTime
              )}
            </span>
          </div>

          <div style={styles.timeRow}>
            🕒

            <strong>
              {formatTime(
                currentTime
              )}
            </strong>
          </div>

        </div>

      </div>

      {/* ============================= */}
      {/* WELCOME CARD */}
      {/* ============================= */}

      <div style={styles.welcomeCard}>

        <div>

          <p style={styles.welcomeLabel}>
            BILLING MANAGEMENT
          </p>

          <h2 style={styles.welcomeTitle}>
            Everything you need in one place
          </h2>

          <p style={styles.welcomeText}>
            Manage customers, products and your
            business information from your dashboard.
          </p>

        </div>

        <div style={styles.welcomeIcon}>
          📊
        </div>

      </div>

      {/* ============================= */}
      {/* STATISTICS */}
      {/* ============================= */}

      <div style={styles.statsGrid}>

        {/* PRODUCTS */}

        <div style={styles.statCard}>

          <div
            style={{
              ...styles.statIcon,
              ...styles.productIcon,
            }}
          >
            📦
          </div>

          <div>

            <p style={styles.statLabel}>
              Products
            </p>

            <h2 style={styles.statValue}>
              {loadingStats
                ? "..."
                : productCount}
            </h2>

            <p style={styles.statDescription}>
              Available products
            </p>

          </div>

        </div>

        {/* CUSTOMERS */}

        <div style={styles.statCard}>

          <div
            style={{
              ...styles.statIcon,
              ...styles.customerIcon,
            }}
          >
            👥
          </div>

          <div>

            <p style={styles.statLabel}>
              Customers
            </p>

            <h2 style={styles.statValue}>
              {loadingStats
                ? "..."
                : customerCount}
            </h2>

            <p style={styles.statDescription}>
              Saved customer details
            </p>

          </div>

        </div>

      </div>

      {/* ============================= */}
      {/* BOTTOM GRID */}
      {/* ============================= */}

      <div style={styles.bottomGrid}>

        {/* ============================= */}
        {/* DRAFTS / RECENT ACTIVITY */}
        {/* ============================= */}

        <div style={styles.section}>

          <div style={styles.sectionHeader}>

            <div>

              <h2 style={styles.sectionTitle}>
                Recent Activity
              </h2>

              <p style={styles.sectionSubtitle}>
                Your unfinished billing drafts
              </p>

            </div>

            <span style={styles.recentBadge}>
              {drafts.length} Draft
              {drafts.length === 1
                ? ""
                : "s"}
            </span>

          </div>

          {/* ============================= */}
          {/* SEARCH + FILTER */}
          {/* ============================= */}

          <div style={styles.draftToolbar}>

            <div style={styles.searchBox}>

              <span style={styles.searchIcon}>
                🔍
              </span>

              <input
                type="text"
                value={draftSearch}
                onChange={event =>
                  setDraftSearch(
                    event.target.value
                  )
                }
                placeholder="Search drafts..."
                style={styles.searchInput}
              />

              {draftSearch && (
                <button
                  type="button"
                  style={styles.clearSearchButton}
                  onClick={() =>
                    setDraftSearch("")
                  }
                  title="Clear search"
                >
                  ×
                </button>
              )}

            </div>

            <div style={styles.filterGroup}>

              <button
                type="button"
                onClick={() =>
                  setDraftFilter("all")
                }
                style={{
                  ...styles.filterButton,
                  ...(draftFilter ===
                  "all"
                    ? styles.activeFilterButton
                    : {}),
                }}
              >
                All
              </button>

              <button
                type="button"
                onClick={() =>
                  setDraftFilter(
                    "important"
                  )
                }
                style={{
                  ...styles.filterButton,
                  ...(draftFilter ===
                  "important"
                    ? styles.activeFilterButton
                    : {}),
                }}
              >
                ⭐ Important
              </button>

              <button
                type="button"
                onClick={() =>
                  setDraftFilter(
                    "normal"
                  )
                }
                style={{
                  ...styles.filterButton,
                  ...(draftFilter ===
                  "normal"
                    ? styles.activeFilterButton
                    : {}),
                }}
              >
                Normal
              </button>

              <button
                type="button"
                onClick={() =>
                  setDraftFilter(
                    "gst"
                  )
                }
                style={{
                  ...styles.filterButton,
                  ...(draftFilter ===
                  "gst"
                    ? styles.activeFilterButton
                    : {}),
                }}
              >
                GST
              </button>

              <button
                type="button"
                onClick={() =>
                  setDraftFilter(
                    "corecutting"
                  )
                }
                style={{
                  ...styles.filterButton,
                  ...(draftFilter ===
                  "corecutting"
                    ? styles.activeFilterButton
                    : {}),
                }}
              >
                Core Cutting
              </button>

            </div>

          </div>

          {/* ============================= */}
          {/* DRAFT CONTENT */}
          {/* ============================= */}

          {loadingDrafts ? (

            <div style={styles.draftLoading}>
              <div style={styles.loadingSpinner}>
                ⟳
              </div>

              <p>
                Loading drafts...
              </p>
            </div>

          ) : filteredDrafts.length ===
            0 ? (

            <div style={styles.emptyState}>

              <div style={styles.emptyIcon}>
                {drafts.length === 0
                  ? "📋"
                  : "🔍"}
              </div>

              <h3 style={styles.emptyTitle}>
                {drafts.length === 0
                  ? "No unfinished bills"
                  : "No drafts found"}
              </h3>

              <p style={styles.emptyText}>
                {drafts.length === 0
                  ? "When you start entering a bill, it will automatically appear here."
                  : "Try changing your search or filter."}
              </p>

            </div>

          ) : (

            <div style={styles.draftList}>

              {filteredDrafts.map(
                draft => (

                  <div
                    key={draft.id}
                    style={styles.draftCard}
                  >

                    {/* ================= */}
                    {/* DRAFT ICON */}
                    {/* ================= */}

                    <div
                      style={
                        styles.draftTypeIcon
                      }
                    >
                      {draft.billType ===
                      "gst"
                        ? "🧾"
                        : draft.billType ===
                          "corecutting"
                        ? "🏗️"
                        : draft.billType ===
                          "challan"
                        ? "📄"
                        : "📝"}
                    </div>

                    {/* ================= */}
                    {/* DRAFT INFO */}
                    {/* ================= */}

                    <div
                      style={
                        styles.draftInfo
                      }
                    >

                      <div
                        style={
                          styles.draftTitleRow
                        }
                      >

                        <strong
                          style={
                            styles.draftTitle
                          }
                        >
                          {getBillTypeLabel(
                            draft.billType
                          )}
                        </strong>

                        {draft.billNumber && (
                          <span
                            style={
                              styles.draftNumber
                            }
                          >
                            #{draft.billNumber}
                          </span>
                        )}

                        {draft.isImportant && (
                          <span
                            style={
                              styles.importantBadge
                            }
                          >
                            ⭐ Important
                          </span>
                        )}

                      </div>

                      <p
                        style={
                          styles.draftCompany
                        }
                      >
                        🏢{" "}
                        {getDraftCompany(
                          draft
                        )}
                      </p>

                      {getDraftCustomer(
                        draft
                      ) && (
                        <p
                          style={
                            styles.draftDetail
                          }
                        >
                          👤{" "}
                          {getDraftCustomer(
                            draft
                          )}
                        </p>
                      )}

                      {getDraftSite(
                        draft
                      ) && (
                        <p
                          style={
                            styles.draftDetail
                          }
                        >
                          📍{" "}
                          {getDraftSite(
                            draft
                          )}
                        </p>
                      )}

                      <p
                        style={
                          styles.draftUpdated
                        }
                      >
                        Last updated:{" "}
                        {formatDraftUpdated(
                          draft.updatedAt
                        )}
                      </p>

                    </div>

                    {/* ================= */}
                    {/* ACTIONS */}
                    {/* ================= */}

                    <div
                      style={
                        styles.draftActions
                      }
                    >

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleImportant(
                            draft
                          )
                        }
                        style={
                          styles.starButton
                        }
                        title={
                          draft.isImportant
                            ? "Remove from Important"
                            : "Mark as Important"
                        }
                      >
                        {draft.isImportant
                          ? "⭐"
                          : "☆"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenDraft(
                            draft
                          )
                        }
                        style={
                          styles.continueButton
                        }
                      >
                        Continue
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteDraft(
                            draft
                          )
                        }
                        disabled={
                          deletingDraftId ===
                          draft.id
                        }
                        style={
                          styles.deleteButton
                        }
                        title="Delete draft"
                      >
                        {deletingDraftId ===
                        draft.id
                          ? "..."
                          : "🗑️"}
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>

          )}

        </div>

        {/* ============================= */}
        {/* ACCOUNT INFORMATION */}
        {/* ============================= */}

        <div style={styles.accountCard}>

          <div style={styles.accountHeader}>

            <div style={styles.accountIcon}>
              👤
            </div>

            <div>

              <h2 style={styles.accountTitle}>
                Account Information
              </h2>

              <p style={styles.accountSubtitle}>
                Your account details
              </p>

            </div>

          </div>

          <div style={styles.divider} />

          {/* NAME */}

          <div style={styles.infoRow}>

            <span style={styles.infoLabel}>
              Name
            </span>

            <strong style={styles.infoValue}>
              {displayName}
            </strong>

          </div>

          {/* EMAIL */}

          <div style={styles.infoRow}>

            <span style={styles.infoLabel}>
              Email
            </span>

            <strong style={styles.infoValue}>
              {accountInfo.email ||
                "Not available"}
            </strong>

          </div>

          {/* PHONE */}

          <div style={styles.infoRow}>

            <span style={styles.infoLabel}>
              Phone
            </span>

            <strong style={styles.infoValue}>
              {accountInfo.phone ||
                "Not available"}
            </strong>

          </div>

          {/* STATUS */}

          <div style={styles.infoRow}>

            <span style={styles.infoLabel}>
              Status
            </span>

            <span style={styles.statusBadge}>
              {profile?.status ||
                "Approved"}
            </span>

          </div>

          {/* LAST LOGIN */}

          <div style={styles.lastLoginBox}>

            <div style={styles.lastLoginIcon}>
              🕒
            </div>

            <div>

              <p style={styles.lastLoginLabel}>
                Last Login
              </p>

              <strong style={styles.lastLoginValue}>
                {formatLastLogin(
                  accountInfo.lastLogin
                )}
              </strong>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}


// =====================================
// STYLES
// =====================================

const styles = {

  container: {
    width: "100%",
    boxSizing: "border-box",
  },

  // =========================
  // HEADER
  // =========================

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
    flexWrap: "wrap",
  },

  userHeader: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },

  dashboardIcon: {
    width: "55px",
    height: "55px",
    borderRadius: "10px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    fontSize: "30px",

    background:
      "linear-gradient(135deg, #4f46e5, #9333ea)",

    boxShadow:
      "0 4px 10px rgba(79,70,229,0.2)",
  },

  greeting: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "700",
    color: "#64748b",
  },

  title: {
    margin: "3px 0",
    fontSize: "30px",
    fontWeight: "800",
    color: "#1e293b",
  },

  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#64748b",
  },

  dateCard: {
    minWidth: "220px",
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "15px 18px",
    boxShadow:
      "0 4px 12px rgba(0,0,0,0.04)",
  },

  dateRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#475569",
  },

  timeRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "10px",
    fontSize: "18px",
    color: "#1e293b",
  },

  // =========================
  // WELCOME
  // =========================

  welcomeCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",

    background:
      "linear-gradient(135deg, #2563eb, #1e40af)",

    color: "#ffffff",

    padding: "30px",
    borderRadius: "16px",
    marginBottom: "25px",

    boxShadow:
      "0 8px 20px rgba(37,99,235,0.2)",
  },

  welcomeLabel: {
    margin: "0 0 8px",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "1.5px",
    opacity: 0.75,
  },

  welcomeTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "800",
  },

  welcomeText: {
    margin: "10px 0 0",
    fontSize: "15px",
    opacity: 0.9,
    maxWidth: "700px",
    lineHeight: "1.6",
  },

  welcomeIcon: {
    width: "70px",
    height: "70px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "42px",
    borderRadius: "14px",
    background:
      "rgba(255,255,255,0.15)",
  },

  // =========================
  // STATS
  // =========================

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "25px",
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "22px",
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "15px",
    boxShadow:
      "0 4px 12px rgba(0,0,0,0.04)",
  },

  statIcon: {
    width: "60px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "16px",
    fontSize: "30px",
  },

  productIcon: {
    background: "#ecfdf5",
  },

  customerIcon: {
    background: "#f5f3ff",
  },

  statLabel: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "700",
    color: "#64748b",
  },

  statValue: {
    margin: "5px 0",
    fontSize: "30px",
    fontWeight: "800",
    color: "#1e293b",
  },

  statDescription: {
    margin: 0,
    fontSize: "12px",
    color: "#94a3b8",
  },

  // =========================
  // BOTTOM GRID
  // =========================

  bottomGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 2fr) minmax(320px, 1fr)",
    gap: "22px",
  },

  // =========================
  // RECENT ACTIVITY
  // =========================

  section: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    overflow: "hidden",
    minHeight: "350px",
    boxShadow:
      "0 4px 12px rgba(0,0,0,0.04)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px",
    borderBottom:
      "1px solid #e2e8f0",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "19px",
    color: "#1e293b",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    fontSize: "13px",
    color: "#64748b",
  },

  recentBadge: {
    padding: "7px 12px",
    borderRadius: "20px",
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "700",
  },

  // =========================
  // DRAFT TOOLBAR
  // =========================

  draftToolbar: {
    padding: "15px 20px",
    borderBottom:
      "1px solid #e2e8f0",
    background: "#f8fafc",
  },

  searchBox: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    background: "#ffffff",
    border:
      "1px solid #cbd5e1",
    borderRadius: "10px",
    minHeight: "42px",
    boxSizing: "border-box",
  },

  searchIcon: {
    marginLeft: "12px",
    fontSize: "15px",
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    padding: "10px 40px 10px 10px",
    fontSize: "14px",
    color: "#334155",
    boxSizing: "border-box",
  },

  clearSearchButton: {
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",

    width: "26px",
    height: "26px",

    border: "none",
    borderRadius: "50%",

    background: "#e2e8f0",
    color: "#475569",

    cursor: "pointer",

    fontSize: "18px",
    lineHeight: "1",
  },

  filterGroup: {
    display: "flex",
    gap: "7px",
    marginTop: "10px",
    flexWrap: "wrap",
  },

  filterButton: {
    border:
      "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#475569",
    borderRadius: "8px",
    padding: "7px 11px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },

  activeFilterButton: {
    background: "#2563eb",
    borderColor: "#2563eb",
    color: "#ffffff",
  },

  // =========================
  // DRAFT LIST
  // =========================

  draftList: {
    maxHeight: "480px",
    overflowY: "auto",
  },

  draftCard: {
    display: "flex",
    alignItems: "center",
    gap: "13px",

    padding: "15px 20px",

    borderBottom:
      "1px solid #f1f5f9",

    transition:
      "background 0.15s ease",
  },

  draftTypeIcon: {
    width: "45px",
    height: "45px",

    flexShrink: 0,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    borderRadius: "12px",

    background: "#eff6ff",

    fontSize: "22px",
  },

  draftInfo: {
    flex: 1,
    minWidth: 0,
  },

  draftTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    flexWrap: "wrap",
  },

  draftTitle: {
    color: "#1e293b",
    fontSize: "14px",
  },

  draftNumber: {
    padding: "3px 7px",
    borderRadius: "5px",
    background: "#f1f5f9",
    color: "#475569",
    fontSize: "11px",
    fontWeight: "700",
  },

  importantBadge: {
    padding: "3px 7px",
    borderRadius: "5px",
    background: "#fef3c7",
    color: "#92400e",
    fontSize: "10px",
    fontWeight: "800",
  },

  draftCompany: {
    margin: "5px 0 0",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  draftDetail: {
    margin: "3px 0 0",
    color: "#64748b",
    fontSize: "12px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  draftUpdated: {
    margin: "5px 0 0",
    color: "#94a3b8",
    fontSize: "11px",
  },

  draftActions: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexShrink: 0,
  },

  starButton: {
    width: "34px",
    height: "34px",

    border:
      "1px solid #e2e8f0",
    borderRadius: "8px",

    background: "#ffffff",

    cursor: "pointer",

    fontSize: "17px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  continueButton: {
    border: "none",
    borderRadius: "8px",

    background: "#2563eb",
    color: "#ffffff",

    padding: "9px 13px",

    cursor: "pointer",

    fontSize: "12px",
    fontWeight: "700",
  },

  deleteButton: {
    width: "34px",
    height: "34px",

    border:
      "1px solid #fecaca",
    borderRadius: "8px",

    background: "#fff7f7",
    color: "#dc2626",

    cursor: "pointer",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    fontSize: "14px",
  },

  // =========================
  // EMPTY / LOADING
  // =========================

  emptyState: {
    minHeight: "250px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "20px",
  },

  emptyIcon: {
    fontSize: "45px",
    marginBottom: "12px",
  },

  emptyTitle: {
    margin: 0,
    color: "#334155",
    fontSize: "17px",
  },

  emptyText: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "14px",
    maxWidth: "450px",
    lineHeight: "1.5",
  },

  draftLoading: {
    minHeight: "250px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    fontSize: "14px",
  },

  loadingSpinner: {
    fontSize: "30px",
    marginBottom: "8px",
  },

  // =========================
  // ACCOUNT CARD
  // =========================

  accountCard: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "20px",
    boxShadow:
      "0 4px 12px rgba(0,0,0,0.04)",
  },

  accountHeader: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  accountIcon: {
    width: "50px",
    height: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "14px",
    fontSize: "25px",
    background: "#eff6ff",
  },

  accountTitle: {
    margin: 0,
    fontSize: "19px",
    color: "#1e293b",
  },

  accountSubtitle: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#64748b",
  },

  divider: {
    height: "1px",
    background: "#e2e8f0",
    margin: "18px 0",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "10px 0",
    fontSize: "14px",
  },

  infoLabel: {
    color: "#64748b",
    flexShrink: 0,
  },

  infoValue: {
    color: "#334155",
    textAlign: "right",
    wordBreak: "break-word",
  },

  statusBadge: {
    padding: "5px 12px",
    borderRadius: "20px",
    background: "#ecfdf5",
    color: "#059669",
    fontSize: "12px",
    fontWeight: "800",
    textTransform: "capitalize",
  },

  lastLoginBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "15px",
    padding: "14px",
    borderRadius: "12px",
    background: "#f8fafc",
  },

  lastLoginIcon: {
    width: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    background: "#e2e8f0",
    fontSize: "20px",
  },

  lastLoginLabel: {
    margin: 0,
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
  },

  lastLoginValue: {
    display: "block",
    marginTop: "3px",
    fontSize: "13px",
    color: "#334155",
  },

};

export default Home;