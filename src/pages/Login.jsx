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

  // forgotMode: "login" | "request" | "verify" | "reset"

  const [forgotMode, setForgotMode] = useState("login");

  const [recoveryOtp, setRecoveryOtp] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);

  // =========================

  // LOGIN

  // =========================

  async function handleLogin(e) {

    e.preventDefault();

    if (loading) return;

    setLoading(true);

    setMessage("");

    try {

      const { data, error } = await supabase.auth.signInWithPassword({

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

      const { data: profile, error: profileError } = await supabase

        .from("profiles")

        .select("id, status")

        .eq("id", data.user.id)

        .maybeSingle();

      if (profileError) {

        await supabase.auth.signOut();

        setMessage(profileError.message);

        return;

      }

      if (!profile) {

        await supabase.auth.signOut();

        setMessage(

          "This account is not registered as a billing user. Please use the correct login page."

        );

        return;

      }

      navigate("/dashboard", { replace: true });

    } catch (error) {

      console.error("Login error:", error);

      setMessage("Something went wrong. Please try again.");

    } finally {

      setLoading(false);

    }

  }

  // =========================

  // HELPERS

  // =========================

  function maskEmail(value) {

    const [name = "", domain = ""] = String(value || "").split("@");

    return domain ? `${name.slice(0, 2)}\*\*\*@${domain}` : "(invalid email)";

  }

    // Account existence is checked by the server-side Edge Function.

  async function requestResetCode({ isResend = false } = {}) {

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {

    setMessage("Please enter your email address first.");

    return false;

  }

  try {

    const { data, error } = await supabase.functions.invoke(

      "request-password-reset",

      {

        body: { email: normalizedEmail },

      }

    );

    if (error) {
      let responseBody = null;

      try {
        if (error.context) {
          const response = error.context.clone();
          const contentType = response.headers.get("content-type") || "";
          responseBody = contentType.includes("application/json")
            ? await response.json()
            : await response.text();
        }
      } catch (responseReadError) {
        responseBody =
          responseReadError?.message || "Could not read response body";
      }

      console.error("[Password Reset] Edge Function failed:", {
        name: error.name,
        message: error.message,
        status: error.context?.status ?? null,
        responseBody,
      });

      setMessage(
        "Unable to verify your account or send the reset code. Please try again."
      );
      return false;
    }

    if (data?.exists === false) {

      setMessage(

        data.error ||

          "No account found with this email address. Please check and try again."

      );

      return false;

    }

    if (data?.error || !data?.exists) {

      setMessage(

        data?.error || "Could not send the reset code. Please try again."

      );

      return false;

    }

    console.info("[Forgot Password] Reset code requested", {

      isResend,

      email: maskEmail(normalizedEmail),

    });

    return true;

  } catch (error) {

    console.error("Password reset request failed:", error);

    setMessage("Could not send the reset code. Please try again.");

    return false;

  }

}

  // =========================

  async function handleForgotPassword(e) {

    e.preventDefault();

    if (loading) return;

    setLoading(true);

    setMessage("");

    try {

      const ok = await requestResetCode({ isResend: false });

      if (!ok) return;

      setForgotMode("verify");

      setMessage("A 6-digit reset code has been sent. Check your inbox and spam folder.");

    } catch (error) {

      console.error("[Forgot Password OTP] Unexpected request error", {

        message: error?.message ?? String(error),

        timestamp: new Date().toISOString(),

      });

      setMessage("Could not request a reset code. Please try again.");

    } finally {

      setLoading(false);

    }

  }

  // =========================

  // FORGOT PASSWORD — STEP 2: VERIFY OTP

  // =========================

  async function handleVerifyRecoveryOtp(e) {

    e.preventDefault();

    if (loading) return;

    setMessage("");

    if (!/^\d{6}$/.test(recoveryOtp)) {

      setMessage("Please enter the complete 6-digit reset code.");

      return;

    }

    setLoading(true);

    console.info("[Forgot Password OTP] Verification started", {

      email: maskEmail(email.trim()),

      otpLength: recoveryOtp.length,

      timestamp: new Date().toISOString(),

    });

    try {

      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({

        email: email.trim(),

        token: recoveryOtp,

        type: "recovery",

      });

      if (verifyError) {

        console.error("[Forgot Password OTP] Verification failed", {

          message: verifyError.message,

          status: verifyError.status ?? null,

          code: verifyError.code ?? null,

          timestamp: new Date().toISOString(),

        });

        setMessage(verifyError.message);

        return;

      }

      console.info("[Forgot Password OTP] Verification succeeded", {

        hasUser: Boolean(verifyData?.user),

        hasSession: Boolean(verifyData?.session),

        timestamp: new Date().toISOString(),

      });

      // Move to reset-password step

      setNewPassword("");

      setConfirmNewPassword("");

      setShowNewPassword(false);

      setForgotMode("reset");

      setMessage("Code verified. Please choose your new password.");

    } catch (error) {

      console.error("[Forgot Password OTP] Unexpected verification error", {

        message: error?.message ?? String(error),

        timestamp: new Date().toISOString(),

      });

      setMessage("Could not verify the code. Please try again.");

    } finally {

      setLoading(false);

    }

  }

  // =========================

  // FORGOT PASSWORD — STEP 3: CHANGE PASSWORD

  // =========================

  async function handleChangePassword(e) {

    e.preventDefault();

    if (loading) return;

    setMessage("");

    if (newPassword.length < 6) {

      setMessage("New password must be at least 6 characters.");

      return;

    }

    if (newPassword !== confirmNewPassword) {

      setMessage("New password and confirmation do not match.");

      return;

    }

    setLoading(true);

    console.info("[Forgot Password OTP] Password update started", {

      email: maskEmail(email.trim()),

      timestamp: new Date().toISOString(),

    });

    try {

      const { data: updateData, error: updateError } =

        await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {

        console.error("[Forgot Password OTP] Password update failed", {

          message: updateError.message,

          status: updateError.status ?? null,

          code: updateError.code ?? null,

          timestamp: new Date().toISOString(),

        });

        setMessage(updateError.message);

        return;

      }

      console.info("[Forgot Password OTP] Password updated successfully", {

        hasUser: Boolean(updateData?.user),

        timestamp: new Date().toISOString(),

      });

      await supabase.auth.signOut();

      // Reset all reset-flow state

      setPassword("");

      setRecoveryOtp("");

      setNewPassword("");

      setConfirmNewPassword("");

      setShowNewPassword(false);

      setForgotMode("login");

      setMessage("Password reset successfully. You can now log in with your new password.");

    } catch (error) {

      console.error("[Forgot Password OTP] Unexpected password update error", {

        message: error?.message ?? String(error),

        timestamp: new Date().toISOString(),

      });

      setMessage("Could not reset the password. Please try again.");

    } finally {

      setLoading(false);

    }

  }

  // =========================

  // RESEND (reuses shared helper)

  // =========================

  async function resendRecoveryOtp() {

    if (loading) return;

    setLoading(true);

    setMessage("");

    try {

      const ok = await requestResetCode({ isResend: true });

      if (ok) {

        setRecoveryOtp("");

        setMessage("A new reset code has been sent to your email.");

      }

    } catch (error) {

      console.error("[Forgot Password OTP] Unexpected resend error", {

        message: error?.message ?? String(error),

        timestamp: new Date().toISOString(),

      });

      setMessage("Could not resend the reset code. Please try again.");

    } finally {

      setLoading(false);

    }

  }

  function returnToLogin() {

    setForgotMode("login");

    setRecoveryOtp("");

    setNewPassword("");

    setConfirmNewPassword("");

    setShowNewPassword(false);

    setMessage("");

  }

  // =========================

  // RENDER

  // =========================

  return (

    <div style={styles.page}>

      <div style={styles.leftSection}>

        <div style={styles.brandContent}>

          <div style={styles.logo}>🧾</div>

          <h1 style={styles.brandTitle}>Billing App</h1>

          <p style={styles.brandText}>

            Manage your customers, products, invoices and business information from one

            simple dashboard.

          </p>

          <div style={styles.features}>

            <div style={styles.feature}>

              <span style={styles.featureIcon}>✓</span>

              <span>Manage Products & Customers</span>

            </div>

            <div style={styles.feature}>

              <span style={styles.featureIcon}>✓</span>

              <span>Create and Manage Bills</span>

            </div>

            <div style={styles.feature}>

              <span style={styles.featureIcon}>✓</span>

              <span>Access Your Business Dashboard</span>

            </div>

          </div>

        </div>

      </div>

      <div style={styles.rightSection}>

        <div style={styles.loginCard}>

          <div style={styles.mobileLogo}>🧾</div>

          <h1 style={styles.loginTitle}>Welcome Back</h1>

          <p style={styles.loginSubtitle}>Sign in to access your billing dashboard</p>

          {message && (

            <div

              style={{

                ...styles.errorBox,

                ...(message.toLowerCase().includes("successfully") ||

                message.startsWith("If an account exists") ||

                message.startsWith("A 6-digit") ||

                message.startsWith("A new reset") ||

                message.startsWith("Code verified")

                  ? styles.successBox

                  : {}),

              }}

            >

              <span style={styles.errorIcon}>

                {message.toLowerCase().includes("successfully") ||

                message.startsWith("A 6-digit") ||

                message.startsWith("A new reset") ||

                message.startsWith("Code verified")

                  ? "✅"

                  : "⚠️"}

              </span>

              <span>{message}</span>

            </div>

          )}

          {forgotMode === "login" ? (

            // =========================

            // LOGIN FORM

            // =========================

            <form onSubmit={handleLogin} style={styles.form}>

              <div style={styles.field}>

                <label style={styles.label}>Email Address</label>

                <div style={styles.inputWrapper}>

                  <span style={styles.inputIcon}>✉️</span>

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

              <div style={styles.field}>

                <label style={styles.label}>Password</label>

                <div style={styles.inputWrapper}>

                  <span style={styles.inputIcon}>🔒</span>

                  <input

                    type={showPassword ? "text" : "password"}

                    value={password}

                    onChange={(e) => {

                      setPassword(e.target.value);

                      setMessage("");

                    }}

                    required

                    disabled={loading}

                    style={{

  ...styles.input,

  padding: "0 48px 0 45px",

}}

                    placeholder="Enter your password"

                    autoComplete="current-password"

                  />

                  <button

                    type="button"

                    onClick={() => setShowPassword(!showPassword)}

                    style={styles.showPassword}

                    disabled={loading}

                    aria-label={showPassword ? "Hide password" : "Show password"}

                  >

                    {showPassword ? "🙈" : "👁️"}

                  </button>

                </div>

              </div>

              <div style={styles.forgotPasswordRow}>

                <button

                  type="button"

                  onClick={() => {

                    setForgotMode("request");

                    setMessage("");

                  }}

                  style={styles.forgotPasswordLink}

                  disabled={loading}

                >

                  Forgot password?

                </button>

              </div>

              <button

                type="submit"

                disabled={loading}

                style={{ ...styles.loginButton, opacity: loading ? 0.75 : 1 }}

              >

                {loading ? (

                  <>

                    <span style={styles.buttonSpinner} /> Logging in...

                  </>

                ) : (

                  <>

                    Login <span>→</span>

                  </>

                )}

              </button>

            </form>

          ) : forgotMode === "request" ? (

            // =========================

            // STEP 1: REQUEST RESET CODE

            // =========================

            <form onSubmit={handleForgotPassword} style={styles.form}>

              <div style={styles.recoveryInfo}>

                <div style={styles.recoveryIcon}>🔐</div>

                <h3 style={styles.recoveryTitle}>Forgot your password?</h3>

                <p style={styles.recoveryDescription}>

                  Enter your account email. We’ll send a 6-digit reset code.

                </p>

              </div>

              <div style={styles.field}>

                <label style={styles.label}>Email Address</label>

                <div style={styles.inputWrapper}>

                  <span style={styles.inputIcon}>✉️</span>

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

                    placeholder="Enter your account email"

                    autoComplete="email"

                  />

                </div>

              </div>

              <button type="submit" disabled={loading} style={styles.loginButton}>

                {loading ? "Sending reset code..." : "Send Reset Code"}

              </button>

              <button

                type="button"

                onClick={returnToLogin}

                style={styles.backButton}

                disabled={loading}

              >

                ← Back to login

              </button>

            </form>

          ) : forgotMode === "verify" ? (

            // =========================

            // STEP 2: VERIFY OTP

            // =========================

            <form onSubmit={handleVerifyRecoveryOtp} style={styles.form}>

              <div style={styles.recoveryInfo}>

                <div style={styles.recoveryIcon}>✉️</div>

                <h3 style={styles.recoveryTitle}>Enter reset code</h3>

                <p style={styles.recoveryDescription}>

                  Enter the 6-digit code sent to <strong>{email}</strong>.

                </p>

              </div>

              <div style={styles.field}>

                <label style={styles.label}>6-digit reset code</label>

                <div style={styles.inputWrapper}>

                  <span style={styles.inputIcon}>🔢</span>

                  <input

                    type="text"

                    inputMode="numeric"

                    autoComplete="one-time-code"

                    value={recoveryOtp}

                    onChange={(e) => {

                      setRecoveryOtp(e.target.value.replace(/\D/g, "").slice(0, 6));

                      setMessage("");

                    }}

                    required

                    minLength={6}

                    maxLength={6}

                    pattern="[0-9]{6}"

                    style={styles.input}

                    placeholder="Enter 6-digit code"

                    aria-label="6-digit password reset code"

                  />

                </div>

              </div>

              <button type="submit" disabled={loading} style={styles.loginButton}>

                {loading ? "Verifying code..." : "Verify Code"}

              </button>

              <div style={styles.recoveryActions}>

                <button

                  type="button"

                  onClick={resendRecoveryOtp}

                  style={styles.forgotPasswordLink}

                  disabled={loading}

                >

                  Resend code

                </button>

                <button

                  type="button"

                  onClick={returnToLogin}

                  style={styles.forgotPasswordLink}

                  disabled={loading}

                >

                  Back to login

                </button>

              </div>

            </form>

          ) : (

            // =========================

            // STEP 3: CHANGE PASSWORD

            // =========================

            <form onSubmit={handleChangePassword} style={styles.form}>

              <div style={styles.recoveryInfo}>

                <div style={styles.recoveryIcon}>🔑</div>

                <h3 style={styles.recoveryTitle}>Choose a new password</h3>

                <p style={styles.recoveryDescription}>

                  Your code has been verified. Set a new password for{" "}

                  <strong>{email}</strong>.

                </p>

              </div>

              <div style={styles.field}>

                <label style={styles.label}>New Password</label>

                <div style={styles.inputWrapper}>

                  <span style={styles.inputIcon}>🔒</span>

                  <input

                    type={showNewPassword ? "text" : "password"}

                    value={newPassword}

                    onChange={(e) => {

                      setNewPassword(e.target.value);

                      setMessage("");

                    }}

                    required

                    minLength={6}

                    disabled={loading}

                    style={{

  ...styles.input,

  padding: "0 48px 0 45px",

}}

                    placeholder="Enter new password"

                    autoComplete="new-password"

                  />

                  <button

                    type="button"

                    onClick={() => setShowNewPassword(!showNewPassword)}

                    style={styles.showPassword}

                    disabled={loading}

                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}

                  >

                    {showNewPassword ? "🙈" : "👁️"}

                  </button>

                </div>

              </div>

              <div style={styles.field}>

                <label style={styles.label}>Confirm New Password</label>

                <div style={styles.inputWrapper}>

                  <span style={styles.inputIcon}>🔐</span>

                  <input

                    type="password"

                    value={confirmNewPassword}

                    onChange={(e) => {

                      setConfirmNewPassword(e.target.value);

                      setMessage("");

                    }}

                    required

                    minLength={6}

                    disabled={loading}

                    style={styles.input}

                    placeholder="Confirm new password"

                    autoComplete="new-password"

                  />

                </div>

              </div>

              <button type="submit" disabled={loading} style={styles.loginButton}>

                {loading ? "Updating password..." : "Change Password"}

              </button>

              <div style={styles.recoveryActions}>

                <button

                  type="button"

                  onClick={returnToLogin}

                  style={styles.forgotPasswordLink}

                  disabled={loading}

                >

                  Cancel

                </button>

              </div>

            </form>

          )}

          <div style={styles.divider}>

            <span>New to Billing App?</span>

          </div>

          <p style={styles.signupText}>

            Don't have an account?{" "}

            <Link to="/signup" style={styles.signupLink}>

              Create Account

            </Link>

          </p>

          <Link to="/admin-login" style={styles.adminLink}>

            <span>⚙️</span>

            Administrator Login

          </Link>

        </div>

        <p style={styles.footer}>© {new Date().getFullYear()} Billing App</p>

      </div>

    </div>

  );

}

// =========================

// STYLES

// =========================

const styles = {

  page: {

    minHeight: "100vh",

    display: "flex",

    fontFamily: "Inter, Arial, sans-serif",

    background: "#f8fafc",

  },

  leftSection: {

    width: "45%",

    minHeight: "100vh",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    padding: "60px",

    boxSizing: "border-box",

    color: "white",

    background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 45%, #3b82f6 100%)",

  },

  brandContent: { maxWidth: "500px" },

  logo: {

    width: "70px",

    height: "70px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    fontSize: "34px",

    background: "rgba(255,255,255,0.15)",

    border: "1px solid rgba(255,255,255,0.2)",

    borderRadius: "18px",

    marginBottom: "28px",

    backdropFilter: "blur(10px)",

  },

  brandTitle: { margin: 0, fontSize: "42px", fontWeight: "750", letterSpacing: "-1px" },

  brandText: {

    fontSize: "17px",

    lineHeight: "1.7",

    marginTop: "18px",

    marginBottom: "35px",

    color: "rgba(255,255,255,0.85)",

  },

  features: { display: "flex", flexDirection: "column", gap: "16px" },

  feature: {

    display: "flex",

    alignItems: "center",

    gap: "12px",

    fontSize: "15px",

    color: "rgba(255,255,255,0.95)",

  },

  featureIcon: {

    width: "26px",

    height: "26px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    borderRadius: "50%",

    background: "rgba(255,255,255,0.18)",

    fontWeight: "bold",

  },

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

  loginCard: { width: "100%", maxWidth: "430px" },

  mobileLogo: { display: "none", fontSize: "36px", marginBottom: "20px" },

  loginTitle: {

    margin: 0,

    color: "#111827",

    fontSize: "32px",

    fontWeight: "750",

    letterSpacing: "-0.7px",

  },

  loginSubtitle: { marginTop: "10px", marginBottom: "32px", color: "#6b7280", fontSize: "15px" },

  errorBox: {

    display: "flex",

    alignItems: "flex-start",

    gap: "10px",

    padding: "14px",

    marginBottom: "20px",

    borderRadius: "10px",

    color: "#b91c1c",

    background: "#fef2f2",

    border: "1px solid #fecaca",

    fontSize: "14px",

    lineHeight: "1.5",

  },

  errorIcon: { fontSize: "16px" },

  form: { display: "flex", flexDirection: "column", gap: "20px" },

  field: { display: "flex", flexDirection: "column", gap: "8px" },

  label: { fontSize: "14px", fontWeight: "600", color: "#374151" },

  inputWrapper: { position: "relative", display: "flex", alignItems: "center" },

  inputIcon: { position: "absolute", left: "15px", fontSize: "16px", pointerEvents: "none" },

  input: {

    width: "100%",

    height: "52px",

    padding: "0 15px 0 45px",

    boxSizing: "border-box",

    border: "1px solid #d1d5db",

    borderRadius: "10px",

    outline: "none",

    fontSize: "15px",

    color: "#111827",

    background: "white",

    transition: "border 0.2s ease, box-shadow 0.2s ease",

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

    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",

    fontSize: "15px",

    fontWeight: "650",

    boxShadow: "0 8px 20px rgba(37,99,235,0.22)",

    transition: "transform 0.2s ease, box-shadow 0.2s ease",

    cursor: "pointer",

  },

  buttonSpinner: {

    width: "16px",

    height: "16px",

    border: "2px solid rgba(255,255,255,0.4)",

    borderTop: "2px solid white",

    borderRadius: "50%",

    animation: "spin 0.8s linear infinite",

  },

  successBox: { color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0" },

  forgotPasswordRow: {

    display: "flex",

    justifyContent: "flex-end",

    marginTop: "-10px",

    marginBottom: "-4px",

  },

  forgotPasswordLink: {

    border: "none",

    background: "transparent",

    color: "#2563eb",

    fontSize: "13px",

    fontWeight: "650",

    cursor: "pointer",

    padding: "6px 0",

  },

  backButton: {

    border: "none",

    background: "transparent",

    color: "#4b5563",

    fontSize: "14px",

    fontWeight: "600",

    cursor: "pointer",

    padding: "8px",

  },

  recoveryInfo: {

    textAlign: "center",

    padding: "18px 14px",

    border: "1px solid #dbeafe",

    background: "#eff6ff",

    borderRadius: "14px",

  },

  recoveryIcon: { fontSize: "30px", marginBottom: "8px" },

  recoveryTitle: { margin: "0 0 8px", color: "#1e3a8a", fontSize: "20px" },

  recoveryDescription: {

    margin: 0,

    color: "#4b5563",

    fontSize: "13px",

    lineHeight: 1.6,

    overflowWrap: "anywhere",

  },

  recoveryActions: {

    display: "flex",

    justifyContent: "space-between",

    alignItems: "center",

    flexWrap: "wrap",

    gap: "12px",

  },

  divider: {

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    marginTop: "30px",

    color: "#9ca3af",

    fontSize: "13px",

  },

  signupText: { textAlign: "center", marginTop: "12px", color: "#6b7280", fontSize: "14px" },

  signupLink: { color: "#2563eb", textDecoration: "none", fontWeight: "650" },

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

    border: "1px solid #e5e7eb",

    background: "#ffffff",

  },

  footer: { marginTop: "35px", color: "#9ca3af", fontSize: "12px", textAlign: "center" },

};

export default Login;
