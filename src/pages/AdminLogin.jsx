import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);

  // =========================
  // ADMIN LOGIN
  // =========================

  async function handleAdminLogin(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      // =========================
      // LOGIN WITH SUPABASE AUTH
      // =========================

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.user) {
        setMessage(
          "Admin login failed. User not found."
        );
        return;
      }

      // =========================
      // CHECK ADMINS TABLE
      // =========================

      const {
        data: admin,
        error: adminError,
      } = await supabase
        .from("admins")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      if (adminError) {
        await supabase.auth.signOut();

        setMessage(adminError.message);

        return;
      }

      // =========================
      // NOT AN ADMIN
      // =========================

      if (!admin) {
        await supabase.auth.signOut();

        setMessage(
          "This account does not have administrator access."
        );

        return;
      }

      // =========================
      // ADMIN DISABLED
      // =========================

      if (!admin.is_active) {
        await supabase.auth.signOut();

        setMessage(
          "This administrator account has been disabled."
        );

        return;
      }

      // =========================
      // ADMIN SUCCESS
      // =========================

      navigate("/admin-dashboard", {
        replace: true,
      });

    } catch (error) {
      console.error(
        "Admin login error:",
        error
      );

      setMessage(
        "Something went wrong. Please try again."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>

      {/* ========================= */}
      {/* LEFT BRAND SECTION */}
      {/* ========================= */}

      <div style={styles.leftSection}>

        <div style={styles.brandContent}>

          <div style={styles.logo}>
            🛡️
          </div>

          <div style={styles.adminBadge}>
            ADMINISTRATION PANEL
          </div>

          <h1 style={styles.brandTitle}>
            Billing App
          </h1>

          <p style={styles.brandText}>
            Securely manage users, account
            approvals and billing application
            administration.
          </p>

          <div style={styles.features}>

            <div style={styles.feature}>

              <span style={styles.featureIcon}>
                ✓
              </span>

              <span>
                Manage User Accounts
              </span>

            </div>

            <div style={styles.feature}>

              <span style={styles.featureIcon}>
                ✓
              </span>

              <span>
                Approve or Reject Registrations
              </span>

            </div>

            <div style={styles.feature}>

              <span style={styles.featureIcon}>
                ✓
              </span>

              <span>
                Secure Administrator Access
              </span>

            </div>

          </div>

        </div>

      </div>


      {/* ========================= */}
      {/* RIGHT LOGIN SECTION */}
      {/* ========================= */}

      <div style={styles.rightSection}>

        <div style={styles.loginCard}>

          {/* MOBILE LOGO */}

          <div style={styles.mobileLogo}>
            🛡️
          </div>


          {/* HEADER */}

          <div style={styles.headerBadge}>
            Administrator Access
          </div>

          <h1 style={styles.loginTitle}>
            Admin Login
          </h1>

          <p style={styles.loginSubtitle}>
            Sign in to access the administration
            dashboard.
          </p>


          {/* ERROR MESSAGE */}

          {message && (
            <div style={styles.errorBox}>

              <span style={styles.errorIcon}>
                ⚠️
              </span>

              <span>
                {message}
              </span>

            </div>
          )}


          {/* ========================= */}
          {/* LOGIN FORM */}
          {/* ========================= */}

          <form
            onSubmit={handleAdminLogin}
            style={styles.form}
          >

            {/* EMAIL */}

            <div style={styles.field}>

              <label style={styles.label}>
                Administrator Email
              </label>

              <div style={styles.inputWrapper}>

                <span style={styles.inputIcon}>
                  ✉️
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(
                      e.target.value
                    );

                    setMessage("");
                  }}
                  required
                  disabled={loading}
                  style={styles.input}
                  placeholder="Enter admin email"
                  autoComplete="email"
                />

              </div>

            </div>


            {/* PASSWORD */}

            <div style={styles.field}>

              <label style={styles.label}>
                Password
              </label>

              <div style={styles.inputWrapper}>

                <span style={styles.inputIcon}>
                  🔒
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) => {
                    setPassword(
                      e.target.value
                    );

                    setMessage("");
                  }}
                  required
                  disabled={loading}
                  style={{
                    ...styles.input,
                    paddingRight: "50px",
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  style={styles.showPassword}
                  aria-label="Show password"
                >
                  {showPassword
                    ? "🙈"
                    : "👁️"}
                </button>

              </div>

            </div>


            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.loginButton,

                opacity:
                  loading ? 0.75 : 1,

                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",
              }}
            >

              {loading ? (
                <>
                  <span
                    style={styles.buttonSpinner}
                  />

                  Verifying Access...

                </>
              ) : (
                <>
                  <span>
                    Login as Administrator
                  </span>

                  <span>
                    →
                  </span>
                </>
              )}

            </button>

          </form>


          {/* SECURITY NOTE */}

          <div style={styles.securityBox}>

            <span style={styles.securityIcon}>
              🔐
            </span>

            <span>
              This area is restricted to
              authorized administrators only.
            </span>

          </div>


          {/* BACK TO USER LOGIN */}

          <Link
            to="/login"
            style={styles.userLoginLink}
          >

            <span>
              ←
            </span>

            Back to User Login

          </Link>

        </div>


        {/* FOOTER */}

        <p style={styles.footer}>
          © {new Date().getFullYear()}
          {" "}
          Billing App · Secure Administration
        </p>

      </div>

    </div>
  );
}


// =========================
// STYLES
// =========================

const styles = {

  // =========================
  // PAGE
  // =========================

  page: {
    minHeight: "100vh",

    display: "flex",

    fontFamily:
      "Inter, Arial, sans-serif",

    background: "#f8fafc",
  },


  // =========================
  // LEFT SECTION
  // =========================

  leftSection: {
    width: "45%",

    minHeight: "100vh",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    padding: "60px",

    boxSizing: "border-box",

    color: "white",

    background:
      "linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%)",
  },

  brandContent: {
    maxWidth: "500px",
  },

  logo: {
    width: "72px",

    height: "72px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    fontSize: "36px",

    background:
      "rgba(255,255,255,0.1)",

    border:
      "1px solid rgba(255,255,255,0.15)",

    borderRadius: "18px",

    marginBottom: "25px",
  },

  adminBadge: {
    display: "inline-block",

    padding: "7px 12px",

    marginBottom: "15px",

    borderRadius: "20px",

    background:
      "rgba(59,130,246,0.2)",

    border:
      "1px solid rgba(96,165,250,0.35)",

    color: "#bfdbfe",

    fontSize: "11px",

    fontWeight: "700",

    letterSpacing: "1px",
  },

  brandTitle: {
    margin: 0,

    fontSize: "42px",

    fontWeight: "750",

    letterSpacing: "-1px",
  },

  brandText: {
    fontSize: "17px",

    lineHeight: "1.7",

    marginTop: "18px",

    marginBottom: "35px",

    color:
      "rgba(255,255,255,0.75)",
  },


  // =========================
  // FEATURES
  // =========================

  features: {
    display: "flex",

    flexDirection: "column",

    gap: "16px",
  },

  feature: {
    display: "flex",

    alignItems: "center",

    gap: "12px",

    fontSize: "15px",

    color:
      "rgba(255,255,255,0.9)",
  },

  featureIcon: {
    width: "26px",

    height: "26px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    borderRadius: "50%",

    background:
      "rgba(59,130,246,0.2)",

    color: "#93c5fd",

    fontWeight: "bold",
  },


  // =========================
  // RIGHT SECTION
  // =========================

  rightSection: {
    width: "55%",

    minHeight: "100vh",

    display: "flex",

    flexDirection: "column",

    alignItems: "center",

    justifyContent: "center",

    padding: "40px",

    boxSizing: "border-box",
  },

  loginCard: {
    width: "100%",

    maxWidth: "430px",
  },


  // =========================
  // HEADER
  // =========================

  mobileLogo: {
    display: "none",

    fontSize: "38px",

    marginBottom: "18px",
  },

  headerBadge: {
    display: "inline-block",

    padding: "6px 11px",

    marginBottom: "15px",

    borderRadius: "20px",

    color: "#2563eb",

    background: "#eff6ff",

    fontSize: "12px",

    fontWeight: "700",
  },

  loginTitle: {
    margin: 0,

    color: "#111827",

    fontSize: "32px",

    fontWeight: "750",

    letterSpacing: "-0.7px",
  },

  loginSubtitle: {
    marginTop: "10px",

    marginBottom: "30px",

    color: "#6b7280",

    fontSize: "15px",

    lineHeight: "1.5",
  },


  // =========================
  // ERROR
  // =========================

  errorBox: {
    display: "flex",

    alignItems: "flex-start",

    gap: "10px",

    padding: "14px",

    marginBottom: "20px",

    borderRadius: "10px",

    color: "#b91c1c",

    background: "#fef2f2",

    border:
      "1px solid #fecaca",

    fontSize: "14px",

    lineHeight: "1.5",
  },

  errorIcon: {
    fontSize: "16px",
  },


  // =========================
  // FORM
  // =========================

  form: {
    display: "flex",

    flexDirection: "column",

    gap: "20px",
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

  inputWrapper: {
    position: "relative",

    display: "flex",

    alignItems: "center",
  },

  inputIcon: {
    position: "absolute",

    left: "15px",

    fontSize: "16px",

    pointerEvents: "none",
  },

  input: {
    width: "100%",

    height: "52px",

    padding:
      "0 15px 0 45px",

    boxSizing: "border-box",

    border:
      "1px solid #d1d5db",

    borderRadius: "10px",

    outline: "none",

    fontSize: "15px",

    color: "#111827",

    background: "white",
  },

  showPassword: {
    position: "absolute",

    right: "10px",

    border: "none",

    background: "transparent",

    cursor: "pointer",

    fontSize: "17px",

    padding: "8px",
  },


  // =========================
  // LOGIN BUTTON
  // =========================

  loginButton: {
    width: "100%",

    height: "52px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    gap: "10px",

    border: "none",

    borderRadius: "10px",

    marginTop: "5px",

    color: "white",

    background:
      "linear-gradient(135deg, #1f2937, #111827)",

    fontSize: "15px",

    fontWeight: "650",

    boxShadow:
      "0 8px 20px rgba(17,24,39,0.2)",
  },

  buttonSpinner: {
    width: "16px",

    height: "16px",

    border:
      "2px solid rgba(255,255,255,0.35)",

    borderTop:
      "2px solid white",

    borderRadius: "50%",

    animation:
      "spin 0.8s linear infinite",
  },


  // =========================
  // SECURITY BOX
  // =========================

  securityBox: {
    display: "flex",

    alignItems: "flex-start",

    gap: "10px",

    marginTop: "24px",

    padding: "14px",

    borderRadius: "10px",

    background: "#f9fafb",

    border:
      "1px solid #e5e7eb",

    color: "#6b7280",

    fontSize: "13px",

    lineHeight: "1.5",
  },

  securityIcon: {
    fontSize: "16px",
  },


  // =========================
  // USER LOGIN LINK
  // =========================

  userLoginLink: {
    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    gap: "8px",

    marginTop: "24px",

    padding: "13px",

    borderRadius: "10px",

    color: "#374151",

    background: "white",

    border:
      "1px solid #e5e7eb",

    textDecoration: "none",

    fontSize: "14px",

    fontWeight: "600",
  },


  // =========================
  // FOOTER
  // =========================

  footer: {
    marginTop: "35px",

    color: "#9ca3af",

    fontSize: "12px",

    textAlign: "center",
  },
};

export default AdminLogin;