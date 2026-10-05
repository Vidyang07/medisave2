import { Link } from "react-router-dom";
import { PillIcon, ShieldCheckIcon } from "./common/Icons";

const linkCls = "text-ink-muted hover:text-brand transition-colors";

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-line text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 space-y-3 max-w-sm">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-brand text-success-line flex items-center justify-center">
                <PillIcon className="w-4 h-4 -rotate-45" />
              </span>
              <span className="text-base font-bold tracking-tight text-ink">
                MEDI<span className="text-brand">SAVE</span>
              </span>
            </Link>
            <p className="text-sm text-ink-muted leading-relaxed">
              A verified community platform for medicine donation, expiry awareness and safe redistribution.
            </p>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              100% free community donation · No buying or selling
            </p>
          </div>

          <nav className="space-y-2.5 text-sm" aria-label="Platform">
            <h4 className="eyebrow !text-ink-subtle">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/ngo-requests" className={linkCls}>Community NGO Requests</Link></li>
              <li><Link to="/sell" className={linkCls}>Donate Medicine</Link></li>
              <li><Link to="/dashboard" className={linkCls}>My Cabinet</Link></li>
              <li><Link to="/partner" className={linkCls}>Partner Portal</Link></li>
            </ul>
          </nav>

          <nav className="space-y-2.5 text-sm" aria-label="Safety">
            <h4 className="eyebrow !text-ink-subtle">Safety</h4>
            <ul className="space-y-2">
              <li><Link to="/disposal-guide" className={linkCls}>Safe Disposal</Link></li>
              <li><Link to="/disposal-guide#amr-prevention" className={linkCls}>AMR Prevention</Link></li>
              <li><Link to="/terms" className={linkCls}>Terms</Link></li>
              <li><Link to="/privacy" className={linkCls}>Privacy</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-line-soft flex flex-col sm:flex-row gap-2 justify-between text-xs text-ink-subtle">
          <p>© {new Date().getFullYear()} MEDISAVE. Community medicine donation platform.</p>
          <p>Not a pharmacy. Always consult a doctor before taking any medicine.</p>
        </div>
      </div>
    </footer>
  );
}
