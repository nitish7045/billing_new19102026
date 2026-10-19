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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(e) {
    e.preventDefault();

    setMessage("");

    // =========================
    // VALIDATE FULL NAME
    // =========================

    if (!fullName.trim()) {
      setMessage("❌ Please enter your full name.");
      return;
    }

    // =========================
    // VALIDATE WHATSAPP NUMBER
    // =========================

    if (!whatsappNumber.trim()) {
      setMessage("❌ Please enter your WhatsApp number.");
      return;
    }

    // =========================
    // VALIDATE PASSWORD
    // =========================

    if (password.length < 6) {
      setMessage(
        "❌ Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        "❌ Password and Confirm Password do not match."
      );
      return;
    }

    setLoading(true);

    try {
      // =========================
      // CREATE AUTH USER
      // =========================

      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,

          options: {
            data: {
              full_name: fullName.trim(),
              phone: whatsappNumber.trim(),
            },
          },
        });

      if (error) {
        setMessage(`❌ ${error.message}`);
        return;
      }

      if (!data.user) {
        setMessage(
          "❌ Account creation failed. Please try again."
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
      console.error("Signup error:", error);

      setMessage(
        "❌ Something went wrong. Please try again."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>

      {/* BACKGROUND DECORATION */}

      <div style={styles.circleOne}></div>

      <div style={styles.circleTwo}></div>


      {/* MAIN CARD */}

      <div style={styles.card}>

        {/* LOGO */}

        <div style={styles.logo}>
          🧾
        </div>


        {/* HEADER */}

        <div style={styles.header}>

          <h1 style={styles.title}>
            Create Account
          </h1>

          <p style={styles.subtitle}>
            Create your Billing App account
          </p>

        </div>


        {/* FORM */}

        <form
          onSubmit={handleSignup}
          style={styles.form}
        >

          {/* FULL NAME */}

          <div style={styles.field}>

            <label style={styles.label}>
              Full Name
            </label>

            <div style={styles.inputWrapper}>

              <span style={styles.inputIcon}>
                👤
              </span>

              <input
                type="text"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                required
                style={styles.input}
                placeholder="Enter your full name"
              />

            </div>

          </div>


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
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
                style={styles.input}
                placeholder="Enter your email address"
              />

            </div>

          </div>


          {/* WHATSAPP */}

          <div style={styles.field}>

            <label style={styles.label}>
              WhatsApp Number
            </label>

            <div style={styles.inputWrapper}>

              <span style={styles.inputIcon}>
                📱
              </span>

              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) =>
                  setWhatsappNumber(e.target.value)
                }
                required
                style={styles.input}
                placeholder="Enter WhatsApp number"
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
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                style={{
                  ...styles.input,
                  paddingRight: "55px",
                }}
                placeholder="Create a password"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                style={styles.eyeButton}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>

            </div>

          </div>


          {/* CONFIRM PASSWORD */}

          <div style={styles.field}>

            <label style={styles.label}>
              Confirm Password
            </label>

            <div style={styles.inputWrapper}>

              <span style={styles.inputIcon}>
                🔐
              </span>

              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                required
                style={{
                  ...styles.input,
                  paddingRight: "55px",
                }}
                placeholder="Confirm your password"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                style={styles.eyeButton}
              >
                {showConfirmPassword
                  ? "🙈"
                  : "👁️"}
              </button>

            </div>

          </div>


          {/* MESSAGE */}

          {message && (

            <div
              style={{
                ...styles.message,
                background:
                  message.includes("❌")
                    ? "#fef2f2"
                    : "#f0fdf4",

                borderColor:
                  message.includes("❌")
                    ? "#fecaca"
                    : "#bbf7d0",

                color:
                  message.includes("❌")
                    ? "#b91c1c"
                    : "#15803d",
              }}
            >
              {message}
            </div>

          )}


          {/* SIGNUP BUTTON */}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,

              opacity:
                loading ? 0.7 : 1,

              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >

            {loading
              ? "Creating Account..."
              : "Create Account"}

          </button>

        </form>


        {/* LOGIN LINK */}

        <div style={styles.footer}>

          <p style={styles.footerText}>

            Already have an account?

            <Link
              to="/login"
              style={styles.loginLink}
            >
              Login
            </Link>

          </p>

        </div>


        {/* SECURITY */}

        <div style={styles.security}>

          <span>
            🔒
          </span>

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

    fontFamily:
      "Inter, Arial, sans-serif",
  },


  // =========================
  // BACKGROUND
  // =========================

  circleOne: {
    position: "absolute",

    width: "450px",

    height: "450px",

    borderRadius: "50%",

    background:
      "rgba(37, 99, 235, 0.10)",

    top: "-180px",

    left: "-180px",
  },


  circleTwo: {
    position: "absolute",

    width: "400px",

    height: "400px",

    borderRadius: "50%",

    background:
      "rgba(99, 102, 241, 0.10)",

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

    boxShadow:
      "0 25px 60px rgba(15, 23, 42, 0.15)",

    border:
      "1px solid rgba(255,255,255,0.8)",

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

    background:
      "linear-gradient(135deg, #2563eb, #4f46e5)",

    boxShadow:
      "0 10px 25px rgba(37,99,235,0.25)",
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

    transition:
      "border 0.2s ease, box-shadow 0.2s ease",
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

    background:
      "linear-gradient(135deg, #2563eb, #4f46e5)",

    color: "white",

    fontSize: "15px",

    fontWeight: "600",

    boxShadow:
      "0 8px 18px rgba(37,99,235,0.22)",

    transition:
      "transform 0.2s ease, opacity 0.2s ease",
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

    borderTop:
      "1px solid #e5e7eb",

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