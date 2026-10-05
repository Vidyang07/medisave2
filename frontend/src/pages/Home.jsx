import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Hero from "../components/Hero";
import MedicineCard from "../components/MedicineCard";
import { CATEGORIES } from "../data/mockData";
import {
  ShieldCheckIcon,
  ClockIcon,
  PackageIcon,
  ArrowRightIcon,
  CheckIcon,
  FileTextIcon,
  AlertTriangleIcon,
  LockIcon,
} from "../components/common/Icons";
import { Button } from "../components/common/Button";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [medicines, setMedicines] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMeds, setIsLoadingMeds] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const params = { limit: 8 };
    if (selectedCategory !== "All Categories") {
      params.category = selectedCategory;
    }

    api
      .get("/medicines", { params })
      .then((res) => {
        if (isMounted && res.data?.success) {
          setMedicines(res.data.data || []);
          if (res.data.pagination?.total !== undefined) {
            setTotalCount(res.data.pagination.total);
          }
        }
        if (isMounted) setIsLoadingMeds(false);
      })
      .catch(() => {
        if (isMounted) setIsLoadingMeds(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. How MEDISAVE Works */}
      <section id="how-it-works" className="bg-white border-b border-line py-14 sm:py-18 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-bold text-brand uppercase tracking-wider">
              Verification Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
              How MEDISAVE Works
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-2 leading-relaxed">
              A structured, verified bridge connecting community surplus medicines with accredited healthcare partners through authenticated physical handovers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-xl bg-surface-alt border border-line flex flex-col justify-between">
              <div>
                <span className="text-2xl font-black text-brand/30 font-mono block mb-2">
                  01
                </span>
                <h3 className="text-sm sm:text-base font-bold text-ink mb-1.5">
                  List Eligible Medicine
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Donors list sealed, unexpired medicines with batch details, minimum 90-day shelf life, and AI-assisted identification.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-line-soft flex items-center gap-1.5 text-[11px] text-brand font-semibold">
                <CheckIcon className="w-3.5 h-3.5" />
                <span>Min. 90-day buffer</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-xl bg-surface-alt border border-line flex flex-col justify-between">
              <div>
                <span className="text-2xl font-black text-brand/30 font-mono block mb-2">
                  02
                </span>
                <h3 className="text-sm sm:text-base font-bold text-ink mb-1.5">
                  Verification Review
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Coordinators audit packaging integrity, expiry window, and prescription classifications before approving for catalog display.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-line-soft flex items-center gap-1.5 text-[11px] text-brand font-semibold">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                <span>Coordinator audited</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-xl bg-surface-alt border border-line flex flex-col justify-between">
              <div>
                <span className="text-2xl font-black text-brand/30 font-mono block mb-2">
                  03
                </span>
                <h3 className="text-sm sm:text-base font-bold text-ink mb-1.5">
                  Verified Partner Accepts
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Accredited community clinics, dispensaries, and health NGOs review local donations and claim needed medications.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-line-soft flex items-center gap-1.5 text-[11px] text-brand font-semibold">
                <PackageIcon className="w-3.5 h-3.5" />
                <span>Accredited partners</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-xl bg-surface-alt border border-line flex flex-col justify-between">
              <div>
                <span className="text-2xl font-black text-brand/30 font-mono block mb-2">
                  04
                </span>
                <h3 className="text-sm sm:text-base font-bold text-ink mb-1.5">
                  Safe Handover
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  In-person physical inspection at a public landmark, completed through a secure 6-digit one-time code entered by the partner.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-line-soft flex items-center gap-1.5 text-[11px] text-brand font-semibold">
                <LockIcon className="w-3.5 h-3.5" />
                <span>6-digit OTP verification</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why Medicine Wastage Matters */}
      <section className="bg-surface-alt border-b border-line py-14 sm:py-18 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-bold text-brand uppercase tracking-wider">
              Environmental & Healthcare Impact
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
              Why Medicine Wastage Matters
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-2 leading-relaxed">
              Household pharmaceutical accumulation creates preventable shortages for underprivileged communities and severe ecological threats when discarded improperly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-line shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="text-sm font-bold text-ink">Unused Medicines are Forgotten</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Acute treatment changes and bulk purchases leave millions of usable tablets idle in household drawers until they lose therapeutic viability.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-line shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="text-sm font-bold text-ink">Critical Community Shortages</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Charitable clinics, old age homes, and community dispensaries face chronic shortages of standard chronic and analgesic medications.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-line shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-danger-tint text-danger flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="text-sm font-bold text-ink">Environmental & AMR Hazards</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Flushing leftover antibiotics into municipal sewage leaches active compounds into river basins, accelerating antimicrobial resistance (AMR).
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-line shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h3 className="text-sm font-bold text-ink">Controlled Redirection</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Eligible unexpired medications are redirected safely to verified institutional channels rather than entering municipal landfills.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Expiry Awareness Matrix */}
      <section className="bg-white border-b border-line py-14 sm:py-18 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-bold text-brand uppercase tracking-wider">
              Proactive Lifecycle Management
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
              Expiry Awareness & Action Matrix
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-2 leading-relaxed">
              Understand the operational status of your home medicine cabinet based on exact remaining shelf life.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Tier 1: > 6 Months */}
            <div className="p-6 rounded-xl border-2 border-success-line bg-success-tint/50 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-success-tint text-success">
                  &gt; 6 Months Buffer
                </span>
                <span className="text-xs font-bold text-success">Stable</span>
              </div>
              <h3 className="text-base font-bold text-ink">Monitor</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Medicines in this window are secure for household use or prime candidates for community donation if no longer required.
              </p>
              <div className="pt-2 border-t border-success-line/60">
                <span className="text-[11px] font-semibold text-success">Action: Eligible to Donate</span>
              </div>
            </div>

            {/* Tier 2: 3–6 Months */}
            <div className="p-6 rounded-xl border-2 border-warning-line bg-warning-tint/50 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-warning-tint text-warning">
                  3–6 Months Buffer
                </span>
                <span className="text-xs font-bold text-warning">Attention</span>
              </div>
              <h3 className="text-base font-bold text-ink">Plan</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Determine if the treatment course will be finished domestically. If surplus, donate immediately before the 90-day threshold.
              </p>
              <div className="pt-2 border-t border-warning-line/60">
                <span className="text-[11px] font-semibold text-warning">Action: Donate Soon</span>
              </div>
            </div>

            {/* Tier 3: < 3 Months */}
            <div className="p-6 rounded-xl border-2 border-danger-line bg-danger-tint/50 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-danger-tint text-danger">
                  &lt; 3 Months Buffer
                </span>
                <span className="text-xs font-bold text-danger">Restricted</span>
              </div>
              <h3 className="text-base font-bold text-ink">Act / Use</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Shelf life is below the platform 90-day donation threshold. Complete current domestic course or prepare for household disposal.
              </p>
              <div className="pt-2 border-t border-danger-line/60">
                <span className="text-[11px] font-semibold text-danger">Action: Ineligible to Donate</span>
              </div>
            </div>

            {/* Tier 4: Expired */}
            <div className="p-6 rounded-xl border-2 border-line bg-surface-alt space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-line text-ink-muted">
                  Expired
                </span>
                <span className="text-xs font-bold text-ink-subtle">Disposal</span>
              </div>
              <h3 className="text-base font-bold text-ink">Safe Disposal</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Expired drugs must never be redistributed. Follow the 4-step home neutralization protocol or drop at collection points.
              </p>
              <div className="pt-2 border-t border-line">
                <Link to="/disposal-guide" className="text-[11px] font-semibold text-brand hover:underline">
                  Action: View Disposal Guide →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Safety & Verification Standards */}
      <section className="bg-surface-alt border-b border-line py-14 sm:py-18 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-bold text-brand uppercase tracking-wider">
              Safety Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
              Verification & Safety Standards
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-2 leading-relaxed">
              Every step of the MEDISAVE lifecycle is governed by automated and administrative safety guardrails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-line shadow-2xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
                <ClockIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-ink">90-Day Expiry Guardrail</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                The server automatically validates expiration dates and rejects any submission with less than 90 days of shelf life.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-line shadow-2xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
                <PackageIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-ink">Sealed Packaging Standard</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Only intact blister packs with undamaged foil and unopened tamper-evident bottles are accepted. Cut strips are rejected.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-line shadow-2xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-800 flex items-center justify-center">
                <FileTextIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-ink">Prescription Verification</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Schedule H and H1 medications require registered physician prescription approval before partner handover.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-line shadow-2xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
                <ShieldCheckIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-ink">Verified Partner Network</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Only accredited community clinics, health NGOs, and institutional dispensaries can accept surplus medicine listings.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-line shadow-2xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
                <LockIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-ink">6-Digit Handover OTP</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Cryptographic server-generated one-time codes confirm in-person handovers, backed by a 5-attempt brute-force lockout defense.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-line shadow-2xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-warning-tint text-warning flex items-center justify-center">
                <AlertTriangleIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-ink">High-Risk Exclusions</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Cold-chain biologics (such as insulin) and Schedule X narcotics are strictly excluded from peer donation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5.5 Featured Available Donations Preview */}
      <section className="bg-white py-14 sm:py-18 text-left border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold text-brand uppercase tracking-wider">
                Community Listings
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
                Available Medicine Donations
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted mt-1">
                Browse verified surplus medicines ready for partner redistribution across Pune.
              </p>
            </div>

            <Link
              to="/partner"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-strong bg-brand-tint hover:bg-[#d5ebe7] px-3.5 py-2 rounded-lg border border-brand-line transition shrink-0"
            >
              <span>Partner Clinic Portal</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
            {CATEGORIES.slice(0, 7).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-brand text-white shadow-2xs"
                    : "bg-white text-ink-muted border border-line hover:border-line-strong hover:bg-surface-alt"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Medicine Product Grid */}
          {isLoadingMeds ? (
            <div className="py-12 text-center text-xs text-ink-subtle">
              Loading verified community donations...
            </div>
          ) : medicines.length === 0 ? (
            <div className="py-12 bg-surface-alt rounded-xl border border-line text-center text-xs text-ink-subtle">
              No available donations in this category right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {medicines.map((medicine) => (
                <MedicineCard key={medicine._id || medicine.id} medicine={medicine} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. Closing Action CTA */}
      <section className="bg-brand text-white py-14 sm:py-16 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-bold text-success-line uppercase tracking-wider">
                Community Stewardship
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Have unused eligible medicine?
              </h2>
              <p className="text-xs sm:text-sm text-success-tint leading-relaxed">
                Help prevent pharmaceutical waste and support community healthcare. Donate your sealed, unexpired medicines responsibly.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/sell">
                <Button variant="secondary" size="lg" className="bg-white text-brand hover:bg-brand-tint font-bold shadow-sm">
                  Donate Responsibly
                  <ArrowRightIcon className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link to="/disposal-guide">
                <Button variant="outline" size="lg" className="border-white/40 text-white hover:bg-white/10">
                  Safe Disposal Guide
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}