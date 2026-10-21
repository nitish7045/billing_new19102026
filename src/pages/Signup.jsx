import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // message = { type: "error" | "success", text: string, action?: "login" } | null
  const [message, setMessage] = useState(null);

  // Debug helper: logs a masked email only. Never log passwords or OTP values.
  function maskedEmail(value) {
    const [name = "", domain = ""] = String(value || "").split("@");
    if (!domain) return "(invalid email)";
    return `${name.slice(0, 2)}***@${domain}`;
  }

  function showError(text, action) {
    setMessage({ type: "error", text, action });
  }

  function showSuccess(text) {
    setMessage({ type: "success", text });
  }

  async function handleSignup(e) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      // =========================
      // STEP 2: Verify OTP
      // =========================
      if (otpSent) {
        if (!/^\d{6}$/.test(otp)) {
          showError("Please enter the complete 6-digit verification code.");
          return;
        }

        console.info("[Signup OTP] Verification started", {
          email: maskedEmail(email.trim()),
          type: "signup",
          otpLength: otp.trim().length,
          timestamp: new Date().toISOString(),
        });

        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otp.trim(),
          type: "signup",
        });

        if (error) {
          console.error("[Signup OTP] Verification failed", {
            message: error.message,
            status: error.status ?? null,
            code: error.code ?? null,
            timestamp: new Date().toISOString(),
          });

          const msg = error.message.toLowerCase();

          if (msg.includes("expired")) {
            showError(
              "This verification code has expired. Click “Resend code” to get a new one."
            );
          } else if (msg.includes("invalid") || msg.includes("token")) {
            showError(
              "The verification code is incorrect. Double-check the 6 digits and try again."
            );
          } else if (msg.includes("rate") || error.status === 429) {
            showError(
              "Too many attempts. Please wait a minute before trying again."
            );
          } else {
            showError(error.message);
          }
          return;
        }

        console.info("[Signup OTP] Verification API succeeded", {
          hasUser: Boolean(data?.user),
          userId: data?.user?.id ?? null,
          hasSession: Boolean(data?.session),
          timestamp: new Date().toISOString(),
        });

        if (!data.user) {
          showError("Email verification failed. Please try again.");
          return;
        }

        showSuccess("Email verified successfully. Opening your dashboard...");
        navigate("/dashboard", { replace: true });
        return;
      }

      // =========================
      // STEP 1: Validate form
      // =========================
      if (!fullName.trim()) {
        showError("Please enter your full name.");
        return;
      }
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        showError("Please enter a valid email address.");
        return;
      }
      if (!whatsappNumber.trim()) {
        showError("Please enter your WhatsApp number.");
        return;
      }
      if (password.length < 6) {
        showError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        showError("Password and Confirm Password do not match.");
        return;
      }

      console.info("[Signup OTP] Signup request started", {
        email: maskedEmail(email.trim()),
        timestamp: new Date().toISOString(),
      });

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: whatsappNumber.trim(),
          },
        },
      });

      // =========================
      // Handle Supabase errors
      // =========================
      if (error) {
        console.error("[Signup OTP] Supabase signUp returned an error", {
          message: error.message,
          status: error.status ?? null,
          code: error.code ?? null,
          timestamp: new Date().toISOString(),
        });

        const msg = error.message.toLowerCase();

        if (
          msg.includes("already registered") ||
          msg.includes("already exists") ||
          msg.includes("user already")
        ) {
          showError(
            "This email is already registered. Please log in instead, or use “Change email” to sign up with a different address.",
            "login"
          );
        } else if (msg.includes("rate") || error.status === 429) {
          showError(
            "Too many signup attempts. Please wait a few minutes and try again."
          );
        } else if (msg.includes("password")) {
          showError(error.message);
        } else {
          showError(error.message);
        }
        return;
      }

      console.info("[Signup OTP] Supabase signUp response received", {
        hasUser: Boolean(data?.user),
        userId: data?.user?.id ?? null,
        hasSession: Boolean(data?.session),
        emailConfirmedAt: data?.user?.email_confirmed_at ?? null,
        identitiesCount: Array.isArray(data?.user?.identities)
          ? data.user.identities.length
          : null,
        note: "A successful API response does not guarantee that the email was delivered.",
        timestamp: new Date().toISOString(),
      });

      if (!data?.user) {
        showError("Account creation failed. Please try again.");
        return;
      }

      // =========================
      // CRITICAL: Detect duplicate email
      // When email confirmation is ON and the user already exists,
      // Supabase returns a user object with an EMPTY identities array
      // instead of throwing an error.
      // =========================
      if (
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        showError(
          "This email is already registered. Please log in instead, or use “Change email” to sign up with a different address.",
          "login"
        );
        return;
      }

      // Also guard: if the user is already confirmed, they must log in.
      if (data.user.email_confirmed_at) {
        showError(
          "This email is already registered and verified. Please log in instead.",
          "login"
        );
        return;
      }

      // =========================
      // Success path
      // =========================
      setOtpSent(true);
      showSuccess(
        `Verification code sent to ${email.trim()}. Check your inbox and spam folder.`
      );
    } catch (error) {
      console.error("[Signup OTP] Unexpected signup/verification exception", {
        name: error?.name ?? null,
        message: error?.message ?? String(error),
        timestamp: new Date().toISOString(),
      });
      showError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (!email.trim()) {
      showError("Enter your email address first.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      console.info("[Signup OTP] Resend request started", {
        email: maskedEmail(email.trim()),
        type: "signup",
        timestamp: new Date().toISOString(),
      });

      const { data, error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });

      if (error) {
        console.error("[Signup OTP] Resend failed", {
          message: error.message,
          status: error.status ?? null,
          code: error.code ?? null,
          timestamp: new Date().toISOString(),
        });

        const msg = error.message.toLowerCase();

        if (
          msg.includes("already confirmed") ||
          msg.includes("already verified")
        ) {
          showError("This email is already verified. Please log in instead.", "login");
        } else if (msg.includes("rate") || error.status === 429) {
          showError(
            "Please wait a bit before requesting another code (rate limit)."
          );
        } else if (msg.includes("user not found")) {
          showError(
            "We couldn’t find an account for this email. Please sign up again."
          );
        } else {
          showError(error.message);
        }
        return;
      }

      console.info("[Signup OTP] Resend API succeeded", {
        hasUser: Boolean(data?.user),
        userId: data?.user?.id ?? null,
        note: "Check Supabase Auth logs and Brevo transactional email logs to confirm delivery.",
        timestamp: new Date().toISOString(),
      });

      showSuccess(`A new verification code has been sent to ${email.trim()}.`);
    } catch (error) {
      console.error("[Signup OTP] Unexpected resend exception", {
        name: error?.name ?? null,
        message: error?.message ?? String(error),
        timestamp: new Date().toISOString(),
      });
      showError("Could not resend the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function changeEmail() {
    setOtpSent(false);
    setOtp("");
    setMessage(null);
  }

  return (
    <div style={styles.container}>
      {/* BACKGROUND DECORATION */}
      <div style={styles.circleOne}></div>
      <div style={styles.circleTwo}></div>

      {/* MAIN CARD */}
      <div style={styles.card}>
        {/* LOGO */}
        <div style={styles.logo}>🧾</div>

        {/* HEADER */}
        <div style={styles.header}>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Create your Billing App account</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSignup} style={styles.form}>
          {!otpSent ? (
            <>
              {/* FULL NAME */}
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>👤</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    style={styles.input}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div style={styles.field}>
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>✉️</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={styles.input}
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              {/* WHATSAPP */}
              <div style={styles.field}>
                <label style={styles.label}>WhatsApp Number</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>📱</span>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    required
                    style={styles.input}
                    placeholder="Enter WhatsApp number"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ ...styles.input, paddingRight: "55px" }}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div style={styles.field}>
                <label style={styles.label}>Confirm Password</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>🔐</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ ...styles.input, paddingRight: "55px" }}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    style={styles.eyeButton}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={styles.otpInfo}>
                <div style={styles.otpIcon}>✉️</div>
                <h3 style={styles.otpTitle}>Verify your email</h3>
                <p style={styles.otpDescription}>
                  Enter the verification code sent to <strong>{email}</strong>.
                  Check your spam folder if you do not see it.
                </p>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Email verification code</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>🔢</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    minLength={6}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    aria-label="Email verification code"
                  />
                </div>
              </div>

              <div style={styles.otpActions}>
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={loading}
                  style={styles.secondaryButton}
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={changeEmail}
                  disabled={loading}
                  style={styles.textButton}
                >
                  Change email
                </button>
              </div>
            </>
          )}

          {/* MESSAGE */}
          {message && (
            <div
              style={{
                ...styles.message,
                background: message.type === "error" ? "#fef2f2" : "#f0fdf4",
                borderColor:
                  message.type === "error" ? "#fecaca" : "#bbf7d0",
                color: message.type === "error" ? "#b91c1c" : "#15803d",
              }}
            >
              {message.type === "error" ? "❌ " : "✅ "}
              {message.text}
              
            </div>
          )}

          {/* SIGNUP BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? otpSent
                ? "Verifying..."
                : "Sending verification code..."
              : otpSent
                ? "Verify Email & Continue"
                : "Send Verification Code"}
          </button>
        </form>

        {/* LOGIN LINK */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?
            <Link to="/login" style={styles.loginLink}>
              Login
            </Link>
          </p>
        </div>

        {/* SECURITY */}
        <div style={styles.security}>
          <span>🔒</span>
          Your information is securely protected
        </div>
      </div>
    </div>
  );
}

// =========================
// STYLES
// =========================

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "30px 20px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #eef2ff 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily: "Inter, Arial, sans-serif",
  },

  // =========================
  // BACKGROUND
  // =========================

  circleOne: {
    position: "absolute",
    width: "450px",
    height: "450px",
    borderRadius: "50%",
    background: "rgba(37, 99, 235, 0.10)",
    top: "-180px",
    left: "-180px",
  },

  circleTwo: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "rgba(99, 102, 241, 0.10)",
    bottom: "-200px",
    right: "-150px",
  },

  // =========================
  // CARD
  // =========================

  card: {
    width: "100%",
    maxWidth: "460px",
    background: "white",
    padding: "38px",
    borderRadius: "22px",
    boxSizing: "border-box",
    boxShadow: "0 25px 60px rgba(15, 23, 42, 0.15)",
    border: "1px solid rgba(255,255,255,0.8)",
    position: "relative",
    zIndex: 1,
  },

  // =========================
  // LOGO
  // =========================

  logo: {
    width: "64px",
    height: "64px",
    margin: "0 auto 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #2563eb, #4f46e5)",
    boxShadow: "0 10px 25px rgba(37,99,235,0.25)",
  },

  // =========================
  // HEADER
  // =========================

  header: {
    textAlign: "center",
    marginBottom: "28px",
  },

  title: {
    margin: "0 0 8px",
    fontSize: "28px",
    fontWeight: "700",
    color: "#111827",
    letterSpacing: "-0.5px",
  },

  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#6b7280",
  },

  // =========================
  // FORM
  // =========================

  form: {
    width: "100%",
  },

  field: {
    marginBottom: "18px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
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
    height: "48px",
    padding: "0 15px 0 45px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    outline: "none",
    boxSizing: "border-box",
    fontSize: "14px",
    color: "#111827",
    background: "#ffffff",
    transition: "border 0.2s ease, box-shadow 0.2s ease",
  },

  eyeButton: {
    position: "absolute",
    right: "8px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "17px",
    padding: "8px",
  },

  otpInfo: {
    textAlign: "center",
    marginBottom: "24px",
    padding: "18px 14px",
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    borderRadius: "14px",
  },

  otpIcon: {
    fontSize: "30px",
    marginBottom: "8px",
  },

  otpTitle: {
    margin: "0 0 8px",
    color: "#1e3a8a",
    fontSize: "20px",
  },

  otpDescription: {
    margin: 0,
    color: "#4b5563",
    fontSize: "13px",
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  },

  otpActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginTop: "-4px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  secondaryButton: {
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    color: "#3730a3",
    padding: "10px 14px",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },

  textButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    padding: "10px 4px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },

  // =========================
  // MESSAGE
  // =========================

  message: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid",
    fontSize: "13px",
    marginBottom: "18px",
    lineHeight: "1.5",
  },

  // =========================
  // BUTTON
  // =========================

  button: {
    width: "100%",
    height: "50px",
    border: "none",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #2563eb, #4f46e5)",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
    boxShadow: "0 8px 18px rgba(37,99,235,0.22)",
    transition: "transform 0.2s ease, opacity 0.2s ease",
  },

  // =========================
  // FOOTER
  // =========================

  footer: {
    marginTop: "25px",
    textAlign: "center",
  },

  footerText: {
    margin: 0,
    fontSize: "14px",
    color: "#6b7280",
  },

  loginLink: {
    marginLeft: "6px",
    color: "#2563eb",
    fontWeight: "600",
    textDecoration: "none",
  },

  // =========================
  // SECURITY
  // =========================

  security: {
    marginTop: "25px",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
    textAlign: "center",
    fontSize: "12px",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
};

export default Signup;