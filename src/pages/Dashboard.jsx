import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// =========================
// MANAGEMENT PAGES
// =========================

import BankManagement from "./BankManagement";
import ProductManagement from "./ProductManagement";
import UploadFiles from "./UploadFiles";
import CustomerManagement from "./CustomerManagement";
import BillManagement from "./BillManagement";
import Reports from "./Reports";

// =========================
// BILLING PAGES
// =========================

import NewBill from "./NewBill";
import NormalBill from "./billing/NormalBill";
import CoreCuttingBill from "./billing/CoreCuttingBill";
import GstBill from "./billing/GstBill";

// =========================
// COMPONENTS
// =========================

import Sidebar from "../components/Sidebar";
import Home from "./Home";

// =========================================================
// DASHBOARD
// =========================================================

function Dashboard() {
  const navigate = useNavigate();

  // =======================================================
  // PROFILE
  // =======================================================

  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");

  // =======================================================
  // NEW BILL / BILLING SETUP
  //
  // IMPORTANT:
  //
  // New bill:
  //   draftMode = "new"
  //
  // Existing draft:
  //   draftMode = "existing"
  //
  // Edit existing invoice:
  //   draftMode = "edit"
  //   invoiceId = existing invoice ID
  //   invoice = invoice snapshot
  //
  // Actual draft content remains in IndexedDB.
  // =======================================================

  const [newBillSetup, setNewBillSetup] = useState(() => {
    try {
      const saved = localStorage.getItem(
        "billingNewBillSetup"
      );

      if (!saved) {
        return null;
      }

      const parsed = JSON.parse(saved);

      // ---------------------------------------------------
      // Basic protection against corrupted state
      // ---------------------------------------------------

      if (
        !parsed ||
        typeof parsed !== "object"
      ) {
        return null;
      }

      if (
        !parsed.billType ||
        !parsed.company?.id
      ) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.error(
        "Failed to restore billing setup:",
        error
      );

      return null;
    }
  });

  // =======================================================
  // LOGOUT
  // =======================================================

  const [
    showLogoutConfirm,
    setShowLogoutConfirm,
  ] = useState(false);

  // =======================================================
  // ACTIVE PAGE
  // =======================================================

  const [
    activePage,
    setActivePage,
  ] = useState(() => {
    try {
      return (
        localStorage.getItem(
          "billingActivePage"
        ) || "home"
      );
    } catch {
      return "home";
    }
  });

  // =======================================================
  // SIDEBAR
  // =======================================================

  const [
    sidebarCollapsed,
    setSidebarCollapsed,
  ] = useState(() => {
    try {
      return (
        localStorage.getItem(
          "billingSidebarCollapsed"
        ) === "true"
      );
    } catch {
      return false;
    }
  });

  // =======================================================
  // SAVE ACTIVE PAGE
  // =======================================================

  useEffect(() => {
    try {
      localStorage.setItem(
        "billingActivePage",
        activePage
      );
    } catch (error) {
      console.error(
        "Failed to save active page:",
        error
      );
    }
  }, [activePage]);

  // =======================================================
  // SAVE BILLING NAVIGATION SETUP
  //
  // IMPORTANT:
  //
  // This is only navigation/session information.
  //
  // Actual draft content is stored in IndexedDB.
  //
  // Edit mode stores invoice information here because
  // there is no draft for an existing invoice.
  // =======================================================

  useEffect(() => {
    try {
      if (newBillSetup) {
        localStorage.setItem(
          "billingNewBillSetup",
          JSON.stringify(
            newBillSetup
          )
        );
      } else {
        localStorage.removeItem(
          "billingNewBillSetup"
        );
      }
    } catch (error) {
      console.error(
        "Failed to save billing setup:",
        error
      );
    }
  }, [newBillSetup]);

  // =======================================================
  // SAVE SIDEBAR STATE
  // =======================================================

  useEffect(() => {
    try {
      localStorage.setItem(
        "billingSidebarCollapsed",
        String(sidebarCollapsed)
      );
    } catch (error) {
      console.error(
        "Failed to save sidebar state:",
        error
      );
    }
  }, [sidebarCollapsed]);

  // =======================================================
  // LOAD DASHBOARD
  // =======================================================

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: {
          user,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "User loading error:",
          userError
        );

        navigate("/login", {
          replace: true,
        });

        return;
      }

      if (!user) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Profile error:",
          error
        );

        setMessage(
          `❌ ${error.message}`
        );

        return;
      }

      if (!data) {
        await supabase.auth.signOut();

        navigate("/login", {
          replace: true,
        });

        return;
      }

      setProfile(data);
    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
      );

      setMessage(
        "❌ Something went wrong while loading your account."
      );
    } finally {
      setLoading(false);
    }
  }

  // =======================================================
  // INITIAL LOAD + PROFILE REALTIME
  // =======================================================

  useEffect(() => {
    let channel = null;
    let isMounted = true;

    async function initializeDashboard() {
      setLoading(true);
      setMessage("");

      try {
        const {
          data: {
            user,
          },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isMounted) {
          return;
        }

        if (userError || !user) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        if (error) {
          console.error(
            "Profile error:",
            error
          );

          setMessage(
            `❌ ${error.message}`
          );

          return;
        }

        if (!data) {
          await supabase.auth.signOut();

          navigate("/login", {
            replace: true,
          });

          return;
        }

        setProfile(data);

        // =================================================
        // PROFILE REALTIME
        // =================================================

        const channelName =
          `profile-status-${user.id}`;

        const oldChannels =
          supabase.getChannels();

        for (
          const oldChannel of oldChannels
        ) {
          if (
            oldChannel.topic ===
            `realtime:${channelName}`
          ) {
            await supabase.removeChannel(
              oldChannel
            );
          }
        }

        channel = supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              console.log(
                "Realtime profile update:",
                payload
              );

              if (
                payload.eventType ===
                  "UPDATE" &&
                isMounted
              ) {
                setProfile(
                  payload.new
                );
              }
            }
          )
          .subscribe((status) => {
            console.log(
              "Realtime subscription:",
              status
            );
          });
      } catch (error) {
        console.error(
          "Dashboard initialization error:",
          error
        );

        if (isMounted) {
          setMessage(
            "❌ Something went wrong while loading your account."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeDashboard();

    return () => {
      isMounted = false;

      if (channel) {
        supabase.removeChannel(
          channel
        );
      }
    };
  }, [navigate]);

  // =======================================================
  // CHANGE ACTIVE PAGE
  // =======================================================

  function handleSetActivePage(page) {
    /*
     * Clicking New Bill always opens the bill selector.
     *
     * This does NOT delete any IndexedDB drafts.
     */

    if (page === "new-bill") {
      setNewBillSetup(null);
    }

    setActivePage(page);
  }

  // =======================================================
  // PROCEED FROM NEW BILL SELECTOR
  // =======================================================

  function handleProceedBill(billData) {
    if (
      !billData?.company?.id ||
      !billData?.billType
    ) {
      alert(
        "Company and bill type are required."
      );

      return;
    }

    const setup = {
      billType:
        billData.billType,

      challanType:
        billData.challanType ||
        null,

      company:
        billData.company,

      draftId:
        billData.draftId ||
        null,

      draftMode:
        billData.draftMode ||
        "new",

      draft:
        billData.draft ||
        null,

      /*
       * These are normally empty for a new bill.
       *
       * They are included so the setup structure
       * remains compatible with edit mode.
       */
      invoiceId:
        billData.invoiceId ||
        null,

      invoice:
        billData.invoice ||
        null,
    };

    console.log(
      "OPEN BILL SETUP:",
      setup
    );

    setNewBillSetup(
      setup
    );

    setActivePage(
      "new-bill"
    );
  }

  // =======================================================
  // OPEN EXACT DRAFT FROM HOME
  // =======================================================

  async function handleOpenDraft(draft) {
    if (!draft?.id) {
      alert(
        "This draft could not be opened."
      );

      return;
    }

    if (
      !draft?.companyId ||
      !draft?.billType
    ) {
      alert(
        "This draft is missing company or bill type information."
      );

      return;
    }

    if (!profile?.id) {
      alert(
        "Your account information is not ready yet."
      );

      return;
    }

    try {
      let company =
        draft.company ||
        null;

      // =====================================================
      // RESTORE COMPANY SNAPSHOT
      // =====================================================

      if (!company) {
        const {
          data,
          error,
        } = await supabase
          .from("companies")
          .select("*")
          .eq(
            "id",
            draft.companyId
          )
          .eq(
            "user_id",
            profile.id
          )
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          alert(
            "The company associated with this draft could not be found."
          );

          return;
        }

        company = data;
      }

      // =====================================================
      // BUILD EXACT EXISTING-DRAFT SETUP
      // =====================================================

      const setup = {
        billType:
          draft.billType,

        challanType:
          draft.challanType ||
          null,

        company,

        draftId:
          draft.id,

        draftMode:
          "existing",

        draft,

        /*
         * Existing drafts are not invoice edits.
         */
        invoiceId:
          null,

        invoice:
          null,
      };

      console.log(
        "OPEN EXISTING DRAFT:",
        setup
      );

      // =====================================================
      // OPEN BILLING PAGE
      // =====================================================

      setNewBillSetup(
        setup
      );

      setActivePage(
        "new-bill"
      );
    } catch (error) {
      console.error(
        "Unable to open draft:",
        error
      );

      alert(
        "Unable to open this draft. Please try again."
      );
    }
  }

  // =======================================================
  // EDIT EXISTING INVOICE
  // =======================================================

  function handleEditBill(invoice) {
    // -----------------------------------------------------
    // BASIC VALIDATION
    // -----------------------------------------------------

    if (!invoice?.id) {
      alert(
        "This bill could not be opened for editing."
      );

      return;
    }

    // -----------------------------------------------------
    // DELETED BILLS CANNOT BE EDITED
    //
    // They must first be restored from Bill Management.
    // -----------------------------------------------------

    if (
      Number(invoice.isdelete) === 1
    ) {
      alert(
        "This bill is deleted. Restore it before editing."
      );

      return;
    }

    if (
      !invoice.company_id
    ) {
      alert(
        "This bill is missing company information."
      );

      return;
    }

    if (
      !invoice.bill_type
    ) {
      alert(
        "This bill is missing its bill type."
      );

      return;
    }

    // -----------------------------------------------------
    // BUILD COMPANY SNAPSHOT
    //
    // The invoice contains a historical company snapshot.
    // This is what we pass to the billing page.
    // -----------------------------------------------------

    const company = {
      id:
        invoice.company_id,

      company_name:
        invoice.company_name ||
        "",

      gst_no:
        invoice.company_gst_no ||
        "",

      bank_name:
        invoice.bank_name ||
        "",

      account_no:
        invoice.bank_account_number ||
        "",

      ifsc_code:
        invoice.bank_ifsc_code ||
        "",
    };

    // -----------------------------------------------------
    // BUILD EDIT SETUP
    // -----------------------------------------------------

    const setup = {
      billType:
        invoice.bill_type,

      challanType:
        null,

      company,

      /*
       * Edit mode does NOT use an IndexedDB draft.
       */
      draftId:
        null,

      draftMode:
        "edit",

      draft:
        null,

      /*
       * Existing invoice information.
       */
      invoiceId:
        invoice.id,

      invoice,
    };

    console.log(
      "OPEN INVOICE FOR EDIT:",
      setup
    );

    // -----------------------------------------------------
    // OPEN EXISTING BILLING PAGE
    // -----------------------------------------------------

    setNewBillSetup(
      setup
    );

    setActivePage(
      "new-bill"
    );
  }

  // =======================================================
  // GO BACK FROM BILLING PAGE
  // =======================================================

  function handleBackToNewBill() {
    const wasEditingInvoice =
      newBillSetup?.draftMode === "edit" &&
      Boolean(newBillSetup?.invoiceId);

    // Clear the current editor setup without deleting saved drafts.
    setNewBillSetup(null);

    // An update should return to the bill list, not the New Bill selector.
    setActivePage(
      wasEditingInvoice ? "bill-management" : "new-bill"
    );
  }

  // =======================================================
  // REQUEST LOGOUT
  // =======================================================

  function requestLogout() {
    setShowLogoutConfirm(
      true
    );
  }

  // =======================================================
  // CANCEL LOGOUT
  // =======================================================

  function cancelLogout() {
    setShowLogoutConfirm(
      false
    );
  }

  // =======================================================
  // CONFIRM LOGOUT
  // =======================================================

  async function handleLogout() {
    try {
      setShowLogoutConfirm(
        false
      );

      localStorage.removeItem(
        "billingActivePage"
      );

      localStorage.removeItem(
        "billingSidebarCollapsed"
      );

      localStorage.removeItem(
        "billingNewBillSetup"
      );

      setNewBillSetup(
        null
      );

      const {
        error,
      } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      navigate(
        "/login",
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setMessage(
        "❌ Something went wrong while logging out."
      );
    }
  }

  // =======================================================
  // LOGOUT CONFIRMATION
  // =======================================================

  function LogoutConfirmation() {
    if (
      !showLogoutConfirm
    ) {
      return null;
    }

    return (
      <div
        style={
          styles.modalOverlay
        }
      >
        <div
          style={
            styles.logoutModal
          }
        >
          <div
            style={
              styles.logoutModalIcon
            }
          >
            🚪
          </div>

          <h2
            style={
              styles.logoutModalTitle
            }
          >
            Logout?
          </h2>

          <p
            style={
              styles.logoutModalText
            }
          >
            Are you sure you want
            to logout from your
            account?
          </p>

          <div
            style={
              styles.modalButtons
            }
          >
            <button
              type="button"
              onClick={
                cancelLogout
              }
              style={
                styles.cancelButton
              }
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={
                handleLogout
              }
              style={
                styles.confirmLogoutButton
              }
            >
              Yes, Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div
        style={
          styles.loadingContainer
        }
      >
        <div
          style={
            styles.loadingContent
          }
        >
          <div
            style={
              styles.spinner
            }
          />

          <h2
            style={
              styles.loadingTitle
            }
          >
            Loading Dashboard
          </h2>

          <p
            style={
              styles.loadingText
            }
          >
            Please wait while we
            prepare your data...
          </p>
        </div>
      </div>
    );
  }

  // =======================================================
  // ERROR
  // =======================================================

  if (message) {
    return (
      <>
        <div
          style={
            styles.center
          }
        >
          <div
            style={
              styles.card
            }
          >
            <h2>
              {message}
            </h2>

            <button
              type="button"
              onClick={
                loadDashboard
              }
              style={
                styles.button
              }
            >
              🔄 Try Again
            </button>

            <button
              type="button"
              onClick={
                requestLogout
              }
              style={
                styles.logoutButton
              }
            >
              Logout
            </button>
          </div>
        </div>

        <LogoutConfirmation />
      </>
    );
  }

  // =======================================================
  // PROFILE NOT FOUND
  // =======================================================

  if (!profile) {
    return (
      <>
        <div
          style={
            styles.center
          }
        >
          <div
            style={
              styles.card
            }
          >
            <h2>
              Profile not found.
            </h2>

            <button
              type="button"
              onClick={
                requestLogout
              }
              style={
                styles.logoutButton
              }
            >
              Logout
            </button>
          </div>
        </div>

        <LogoutConfirmation />
      </>
    );
  }

  // =======================================================
  // PENDING
  // =======================================================

  if (
    profile.status ===
    "pending"
  ) {
    return (
      <>
        <div
          style={
            styles.center
          }
        >
          <div
            style={
              styles.card
            }
          >
            <div
              style={
                styles.icon
              }
            >
              ⏳
            </div>

            <h1>
              Waiting for Approval
            </h1>

            <p>
              Hello{" "}
              <strong>
                {profile.full_name ||
                  "User"}
              </strong>
            </p>

            <p>
              Your account registration
              is waiting for
              administrator approval.
            </p>

            <p
              style={
                styles.smallText
              }
            >
              This page will automatically
              update when your account
              status changes.
            </p>

            <button
              type="button"
              onClick={
                loadDashboard
              }
              style={
                styles.button
              }
            >
              Check Status
            </button>

            <button
              type="button"
              onClick={
                requestLogout
              }
              style={
                styles.logoutButton
              }
            >
              Logout
            </button>
          </div>
        </div>

        <LogoutConfirmation />
      </>
    );
  }

  // =======================================================
  // REJECTED
  // =======================================================

  if (
    profile.status ===
    "rejected"
  ) {
    return (
      <>
        <div
          style={
            styles.center
          }
        >
          <div
            style={
              styles.card
            }
          >
            <div
              style={
                styles.icon
              }
            >
              ❌
            </div>

            <h1>
              Registration Rejected
            </h1>

            <p>
              Your account registration
              was rejected by the
              administrator.
            </p>

            <p
              style={
                styles.smallText
              }
            >
              If the administrator
              changes your status,
              this page will update
              automatically.
            </p>

            <button
              type="button"
              onClick={
                requestLogout
              }
              style={
                styles.logoutButton
              }
            >
              Logout
            </button>
          </div>
        </div>

        <LogoutConfirmation />
      </>
    );
  }

  // =======================================================
  // DISABLED
  // =======================================================

  if (
    profile.status ===
    "disabled"
  ) {
    return (
      <>
        <div
          style={
            styles.center
          }
        >
          <div
            style={
              styles.card
            }
          >
            <div
              style={
                styles.icon
              }
            >
              🚫
            </div>

            <h1>
              Account Disabled
            </h1>

            <p>
              Hello{" "}
              <strong>
                {profile.full_name ||
                  "User"}
              </strong>
            </p>

            <p>
              Your account has been
              disabled by the
              administrator.
            </p>

            {profile.disable_reason && (
              <div
                style={
                  styles.reasonBox
                }
              >
                <h3
                  style={
                    styles.reasonTitle
                  }
                >
                  Reason for Account
                  Disable
                </h3>

                <p
                  style={
                    styles.reasonText
                  }
                >
                  {
                    profile.disable_reason
                  }
                </p>
              </div>
            )}

            {profile.disabled_comment && (
              <div
                style={
                  styles.commentBox
                }
              >
                <h3
                  style={
                    styles.boxTitle
                  }
                >
                  Additional Information
                </h3>

                <p
                  style={
                    styles.boxText
                  }
                >
                  {
                    profile.disabled_comment
                  }
                </p>
              </div>
            )}

            <div
              style={
                styles.supportBox
              }
            >
              <h3
                style={
                  styles.supportTitle
                }
              >
                Need Help?
              </h3>

              <p
                style={
                  styles.supportText
                }
              >
                If you believe your
                account was disabled by
                mistake, please contact
                support.
              </p>

              <p
                style={
                  styles.contact
                }
              >
                📞{" "}
                <a
                  href="tel:7045239943"
                  style={
                    styles.link
                  }
                >
                  7045239943
                </a>
              </p>

              <p
                style={
                  styles.contact
                }
              >
                ✉️{" "}
                <a
                  href="mailto:work.nitishrajbhar@gmail.com"
                  style={
                    styles.link
                  }
                >
                  work.nitishrajbhar@gmail.com
                </a>
              </p>
            </div>

            <button
              type="button"
              onClick={
                requestLogout
              }
              style={
                styles.logoutButton
              }
            >
              Logout
            </button>
          </div>
        </div>

        <LogoutConfirmation />
      </>
    );
  }

  // =======================================================
  // APPROVED USER
  // =======================================================

  if (
    profile.status ===
    "approved"
  ) {
    return (
      <>
        <div
          style={
            styles.appContainer
          }
        >
          {/* =================================================
              SIDEBAR
          ================================================= */}

          <Sidebar
            activePage={
              activePage
            }
            setActivePage={
              handleSetActivePage
            }
            onLogout={
              requestLogout
            }
            collapsed={
              sidebarCollapsed
            }
            setCollapsed={
              setSidebarCollapsed
            }
          />

          {/* =================================================
              MAIN AREA
          ================================================= */}

          <main
            style={{
              ...styles.appMain,

              marginLeft:
                sidebarCollapsed
                  ? "72px"
                  : "250px",
            }}
          >
            {/* =================================================
                HOME
            ================================================= */}

            {activePage ===
              "home" && (
              <Home
                profile={
                  profile
                }
                onOpenDraft={
                  handleOpenDraft
                }
              />
            )}

            {/* =================================================
                NEW BILL SELECTOR
            ================================================= */}

            {activePage ===
              "new-bill" &&
              !newBillSetup && (
                <NewBill
                  profile={
                    profile
                  }
                  onProceed={
                    handleProceedBill
                  }
                />
              )}

            {/* =================================================
                BILLING EDITOR
               
                Supported:
                - New bill
                - Existing draft
                - Edit existing invoice
            ================================================= */}

            {activePage ===
              "new-bill" &&
              newBillSetup && (
                <>
                  {/* =========================================
                      NORMAL BILL
                  ========================================= */}

                  {newBillSetup
                    .billType ===
                    "normal" && (
                    <NormalBill
                      key={`normal-${
                        newBillSetup.draftId ||
                        newBillSetup.invoiceId ||
                        "new"
                      }`}
                      profile={
                        profile
                      }
                      company={
                        newBillSetup.company
                      }
                      draftId={
                        newBillSetup.draftId ||
                        null
                      }
                      draftMode={
                        newBillSetup.draftMode ||
                        "new"
                      }
                      draft={
                        newBillSetup.draft ||
                        null
                      }
                      invoiceId={
                        newBillSetup.invoiceId ||
                        null
                      }
                      invoice={
                        newBillSetup.invoice ||
                        null
                      }
                      onBack={
                        handleBackToNewBill
                      }
                    />
                  )}

                  {/* =========================================
                      GST BILL
                  ========================================= */}

                  {newBillSetup
                    .billType ===
                    "gst" && (
                    <GstBill
                      key={`gst-${
                        newBillSetup.draftId ||
                        newBillSetup.invoiceId ||
                        "new"
                      }`}
                      profile={
                        profile
                      }
                      company={
                        newBillSetup.company
                      }
                      draftId={
                        newBillSetup.draftId ||
                        null
                      }
                      draftMode={
                        newBillSetup.draftMode ||
                        "new"
                      }
                      draft={
                        newBillSetup.draft ||
                        null
                      }
                      invoiceId={
                        newBillSetup.invoiceId ||
                        null
                      }
                      invoice={
                        newBillSetup.invoice ||
                        null
                      }
                      onBack={
                        handleBackToNewBill
                      }
                    />
                  )}

                  {/* =========================================
                      CORE CUTTING BILL
                  ========================================= */}

                  {newBillSetup
                    .billType ===
                    "corecutting" && (
                    <CoreCuttingBill
                      key={`corecutting-${
                        newBillSetup.draftId ||
                        newBillSetup.invoiceId ||
                        "new"
                      }`}
                      profile={
                        profile
                      }
                      company={
                        newBillSetup.company
                      }
                      draftId={
                        newBillSetup.draftId ||
                        null
                      }
                      draftMode={
                        newBillSetup.draftMode ||
                        "new"
                      }
                      draft={
                        newBillSetup.draft ||
                        null
                      }
                      invoiceId={
                        newBillSetup.invoiceId ||
                        null
                      }
                      invoice={
                        newBillSetup.invoice ||
                        null
                      }
                      onBack={
                        handleBackToNewBill
                      }
                    />
                  )}

                  {/* =========================================
                      CHALLAN
                      
                      Deferred for now.
                  ========================================= */}

                  {newBillSetup
                    .billType ===
                    "challan" && (
                    <div
                      style={
                        styles.pagePlaceholder
                      }
                    >
                      <h1>
                        Challan
                      </h1>

                      <p>
                        Challan billing
                        will be added
                        here.
                      </p>
                    </div>
                  )}

                  {/* =========================================
                      INVALID BILL TYPE
                  ========================================= */}

                  {![
                    "normal",
                    "gst",
                    "corecutting",
                    "challan",
                  ].includes(
                    newBillSetup.billType
                  ) && (
                    <div
                      style={
                        styles.pagePlaceholder
                      }
                    >
                      <h1>
                        Invalid Bill Type
                      </h1>

                      <p>
                        The selected bill
                        type could not be
                        opened.
                      </p>

                      <button
                        type="button"
                        onClick={
                          handleBackToNewBill
                        }
                        style={
                          styles.button
                        }
                      >
                        ← Back
                      </button>
                    </div>
                  )}
                </>
              )}

            {/* =================================================
                BILL MANAGEMENT
            ================================================= */}

            {activePage ===
              "bill-management" && (
              <BillManagement
                profile={
                  profile
                }
                onEditBill={
                  handleEditBill
                }
              />
            )}

            {/* =================================================
                BANK MANAGEMENT
            ================================================= */}

            {activePage ===
              "bank-management" && (
              <BankManagement />
            )}

            {/* =================================================
                PRODUCTS
            ================================================= */}

            {activePage ===
              "products" && (
              <ProductManagement />
            )}

            {/* =================================================
                CUSTOMERS
            ================================================= */}

            {activePage ===
              "customers" && (
              <CustomerManagement />
            )}

            {/* =================================================
    REPORTS
================================================= */}

{activePage ===
  "reports" && (
  <Reports
    profile={profile}
  />
)}

            {/* =================================================
                UPLOAD FILES
            ================================================= */}

            {activePage ===
              "upload-files" && (
              <UploadFiles />
            )}
          </main>
        </div>

        {/* =====================================================
            LOGOUT MODAL
        ===================================================== */}

        <LogoutConfirmation />
      </>
    );
  }

  // =======================================================
  // UNKNOWN STATUS
  // =======================================================

  return (
    <>
      <div
        style={
          styles.center
        }
      >
        <div
          style={
            styles.card
          }
        >
          <h2>
            Invalid Account Status
          </h2>

          <p>
            Please contact the administrator.
          </p>

          <button
            type="button"
            onClick={
              requestLogout
            }
            style={
              styles.logoutButton
            }
          >
            Logout
          </button>
        </div>
      </div>

      <LogoutConfirmation />
    </>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = {
  // =======================================================
  // MAIN APP
  // =======================================================

  appContainer: {
    minHeight: "100vh",
    width: "100%",
    background: "#f5f6fa",
  },

  appMain: {
    minHeight: "100vh",
    width: "auto",
    padding: "25px",
    boxSizing: "border-box",
    overflowX: "hidden",
    transition:
      "margin-left 0.25s ease",
  },

  pagePlaceholder: {
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    minHeight: "300px",
    boxSizing: "border-box",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.05)",
  },

  // =======================================================
  // CENTER
  // =======================================================

  center: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f5f5",
    padding: "20px",
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: "500px",
    background: "white",
    padding: "40px",
    borderRadius: "12px",
    textAlign: "center",
    boxSizing: "border-box",
    boxShadow:
      "0 4px 15px rgba(0,0,0,0.08)",
  },

  icon: {
    fontSize: "50px",
    marginBottom: "15px",
  },

  button: {
    padding: "12px 20px",
    margin: "10px",
    cursor: "pointer",
    borderRadius: "6px",
    border: "1px solid #ccc",
    background: "white",
  },

  logoutButton: {
    padding: "10px 18px",
    cursor: "pointer",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    margin: "10px",
  },

  smallText: {
    fontSize: "13px",
    color: "#777",
    marginTop: "20px",
  },

  // =======================================================
  // DISABLE REASON
  // =======================================================

  reasonBox: {
    marginTop: "25px",
    padding: "16px",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "8px",
    textAlign: "left",
  },

  reasonTitle: {
    margin: "0 0 8px 0",
  },

  reasonText: {
    margin: 0,
    color: "#444",
    whiteSpace: "pre-wrap",
  },

  // =======================================================
  // ADMIN COMMENT
  // =======================================================

  commentBox: {
    marginTop: "15px",
    padding: "16px",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    textAlign: "left",
  },

  boxTitle: {
    margin: "0 0 8px 0",
  },

  boxText: {
    margin: 0,
    color: "#444",
    whiteSpace: "pre-wrap",
  },

  // =======================================================
  // SUPPORT
  // =======================================================

  supportBox: {
    marginTop: "25px",
    padding: "18px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
    textAlign: "left",
  },

  supportTitle: {
    margin: "0 0 10px 0",
  },

  supportText: {
    marginTop: 0,
  },

  contact: {
    margin: "8px 0",
  },

  link: {
    color: "#2563eb",
    textDecoration: "none",
  },

  // =======================================================
  // LOADING
  // =======================================================

  loadingContainer: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f6fa",
  },

  loadingContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  spinner: {
    width: "42px",
    height: "42px",
    border:
      "4px solid #e5e7eb",
    borderTop:
      "4px solid #2563eb",
    borderRadius: "50%",
    animation:
      "spin 0.8s linear infinite",
    marginBottom: "18px",
  },

  loadingTitle: {
    margin: "0 0 8px",
    fontSize: "22px",
    fontWeight: "700",
    color: "#111827",
  },

  loadingText: {
    margin: 0,
    fontSize: "14px",
    color: "#6b7280",
  },

  // =======================================================
  // MODAL OVERLAY
  // =======================================================

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    background:
      "rgba(15, 23, 42, 0.55)",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    padding: "20px",

    zIndex: 9999,

    backdropFilter:
      "blur(3px)",
  },

  // =======================================================
  // LOGOUT MODAL
  // =======================================================

  logoutModal: {
    width: "100%",
    maxWidth: "400px",

    background: "#ffffff",

    borderRadius: "16px",

    padding: "32px",

    textAlign: "center",

    boxSizing: "border-box",

    boxShadow:
      "0 20px 50px rgba(0,0,0,0.25)",
  },

  logoutModalIcon: {
    width: "65px",
    height: "65px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    margin: "0 auto 18px",

    fontSize: "32px",

    background: "#fff7ed",

    borderRadius: "50%",
  },

  logoutModalTitle: {
    margin: "0 0 10px",

    fontSize: "24px",

    color: "#111827",
  },

  logoutModalText: {
    margin: 0,

    color: "#6b7280",

    lineHeight: "1.6",
  },

  modalButtons: {
    display: "flex",

    gap: "12px",

    marginTop: "28px",
  },

  cancelButton: {
    flex: 1,

    padding: "12px",

    borderRadius: "8px",

    border:
      "1px solid #d1d5db",

    background: "#ffffff",

    cursor: "pointer",

    fontSize: "14px",

    fontWeight: "600",

    color: "#374151",
  },

  confirmLogoutButton: {
    flex: 1,

    padding: "12px",

    border: "none",

    borderRadius: "8px",

    background: "#dc2626",

    color: "white",

    cursor: "pointer",

    fontSize: "14px",

    fontWeight: "600",
  },
};

export default Dashboard;