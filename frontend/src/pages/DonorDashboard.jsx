import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import { Breadcrumb } from "../components/common/Breadcrumb";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { Modal } from "../components/common/Modal";
import {
  PackageIcon,
  ShieldCheckIcon,
  ClockIcon,
  PlusIcon,
  CheckIcon,
  TrashIcon,
  FileTextIcon,
  UploadIcon,
  MapPinIcon,
  LockIcon,
  HeartIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "../components/common/Icons";

export default function DonorDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const currentUser = user || {
    name: "Community Donor",
    email: "donor@medisave.org",
    address: "Kothrud, Pune",
    role: "user",
    avatar: "",
  };

  const initialTab = searchParams.get("tab") || "donations";
  const [activeTab, setActiveTab] = useState(initialTab); // 'donations', 'cabinet', 'prescriptions'
  const [listingFilter, setListingFilter] = useState("all");

  // Listings / Donations State
  const [listings, setListings] = useState([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Prescriptions State
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(true);
  const [isUploadRxModalOpen, setIsUploadRxModalOpen] = useState(false);
  const [isUploadingRx, setIsUploadingRx] = useState(false);
  const [rxFormData, setRxFormData] = useState({
    patientName: "",
    doctorName: "",
    doctorRegistrationNumber: "",
    prescribedSalts: "",
  });
  const [rxFile, setRxFile] = useState(null);
  const [previewRx, setPreviewRx] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);

  // Household Medicine Cabinet State with Expiry Calculation
  const [cabinetItems, setCabinetItems] = useState(() => {
    try {
      const saved = localStorage.getItem("medisave_cabinet_items");
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    const today = new Date();
    const addDays = (d) => {
      const target = new Date(today.getTime() + d * 86400000);
      return target.toISOString().split("T")[0];
    };

    return [
      {
        id: "cab-1",
        name: "Dolo 650 (Paracetamol)",
        quantity: 15,
        unit: "tablets",
        expiryDate: addDays(240), // >6 months: Green
        category: "Pain & Fever",
        form: "Tablet",
      },
      {
        id: "cab-2",
        name: "Cetirizine 10mg",
        quantity: 10,
        unit: "tablets",
        expiryDate: addDays(120), // 3-6 months: Amber
        category: "Respiratory & Allergy",
        form: "Tablet",
      },
      {
        id: "cab-3",
        name: "Amoxicillin 500mg",
        quantity: 6,
        unit: "capsules",
        expiryDate: addDays(40), // <3 months: Red
        category: "Antibiotics",
        form: "Capsule",
      },
    ];
  });

  const [isAddCabinetModalOpen, setIsAddCabinetModalOpen] = useState(false);
  const [cabinetFormData, setCabinetFormData] = useState({
    name: "",
    quantity: 10,
    unit: "tablets",
    expiryDate: "",
    category: "Pain & Fever",
    form: "Tablet",
  });

  useEffect(() => {
    try {
      localStorage.setItem("medisave_cabinet_items", JSON.stringify(cabinetItems));
    } catch {
      // Ignore storage errors
    }
  }, [cabinetItems]);

  const fetchListings = () => {
    setIsLoadingListings(true);
    api
      .get("/medicines/my-listings")
      .then((res) => {
        if (res.data?.success) {
          setListings(res.data.data || []);
        }
        setIsLoadingListings(false);
      })
      .catch((err) => {
        console.warn("Failed to fetch user listings:", err.message);
        setIsLoadingListings(false);
      });
  };

  const fetchPrescriptions = () => {
    setIsLoadingPrescriptions(true);
    api
      .get("/prescriptions/my-prescriptions")
      .then((res) => {
        if (res.data?.success) {
          setPrescriptions(res.data.data || []);
        }
        setIsLoadingPrescriptions(false);
      })
      .catch((err) => {
        console.warn("Failed to fetch prescriptions:", err.message);
        setIsLoadingPrescriptions(false);
      });
  };

  useEffect(() => {
    fetchListings();
    fetchPrescriptions();
  }, []);

  const getCabinetItemStatus = (expiryDateStr) => {
    if (!expiryDateStr) {
      return {
        tier: "critical",
        label: "No Date / Expired",
        color: "red",
        daysLeft: 0,
        eligible: false,
      };
    }
    const exp = new Date(expiryDateStr);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        tier: "expired",
        label: `Expired (${Math.abs(diffDays)}d ago)`,
        color: "red",
        daysLeft: diffDays,
        eligible: false,
      };
    }
    if (diffDays < 90) {
      return {
        tier: "critical",
        label: `Less than 3 months (${diffDays}d left)`,
        color: "red",
        daysLeft: diffDays,
        eligible: false,
      };
    }
    if (diffDays <= 180) {
      return {
        tier: "warning",
        label: `3–6 months (${diffDays}d left)`,
        color: "amber",
        daysLeft: diffDays,
        eligible: true,
      };
    }
    return {
      tier: "healthy",
      label: `More than 6 months (${diffDays}d left)`,
      color: "green",
      daysLeft: diffDays,
      eligible: true,
    };
  };

  const handleAddCabinetSubmit = (e) => {
    e.preventDefault();
    if (!cabinetFormData.name.trim()) {
      showToast("Please enter medicine name", "error");
      return;
    }
    if (!cabinetFormData.expiryDate) {
      showToast("Please select expiry date", "error");
      return;
    }

    const newItem = {
      id: `cab-${Date.now()}`,
      name: cabinetFormData.name.trim(),
      quantity: Number(cabinetFormData.quantity) || 1,
      unit: cabinetFormData.unit || "tablets",
      expiryDate: cabinetFormData.expiryDate,
      category: cabinetFormData.category || "Pain & Fever",
      form: cabinetFormData.form || "Tablet",
    };

    setCabinetItems((prev) => [newItem, ...prev]);
    showToast(`Added "${newItem.name}" to Medicine Cabinet`, "success");
    setIsAddCabinetModalOpen(false);
    setCabinetFormData({
      name: "",
      quantity: 10,
      unit: "tablets",
      expiryDate: "",
      category: "Pain & Fever",
      form: "Tablet",
    });
  };

  const handleDeleteCabinetItem = (id, medName) => {
    setCabinetItems((prev) => prev.filter((item) => item.id !== id));
    showToast(`Removed "${medName}" from Cabinet`, "info");
  };

  const handleDeleteListing = async (medId, medTitle) => {
    if (!window.confirm(`Are you sure you want to remove "${medTitle}" from your listings?`)) {
      return;
    }

    setDeletingId(medId);
    try {
      const res = await api.delete(`/medicines/${medId}`);
      if (res.data?.success) {
        showToast(`Removed "${medTitle}" donation listing`, "info");
        setListings((prev) => prev.filter((l) => (l._id || l.id) !== medId));
      } else {
        showToast(res.data?.message || "Could not delete listing", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to remove listing", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadRxSubmit = async (e) => {
    e.preventDefault();
    if (!rxFormData.patientName.trim()) {
      showToast("Patient name is required", "error");
      return;
    }
    if (!rxFile) {
      showToast("Please select a prescription file (PDF, JPG, PNG)", "error");
      return;
    }
    if (rxFile.size > 5 * 1024 * 1024) {
      showToast("Prescription file must be under 5 MB", "error");
      return;
    }

    setIsUploadingRx(true);
    try {
      const data = new FormData();
      data.append("prescription", rxFile);
      data.append("patientName", rxFormData.patientName.trim());
      if (rxFormData.doctorName) data.append("doctorName", rxFormData.doctorName.trim());
      if (rxFormData.doctorRegistrationNumber)
        data.append("doctorRegistrationNumber", rxFormData.doctorRegistrationNumber.trim());
      if (rxFormData.prescribedSalts)
        data.append("prescribedSalts", rxFormData.prescribedSalts.trim());

      const res = await api.post("/prescriptions", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        showToast("Prescription uploaded successfully for moderation review!", "success");
        setIsUploadRxModalOpen(false);
        setRxFormData({
          patientName: "",
          doctorName: "",
          doctorRegistrationNumber: "",
          prescribedSalts: "",
        });
        setRxFile(null);
        fetchPrescriptions();
      } else {
        showToast(res.data?.message || "Upload failed", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to upload prescription", "error");
    } finally {
      setIsUploadingRx(false);
    }
  };

  const handleViewPrescriptionDoc = async (rx) => {
    const rxId = rx._id || rx.id;
    setPreviewRx(rx);
    setIsLoadingDoc(true);
    setPreviewBlobUrl(null);

    try {
      const res = await api.get(`/prescriptions/${rxId}/document`, {
        responseType: "blob",
      });
      const mimeType = rx.documentMimeType || res.headers["content-type"] || "application/pdf";
      const blob = new Blob([res.data], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      setPreviewBlobUrl(blobUrl);
    } catch (err) {
      let errMsg = "Failed to retrieve prescription document";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errMsg = json.message;
        } catch (_parseErr) {
          void _parseErr;
        }
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      showToast(errMsg, "error");
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const activeCount = listings.filter((l) => l.status === "approved").length;
  const acceptedCount = listings.filter((l) => l.status === "accepted").length;
  const completedCount = listings.filter((l) => l.status === "completed" || l.status === "sold").length;
  const pendingCount = listings.filter((l) => l.status === "pending").length;
  const rejectedCount = listings.filter((l) => l.status === "rejected").length;

  const filteredListings = listings.filter((l) => {
    if (listingFilter === "all") return true;
    if (listingFilter === "completed") return l.status === "completed" || l.status === "sold";
    return l.status === listingFilter;
  });

  const acceptedListings = listings.filter((l) => l.status === "accepted");

  return (
    <div className="min-h-screen bg-canvas py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb items={[{ label: "Donor Dashboard", href: "/dashboard", current: true }]} />

        {/* Dashboard Header Profile Banner */}
        <div className="bg-white rounded-2xl border border-line p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-left">
          <div className="flex items-center gap-4">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-line shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center font-extrabold text-2xl shadow-xs">
                {currentUser.name?.charAt(0).toUpperCase() || "D"}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
                  Welcome, {currentUser.name}
                </h1>
                <Badge variant="verified" size="sm">
                  Verified Community Donor
                </Badge>
              </div>
              <p className="text-xs text-ink-muted flex items-center gap-1.5">
                <MapPinIcon className="w-3.5 h-3.5 text-brand" />
                {currentUser.locality || currentUser.address?.split(",")[0] || "Katraj, Pune"} • {currentUser.email}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3 w-full sm:w-auto">
            {currentUser.role === "admin" && (
              <Link to="/admin" className="flex-1 sm:flex-none">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full bg-warning-tint border-warning-line text-warning hover:bg-warning-tint font-bold shadow-xs"
                >
                  <ShieldCheckIcon className="w-4 h-4 text-warning" />
                  Admin Console
                </Button>
              </Link>
            )}
            {currentUser.role === "partner" && (
              <Link to="/partner" className="flex-1 sm:flex-none">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full bg-success-tint border-success-line text-success hover:bg-success-tint font-bold shadow-xs"
                >
                  <PackageIcon className="w-4 h-4 text-brand" />
                  Partner Portal
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsUploadRxModalOpen(true)}
              className="flex-1 sm:flex-none"
            >
              <UploadIcon className="w-4 h-4 text-brand" />
              Upload Prescription
            </Button>
            <Link to="/sell" className="flex-1 sm:flex-none">
              <Button variant="primary" size="md" className="w-full shadow-xs">
                <PlusIcon className="w-4 h-4" />
                Donate Medicine
              </Button>
            </Link>
          </div>
        </div>

        {/* 4-Step Redistribution Lifecycle Stepper Bar */}
        <div className="bg-gradient-to-r from-brand-tint/80 via-white to-success-tint/60 rounded-2xl border border-line p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="w-4 h-4 text-brand" />
            <h2 className="text-xs font-black uppercase tracking-wider text-ink">
              Verified Medicine Donation & Handover Protocol
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="bg-white/90 p-3.5 rounded-xl border border-line space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-brand">
                <span>Step 1: Free Intake</span>
                <span className="w-5 h-5 rounded-full bg-brand-tint flex items-center justify-center text-[10px]">1</span>
              </div>
              <p className="text-xs font-bold text-ink">Donor Submits Listing</p>
              <p className="text-[11px] text-ink-muted">
                100% free donation with &gt;90d expiry buffer & sealed blister packaging.
              </p>
            </div>

            <div className="bg-white/90 p-3.5 rounded-xl border border-line space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-warning">
                <span>Step 2: Partner Match</span>
                <span className="w-5 h-5 rounded-full bg-warning-tint flex items-center justify-center text-[10px]">2</span>
              </div>
              <p className="text-xs font-bold text-ink">NGO Claims Donation</p>
              <p className="text-[11px] text-ink-muted">
                Nearby accredited clinic or NGO reviews listing and claims donation for community redistribution.
              </p>
            </div>

            <div className="bg-white/90 p-3.5 rounded-xl border border-line space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-success">
                <span>Step 3: Direct Contact</span>
                <span className="w-5 h-5 rounded-full bg-success-tint flex items-center justify-center text-[10px]">3</span>
              </div>
              <p className="text-xs font-bold text-ink">Partner Contacts Donor</p>
              <p className="text-[11px] text-ink-muted">
                Partner contacts you via phone to schedule physical collection at your designated landmark.
              </p>
            </div>

            <div className="bg-white/90 p-3.5 rounded-xl border border-line space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-brand">
                <span>Step 4: Mutual OTP</span>
                <span className="w-5 h-5 rounded-full bg-brand-tint flex items-center justify-center text-[10px]">4</span>
              </div>
              <p className="text-xs font-bold text-ink">6-Digit OTP Handover</p>
              <p className="text-[11px] text-ink-muted">
                Share your 6-digit OTP with the partner in person upon inspection to confirm and complete transfer.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
          <div className="bg-white rounded-xl border border-line p-5 shadow-xs">
            <div className="flex items-center justify-between text-ink-subtle text-xs font-semibold mb-2">
              <span>Total Donated</span>
              <div className="w-8 h-8 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
                <HeartIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-ink">{listings.length}</div>
            <span className="text-[11px] text-brand font-medium">
              Medicine listings created
            </span>
          </div>

          <div className="bg-white rounded-xl border border-line p-5 shadow-xs">
            <div className="flex items-center justify-between text-ink-subtle text-xs font-semibold mb-2">
              <span>Awaiting Partner</span>
              <div className="w-8 h-8 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
                <PackageIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-ink">{activeCount}</div>
            <span className="text-[11px] text-success font-medium">
              Approved & available for clinics
            </span>
          </div>

          <div className="bg-white rounded-xl border border-line p-5 shadow-xs">
            <div className="flex items-center justify-between text-ink-subtle text-xs font-semibold mb-2">
              <span>Scheduled Handovers</span>
              <div className="w-8 h-8 rounded-lg bg-warning-tint text-warning flex items-center justify-center">
                <ClockIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-ink">{acceptedCount}</div>
            <span className="text-[11px] text-warning font-medium">
              Claimed by partner (OTP ready)
            </span>
          </div>

          <div className="bg-white rounded-xl border border-line p-5 shadow-xs">
            <div className="flex items-center justify-between text-ink-subtle text-xs font-semibold mb-2">
              <span>Completed Handovers</span>
              <div className="w-8 h-8 rounded-lg bg-success-tint text-success flex items-center justify-center">
                <CheckCircleIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-ink">{completedCount}</div>
            <span className="text-[11px] text-success font-medium">
              Redistributed to patients
            </span>
          </div>
        </div>

        {/* SECTION: ACTION REQUIRED — ACCEPTED HANDOVERS WITH 6-DIGIT OTP */}
        {acceptedListings.length > 0 && (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
              </span>
              <h2 className="text-base font-extrabold text-ink tracking-tight">
                Action Required: Physical Medicine Handover ({acceptedListings.length})
              </h2>
            </div>

            {acceptedListings.map((accItem) => (
              <div
                key={accItem._id || accItem.id}
                className="bg-white rounded-2xl border-2 border-brand/40 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-tint text-brand border border-success-line">
                      🤝 Accepted by {accItem.acceptedBy?.organizationName || accItem.acceptedBy?.name || "Verified Partner Organization"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sunken text-ink-muted">
                      {accItem.acceptedBy?.organizationType || "Charitable Clinic"}
                    </span>
                    {accItem.acceptedBy?.phone && (
                      <span className="text-xs font-semibold text-ink-muted">
                        📞 Contact: {accItem.acceptedBy.phone}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-ink">
                      {accItem.brandName || accItem.medicineName}
                    </h3>
                    <p className="text-xs text-ink-muted">
                      {accItem.company} · {accItem.quantity} {accItem.unit || "units"} · Batch: {accItem.batchNumber || "CP-2026"}
                    </p>
                  </div>

                  <div className="bg-surface-alt p-3.5 rounded-xl border border-line space-y-1.5 text-xs text-ink">
                    <p className="font-bold text-ink flex items-center gap-1.5">
                      <MapPinIcon className="w-4 h-4 text-brand shrink-0" />
                      Designated Public Handover Landmark:
                    </p>
                    <p className="text-brand-strong font-semibold pl-5 text-sm">
                      {accItem.handoverPoint || `${accItem.locality || "Katraj"} Public PMT Stop / Landmark`}
                    </p>
                    <p className="text-[11px] text-ink-muted pl-5">
                      Coordinate with the partner representative to meet at this landmark during daylight hours.
                    </p>
                  </div>
                </div>

                {/* Secure 6-Digit Handover Code Card */}
                <div className="bg-gradient-to-b from-brand-tint/50 to-white p-5 rounded-2xl border-2 border-brand/30 text-center shadow-xs shrink-0 lg:w-72 space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-brand uppercase tracking-wider">
                    <LockIcon className="w-3.5 h-3.5" />
                    <span>Your Handover Code</span>
                  </div>

                  <div className="text-3xl font-mono font-black text-brand tracking-widest py-2 px-4 bg-white rounded-xl border-2 border-brand/30 shadow-2xs">
                    {accItem.handoverCode || "Pending"}
                  </div>

                  <div className="space-y-1 text-left bg-white/80 p-2.5 rounded-lg border border-line text-[11px] text-ink-muted">
                    <p className="font-bold text-ink text-[11px] flex items-center gap-1">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-brand shrink-0" />
                      Handover Safety Rule:
                    </p>
                    <p>
                      Give this 6-digit code to the partner representative <strong>ONLY in person</strong> after they visually inspect your medicine packaging.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (accItem.handoverCode) {
                        navigator.clipboard.writeText(accItem.handoverCode);
                        showToast("6-Digit Handover Code copied to clipboard!", "success");
                      }
                    }}
                    className="w-full py-1.5 text-xs font-bold text-brand hover:bg-brand-tint rounded-lg transition border border-line cursor-pointer"
                  >
                    📋 Copy 6-Digit Code
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-line shadow-xs overflow-hidden text-left">
          <div className="flex border-b border-line px-6 pt-4 gap-4 sm:gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("donations")}
              className={`pb-4 text-xs sm:text-sm font-bold transition border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "donations"
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              <HeartIcon className="w-4 h-4" />
              My Medicine Donations ({listings.length})
            </button>

            <button
              onClick={() => setActiveTab("cabinet")}
              className={`pb-4 text-xs sm:text-sm font-bold transition border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "cabinet"
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              <PackageIcon className="w-4 h-4" />
              Household Medicine Cabinet ({cabinetItems.length})
            </button>

            <button
              onClick={() => setActiveTab("prescriptions")}
              className={`pb-4 text-xs sm:text-sm font-bold transition border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "prescriptions"
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              <FileTextIcon className="w-4 h-4" />
              My Prescriptions ({prescriptions.length})
            </button>
          </div>

          {/* TAB 1: MY MEDICINE DONATIONS */}
          {activeTab === "donations" && (
            <div className="p-6 space-y-6">
              {/* Filter Sub-Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                  { id: "all", label: `All (${listings.length})` },
                  { id: "approved", label: `Active / Awaiting Partner (${activeCount})` },
                  { id: "accepted", label: `Accepted (${acceptedCount})` },
                  { id: "completed", label: `Completed (${completedCount})` },
                  { id: "pending", label: `Pending Audit (${pendingCount})` },
                  { id: "rejected", label: `Rejected (${rejectedCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setListingFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                      listingFilter === f.id
                        ? "bg-brand text-white shadow-2xs"
                        : "bg-surface-alt text-ink-muted border border-line hover:bg-canvas"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {isLoadingListings ? (
                <div className="py-12 flex justify-center items-center">
                  <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredListings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm text-ink-muted">
                    <thead className="text-[11px] uppercase tracking-wider text-ink-subtle bg-surface-alt border-b border-line">
                      <tr>
                        <th className="py-3 px-4 font-bold">Medicine Name & Info</th>
                        <th className="py-3 px-4 font-bold">Category</th>
                        <th className="py-3 px-4 font-bold">Locality & Landmark</th>
                        <th className="py-3 px-4 font-bold">Expiry Date</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredListings.map((item) => {
                        const medId = item._id || item.id;
                        const title = item.brandName || item.medicineName || item.name;
                        const expiryStr =
                          item.expiryText ||
                          (item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "-");

                        return (
                          <tr key={medId} className="hover:bg-surface-alt transition">
                            <td className="py-4 px-4 font-semibold text-ink">
                              <div className="text-sm font-bold text-ink">{title}</div>
                              <div className="text-xs text-ink-subtle font-normal">
                                {item.company} {item.strength ? `(${item.strength})` : ""} · {item.quantity} {item.unit || "units"}
                              </div>
                              <div className="text-[11px] text-ink-muted font-normal mt-0.5">
                                Batch: <span className="font-mono">{item.batchNumber || "CP-2026"}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-xs text-ink-muted">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-surface-alt border border-line">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs text-ink">
                              <div className="font-semibold flex items-center gap-1">
                                <MapPinIcon className="w-3.5 h-3.5 text-brand" />
                                {item.locality || "Katraj"}
                              </div>
                              <div className="text-[11px] text-ink-subtle truncate max-w-xs">
                                {item.handoverPoint || "Public Landmark"}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-xs font-mono">{expiryStr}</td>
                            <td className="py-4 px-4">
                              {item.status === "approved" && (
                                <Badge variant="success" size="sm">
                                  🟢 Active / Searching Clinic
                                </Badge>
                              )}
                              {item.status === "accepted" && (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-warning-tint text-warning border border-warning-line">
                                    🤝 Accepted by Partner
                                  </span>
                                  {item.handoverCode && (
                                    <div className="text-[11px] font-mono font-bold text-brand">
                                      OTP: <span className="underline">{item.handoverCode}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {(item.status === "completed" || item.status === "sold") && (
                                <Badge variant="default" size="sm">
                                  ✅ Handover Completed
                                </Badge>
                              )}
                              {item.status === "pending" && (
                                <Badge variant="warning" size="sm">
                                  ⏳ Pending Safety Audit
                                </Badge>
                              )}
                              {item.status === "rejected" && (
                                <div className="space-y-1">
                                  <Badge variant="danger" size="sm">
                                    🔴 Ineligible / Rejected
                                  </Badge>
                                  {item.rejectionReason && (
                                    <p className="text-[11px] text-danger font-medium max-w-xs">
                                      {item.rejectionReason}
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <Link
                                  to={`/medicine/${medId}`}
                                  className="text-xs font-bold text-brand hover:underline cursor-pointer"
                                >
                                  View
                                </Link>
                                {item.status !== "accepted" && item.status !== "completed" && (
                                  <button
                                    onClick={() => handleDeleteListing(medId, title)}
                                    disabled={deletingId === medId}
                                    className="text-xs font-semibold text-danger hover:text-danger transition cursor-pointer disabled:opacity-50"
                                    title="Delete listing"
                                  >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No medicine listings in this category"
                  description="Have unused, unexpired surplus medicines at home? Donate them 100% free on MEDISAVE to help local clinics."
                  actionLabel="Donate a Medicine"
                  actionLink="/sell"
                />
              )}
            </div>
          )}

          {/* TAB 2: HOUSEHOLD MEDICINE CABINET */}
          {activeTab === "cabinet" && (
            <div className="p-6 space-y-6">
              <div className="bg-surface-alt rounded-xl p-5 border border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <PackageIcon className="w-4 h-4 text-brand" />
                    Household Medicine Expiry Tracker
                  </h3>
                  <p className="text-xs text-ink-muted max-w-xl">
                    Keep inventory of medicines stored in your home. MEDISAVE automatically monitors shelf life to prevent accidental consumption of expired drugs.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddCabinetModalOpen(true)}
                  className="shrink-0 shadow-xs"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Medicine
                </Button>
              </div>

              {cabinetItems.length === 0 ? (
                <EmptyState
                  title="Your Household Medicine Cabinet is empty"
                  description="Add medications from your home to track expiration dates and prevent domestic health risks."
                  actionLabel="Add First Medicine"
                  onAction={() => setIsAddCabinetModalOpen(true)}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cabinetItems.map((item) => {
                    const status = getCabinetItemStatus(item.expiryDate);
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-line p-5 shadow-2xs hover:shadow-sm transition flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-brand px-2 py-0.5 rounded bg-brand-tint">
                                {item.category || "General"}
                              </span>
                              <h4 className="text-sm font-bold text-ink mt-1">{item.name}</h4>
                            </div>
                            <button
                              onClick={() => handleDeleteCabinetItem(item.id, item.name)}
                              className="text-ink-subtle hover:text-danger transition p-1"
                              title="Delete from cabinet"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-xs text-ink-muted">
                            Quantity: <span className="font-semibold text-ink">{item.quantity} {item.unit}</span>
                          </div>

                          <div className="bg-surface-alt p-2.5 rounded-lg border border-line space-y-1">
                            <div className="text-[11px] text-ink-subtle">Expiry: {item.expiryDate}</div>
                            <div
                              className={`text-xs font-bold ${
                                status.tier === "healthy"
                                  ? "text-success"
                                  : status.tier === "warning"
                                  ? "text-warning"
                                  : "text-danger"
                              }`}
                            >
                              {status.label}
                            </div>
                          </div>
                        </div>

                        <div>
                          {status.eligible ? (
                            <Link
                              to={`/sell?title=${encodeURIComponent(item.name)}&quantity=${item.quantity}&category=${encodeURIComponent(item.category || "Pain & Fever")}&expiryDate=${item.expiryDate}`}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-strong text-white text-xs font-bold rounded-lg transition shadow-2xs"
                            >
                              <span>🎁 Donate to Clinic</span>
                            </Link>
                          ) : (
                            <Link
                              to="/disposal-guide"
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-danger hover:bg-danger text-white text-xs font-bold rounded-lg transition shadow-2xs"
                            >
                              <span>♻️ Safe Disposal Guide</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MY PRESCRIPTIONS */}
          {activeTab === "prescriptions" && (
            <div className="p-6 space-y-6">
              <div className="bg-surface-alt rounded-xl p-5 border border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <FileTextIcon className="w-4 h-4 text-brand" />
                    Prescription Verification Hub
                  </h3>
                  <p className="text-xs text-ink-muted max-w-xl">
                    Upload medical prescriptions for Schedule H prescription medicines. All documents are encrypted and audited by certified platform coordinators.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsUploadRxModalOpen(true)}
                  className="shrink-0 shadow-xs"
                >
                  <UploadIcon className="w-3.5 h-3.5" />
                  Upload Prescription
                </Button>
              </div>

              {isLoadingPrescriptions ? (
                <div className="py-12 flex justify-center items-center">
                  <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : prescriptions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm text-ink-muted">
                    <thead className="text-[11px] uppercase tracking-wider text-ink-subtle bg-surface-alt border-b border-line">
                      <tr>
                        <th className="py-3 px-4 font-bold">Patient Name</th>
                        <th className="py-3 px-4 font-bold">Doctor Details</th>
                        <th className="py-3 px-4 font-bold">Prescribed Salts</th>
                        <th className="py-3 px-4 font-bold">Uploaded Date</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold text-right">Document</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {prescriptions.map((rx) => (
                        <tr key={rx._id || rx.id} className="hover:bg-surface-alt transition">
                          <td className="py-4 px-4 font-bold text-ink">{rx.patientName}</td>
                          <td className="py-4 px-4 text-xs text-ink">
                            <div>{rx.doctorName || "Registered Medical Practitioner"}</div>
                            {rx.doctorRegistrationNumber && (
                              <div className="text-[11px] text-ink-subtle font-mono">
                                Reg: {rx.doctorRegistrationNumber}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-xs text-ink-muted">{rx.prescribedSalts || "General Rx"}</td>
                          <td className="py-4 px-4 text-xs font-mono">
                            {new Date(rx.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4">
                            {rx.status === "approved" && (
                              <Badge variant="success" size="sm">
                                Verified Valid
                              </Badge>
                            )}
                            {rx.status === "pending" && (
                              <Badge variant="warning" size="sm">
                                Pending Moderation
                              </Badge>
                            )}
                            {rx.status === "rejected" && (
                              <Badge variant="danger" size="sm">
                                Rejected
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleViewPrescriptionDoc(rx)}
                              className="text-xs font-bold text-brand hover:underline cursor-pointer"
                            >
                              Preview Document
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No prescriptions uploaded yet"
                  description="When receiving Schedule H medicines, upload a valid prescription written by a registered medical practitioner."
                  actionLabel="Upload Prescription"
                  onAction={() => setIsUploadRxModalOpen(true)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD TO MEDICINE CABINET */}
      <Modal
        isOpen={isAddCabinetModalOpen}
        onClose={() => setIsAddCabinetModalOpen(false)}
        title="Add Medicine to Household Cabinet"
      >
        <form onSubmit={handleAddCabinetSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Medicine Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Paracetamol 500mg, Pan 40"
              value={cabinetFormData.name}
              onChange={(e) => setCabinetFormData({ ...cabinetFormData, name: e.target.value })}
              className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink focus:ring-2 focus:ring-brand focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={cabinetFormData.quantity}
                onChange={(e) => setCabinetFormData({ ...cabinetFormData, quantity: e.target.value })}
                className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Unit</label>
              <input
                type="text"
                placeholder="tablets, capsules, ml"
                value={cabinetFormData.unit}
                onChange={(e) => setCabinetFormData({ ...cabinetFormData, unit: e.target.value })}
                className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Expiry Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                required
                value={cabinetFormData.expiryDate}
                onChange={(e) => setCabinetFormData({ ...cabinetFormData, expiryDate: e.target.value })}
                className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Category</label>
              <select
                value={cabinetFormData.category}
                onChange={(e) => setCabinetFormData({ ...cabinetFormData, category: e.target.value })}
                className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink focus:ring-2 focus:ring-brand focus:outline-none"
              >
                <option value="Pain & Fever">Pain & Fever</option>
                <option value="Antibiotics">Antibiotics</option>
                <option value="Respiratory & Allergy">Respiratory & Allergy</option>
                <option value="Gastrointestinal">Gastrointestinal</option>
                <option value="Cardiovascular & BP">Cardiovascular & BP</option>
                <option value="Diabetes Care">Diabetes Care</option>
                <option value="Vitamins & Supplements">Vitamins & Supplements</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddCabinetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save to Cabinet
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: UPLOAD PRESCRIPTION */}
      <Modal
        isOpen={isUploadRxModalOpen}
        onClose={() => setIsUploadRxModalOpen(false)}
        title="Upload Medical Prescription"
      >
        <form onSubmit={handleUploadRxSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Patient Full Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kulkarni"
              value={rxFormData.patientName}
              onChange={(e) => setRxFormData({ ...rxFormData, patientName: e.target.value })}
              className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink focus:ring-2 focus:ring-brand focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Doctor Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. A. Joshi"
                value={rxFormData.doctorName}
                onChange={(e) => setRxFormData({ ...rxFormData, doctorName: e.target.value })}
                className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Doctor Reg Number</label>
              <input
                type="text"
                placeholder="e.g. MMC-2018-99881"
                value={rxFormData.doctorRegistrationNumber}
                onChange={(e) => setRxFormData({ ...rxFormData, doctorRegistrationNumber: e.target.value })}
                className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">Prescribed Medicines / Salts</label>
            <input
              type="text"
              placeholder="e.g. Azithromycin 500mg, Pantoprazole 40mg"
              value={rxFormData.prescribedSalts}
              onChange={(e) => setRxFormData({ ...rxFormData, prescribedSalts: e.target.value })}
              className="w-full bg-canvas border border-line rounded-lg p-2.5 text-xs text-ink focus:ring-2 focus:ring-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Prescription Document File (PDF, JPG, PNG &lt; 5MB) <span className="text-danger">*</span>
            </label>
            <input
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setRxFile(e.target.files[0])}
              className="w-full bg-canvas border border-line rounded-lg p-2 text-xs text-ink focus:outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsUploadRxModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isUploadingRx}>
              {isUploadingRx ? "Uploading..." : "Submit Prescription"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: PREVIEW PRESCRIPTION DOCUMENT */}
      <Modal
        isOpen={Boolean(previewRx)}
        onClose={() => {
          setPreviewRx(null);
          setPreviewBlobUrl(null);
        }}
        title={`Prescription Document — ${previewRx?.patientName || "Preview"}`}
      >
        <div className="space-y-4">
          {isLoadingDoc ? (
            <div className="py-16 flex justify-center items-center">
              <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : previewBlobUrl ? (
            <div className="border border-line rounded-xl overflow-hidden max-h-[500px] flex justify-center bg-sunken">
              {previewRx?.documentMimeType?.includes("pdf") ? (
                <iframe src={previewBlobUrl} className="w-full h-[450px]" title="Prescription Document"></iframe>
              ) : (
                <img src={previewBlobUrl} alt="Prescription" className="max-h-[450px] object-contain" />
              )}
            </div>
          ) : (
            <p className="text-xs text-danger text-center py-8">Could not load document preview.</p>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreviewRx(null);
                setPreviewBlobUrl(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
