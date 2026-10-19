import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminLogin from "./pages/AdminLogin";
import PendingApproval from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* DEFAULT */}

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* USER AUTHENTICATION */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        {/* ADMIN LOGIN */}

        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />

        {/* OPTIONAL OLD PENDING PAGE */}

        <Route
          path="/pending-approval"
          element={<PendingApproval />}
        />

        {/* USER DASHBOARD */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* ADMIN DASHBOARD */}

        <Route
          path="/admin-dashboard"
          element={<AdminDashboard />}
        />

        {/* UNKNOWN URL */}

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;