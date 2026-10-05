import { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { CartDrawer } from "./components/CartDrawer";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SellMedicine from "./pages/SellMedicine";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import MedicineDetails from "./pages/MedicineDetails";
import AdminDashboard from "./pages/AdminDashboard";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CepProofs from "./pages/CepProofs";
import NgoRequests from "./pages/NgoRequests";
import DisposalGuide from "./pages/DisposalGuide";
import PartnerDashboard from "./pages/PartnerDashboard";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";

import { FEATURES } from "./config/features";

// Scroll to top helper on route navigation
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col bg-canvas text-ink font-sans">
            <ScrollToTop />
            <Navbar />

            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/buy" element={<Navigate to="/partner" replace />} />
                <Route path="/medicine/:id" element={<MedicineDetails />} />
                <Route path="/cep-proofs" element={<CepProofs />} />
                <Route path="/ngo-requests" element={<NgoRequests />} />
                <Route path="/disposal-guide" element={<DisposalGuide />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />

                {/* Protected Routes */}
                <Route
                  path="/sell"
                  element={
                    <ProtectedRoute>
                      <SellMedicine />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/donor-dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/partner"
                  element={
                    <ProtectedRoute partnerOnly>
                      <PartnerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ngo-dashboard"
                  element={
                    <ProtectedRoute partnerOnly>
                      <PartnerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>

            {FEATURES.ENABLE_COMMERCIAL_MARKETPLACE && <CartDrawer />}
            <Footer />
          </div>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}