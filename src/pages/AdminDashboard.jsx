import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function AdminDashboard() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [updatingUserId, setUpdatingUserId] =
    useState(null);

  const [disableUser, setDisableUser] =
    useState(null);

  const [disableReason, setDisableReason] =
    useState("");

  const [showLogoutConfirm, setShowLogoutConfirm] =
    useState(false);

  const defaultReasons = [
    "Violation of application rules.",
    "Suspicious account activity detected.",
    "Invalid or incorrect account information.",
    "Misuse of the billing application.",
    "Account temporarily disabled by administrator.",
  ];

  // =========================
  // LOAD USERS
  // =========================

  async function loadUsers(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    setMessage("");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);

        setMessage(
          `❌ Failed to load users: ${error.message}`
        );

        return;
      }

      setUsers(data || []);

    } catch (error) {
      console.error(error);

      setMessage(
        "❌ Something went wrong while loading users."
      );

    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  // =========================
  // LOAD + REALTIME
  // =========================

  useEffect(() => {
    loadUsers();

    const channel = supabase
      .channel("admin-profiles-live")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          loadUsers(false);
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =========================
  // UPDATE USER STATUS
  // =========================

  async function updateUserStatus(
    userId,
    newStatus,
    reason = null
  ) {
    setMessage("");

    setUpdatingUserId(userId);

    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "disabled") {
        updateData.disable_reason = reason;
      }

      if (newStatus === "approved") {
        updateData.disable_reason = null;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId)
        .select();

      if (error) {
        setMessage(
          `❌ Failed to update user: ${error.message}`
        );

        return;
      }

      if (!data || data.length === 0) {
        setMessage(
          "❌ User was not updated."
        );

        return;
      }

      setUsers((previousUsers) =>
        previousUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                ...updateData,
              }
            : user
        )
      );

      setMessage(
        `✅ User successfully ${newStatus}.`
      );

    } catch (error) {
      console.error(error);

      setMessage(
        `❌ ${
          error.message ||
          "Something went wrong."
        }`
      );

    } finally {
      setUpdatingUserId(null);
    }
  }

  // =========================
  // DISABLE MODAL
  // =========================

  function openDisableModal(user) {
    setDisableUser(user);

    setDisableReason(
      "Account temporarily disabled by administrator."
    );
  }

  async function confirmDisable() {
    if (!disableUser) {
      return;
    }

    if (!disableReason.trim()) {
      alert(
        "Please select or enter a reason."
      );

      return;
    }

    await updateUserStatus(
      disableUser.id,
      "disabled",
      disableReason.trim()
    );

    setDisableUser(null);
    setDisableReason("");
  }

  // =========================
  // LOGOUT
  // =========================

  function requestLogout() {
    setShowLogoutConfirm(true);
  }

  async function handleLogout() {
    try {
      setShowLogoutConfirm(false);

      await supabase.auth.signOut();

      navigate("/admin-login", {
        replace: true,
      });

    } catch (error) {
      console.error(error);

      setMessage(
        "❌ Something went wrong while logging out."
      );
    }
  }

  // =========================
  // STATISTICS
  // =========================

  const totalUsers = users.length;

  const pendingUsers = users.filter(
    (user) => user.status === "pending"
  ).length;

  const approvedUsers = users.filter(
    (user) => user.status === "approved"
  ).length;

  const rejectedUsers = users.filter(
    (user) => user.status === "rejected"
  ).length;

  const disabledUsers = users.filter(
    (user) => user.status === "disabled"
  ).length;

  // =========================
  // FILTER + SEARCH
  // =========================

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {

      const matchesFilter =
        filter === "all"
          ? true
          : user.status === filter;

      const phoneNumber =
        user.phone ||
        user.whatsapp_number ||
        "";

      const searchText = `
        ${user.full_name || ""}
        ${user.email || ""}
        ${phoneNumber}
      `.toLowerCase();

      const matchesSearch =
        searchText.includes(
          search.toLowerCase()
        );

      return (
        matchesFilter &&
        matchesSearch
      );
    });
  }, [
    users,
    filter,
    search,
  ]);

  return (
    <div style={styles.container}>

      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <div style={styles.header}>

        <div>

          <div style={styles.logoRow}>

            <div style={styles.logo}>
              B
            </div>

            <div>

              <h1 style={styles.title}>
                Billing Admin
              </h1>

              <p style={styles.subtitle}>
                Manage users and account access
              </p>

            </div>

          </div>

        </div>

        <button
          onClick={requestLogout}
          style={styles.logoutButton}
        >
          🚪 Logout
        </button>

      </div>


      {/* ========================= */}
      {/* STATISTICS */}
      {/* ========================= */}

      <div style={styles.statsGrid}>

        <StatCard
          icon="👥"
          title="Total Users"
          value={totalUsers}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />

        <StatCard
          icon="⏳"
          title="Pending"
          value={pendingUsers}
          active={filter === "pending"}
          onClick={() =>
            setFilter("pending")
          }
        />

        <StatCard
          icon="✅"
          title="Approved"
          value={approvedUsers}
          active={filter === "approved"}
          onClick={() =>
            setFilter("approved")
          }
        />

        <StatCard
          icon="❌"
          title="Rejected"
          value={rejectedUsers}
          active={filter === "rejected"}
          onClick={() =>
            setFilter("rejected")
          }
        />

        <StatCard
          icon="🚫"
          title="Disabled"
          value={disabledUsers}
          active={filter === "disabled"}
          onClick={() =>
            setFilter("disabled")
          }
        />

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

          <button
            onClick={() =>
              setMessage("")
            }
            style={styles.messageClose}
          >
            ×
          </button>

        </div>

      )}


      {/* ========================= */}
      {/* USER MANAGEMENT */}
      {/* ========================= */}

      <div style={styles.tableContainer}>

        {/* TOP */}

        <div style={styles.tableTop}>

          <div>

            <h2 style={styles.sectionTitle}>
              User Management
            </h2>

            <p style={styles.filterText}>
              Showing{" "}
              <strong>
                {filteredUsers.length}
              </strong>{" "}
              of{" "}
              <strong>
                {totalUsers}
              </strong>{" "}
              users
            </p>

          </div>


          <div style={styles.tableActions}>

            <div style={styles.searchBox}>

              <span>
                🔍
              </span>

              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                style={styles.searchInput}
              />

            </div>

            <button
              onClick={() =>
                loadUsers()
              }
              style={styles.refreshButton}
            >
              ↻ Refresh
            </button>

          </div>

        </div>


        {/* ACTIVE FILTER */}

        <div style={styles.filterBar}>

          {[
            "all",
            "pending",
            "approved",
            "rejected",
            "disabled",
          ].map((item) => (

            <button
              key={item}
              onClick={() =>
                setFilter(item)
              }
              style={{
                ...styles.filterButton,

                ...(filter === item
                  ? styles.activeFilterButton
                  : {}),
              }}
            >
              {item === "all"
                ? "All Users"
                : item.charAt(0)
                    .toUpperCase() +
                  item.slice(1)}
            </button>

          ))}

        </div>


        {/* ========================= */}
        {/* TABLE */}
        {/* ========================= */}

        {loading ? (

          <div style={styles.loadingBox}>

            <div style={styles.spinner}></div>

            <p>
              Loading users...
            </p>

          </div>

        ) : filteredUsers.length === 0 ? (

          <div style={styles.emptyState}>

            <div style={styles.emptyIcon}>
              👤
            </div>

            <h3>
              No users found
            </h3>

            <p>
              Try changing your filter
              or search term.
            </p>

          </div>

        ) : (

          <div style={styles.tableWrapper}>

            <table style={styles.table}>

              <thead>

                <tr>

                  <th style={styles.th}>
                    User
                  </th>

                  <th style={styles.th}>
                    Phone
                  </th>

                  <th style={styles.th}>
                    Status
                  </th>

                  <th style={styles.th}>
                    Disable Reason
                  </th>

                  <th style={styles.th}>
                    Joined
                  </th>

                  <th style={styles.th}>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredUsers.map(
                  (user) => {

                    const phoneNumber =
                      user.phone ||
                      user.whatsapp_number ||
                      "-";

                    const isUpdating =
                      updatingUserId ===
                      user.id;

                    return (

                      <tr
                        key={user.id}
                        style={styles.tr}
                      >

                        {/* USER */}

                        <td style={styles.td}>

                          <div
                            style={
                              styles.userInfo
                            }
                          >

                            <div
                              style={
                                styles.avatar
                              }
                            >
                              {(
                                user.full_name ||
                                "U"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>

                              <div
                                style={
                                  styles.userName
                                }
                              >
                                {user.full_name ||
                                  "-"}
                              </div>

                              <div
                                style={
                                  styles.userEmail
                                }
                              >
                                {user.email ||
                                  "-"}
                              </div>

                            </div>

                          </div>

                        </td>


                        {/* PHONE */}

                        <td style={styles.td}>
                          {phoneNumber}
                        </td>


                        {/* STATUS */}

                        <td style={styles.td}>

                          <StatusBadge
                            status={
                              user.status
                            }
                          />

                        </td>


                        {/* REASON */}

                        <td
                          style={{
                            ...styles.td,
                            maxWidth:
                              "250px",
                          }}
                        >

                          {user.status ===
                          "disabled" ? (

                            <span
                              style={
                                styles.reasonText
                              }
                            >
                              {user.disable_reason ||
                                "No reason provided"}
                            </span>

                          ) : (

                            "-"

                          )}

                        </td>


                        {/* CREATED */}

                        <td style={styles.td}>

                          {user.created_at
                            ? new Date(
                                user.created_at
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  day:
                                    "2-digit",
                                  month:
                                    "short",
                                  year:
                                    "numeric",
                                }
                              )
                            : "-"}

                        </td>


                        {/* ACTIONS */}

                        <td style={styles.td}>

                          <div
                            style={
                              styles.actionGroup
                            }
                          >

                            {/* PENDING */}

                            {user.status ===
                              "pending" && (
                              <>

                                <button
                                  disabled={
                                    isUpdating
                                  }
                                  onClick={() =>
                                    updateUserStatus(
                                      user.id,
                                      "approved"
                                    )
                                  }
                                  style={
                                    styles.approveButton
                                  }
                                >
                                  {isUpdating
                                    ? "..."
                                    : "Approve"}
                                </button>


                                <button
                                  disabled={
                                    isUpdating
                                  }
                                  onClick={() =>
                                    updateUserStatus(
                                      user.id,
                                      "rejected"
                                    )
                                  }
                                  style={
                                    styles.rejectButton
                                  }
                                >
                                  Reject
                                </button>

                              </>
                            )}


                            {/* APPROVED */}

                            {user.status ===
                              "approved" && (

                              <button
                                disabled={
                                  isUpdating
                                }
                                onClick={() =>
                                  openDisableModal(
                                    user
                                  )
                                }
                                style={
                                  styles.disableButton
                                }
                              >
                                {isUpdating
                                  ? "Updating..."
                                  : "Disable"}
                              </button>

                            )}


                            {/* DISABLED */}

                            {user.status ===
                              "disabled" && (

                              <button
                                disabled={
                                  isUpdating
                                }
                                onClick={() =>
                                  updateUserStatus(
                                    user.id,
                                    "approved"
                                  )
                                }
                                style={
                                  styles.approveButton
                                }
                              >
                                {isUpdating
                                  ? "Updating..."
                                  : "Enable"}
                              </button>

                            )}


                            {/* REJECTED */}

                            {user.status ===
                              "rejected" && (

                              <button
                                disabled={
                                  isUpdating
                                }
                                onClick={() =>
                                  updateUserStatus(
                                    user.id,
                                    "approved"
                                  )
                                }
                                style={
                                  styles.approveButton
                                }
                              >
                                {isUpdating
                                  ? "Updating..."
                                  : "Approve"}
                              </button>

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

      </div>


      {/* ========================= */}
      {/* DISABLE USER MODAL */}
      {/* ========================= */}

      {disableUser && (

        <div style={styles.modalOverlay}>

          <div style={styles.modal}>

            <div style={styles.modalHeader}>

              <div
                style={
                  styles.warningIcon
                }
              >
                ⚠️
              </div>

              <div>

                <h2
                  style={
                    styles.modalTitle
                  }
                >
                  Disable Account
                </h2>

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  This will block the user
                  from accessing the billing
                  dashboard.
                </p>

              </div>

            </div>


            <div style={styles.userDisableInfo}>

              <strong>
                {disableUser.full_name}
              </strong>

              <span>
                {disableUser.email}
              </span>

            </div>


            <label style={styles.label}>
              Select a reason
            </label>


            <select
              value={disableReason}
              onChange={(e) =>
                setDisableReason(
                  e.target.value
                )
              }
              style={styles.select}
            >

              {defaultReasons.map(
                (reason) => (

                  <option
                    key={reason}
                    value={reason}
                  >
                    {reason}
                  </option>

                )
              )}

              <option value="">
                Custom reason
              </option>

            </select>


            <label style={styles.label}>
              Reason / Additional Comment
            </label>


            <textarea
              value={disableReason}
              onChange={(e) =>
                setDisableReason(
                  e.target.value
                )
              }
              placeholder="Enter reason..."
              style={styles.textarea}
              rows="5"
            />


            <div style={styles.modalButtons}>

              <button
                onClick={() => {

                  setDisableUser(null);

                  setDisableReason("");

                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>


              <button
                onClick={confirmDisable}
                style={
                  styles.confirmDisableButton
                }
              >
                Disable Account
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ========================= */}
      {/* LOGOUT CONFIRM MODAL */}
      {/* ========================= */}

      {showLogoutConfirm && (

        <div style={styles.modalOverlay}>

          <div
            style={{
              ...styles.modal,
              maxWidth: "420px",
              textAlign: "center",
            }}
          >

            <div style={styles.logoutIcon}>
              🚪
            </div>

            <h2 style={styles.modalTitle}>
              Logout?
            </h2>

            <p
              style={{
                color: "#64748b",
                lineHeight: "1.6",
              }}
            >
              Are you sure you want to logout
              from the administrator dashboard?
            </p>


            <div
              style={{
                ...styles.modalButtons,
                justifyContent: "center",
              }}
            >

              <button
                onClick={() =>
                  setShowLogoutConfirm(
                    false
                  )
                }
                style={
                  styles.cancelButton
                }
              >
                Cancel
              </button>


              <button
                onClick={handleLogout}
                style={
                  styles.logoutConfirmButton
                }
              >
                Yes, Logout
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}


// =========================
// STAT CARD
// =========================

function StatCard({
  icon,
  title,
  value,
  active,
  onClick,
}) {
  return (

    <button
      onClick={onClick}
      style={{
        ...styles.statCard,

        ...(active
          ? styles.activeStatCard
          : {}),
      }}
    >

      <div style={styles.statTop}>

        <div style={styles.statIcon}>
          {icon}
        </div>

        <span style={styles.statArrow}>
          →
        </span>

      </div>


      <p style={styles.statTitle}>
        {title}
      </p>

      <h2 style={styles.statValue}>
        {value}
      </h2>

    </button>

  );
}


// =========================
// STATUS BADGE
// =========================

function StatusBadge({ status }) {

  const icons = {
    approved: "✓",
    pending: "⏳",
    rejected: "×",
    disabled: "−",
  };

  return (

    <span
      style={{
        ...styles.statusBadge,

        ...(status === "approved"
          ? styles.approvedBadge
          : {}),

        ...(status === "pending"
          ? styles.pendingBadge
          : {}),

        ...(status === "rejected"
          ? styles.rejectedBadge
          : {}),

        ...(status === "disabled"
          ? styles.disabledBadge
          : {}),
      }}
    >

      <span>
        {icons[status]}
      </span>

      {status}

    </span>

  );
}


// =========================
// STYLES
// =========================

const styles = {

  container: {
    minHeight: "100vh",
    padding: "28px",
    background:
      "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
    fontFamily:
      "Inter, Arial, sans-serif",
    boxSizing: "border-box",
  },


  /* HEADER */

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",

    padding:
      "24px 28px",

    borderRadius: "18px",

    background:
      "linear-gradient(135deg, #0f172a, #1e293b)",

    color: "white",

    marginBottom: "24px",

    boxShadow:
      "0 10px 30px rgba(15,23,42,0.15)",
  },

  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  logo: {
    width: "50px",
    height: "50px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    borderRadius: "14px",

    background:
      "linear-gradient(135deg,#2563eb,#7c3aed)",

    fontSize: "24px",
    fontWeight: "800",
  },

  title: {
    margin: 0,
    fontSize: "26px",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#cbd5e1",
  },

  logoutButton: {
    padding: "11px 18px",

    borderRadius: "10px",

    border:
      "1px solid rgba(255,255,255,0.2)",

    background:
      "rgba(255,255,255,0.1)",

    color: "white",

    cursor: "pointer",

    fontWeight: "600",
  },


  /* STATS */

  statsGrid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",

    gap: "16px",

    marginBottom: "24px",
  },

  statCard: {
    border: "1px solid #e2e8f0",

    background: "white",

    borderRadius: "16px",

    padding: "20px",

    textAlign: "left",

    cursor: "pointer",

    transition:
      "all 0.2s ease",

    boxShadow:
      "0 4px 15px rgba(0,0,0,0.04)",
  },

  activeStatCard: {
    border:
      "2px solid #2563eb",

    boxShadow:
      "0 8px 20px rgba(37,99,235,0.15)",
  },

  statTop: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",
  },

  statIcon: {
    fontSize: "24px",
  },

  statArrow: {
    color: "#94a3b8",
    fontSize: "20px",
  },

  statTitle: {
    margin:
      "18px 0 5px",

    color: "#64748b",

    fontSize: "14px",

    fontWeight: "600",
  },

  statValue: {
    margin: 0,

    fontSize: "32px",

    color: "#0f172a",
  },


  /* MESSAGE */

  message: {
    padding:
      "14px 18px",

    borderRadius: "12px",

    marginBottom: "20px",

    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",

    fontWeight: "500",
  },

  successMessage: {
    background: "#ecfdf5",
    color: "#047857",
    border:
      "1px solid #a7f3d0",
  },

  errorMessage: {
    background: "#fef2f2",
    color: "#b91c1c",
    border:
      "1px solid #fecaca",
  },

  messageClose: {
    border: "none",
    background: "transparent",
    fontSize: "22px",
    cursor: "pointer",
  },


  /* TABLE */

  tableContainer: {
    background: "white",

    borderRadius: "18px",

    padding: "24px",

    boxShadow:
      "0 8px 25px rgba(15,23,42,0.06)",
  },

  tableTop: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",

    gap: "20px",

    marginBottom: "20px",

    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: 0,

    color: "#0f172a",
  },

  filterText: {
    margin: "6px 0 0",

    color: "#64748b",
  },

  tableActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",

    padding:
      "0 12px",

    border:
      "1px solid #cbd5e1",

    borderRadius: "10px",
  },

  searchInput: {
    border: "none",

    outline: "none",

    padding: "11px 4px",

    width: "220px",
  },

  refreshButton: {
    padding:
      "11px 16px",

    border: "none",

    borderRadius: "10px",

    background: "#2563eb",

    color: "white",

    fontWeight: "600",

    cursor: "pointer",
  },


  /* FILTER */

  filterBar: {
    display: "flex",

    gap: "8px",

    flexWrap: "wrap",

    marginBottom: "20px",
  },

  filterButton: {
    padding:
      "8px 14px",

    borderRadius: "20px",

    border:
      "1px solid #e2e8f0",

    background: "white",

    color: "#475569",

    cursor: "pointer",

    textTransform: "capitalize",
  },

  activeFilterButton: {
    background: "#2563eb",

    color: "white",

    border:
      "1px solid #2563eb",
  },


  /* TABLE */

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",

    minWidth: "1000px",

    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",

    padding:
      "14px 12px",

    background: "#f8fafc",

    color: "#64748b",

    fontSize: "12px",

    textTransform: "uppercase",

    letterSpacing: "0.5px",

    borderBottom:
      "1px solid #e2e8f0",
  },

  td: {
    padding:
      "16px 12px",

    borderBottom:
      "1px solid #f1f5f9",

    color: "#334155",

    fontSize: "14px",
  },

  tr: {
    transition:
      "background 0.2s",
  },


  /* USER */

  userInfo: {
    display: "flex",

    alignItems: "center",

    gap: "10px",
  },

  avatar: {
    width: "40px",
    height: "40px",

    borderRadius: "50%",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    background: "#e0e7ff",

    color: "#3730a3",

    fontWeight: "700",
  },

  userName: {
    fontWeight: "600",

    color: "#0f172a",

    marginBottom: "3px",
  },

  userEmail: {
    fontSize: "12px",

    color: "#64748b",
  },


  /* STATUS */

  statusBadge: {
    display: "inline-flex",

    alignItems: "center",

    gap: "6px",

    padding:
      "6px 10px",

    borderRadius: "20px",

    textTransform:
      "capitalize",

    fontSize: "12px",

    fontWeight: "600",
  },

  approvedBadge: {
    background: "#dcfce7",
    color: "#166534",
  },

  pendingBadge: {
    background: "#fef3c7",
    color: "#92400e",
  },

  rejectedBadge: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  disabledBadge: {
    background: "#e5e7eb",
    color: "#374151",
  },

  reasonText: {
    color: "#b45309",

    lineHeight: "1.5",
  },


  /* ACTIONS */

  actionGroup: {
    display: "flex",
    gap: "7px",
  },

  approveButton: {
    padding:
      "8px 12px",

    border: "none",

    borderRadius: "8px",

    background: "#dcfce7",

    color: "#166534",

    fontWeight: "600",

    cursor: "pointer",
  },

  rejectButton: {
    padding:
      "8px 12px",

    border: "none",

    borderRadius: "8px",

    background: "#fee2e2",

    color: "#991b1b",

    fontWeight: "600",

    cursor: "pointer",
  },

  disableButton: {
    padding:
      "8px 12px",

    border: "none",

    borderRadius: "8px",

    background: "#fff7ed",

    color: "#c2410c",

    fontWeight: "600",

    cursor: "pointer",
  },


  /* LOADING */

  loadingBox: {
    minHeight: "250px",

    display: "flex",

    flexDirection: "column",

    alignItems: "center",

    justifyContent: "center",

    color: "#64748b",
  },

  spinner: {
    width: "38px",

    height: "38px",

    border:
      "4px solid #e2e8f0",

    borderTop:
      "4px solid #2563eb",

    borderRadius: "50%",

    animation:
      "spin 0.8s linear infinite",

    marginBottom: "12px",
  },


  /* EMPTY */

  emptyState: {
    textAlign: "center",

    padding: "60px 20px",

    color: "#64748b",
  },

  emptyIcon: {
    fontSize: "45px",
  },


  /* MODAL */

  modalOverlay: {
    position: "fixed",

    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    background:
      "rgba(15,23,42,0.55)",

    backdropFilter:
      "blur(4px)",

    display: "flex",

    justifyContent: "center",

    alignItems: "center",

    padding: "20px",

    zIndex: 1000,
  },

  modal: {
    width: "100%",

    maxWidth: "520px",

    background: "white",

    padding: "28px",

    borderRadius: "18px",

    boxSizing: "border-box",

    boxShadow:
      "0 25px 60px rgba(0,0,0,0.25)",
  },

  modalHeader: {
    display: "flex",

    alignItems: "center",

    gap: "14px",

    marginBottom: "20px",
  },

  warningIcon: {
    width: "50px",

    height: "50px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    borderRadius: "14px",

    background: "#fff7ed",

    fontSize: "25px",
  },

  logoutIcon: {
    fontSize: "45px",

    marginBottom: "10px",
  },

  modalTitle: {
    margin: 0,

    color: "#0f172a",
  },

  modalSubtitle: {
    margin: "5px 0 0",

    color: "#64748b",

    fontSize: "14px",
  },

  userDisableInfo: {
    display: "flex",

    flexDirection: "column",

    gap: "4px",

    padding: "14px",

    background: "#f8fafc",

    borderRadius: "10px",

    marginBottom: "20px",

    color: "#64748b",
  },

  label: {
    display: "block",

    marginBottom: "7px",

    fontSize: "14px",

    fontWeight: "600",

    color: "#334155",
  },

  select: {
    width: "100%",

    padding: "11px",

    marginBottom: "18px",

    border:
      "1px solid #cbd5e1",

    borderRadius: "10px",

    boxSizing: "border-box",

    outline: "none",
  },

  textarea: {
    width: "100%",

    padding: "12px",

    border:
      "1px solid #cbd5e1",

    borderRadius: "10px",

    boxSizing: "border-box",

    resize: "vertical",

    outline: "none",

    fontFamily: "inherit",
  },

  modalButtons: {
    display: "flex",

    justifyContent:
      "flex-end",

    gap: "10px",

    marginTop: "24px",
  },

  cancelButton: {
    padding:
      "10px 18px",

    border:
      "1px solid #cbd5e1",

    borderRadius: "10px",

    background: "white",

    color: "#475569",

    cursor: "pointer",

    fontWeight: "600",
  },

  confirmDisableButton: {
    padding:
      "10px 18px",

    border: "none",

    borderRadius: "10px",

    background: "#dc2626",

    color: "white",

    cursor: "pointer",

    fontWeight: "600",
  },

  logoutConfirmButton: {
    padding:
      "10px 18px",

    border: "none",

    borderRadius: "10px",

    background: "#2563eb",

    color: "white",

    cursor: "pointer",

    fontWeight: "600",
  },

};

export default AdminDashboard;