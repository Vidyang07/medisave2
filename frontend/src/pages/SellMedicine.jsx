import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { CATEGORIES } from "../data/mockData";
import { useToast } from "../context/useToast";
import { Breadcrumb } from "../components/common/Breadcrumb";
import { Button } from "../components/common/Button";
import {
  ShieldCheckIcon,
  AlertCircleIcon,
  UploadIcon,
  CheckIcon,
  SparklesIcon,
  HeartIcon,
} from "../components/common/Icons";
import { PUNE_LOCALITIES, findLocality } from "../utils/localityConstants";
import { PRICING_CONSTANTS } from "../utils/pricingPolicy";

export default function SellMedicine() {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    brandName: "",
    genericName: "",
    company: "",
    category: "",
    dosageForm: "Tablet",
    strength: "",
    batchNumber: "",
    expiryDate: "",
    quantity: "",
    unit: "Tablets (1 strip)",
    listingType: "free_donation",
    targetBeneficiary: "General Community",
    originalMrp: "50",
    price: "0",
    packageCondition: "Intact Sealed Blister Pack",
    storageCondition: "Stored in cool, dry place (<25°C)",
    isPrescriptionRequired: false,
    storageConfirmed: false,
    description: "",
    locality: "Kothrud",
    pinCode: "411038",
    handoverPoint: "City Pride Kothrud / Vanaz Metro Station",
    handoverRadiusKm: 5,
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [submissionReference, setSubmissionReference] = useState("");
  const [serverError, setServerError] = useState("");

  // AI Assistant States
  const [aiQuery, setAiQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Expiry evaluation
  const expiryCheck = useMemo(() => {
    if (!formData.expiryDate) return { status: "empty", message: "" };
    const expDate = new Date(formData.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        status: "expired",
        message: "Expired medicines cannot be donated. Please refer to our Safe Disposal Guide below.",
      };
    }
    if (diffDays < PRICING_CONSTANTS.MIN_EXPIRY_DAYS) {
      return {
        status: "short",
        message: `Medicine expires in ${diffDays} days. MEDISAVE requires at least ${PRICING_CONSTANTS.MIN_EXPIRY_DAYS} days (3 months) remaining shelf life for community safety.`,
      };
    }
    return {
      status: "valid",
      message: `Safety check passed: ${diffDays} days remaining (${Math.round(diffDays / 30.44)} months shelf life).`,
    };
  }, [formData.expiryDate]);

  const handleAiEstimate = async (medicineTitle, customQuantity = null) => {
    const query = (medicineTitle || aiQuery || formData.brandName || "").trim();
    if (!query) {
      showToast("Please enter a medicine name (e.g. Dolo 650 or Augmentin 625)", "info");
      return;
    }

    setIsAiLoading(true);
    try {
      const res = await api.post("/medicines/ai-suggest", {
        title: query,
        quantity: customQuantity !== null ? customQuantity : formData.quantity || undefined,
        dosageForm: formData.dosageForm,
        category: formData.category,
      });

      if (res.data?.success && res.data.data) {
        const est = res.data.data;
        setAiSuggestion(est);
        setAiQuery(est.brandName || query);

        setFormData((prev) => {
          return {
            ...prev,
            brandName: est.brandName || prev.brandName || query,
            genericName: est.genericName || prev.genericName,
            company: est.company || prev.company,
            category: est.category || prev.category,
            dosageForm: est.dosageForm || prev.dosageForm,
            strength: est.strength || prev.strength,
            quantity: est.quantity !== undefined ? est.quantity : prev.quantity || 10,
            unit: est.unit || prev.unit,
            originalMrp: est.originalMrp ? String(est.originalMrp) : prev.originalMrp || "50",
            price: "0",
            isPrescriptionRequired:
              est.isPrescriptionRequired !== undefined
                ? est.isPrescriptionRequired
                : prev.isPrescriptionRequired,
            packageCondition: est.packageCondition || prev.packageCondition,
            storageCondition: est.storageCondition || prev.storageCondition,
            description: est.description || prev.description,
          };
        });

        showToast(
          `✨ AI identified ${est.brandName || query}! Verified packaging details auto-filled.`,
          "success"
        );
      } else {
        showToast(res.data?.message || "Could not retrieve AI estimation.", "error");
      }
    } catch (err) {
      console.error("AI Estimate Error:", err);
      showToast(
        err.response?.data?.message || "Failed to connect to AI assistant engine.",
        "error"
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    if (name === "locality") {
      const locInfo = findLocality(val);
      setFormData((prev) => ({
        ...prev,
        locality: val,
        pinCode: locInfo ? locInfo.pinCode : prev.pinCode,
        handoverPoint: locInfo ? locInfo.defaultHandover : prev.handoverPoint,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image file size must be less than 5 MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!formData.storageConfirmed) {
      showToast("Please confirm that the medicine was stored in appropriate temperature conditions.", "error");
      return;
    }

    if (expiryCheck.status === "expired") {
      showToast("Cannot submit expired medicines. Please consult the Safe Disposal Guide.", "error");
      return;
    }

    if (expiryCheck.status === "short") {
      showToast(expiryCheck.message, "error");
      return;
    }

    if (
      !formData.brandName ||
      !formData.company ||
      !formData.category ||
      !formData.quantity ||
      !formData.expiryDate ||
      !formData.locality
    ) {
      showToast("Please fill all required fields including locality and handover point.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        medicineName: formData.brandName || formData.genericName,
        brandName: formData.brandName,
        genericName: formData.genericName,
        company: formData.company,
        category: formData.category,
        dosageForm: formData.dosageForm,
        strength: formData.strength,
        batchNumber: formData.batchNumber || "UNSPECIFIED",
        expiryDate: formData.expiryDate,
        quantity: Number(formData.quantity) || 1,
        unit: formData.unit,
        price: 0,
        originalMrp: Number(formData.originalMrp) || 50,
        packageCondition: formData.packageCondition,
        storageCondition: formData.storageCondition,
        isPrescriptionRequired: Boolean(formData.isPrescriptionRequired),
        description: formData.description,
        locality: formData.locality,
        pinCode: formData.pinCode,
        handoverPoint: formData.handoverPoint,
        handoverRadiusKm: Number(formData.handoverRadiusKm) || 5,
        listingType: "free_donation",
        targetBeneficiary: formData.targetBeneficiary || "General Community",
        pricingRationale: "100% Free Community Donation",
        suggestedCommunityPrice: 0,
        image: imagePreview || undefined,
      };

      const res = await api.post("/medicines", payload);

      if (res.data?.success) {
        const createdMed = res.data.data;
        const refCode = createdMed._id
          ? `#DON-${createdMed._id.slice(-6).toUpperCase()}`
          : `#DON-${Math.floor(1000 + Math.random() * 9000)}`;
        setSubmissionReference(refCode);
        setIsSubmittedSuccess(true);
        showToast("Medicine donation published successfully!", "success");
      } else {
        const msg = res.data?.message || "Failed to submit medicine donation.";
        setServerError(msg);
        showToast(msg, "error");
      }
    } catch (error) {
      const msg =
        error.response?.data?.message || "Server error while submitting medicine donation.";
      setServerError(msg);
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmittedSuccess) {
    return (
      <div className="min-h-[75vh] bg-canvas flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl border border-line p-8 sm:p-10 max-w-lg w-full text-center shadow-sm space-y-6">
          <div className="w-16 h-16 bg-brand-tint text-brand rounded-full flex items-center justify-center mx-auto">
            <CheckIcon className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-ink tracking-tight">
              Medicine Donation Submitted Successfully!
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-md mx-auto">
              Thank you for contributing to MEDISAVE. Your medicine donation for{" "}
              <strong className="text-ink">{formData.brandName || "Medicine"}</strong> is
              now listed and available for accredited partner clinics and community health centers in{" "}
              <strong>{formData.locality}</strong> to claim.
            </p>
          </div>

          <div className="bg-surface-alt rounded-xl p-4 text-xs text-left text-ink-muted border border-line space-y-2.5">
            <div className="flex justify-between">
              <span className="text-ink-subtle">Donation Reference:</span>
              <span className="font-mono font-bold text-ink">{submissionReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-subtle">Locality & PIN:</span>
              <span className="font-medium text-ink">
                {formData.locality} ({formData.pinCode})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-subtle">Designated Handover:</span>
              <span className="font-medium text-ink truncate max-w-[200px]">
                {formData.handoverPoint}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-subtle">Status:</span>
              <span className="font-bold text-success bg-success-tint px-2 py-0.5 rounded border border-success-line">
                Available for NGO Partner Claim
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link to="/dashboard" className="flex-1">
              <Button variant="primary" size="md" className="w-full">
                View My Donations
              </Button>
            </Link>
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => {
                setIsSubmittedSuccess(false);
                setFormData({
                  brandName: "",
                  genericName: "",
                  company: "",
                  category: "",
                  dosageForm: "Tablet",
                  strength: "",
                  batchNumber: "",
                  expiryDate: "",
                  quantity: "",
                  unit: "Tablets (1 strip)",
                  listingType: "free_donation",
                  targetBeneficiary: "General Community",
                  originalMrp: "50",
                  price: "0",
                  packageCondition: "Intact Sealed Blister Pack",
                  storageCondition: "Stored in cool, dry place (<25°C)",
                  isPrescriptionRequired: false,
                  storageConfirmed: false,
                  description: "",
                  locality: "Kothrud",
                  pinCode: "411038",
                  handoverPoint: "City Pride Kothrud / Vanaz Metro Station",
                  handoverRadiusKm: 5,
                });
                setImagePreview(null);
                setAiSuggestion(null);
              }}
            >
              Donate Another Medicine
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Header */}
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Donate Medicine" }]} />

        {/* Page Title */}
        <div className="max-w-3xl text-left">
          <span className="text-xs font-bold text-brand uppercase tracking-wider">
            MEDISAVE Community Medicine Intake · Pune
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
            Donate unexpired surplus medicine
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1.5 leading-relaxed">
            Redirect eligible unexpired medications to accredited community health desks, senior care centers, and NGO clinics in Pune. Every donation is 100% free and directly connectable with local verified partners.
          </p>
        </div>

        {/* Two-Column Form Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Multi-Section Donation Form (8 cols) */}
          <main className="lg:col-span-8 bg-white rounded-2xl border border-line p-6 sm:p-8 text-left space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {serverError && (
                <div className="p-3.5 bg-danger-tint border border-danger-line rounded-xl text-xs text-danger font-medium flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 shrink-0 text-danger" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* AI SMART AUTO-FILL BANNER */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand/10 via-brand/5 to-emerald-500/10 border border-brand/20 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center shadow-xs">
                      <SparklesIcon className="w-5 h-5 text-warning-line" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-ink">
                          AI Medicine Intake Assistant
                        </h2>
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-brand text-white">
                          Auto-Fill Helper
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">
                        Type any medicine name — AI assists with active salt formula, manufacturer, and standard packaging details.
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Search & Trigger Input Bar */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAiEstimate(aiQuery);
                        }
                      }}
                      placeholder="Enter medicine name (e.g. Dolo 650, Augmentin 625, Pan-D, Shelcal)..."
                      className="w-full bg-white border border-brand-line rounded-xl pl-3.5 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition shadow-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="shrink-0 flex items-center justify-center gap-2 px-5 font-semibold shadow-xs"
                    onClick={() => handleAiEstimate(aiQuery)}
                    isLoading={isAiLoading}
                  >
                    <SparklesIcon className="w-4 h-4 text-warning-line" />
                    <span>Auto-Fill with AI</span>
                  </Button>
                </div>

                {/* Quick 1-Click Suggestions */}
                <div className="flex items-center flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-ink-subtle">Try quick auto-fill:</span>
                  {["Dolo 650", "Augmentin 625", "Pan-D", "Shelcal 500", "Azee 500", "Cetirizine 10mg"].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setAiQuery(sample);
                        handleAiEstimate(sample);
                      }}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-brand border border-brand/20 hover:border-brand transition shadow-2xs cursor-pointer"
                    >
                      {sample}
                    </button>
                  ))}
                </div>

                {/* AI Suggestion Box */}
                {aiSuggestion && (
                  <div className="mt-3 p-3.5 bg-white rounded-xl border border-brand-line text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-brand">
                        ✨ AI Suggestion: {aiSuggestion.brandName || aiQuery}
                      </span>
                      <span className="text-[10px] text-ink-subtle">
                        {aiSuggestion.company || "Standard Manufacturer"}
                      </span>
                    </div>
                    {aiSuggestion.genericName && (
                      <p className="text-[11px] text-ink-muted">
                        <strong>Active Salt:</strong> {aiSuggestion.genericName}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 1: Medicine Identification */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center font-mono">
                      1
                    </span>
                    <h2 className="font-bold text-ink text-base">
                      Medicine Identification
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Brand / Trade Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="brandName"
                      value={formData.brandName}
                      onChange={handleChange}
                      onBlur={(e) => {
                        if (e.target.value && !formData.genericName) {
                          handleAiEstimate(e.target.value);
                        }
                      }}
                      placeholder="e.g. Dolo 650, Crocin Advance, Augmentin 625"
                      required
                      className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Generic Salt / Active Formula <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="genericName"
                      value={formData.genericName}
                      onChange={handleChange}
                      placeholder="e.g. Paracetamol IP, Amoxicillin + Clavulanic Acid"
                      required
                      className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Manufacturer / Company <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="e.g. Cipla, Sun Pharma, Micro Labs"
                      required
                      className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Therapeutic Category <span className="text-danger">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    >
                      <option value="">Select therapeutic category</option>
                      {CATEGORIES.filter((c) => c !== "All Categories").map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Dosage Form & Strength
                    </label>
                    <input
                      type="text"
                      name="strength"
                      value={formData.strength}
                      onChange={handleChange}
                      placeholder="e.g. Tablet (650mg)"
                      className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Batch & Expiry Information */}
              <div className="space-y-4 pt-4 border-t border-line">
                <div className="flex items-center gap-2 pb-2 border-b border-line">
                  <span className="w-6 h-6 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center font-mono">
                    2
                  </span>
                  <h2 className="font-bold text-ink text-base">
                    Batch & Expiry Guardrails
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Batch Number (Printed on Packaging) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="batchNumber"
                      value={formData.batchNumber}
                      onChange={handleChange}
                      placeholder="e.g. B-9942A or GSK-P2409"
                      required
                      className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    />
                    <span className="text-[11px] text-ink-subtle">
                      Must match printed stamping on physical blister or foil.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Printed Expiry Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      required
                      className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    />
                  </div>
                </div>

                {expiryCheck.message && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-snug flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      expiryCheck.status === "expired"
                        ? "bg-danger-tint border-danger-line text-danger"
                        : expiryCheck.status === "short"
                        ? "bg-warning-tint border-warning-line text-warning"
                        : "bg-success-tint border-success-line text-success"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{expiryCheck.message}</span>
                    </div>
                    {(expiryCheck.status === "expired" || expiryCheck.status === "short") && (
                      <Link
                        to="/disposal-guide"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white hover:bg-brand-strong rounded-lg text-[11px] font-bold shrink-0 transition"
                      >
                        <span>🌱 Safe Disposal Guide</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 3: Physical Package Condition */}
              <div className="space-y-4 pt-4 border-t border-line">
                <div className="flex items-center gap-2 pb-2 border-b border-line">
                  <span className="w-6 h-6 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center font-mono">
                    3
                  </span>
                  <h2 className="font-bold text-ink text-base">
                    Packaging Condition
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Packaging Type & Integrity <span className="text-danger">*</span>
                  </label>
                  <select
                    name="packageCondition"
                    value={formData.packageCondition}
                    onChange={handleChange}
                    required
                    className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                  >
                    <option value="Intact Sealed Blister Pack">
                      Intact Sealed Blister Pack (No tears, punctures, or cut strips)
                    </option>
                    <option value="Factory Sealed Box / Strips">
                      Factory Sealed Box with Intact Security Seal
                    </option>
                    <option value="Hermetically Sealed Foil Sachet">
                      Hermetically Sealed Foil Sachet
                    </option>
                    <option value="Unopened Bottle with Safety Ring">
                      Unopened Bottle with Safety Tamper Ring
                    </option>
                  </select>
                </div>
              </div>

              {/* SECTION 4: Quantity & Purpose */}
              <div className="space-y-4 pt-4 border-t border-line">
                <div className="flex items-center gap-2 pb-2 border-b border-line">
                  <span className="w-6 h-6 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center font-mono">
                    4
                  </span>
                  <h2 className="font-bold text-ink text-base">
                    Quantity & Donation Purpose
                  </h2>
                </div>

                <div className="p-4 rounded-xl bg-brand-tint border border-brand-line space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartIcon className="w-5 h-5 text-brand" />
                      <span className="text-xs font-bold text-brand uppercase tracking-wider">
                        100% Free Community Donation
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-line text-brand-strong">
                      Non-Profit Welfare
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    All medicine donations on MEDISAVE are 100% free for patients in need. We do not support peer-to-peer buying or selling.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Available Units / Strips <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="e.g. 10 (tablets/capsules)"
                      required
                      className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    />
                    <span className="text-[11px] text-ink-subtle mt-1 block">
                      Packaging unit: {formData.unit || "Tablets / Units"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Preferred Target Beneficiary Group
                    </label>
                    <select
                      name="targetBeneficiary"
                      value={formData.targetBeneficiary}
                      onChange={handleChange}
                      className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    >
                      <option value="General Community">General Community (Open Redistribution)</option>
                      <option value="Local Old Age Home">Local Old Age Home (Matoshree Vriddhashram)</option>
                      <option value="Student Health Center">Student Health Desk & Hostel Clinic</option>
                      <option value="Slum Health Camp">Community Outreach Health Camp (Anand Ashram)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Community Handover Point */}
              <div className="space-y-4 pt-4 border-t border-line">
                <div className="flex items-center gap-2 pb-2 border-b border-line">
                  <span className="w-6 h-6 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center font-mono">
                    5
                  </span>
                  <h2 className="font-bold text-ink text-base">
                    Community Handover Point (Pune)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Locality in Pune <span className="text-danger">*</span>
                    </label>
                    <select
                      name="locality"
                      value={formData.locality}
                      onChange={handleChange}
                      required
                      className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    >
                      {PUNE_LOCALITIES.map((loc) => (
                        <option key={loc.name} value={loc.name}>
                          {loc.name} (PIN: {loc.pinCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      PIN Code <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="pinCode"
                      value={formData.pinCode}
                      onChange={handleChange}
                      placeholder="e.g. 411038"
                      required
                      className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Designated Public Handover Landmark <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="handoverPoint"
                    value={formData.handoverPoint}
                    onChange={handleChange}
                    placeholder="e.g. City Pride Kothrud / Vanaz Metro Station / Community Health Desk"
                    required
                    className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                  />
                  <span className="text-[11px] text-ink-subtle mt-1 block">
                    Public landmark where verified NGO clinics or community partners will accept physical handover.
                  </span>
                </div>
              </div>

              {/* SECTION 6: Medical Safety Compliance */}
              <div className="space-y-4 pt-4 border-t border-line">
                <div className="flex items-center gap-2 pb-2 border-b border-line">
                  <span className="w-6 h-6 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center font-mono">
                    6
                  </span>
                  <h2 className="font-bold text-ink text-base">
                    Medical Safety & Storage Certification
                  </h2>
                </div>

                {/* Prescription Required Toggle */}
                <div className="p-4 bg-surface-alt border border-line rounded-xl space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPrescriptionRequired"
                      checked={formData.isPrescriptionRequired}
                      onChange={handleChange}
                      className="accent-brand mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-ink block">
                        Schedule H / Rx Prescription Required
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        Check this box if this medication requires a valid doctor prescription for dispensation.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Storage Certification */}
                <div className="p-4 bg-brand-tint border border-brand-line rounded-xl space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name="storageConfirmed"
                      checked={formData.storageConfirmed}
                      onChange={handleChange}
                      required
                      className="accent-brand mt-0.5"
                    />
                    <span className="text-xs font-medium text-brand-strong leading-snug">
                      I certify that this medicine was stored in a clean, temperature-controlled environment below 25°C and has never been opened, diluted, or exposed to excessive heat or moisture.
                    </span>
                  </label>
                </div>
              </div>

              {/* SECTION 7: Packaging Photo Verification */}
              <div className="space-y-4 pt-4 border-t border-line">
                <div className="flex items-center gap-2 pb-2 border-b border-line">
                  <span className="w-6 h-6 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center font-mono">
                    7
                  </span>
                  <h2 className="font-bold text-ink text-base">
                    Packaging Photo Verification
                  </h2>
                </div>

                <div className="border-2 border-dashed border-line rounded-2xl p-6 text-center hover:border-brand/50 transition bg-surface-alt">
                  {imagePreview ? (
                    <div className="space-y-3">
                      <img
                        src={imagePreview}
                        alt="Uploaded preview"
                        className="w-48 h-36 object-cover rounded-xl mx-auto border border-line shadow-xs"
                      />
                      <div className="flex justify-center gap-3">
                        <label className="text-xs font-bold text-brand hover:underline cursor-pointer">
                          Change Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setImagePreview(null)}
                          className="text-xs font-semibold text-danger hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer">
                      <div className="w-12 h-12 bg-white rounded-full text-brand border border-line flex items-center justify-center mb-2 shadow-xs">
                        <UploadIcon className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-ink">
                        Upload packaging photograph
                      </span>
                      <span className="text-xs text-ink-subtle mt-1 max-w-sm">
                        Ensure batch number, expiry date, and intact packaging seal are visible. (PNG, JPG up to 5 MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* SECTION 8: Additional Notes */}
              <div className="space-y-4 pt-4 border-t border-line">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Donor Notes / Storage Details (Optional)
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="e.g. Surplus from doctor-revised recovery prescription, stored in cool cabinet"
                    className="w-full bg-surface-alt border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-line">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full shadow-sm"
                  isLoading={isSubmitting}
                >
                  Submit Medicine Donation
                </Button>
                <p className="text-[11px] text-ink-subtle text-center mt-2">
                  By submitting, you confirm compliance with MEDISAVE Community Verification Guidelines.
                </p>
              </div>
            </form>
          </main>

          {/* Right Column: Sticky Guidance & Safety Checklist Panel (4 cols) */}
          <aside className="lg:col-span-4 bg-white rounded-2xl border border-line p-6 shadow-xs space-y-6 sticky top-24 text-left">
            <div className="flex items-center gap-2 pb-3 border-b border-line">
              <ShieldCheckIcon className="w-5 h-5 text-brand" />
              <h2 className="font-bold text-ink text-sm">
                Donation Guidelines
              </h2>
            </div>

            <div className="space-y-3.5 text-xs text-ink-muted">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-brand-tint text-brand flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-ink block">100% Free Community Donation</strong>
                  Donated medicines are distributed to non-profit partners and clinics without charges.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-brand-tint text-brand flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-ink block">Minimum 90-Day Expiry Buffer</strong>
                  Must have at least 90 days remaining shelf life from today before expiration.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-brand-tint text-brand flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-ink block">Intact Blister / Foil Seal</strong>
                  No cut strips, punctured foil bubbles, or broken tamper seals are accepted.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-brand-tint text-brand flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-ink block">Physical Handover Verification</strong>
                  Partner clinic contacts you and confirms physical handover using your 6-digit verification code.
                </div>
              </div>
            </div>

            {/* Prohibited Items Warning */}
            <div className="p-4 bg-danger-tint/80 rounded-xl border border-danger-line text-xs text-danger space-y-1.5">
              <strong className="flex items-center gap-1 font-bold text-danger">
                <AlertCircleIcon className="w-4 h-4 text-danger" />
                Strictly Prohibited Items:
              </strong>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-danger/90 pl-1">
                <li>Opened liquid syrups or reconstituted suspensions</li>
                <li>Biologics requiring strict cold-chain (e.g. Insulin)</li>
                <li>Schedule X psychotropics and narcotics</li>
                <li>Loose, cut, or unlabelled individual tablets</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}