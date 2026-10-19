import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function AccountSetup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState("");

  // =========================
  // LOAD CURRENT PROFILE
  // =========================

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      navigate("/login", {
        replace: true,
      });
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !profile) {
      navigate("/login", {
        replace: true,
      });
      return;
    }

    // Make sure user is approved
    if (profile.status !== "approved") {
      navigate("/dashboard", {
        replace: true,
      });
      return;
    }

    // If already completed setup
    if (profile.setup_completed) {
      navigate("/dashboard", {
        replace: true,
      });
      return;
    }

    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");

    setPageLoading(false);
  }

  // =========================
  // SAVE ACCOUNT DETAILS
  // =========================

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        setup_completed: true,
      })
      .eq("id", user.id);

    if (error) {
      setMessage(`❌ ${error.message}`);
      setLoading(false);
      return;
    }

    // Go back to dashboard
    navigate("/dashboard", {
      replace: true,
    });
  }

  // =========================
  // LOADING
  // =========================

  if (pageLoading) {
    return (
      <div style={styles.container}>
        <h2>Loading...</h2>
      </div>
    );
  }

  // =========================
  // PAGE
  // =========================

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Complete Your Account Setup</h1>

        <p style={styles.subtitle}>
          Please complete your details to start using
          the Billing App.
        </p>

        <form onSubmit={handleSubmit}>
          {/* FULL NAME */}

          <div style={styles.field}>
            <label>Full Name</label>

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

          {/* PHONE */}

          <div style={styles.field}>
            <label>Phone Number</label>

            <input
              type="tel"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              required
              style={styles.input}
              placeholder="Enter your phone number"
            />
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Saving..."
              : "Complete Setup"}
          </button>
        </form>

        {message && (
          <p style={styles.message}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
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
    padding: "35px",
    borderRadius: "12px",
    boxSizing: "border-box",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
  },

  subtitle: {
    color: "#666",
    marginBottom: "30px",
  },

  field: {
    marginBottom: "20px",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginTop: "6px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    boxSizing: "border-box",
    fontSize: "16px",
  },

  button: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
  },

  message: {
    marginTop: "15px",
  },
};

export default AccountSetup;