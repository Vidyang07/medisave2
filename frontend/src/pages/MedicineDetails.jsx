import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import { Breadcrumb } from "../components/common/Breadcrumb";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import MedicineCard from "../components/MedicineCard";
import {
  ShieldCheckIcon,
  ClockIcon,
  PackageIcon,
  AlertCircleIcon,
  CheckIcon,
  FileTextIcon,
  MapPinIcon,
} from "../components/common/Icons";

export default function MedicineDetails() {
  const { id } = useParams();

  const [medicine, setMedicine] = useState(null);
  const [relatedMedicines, setRelatedMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("info"); // 'info', 'donor', 'safety'

  useEffect(() => {
    let isMounted = true;

    api
      .get(`/medicines/${id}`)
      .then((res) => {
        if (isMounted) {
          if (res.data?.success && res.data?.data) {
            const med = res.data.data;
            setMedicine(med);

            // Fetch related medicines in same category
            if (med.category) {
              api
                .get("/medicines", { params: { category: med.category, limit: 4 } })
                .then((relRes) => {
                  if (isMounted && relRes.data?.success) {
                    const filtered = (relRes.data.data || []).filter(
                      (m) => (m._id || m.id) !== (med._id || med.id)
                    );
                    setRelatedMedicines(filtered.slice(0, 4));
                  }
                })
                .catch(() => {});
            }
          } else {
            setError("Medicine not found");
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || "Medicine listing not found");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-canvas flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-ink-subtle">
            Loading medicine specifications...
          </span>
        </div>
      </div>
    );
  }

  if (error || !medicine) {
    return (
      <div className="min-h-[70vh] bg-canvas flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-xl border border-line p-8 max-w-md text-center shadow-2xs">
          <div className="w-12 h-12 bg-danger-tint text-danger rounded-full flex items-center justify-center mx-auto mb-3.5 border border-danger-line">
            <AlertCircleIcon className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-ink mb-1.5">
            Donation Listing Not Found
          </h2>
          <p className="text-xs text-ink-muted mb-5 leading-relaxed">
            The requested medicine donation may have been fulfilled, expired, or relocated within the community network.
          </p>
          <Link to="/">
            <Button variant="primary" size="md">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const title = medicine.brandName || medicine.medicineName || medicine.name || "Medicine";
  const generic = medicine.genericName || medicine.medicineName || medicine.name;
  const availableQty = medicine.quantity || 1;
  const unit = medicine.unit || "pack(s)";
  const image = medicine.image || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80";
  const sellerName = medicine.seller?.name || "Community Donor";
  const sellerLocation = medicine.seller?.address || medicine.seller?.location || "Pune, Maharashtra";
  const expiryDisplay = medicine.expiryText || (medicine.expiryDate ? new Date(medicine.expiryDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Valid");

  return (
    <div className="min-h-screen bg-canvas py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Partner Portal", to: "/partner" },
            { label: title },
          ]}
        />

        {/* Main Product Showcase Box */}
        <div className="bg-white rounded-xl border border-line shadow-2xs overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 p-6 sm:p-8">
            {/* Left Column: Product Photography & Packaging Badges (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-canvas border border-line aspect-4/3">
                <img
                  src={image}
                  alt={title}
                  className="w-full h-full object-cover"
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                  <Badge variant="verified" size="md">
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-brand" />
                    Verified Genuine Pack
                  </Badge>
                  {medicine.isPrescriptionRequired && (
                    <Badge variant="prescription" size="sm">
                      Prescription (Rx) Required
                    </Badge>
                  )}
                </div>

                <div className="absolute bottom-3 right-3">
                  <span className="inline-flex items-center gap-1.5 bg-ink/85 backdrop-blur-2xs text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                    <ClockIcon className="w-3.5 h-3.5 text-success-line" />
                    Expiry: {expiryDisplay}
                  </span>
                </div>
              </div>

              {/* Physical Condition Callout Box */}
              <div className="bg-surface-alt rounded-lg p-3.5 border border-line space-y-1.5 text-xs text-left">
                <div className="flex items-center justify-between text-ink font-semibold">
                  <span className="flex items-center gap-1.5">
                    <PackageIcon className="w-4 h-4 text-brand" />
                    Packaging Condition:
                  </span>
                  <span className="text-success font-bold bg-success-tint px-2 py-0.5 rounded border border-success-line">
                    {medicine.packageCondition || "Intact Sealed Blister Pack"}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted leading-normal">
                  Verified undamaged manufacturer blister foil and tamper seal integrity.
                </p>
              </div>
            </div>

            {/* Right Column: Specification & Action Controls (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-5 text-left">
              <div>
                {/* Category & Manufacturer Tag */}
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" size="sm">
                    {medicine.category}
                  </Badge>
                  {medicine.dosageForm && (
                    <span className="text-xs text-ink-subtle font-medium">
                      • {medicine.dosageForm}
                    </span>
                  )}
                </div>

                {/* Primary Brand Name & Generic Formulation */}
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-ink tracking-tight leading-snug">
                  {title}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-ink-muted mt-1">
                  Active Formula: <span className="text-ink font-semibold">{generic}</span>
                </p>
                <p className="text-xs text-ink-subtle mt-0.5">
                  Manufactured by <strong className="text-ink-muted">{medicine.company}</strong>
                </p>

                {/* 100% FREE COMMUNITY DONATION SHOWCASE CARD */}
                <div className="mt-5 p-4 rounded-xl bg-brand-tint border border-brand-line flex items-center justify-between">
                  <div>
                    <span className="text-lg sm:text-xl font-extrabold text-brand flex items-center gap-1.5">
                      🎁 100% Free Donation
                    </span>
                    <span className="text-xs text-ink-muted block mt-0.5">
                      Verified community surplus medicine for non-profit redistribution
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="inline-block bg-brand text-success-line font-bold text-xs px-2.5 py-1 rounded-md">
                      {availableQty} {unit} Available
                    </span>
                  </div>
                </div>

                {/* COMMUNITY HANDOVER SPECIFICATION CARD */}
                <div className="mt-4 p-4 rounded-xl bg-surface-alt border border-line space-y-2.5 text-xs text-left">
                  <div className="flex items-center justify-between">
                    <strong className="text-ink font-bold flex items-center gap-1.5">
                      <MapPinIcon className="w-4 h-4 text-brand" />
                      Community Handover Point:
                    </strong>
                    <span className="font-semibold text-brand bg-brand-tint px-2 py-0.5 rounded border border-brand-line">
                      {medicine.locality || "Pune"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-ink-muted bg-white p-2.5 rounded-lg border border-line">
                    <div>
                      <span className="text-ink-subtle block">Designated Landmark:</span>
                      <strong className="text-ink">{medicine.handoverPoint || "Mutually agreed public landmark"}</strong>
                    </div>
                    <div>
                      <span className="text-ink-subtle block">Locality & PIN:</span>
                      <strong className="text-ink">{medicine.locality || "Pune"} {medicine.pinCode ? `(${medicine.pinCode})` : ""}</strong>
                    </div>
                  </div>

                  <p className="text-[10px] text-ink-subtle leading-relaxed italic border-t border-line-soft pt-1.5">
                    💡 <em>MEDISAVE coordinates physical medicine handovers using 6-digit verification codes. Verified non-profit partners and coordinators accept and inspect donations in person.</em>
                  </p>
                </div>

                {/* Key Technical Highlights Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 text-xs">
                  <div className="p-2.5 bg-surface-alt rounded-lg border border-line">
                    <span className="text-ink-subtle block text-[11px]">Strength</span>
                    <span className="font-bold text-ink font-mono text-xs">
                      {medicine.strength || "Standard"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-surface-alt rounded-lg border border-line">
                    <span className="text-ink-subtle block text-[11px]">Batch Number</span>
                    <span className="font-bold text-ink font-mono text-xs">
                      {medicine.batchNumber || "VERIFIED"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-surface-alt rounded-lg border border-line">
                    <span className="text-ink-subtle block text-[11px]">Target Beneficiary</span>
                    <span className="font-bold text-success text-xs">
                      {medicine.targetBeneficiary || "General Community"}
                    </span>
                  </div>
                </div>

                {/* Storage Instructions Callout */}
                <div className="mt-3.5 flex items-start gap-2 p-2.5 bg-canvas rounded-lg border border-line text-xs text-ink-muted">
                  <FileTextIcon className="w-4 h-4 text-ink-subtle shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-ink">Storage Guideline:</strong>{" "}
                    {medicine.storageCondition || "Store in cool, dry place away from sunlight (<25°C)"}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-line space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/partner"
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      ← Back to Partner Portal
                    </Button>
                  </Link>
                  <Link
                    to="/partner"
                    className="flex-1"
                  >
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full bg-brand hover:bg-brand-strong"
                    >
                      <ShieldCheckIcon className="w-4 h-4 text-success-line" />
                      Partner Redistribution Portal
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed In-Depth Information Section */}
          <div className="border-t border-line bg-surface-alt">
            {/* Tabs Header */}
            <div className="flex border-b border-line px-6 sm:px-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab("info")}
                className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === "info"
                    ? "border-brand text-brand bg-white"
                    : "border-transparent text-ink-subtle hover:text-ink"
                }`}
              >
                Medicine Information
              </button>
              <button
                onClick={() => setActiveTab("donor")}
                className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === "donor"
                    ? "border-brand text-brand bg-white"
                    : "border-transparent text-ink-subtle hover:text-ink"
                }`}
              >
                Donor & Verification
              </button>
              <button
                onClick={() => setActiveTab("safety")}
                className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === "safety"
                    ? "border-brand text-brand bg-white"
                    : "border-transparent text-ink-subtle hover:text-ink"
                }`}
              >
                Safety Compliance
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 sm:p-8 bg-white text-xs sm:text-sm text-ink-muted leading-relaxed">
              {activeTab === "info" && (
                <div className="space-y-3.5 max-w-3xl text-left">
                  <h3 className="text-sm sm:text-base font-bold text-ink">
                    Therapeutic & Formulation Details
                  </h3>
                  <p>{medicine.description || "Verified unexpired medication in undamaged sealed packaging."}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-surface-alt rounded-lg border border-line">
                      <span className="text-[11px] text-ink-subtle block font-medium">Active Ingredients:</span>
                      <span className="font-bold text-ink text-xs">{generic}</span>
                    </div>
                    <div className="p-3 bg-surface-alt rounded-lg border border-line">
                      <span className="text-[11px] text-ink-subtle block font-medium">Manufacturer:</span>
                      <span className="font-bold text-ink text-xs">{medicine.company}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "donor" && (
                <div className="space-y-3.5 max-w-3xl text-left">
                  <h3 className="text-sm sm:text-base font-bold text-ink">
                    Community Donor Profile
                  </h3>
                  <div className="flex items-center gap-3.5 p-3.5 bg-surface-alt rounded-lg border border-line">
                    <div className="w-10 h-10 rounded-full bg-brand text-success-line flex items-center justify-center font-bold text-sm">
                      {sellerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-ink text-sm">
                          {sellerName}
                        </h4>
                        <Badge variant="verified" size="sm">
                          Verified Community Donor
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-subtle mt-0.5">
                        Location: {sellerLocation}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-ink-subtle">
                    Listing reviewed and cleared for community exchange following coordinator review of packaging integrity and expiry parameters.
                  </p>
                </div>
              )}

              {activeTab === "safety" && (
                <div className="space-y-3.5 max-w-3xl text-left">
                  <h3 className="text-sm sm:text-base font-bold text-ink">
                    MEDISAVE Quality & Handling Protocols
                  </h3>
                  <ul className="space-y-2 text-xs text-ink-muted">
                    <li className="flex items-start gap-2">
                      <CheckIcon className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <span><strong>Minimum Expiry Window:</strong> All medicines listed on MEDISAVE have a minimum 90-day safety buffer remaining before expiry.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckIcon className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <span><strong>Sealed Packaging Standard:</strong> Opened bottles, cut blister packs, and broken tamper seals are strictly rejected.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckIcon className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <span><strong>Physical Handover Verification:</strong> Donations are accepted in person using secure 6-digit OTP confirmation to prevent unauthorized redistribution.</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Medicines Grid */}
        {relatedMedicines.length > 0 && (
          <div className="mt-12 text-left space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-ink">
              Other donations in {medicine.category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {relatedMedicines.map((item) => (
                <MedicineCard key={item._id || item.id} medicine={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}