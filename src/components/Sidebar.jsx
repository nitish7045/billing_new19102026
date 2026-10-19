import { useState } from "react";

function Sidebar({
  activePage,
  setActivePage,
  onLogout,
  collapsed,
  setCollapsed,
}) {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const menuItems = [
    {
      id: "home",
      icon: "🏠",
      label: "Dashboard",
    },
    {
      id: "new-bill",
      icon: "➕",
      label: "New Bill",
    },
    {
      id: "bill-management",
      icon: "🧾",
      label: "Bill Management",
    },
    {
      id: "bank-management",
      icon: "🏦",
      label: "Bank Management",
    },
    {
      id: "products",
      icon: "📦",
      label: "Products",
    },
    {
      id: "customers",
      icon: "👥",
      label: "Customers",
    },
    {
      id: "reports",
      icon: "📊",
      label: "Reports",
    },
    {
      id: "upload-files",
      icon: "📁",
      label: "Upload Files",
    },
  ];

  function handleMenuClick(pageId) {
    setActivePage(pageId);

    // Close mobile sidebar
    setMobileOpen(false);
  }

  return (
    <>
      {/* MOBILE MENU BUTTON */}

      <button
        onClick={() =>
          setMobileOpen(!mobileOpen)
        }
        style={styles.mobileMenuButton}
        className="mobile-menu-button"
      >
        ☰
      </button>

      {/* MOBILE OVERLAY */}

      {mobileOpen && (
        <div
          onClick={() =>
            setMobileOpen(false)
          }
          style={styles.overlay}
          className="sidebar-overlay"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={
          mobileOpen
            ? "sidebar mobile-open"
            : "sidebar"
        }
        style={{
          ...styles.sidebar,

          ...(collapsed
            ? styles.collapsedSidebar
            : {}),
        }}
      >

        {/* APP TITLE */}

        <div style={styles.logoSection}>

          {!collapsed && (
            <div style={styles.logoText}>
              Billing App
            </div>
          )}

          <button
            onClick={() =>
              setCollapsed(!collapsed)
            }
            style={styles.collapseButton}
          >
            {collapsed ? "☰" : "◀"}
          </button>

        </div>

        {/* MENU */}

        <div style={styles.menu}>

          {menuItems.map((item) => (
            <button
              key={item.id}

              onClick={() =>
                handleMenuClick(item.id)
              }

              style={{
                ...styles.menuItem,

                ...(activePage === item.id
                  ? styles.activeMenuItem
                  : {}),
              }}

              title={item.label}
            >

              <span style={styles.menuIcon}>
                {item.icon}
              </span>

              {!collapsed && (
                <span>
                  {item.label}
                </span>
              )}

            </button>
          ))}

        </div>

        {/* LOGOUT */}

        <div style={styles.bottomSection}>

          <button
            onClick={onLogout}
            style={styles.logoutButton}
          >

            <span>
              🚪
            </span>

            {!collapsed && (
              <span>
                Logout
              </span>
            )}

          </button>

        </div>

      </aside>
    </>
  );
}


// =========================
// STYLES
// =========================

const styles = {

  sidebar: {
    width: "250px",

    height: "100vh",

    background: "#ffffff",

    borderRight:
      "1px solid #e5e7eb",

    display: "flex",

    flexDirection: "column",

    position: "fixed",

    top: 0,

    left: 0,

    zIndex: 1000,

    transition:
      "width 0.25s ease",

    overflow: "hidden",
  },

  collapsedSidebar: {
    width: "72px",
  },

  logoSection: {
    height: "70px",

    display: "flex",

    alignItems: "center",

    justifyContent: "space-between",

    padding: "0 15px",

    borderBottom:
      "1px solid #e5e7eb",

    boxSizing: "border-box",
  },

  logoText: {
    fontSize: "20px",

    fontWeight: "bold",

    whiteSpace: "nowrap",
  },

  collapseButton: {
    border: "none",

    background: "transparent",

    cursor: "pointer",

    fontSize: "20px",

    padding: "8px",
  },

  menu: {
    flex: 1,

    padding: "15px 10px",

    overflowY: "auto",
  },

  menuItem: {
    width: "100%",

    display: "flex",

    alignItems: "center",

    gap: "15px",

    padding: "13px 12px",

    marginBottom: "6px",

    border: "none",

    background: "transparent",

    borderRadius: "8px",

    cursor: "pointer",

    textAlign: "left",

    fontSize: "15px",

    whiteSpace: "nowrap",
  },

  activeMenuItem: {
    background: "#e8f1ff",

    fontWeight: "bold",
  },

  menuIcon: {
    fontSize: "20px",

    minWidth: "28px",

    textAlign: "center",
  },

  bottomSection: {
    padding: "15px 10px",

    borderTop:
      "1px solid #e5e7eb",
  },

  logoutButton: {
    width: "100%",

    display: "flex",

    alignItems: "center",

    gap: "15px",

    padding: "12px",

    border: "none",

    background: "#fee2e2",

    borderRadius: "8px",

    cursor: "pointer",

    fontSize: "15px",

    whiteSpace: "nowrap",
  },

  mobileMenuButton: {
    display: "none",

    position: "fixed",

    top: "15px",

    left: "15px",

    zIndex: 1100,

    border: "none",

    background: "white",

    borderRadius: "8px",

    padding: "10px 12px",

    fontSize: "20px",

    cursor: "pointer",

    boxShadow:
      "0 2px 10px rgba(0,0,0,0.1)",
  },

  overlay: {
    display: "none",
  },

};

export default Sidebar;