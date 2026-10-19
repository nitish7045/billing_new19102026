import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // =========================
  // LOGIN
  // =========================

  async function handleLogin(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      // =========================
      // LOGIN WITH SUPABASE
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
        setMessage("Login failed. User not found.");
        return;
      }

      // =========================
      // CHECK USER PROFILE
      // =========================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, status")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();

        setMessage(profileError.message);
        return;
      }

      // =========================
      // NOT NORMAL USER
      // =========================

      if (!profile) {
        await supabase.auth.signOut();

        setMessage(
          "This account is not registered as a billing user. Please use the correct login page."
        );

        return;
      }

      // =========================
      // SUCCESS
      // =========================

      navigate("/dashboard", {
        replace: true,
      });

    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        "Something went wrong. Please try again."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>

      {/* LEFT SIDE */}

      <div style={styles.leftSection}>

        <div style={styles.brandContent}>

          <div style={styles.logo}>
            🧾
          </div>

          <h1 style={styles.brandTitle}>
            Billing App
          </h1>

          <p style={styles.brandText}>
            Manage your customers, products,
            invoices and business information
            from one simple dashboard.
          </p>

          <div style={styles.features}>

            <div style={styles.feature}>
              <span style={styles.featureIcon}>
                ✓
              </span>

              <span>
                Manage Products & Customers
              </span>
            </div>

            <div style={styles.feature}>
              <span style={styles.featureIcon}>
                ✓
              </span>

              <span>
                Create and Manage Bills
              </span>
            </div>

            <div style={styles.feature}>
              <span style={styles.featureIcon}>
                ✓
              </span>

              <span>
                Access Your Business Dashboard
              </span>
            </div>

          </div>

        </div>

      </div>


      {/* RIGHT SIDE */}

      <div style={styles.rightSection}>

        <div style={styles.loginCard}>

          {/* HEADER */}

          <div style={styles.mobileLogo}>
            🧾
          </div>

          <h1 style={styles.loginTitle}>
            Welcome Back
          </h1>

          <p style={styles.loginSubtitle}>
            Sign in to access your billing dashboard
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


          {/* FORM */}

          <form
            onSubmit={handleLogin}
            style={styles.form}
          >

            {/* EMAIL */}

            <div style={styles.field}>

              <label style={styles.label}>
                Email Address
              </label>

              <div style={styles.inputWrapper}>

                <span style={styles.inputIcon}>
                  ✉️
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setMessage("");
                  }}
                  required
                  disabled={loading}
                  style={styles.input}
                  placeholder="Enter your email"
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
                    setPassword(e.target.value);
                    setMessage("");
                  }}
                  required
                  disabled={loading}
                  style={{
                    ...styles.input,
                    paddingRight: "48px",
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  style={styles.showPassword}
                  disabled={loading}
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

                  <span style={styles.buttonSpinner} />

                  Logging in...

                </>
              ) : (
                <>
                  Login
                  <span>
                    →
                  </span>
                </>
              )}

            </button>

          </form>


          {/* SIGN UP */}

          <div style={styles.divider}>

            <span>
              New to Billing App?
            </span>

          </div>

          <p style={styles.signupText}>

            Don't have an account?{" "}

            <Link
              to="/signup"
              style={styles.signupLink}
            >
              Create Account
            </Link>

          </p>


          {/* ADMIN LOGIN */}

          <Link
            to="/admin-login"
            style={styles.adminLink}
          >

            <span>
              ⚙️
            </span>

            Administrator Login

          </Link>

        </div>


        {/* FOOTER */}

        <p style={styles.footer}>
          © {new Date().getFullYear()} Billing App
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
      "linear-gradient(135deg, #1d4ed8 0%, #2563eb 45%, #3b82f6 100%)",
  },

  brandContent: {
    maxWidth: "500px",
  },

  logo: {
    width: "70px",

    height: "70px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    fontSize: "34px",

    background:
      "rgba(255,255,255,0.15)",

    border:
      "1px solid rgba(255,255,255,0.2)",

    borderRadius: "18px",

    marginBottom: "28px",

    backdropFilter:
      "blur(10px)",
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
      "rgba(255,255,255,0.85)",
  },

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
      "rgba(255,255,255,0.95)",
  },

  featureIcon: {
    width: "26px",

    height: "26px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    borderRadius: "50%",

    background:
      "rgba(255,255,255,0.18)",

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
  // LOGIN HEADER
  // =========================

  mobileLogo: {
    display: "none",

    fontSize: "36px",

    marginBottom: "20px",
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

    marginBottom: "32px",

    color: "#6b7280",

    fontSize: "15px",
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

    transition:
      "border 0.2s ease, box-shadow 0.2s ease",
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
      "linear-gradient(135deg, #2563eb, #1d4ed8)",

    fontSize: "15px",

    fontWeight: "650",

    boxShadow:
      "0 8px 20px rgba(37,99,235,0.22)",

    transition:
      "transform 0.2s ease, box-shadow 0.2s ease",
  },

  buttonSpinner: {
    width: "16px",

    height: "16px",

    border:
      "2px solid rgba(255,255,255,0.4)",

    borderTop:
      "2px solid white",

    borderRadius: "50%",

    animation:
      "spin 0.8s linear infinite",
  },


  // =========================
  // DIVIDER
  // =========================

  divider: {
    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    marginTop: "30px",

    color: "#9ca3af",

    fontSize: "13px",
  },

  signupText: {
    textAlign: "center",

    marginTop: "12px",

    color: "#6b7280",

    fontSize: "14px",
  },

  signupLink: {
    color: "#2563eb",

    textDecoration: "none",

    fontWeight: "650",
  },


  // =========================
  // ADMIN
  // =========================

  adminLink: {
    marginTop: "22px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    gap: "8px",

    color: "#6b7280",

    textDecoration: "none",

    fontSize: "14px",

    padding: "12px",

    borderRadius: "9px",

    border:
      "1px solid #e5e7eb",

    background: "#ffffff",
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

export default Login;