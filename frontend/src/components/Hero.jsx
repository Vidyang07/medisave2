import { Link } from "react-router-dom";
import {
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  LockIcon,
  MapPinIcon,
} from "./common/Icons";

const trust = [
  { icon: ClockIcon, label: "90-day safety buffer" },
  { icon: ShieldCheckIcon, label: "Verified partners" },
  { icon: CheckIcon, label: "100% free donation" },
];

export default function Hero() {
  return (
    <section className="bg-surface border-b border-line text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7 space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-tint px-3 py-1 text-xs font-semibold text-brand">
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              Community donation · No buying or selling
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-ink tracking-tight leading-[1.05]">
              Give unused medicines a <span className="text-brand">safer destination.</span>
            </h1>

            <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-xl">
              A verified community platform for medicine donation, expiry awareness and safe redistribution.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/sell"
                className="inline-flex items-center gap-2 rounded-[10px] bg-brand px-5 py-3 text-sm font-semibold text-white shadow-2xs hover:bg-brand-strong transition-colors"
              >
                Donate Medicine
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                to="/partner"
                className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-sunken transition-colors"
              >
                NGO Partner Portal
              </Link>
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
              {trust.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm font-medium text-ink-muted">
                  <span className="w-6 h-6 rounded-full bg-brand-tint text-brand flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Illustrative donation record — shows what a verified listing contains */}
          <div className="lg:col-span-5">
            <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-line-soft bg-surface-alt">
                <span className="eyebrow !text-ink-subtle">Example donation record</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-tint px-2 py-0.5 text-[11px] font-bold text-success">
                  <CheckIcon className="w-3 h-3" /> SAFE
                </span>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-ink">Paracetamol 500 mg</h3>
                  <p className="text-sm text-ink-subtle">Tablet · 2 strips × 10</p>
                </div>

                <dl className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border border-line bg-line text-sm">
                  {[
                    ["Expiry", "Apr 2027"],
                    ["Packaging", "Sealed blister"],
                    ["Prescription", "Not required"],
                    ["Locality", "Kothrud, Pune"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-surface p-3">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">{k}</dt>
                      <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>

                <ol className="space-y-2.5 text-sm">
                  {[
                    [CheckIcon, "Listed by donor", true],
                    [ShieldCheckIcon, "Verified by coordinator", true],
                    [MapPinIcon, "Accepted by nearby partner", true],
                    [LockIcon, "Handover with 6-digit code", false],
                  ].map(([Icon, label, done]) => (
                    <li key={label} className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          done ? "bg-brand text-white" : "border border-line-strong text-ink-subtle"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className={done ? "text-ink font-medium" : "text-ink-subtle"}>{label}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
