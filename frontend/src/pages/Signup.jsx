import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import { Button } from "../components/common/Button";
import {
  PillIcon,
  PackageIcon,
  HeartIcon,
  MapPinIcon,
  InfoIcon,
} from "../components/common/Icons";

const PUNE_LOCALITIES = [
  "Katraj",
  "Kothrud",
  "Hadapsar",
  "Hinjewadi",
  "Baner",
  "Viman Nagar",
  "Swargate",
  "Wakad",
  "Shivajinagar",
  "Aundh",
  "Bibwewadi",
  "Dhankawadi",
  "Kalyani Nagar",
  "Pimpri",
  "Chinchwad",
  "Other Pune Locality",
];

const ORGANIZATION_TYPES = [
  "NGO",
  "Charitable Clinic",
  "Community Health Center",
  "Old Age Home",
  "Pharmacy",
  "Other",
];

export default function Signup() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") === "partner" ? "partner" : "user";
  
  const [selectedRole, setSelectedRole] = useState(initialRole); // 'user' (donor) or 'partner' (ngo/clinic)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    locality: "Katraj",
    address: "",
    password: "",
    confirmPassword: "",
    // Partner-specific fields
    organizationName: "",
    organizationType: "NGO",
    termsAgreed: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setErrorMessage("");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      showToast("Password must be at least 6 characters long.", "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      showToast("Passwords do not match.", "error");
      return;
    }

    if (selectedRole === "partner" && !formData.organizationName.trim()) {
      setErrorMessage("Please provide your NGO or Clinic organization name.");
      showToast("Organization name is required for partner clinics.", "error");
      return;
    }

    if (!formData.termsAgreed) {
      setErrorMessage("Please agree to the MEDISAVE Verification Guidelines and Terms.");
      showToast("Please agree to the platform guidelines.", "error");
      return;
    }

    setIsLoading(true);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      locality: formData.locality,
      role: selectedRole,
      organizationName: selectedRole === "partner" ? formData.organizationName.trim() : "",
      organizationType: selectedRole === "partner" ? formData.organizationType : "",
    };

    const result = await signup(payload);

    setIsLoading(false);

    if (result.success) {
      if (selectedRole === "partner" || result.user?.role === "partner") {
        showToast("Partner account registered & submitted for verification!", "success");
        navigate("/partner");
      } else {
        showToast("Donor account created! Welcome to MEDISAVE.", "success");
        navigate("/dashboard");
      }
    } else {
      setErrorMessage(result.message || "Registration failed.");
      showToast(result.message || "Registration failed.", "error");
    }
  };

  return (
    <div className="min-h-[90vh] bg-canvas flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl border border-line shadow-sm max-w-xl w-full p-6 sm:p-10 text-left space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center mx-auto shadow-xs">
            <PillIcon className="w-6 h-6 transform -rotate-45 text-success-line" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Join MEDISAVE
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto">
            100% Free Verified Community Medicine Donation & Expiry Awareness Platform
          </p>
        </div>

        {/* Dedicated 2-Party Selection (Donor vs NGO/Clinic) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-ink uppercase tracking-wider text-center sm:text-left">
            Select Your Account Type:
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Party 1: Donor */}
            <button
              type="button"
              onClick={() => handleRoleSelect("user")}
              className={`p-4 rounded-xl border-2 transition text-left flex flex-col justify-between cursor-pointer ${
                selectedRole === "user"
                  ? "border-brand bg-brand-tint/60 shadow-2xs"
                  : "border-line bg-surface-alt hover:bg-white hover:border-line-strong"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedRole === "user" ? "bg-brand text-white" : "bg-sunken text-ink-subtle"
                  }`}>
                    <HeartIcon className="w-4 h-4" />
                  </div>
                  {selectedRole === "user" && (
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand"></span>
                  )}
                </div>
                <div className="font-bold text-sm text-ink pt-2 leading-tight">Community Donor</div>
              </div>
              <p className="text-xs text-ink-muted mt-1 leading-snug">
                Donate surplus unexpired medicines & track household cabinet
              </p>
            </button>

            {/* Party 2: NGO / Partner Clinic */}
            <button
              type="button"
              onClick={() => handleRoleSelect("partner")}
              className={`p-4 rounded-xl border-2 transition text-left flex flex-col justify-between cursor-pointer ${
                selectedRole === "partner"
                  ? "border-success bg-success-tint/60 shadow-2xs"
                  : "border-line bg-surface-alt hover:bg-white hover:border-line-strong"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedRole === "partner" ? "bg-success text-white" : "bg-sunken text-ink-subtle"
                  }`}>
                    <PackageIcon className="w-4 h-4" />
                  </div>
                  {selectedRole === "partner" && (
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-success"></span>
                  )}
                </div>
                <div className="font-bold text-sm text-ink pt-2 leading-tight">NGO / Partner Clinic</div>
              </div>
              <p className="text-xs text-ink-muted mt-1 leading-snug">
                Claim nearby donations, inspect packages & verify 6-digit OTPs
              </p>
            </button>
          </div>
        </div>

        {/* Role Explanation Notice Pill */}
        <div className="bg-surface-alt p-3.5 rounded-xl border border-line text-xs flex items-start gap-2.5">
          <InfoIcon className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <div className="text-ink-muted text-xs leading-relaxed">
            {selectedRole === "user" ? (
              <span>
                <strong>Donor Account:</strong> Enables 100% free surplus medicine listings, 6-digit physical handover code generation, prescription uploads, and domestic cabinet shelf-life monitoring.
              </span>
            ) : (
              <span>
                <strong>NGO / Partner Account:</strong> For accredited charitable clinics, NGOs, and dispensaries. Discover nearby donations via Haversine distance and complete handovers via 6-digit OTP verification.
              </span>
            )}
          </div>
        </div>

        {/* Inline Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-danger-tint border border-danger-line rounded-xl text-xs text-danger font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          {/* Common Field: Full Name / Representative Name */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              {selectedRole === "partner" ? "Representative Full Name" : "Full Legal Name"}{" "}
              <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={selectedRole === "partner" ? "e.g. Dr. Vikas Rao" : "e.g. Rohit Deshmukh"}
              required
              className="w-full bg-canvas border border-line rounded-lg px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
            />
          </div>

          {/* Partner-Specific Fields: Organization Name & Type */}
          {selectedRole === "partner" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-success-tint/40 p-3.5 rounded-xl border border-success-line">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Organization / Clinic Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder="e.g. Pune Community Care Clinic"
                  required={selectedRole === "partner"}
                  className="w-full bg-white border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Organization Type <span className="text-danger">*</span>
                </label>
                <select
                  name="organizationType"
                  value={formData.organizationType}
                  onChange={handleChange}
                  className="w-full bg-white border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand transition"
                >
                  {ORGANIZATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {selectedRole === "partner" ? "Official Org Email" : "Email Address"}{" "}
                <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={selectedRole === "partner" ? "clinic@medisave.org" : "donor@example.com"}
                required
                className="w-full bg-canvas border border-line rounded-lg px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98230 44556"
                className="w-full bg-canvas border border-line rounded-lg px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
              />
            </div>
          </div>

          {/* Locality Dropdown & Street Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Pune Locality <span className="text-danger">*</span>
              </label>
              <select
                name="locality"
                value={formData.locality}
                onChange={handleChange}
                className="w-full bg-canvas border border-line rounded-lg px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
              >
                {PUNE_LOCALITIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {selectedRole === "partner" ? "Dispensary / Clinic Address" : "Handover Landmark / Area"}
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder={selectedRole === "partner" ? "Near Katraj Chowk, Pune" : "Near Vanaz Metro Station"}
                className="w-full bg-canvas border border-line rounded-lg px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
              />
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Password <span className="text-danger">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                required
                className="w-full bg-canvas border border-line rounded-lg px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Confirm Password <span className="text-danger">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                required
                className="w-full bg-canvas border border-line rounded-lg px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-line text-brand focus:ring-brand w-3.5 h-3.5"
              />
              <span className="text-ink-muted text-[11px]">Show Password</span>
            </label>
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 text-xs text-ink-muted cursor-pointer select-none">
              <input
                type="checkbox"
                name="termsAgreed"
                checked={formData.termsAgreed}
                onChange={handleChange}
                required
                className="mt-0.5 rounded border-line text-brand focus:ring-brand w-4 h-4 shrink-0"
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" className="text-brand font-semibold underline">
                  MEDISAVE Verification Guidelines
                </Link>
                , confirming that all medicines listed or accepted are for 100% free non-commercial redistribution with intact packaging.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isLoading}
            className="w-full justify-center shadow-xs text-xs sm:text-sm font-bold mt-2"
          >
            {isLoading
              ? "Creating Account..."
              : selectedRole === "partner"
              ? "Register NGO / Partner Clinic"
              : "Create Community Donor Account"}
          </Button>
        </form>

        {/* Footer Navigation */}
        <div className="text-center pt-4 border-t border-line text-xs text-ink-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-brand font-bold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}