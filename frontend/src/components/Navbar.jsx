import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  PillIcon,
  SearchIcon,
  UserIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  ChevronDownIcon,
  PackageIcon,
  ShieldCheckIcon,
} from "./common/Icons";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavSearch = (e) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/partner?search=${encodeURIComponent(navSearch.trim())}`);
      setNavSearch("");
      setIsMobileMenuOpen(false);
    }
  };

  const navLinkClass = ({ isActive }) =>
    `relative text-[13px] font-semibold transition-colors px-3 py-2 rounded-lg ${
      isActive
        ? "text-brand bg-brand-tint"
        : "text-ink-muted hover:text-ink hover:bg-sunken"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-line">
      {/* Top Visible Community Notice Banner */}
      <div className="bg-brand-strong text-white text-[11px] font-medium py-1.5 px-4 text-center tracking-wide hidden sm:flex items-center justify-center gap-2">
        <ShieldCheckIcon className="w-3.5 h-3.5 text-success-line shrink-0" />
        <span>100% free community donation · No buying or selling · Verified partners only</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shadow-2xs group-hover:bg-brand-strong transition">
                <PillIcon className="w-4 h-4 transform -rotate-45 text-success-line" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-lg font-bold tracking-tight text-ink leading-none">
                  MEDI<span className="text-brand">SAVE</span>
                </span>
  
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main Navigation">
              <NavLink to="/" className={navLinkClass}>
                Home
              </NavLink>
              <NavLink to="/sell" className={navLinkClass}>
                Donate Medicine
              </NavLink>
              {isAuthenticated && (
                <NavLink to="/dashboard" className={navLinkClass}>
                  Donor Dashboard
                </NavLink>
              )}
              {isAuthenticated && (user?.role === "partner" || user?.role === "admin") && (
                <NavLink
                  to="/partner"
                  className={({ isActive }) =>
                    `text-xs font-bold transition-colors px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                      isActive
                        ? "text-brand bg-success-tint font-extrabold shadow-2xs"
                        : "text-success bg-success-tint hover:bg-success-tint"
                    }`
                  }
                >
                  <PackageIcon className="w-3.5 h-3.5 text-brand" />
                  NGO / Partner Portal
                </NavLink>
              )}
              {isAuthenticated && user?.role === "admin" && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `text-xs font-bold transition-colors px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                      isActive
                        ? "text-warning bg-warning-tint"
                        : "text-warning hover:text-warning hover:bg-warning-tint"
                    }`
                  }
                >
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-warning" />
                  Admin Console
                </NavLink>
              )}
            </nav>
          </div>

          {/* Search bar in desktop navbar */}
          <form
            onSubmit={handleNavSearch}
            className="hidden xl:flex items-center flex-1 max-w-[220px] relative"
          >
            <SearchIcon className="w-3.5 h-3.5 text-ink-subtle absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search donations, salts..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full bg-sunken border border-line text-xs text-ink rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition placeholder-ink-subtle"
            />
          </form>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/sell"
              className="hidden md:inline-flex items-center text-[13px] font-semibold bg-brand text-white hover:bg-brand-strong px-4 py-2 rounded-[10px] transition-colors shadow-2xs"
            >
              Donate Medicine
            </Link>
            {/* Authentication / User Profile */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-line hover:border-line-strong hover:bg-sunken transition cursor-pointer bg-white"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-6 h-6 rounded-full object-cover border border-line"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs">
                      {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-ink leading-tight max-w-[110px] truncate">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-brand font-medium leading-none">
                      {user.role === "admin"
                        ? "Admin"
                        : user.role === "partner"
                        ? "Partner Org"
                        : "Donor / Member"}
                    </span>
                  </div>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-ink-subtle hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-line py-1.5 z-50 text-left">
                    <div className="px-4 py-2 border-b border-line">
                      <p className="text-xs font-bold text-ink truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-ink-muted truncate">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink hover:bg-sunken hover:text-brand transition"
                      >
                        <PackageIcon className="w-4 h-4 text-ink-subtle" />
                        Donor Dashboard
                      </Link>
                      {(user?.role === "partner" || user?.role === "admin") && (
                        <Link
                          to="/partner"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-success hover:bg-success-tint transition font-semibold"
                        >
                          <PackageIcon className="w-4 h-4 text-brand" />
                          Partner Portal
                        </Link>
                      )}
                      {user?.role === "admin" && (
                        <Link
                          to="/admin"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-warning hover:bg-warning-tint transition font-semibold"
                        >
                          <ShieldCheckIcon className="w-4 h-4 text-warning" />
                          Admin Console
                        </Link>
                      )}
                      <Link
                        to="/profile"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-ink hover:bg-sunken hover:text-brand transition"
                      >
                        <UserIcon className="w-4 h-4 text-ink-subtle" />
                        My Profile & Settings
                      </Link>
                    </div>

                    <div className="border-t border-line pt-1">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-danger hover:bg-danger-tint transition text-left cursor-pointer"
                      >
                        <LogOutIcon className="w-4 h-4 text-danger" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-ink hover:text-brand px-3 py-1.5 rounded-lg hover:bg-sunken transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-xs font-semibold border border-line text-ink hover:bg-sunken px-3.5 py-2 rounded-[10px] transition"
                >
                  Join
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-ink hover:text-brand hover:bg-sunken transition lg:hidden cursor-pointer"
              aria-label="Open Mobile Menu"
            >
              {isMobileMenuOpen ? (
                <XIcon className="w-5 h-5" />
              ) : (
                <MenuIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-line bg-surface-alt px-4 pt-3 pb-6 space-y-3 text-left">
          <form onSubmit={handleNavSearch} className="relative">
            <SearchIcon className="w-4 h-4 text-ink-subtle absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search medicines, salts..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full bg-white border border-line text-xs rounded-lg pl-9 pr-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </form>

          <nav className="flex flex-col space-y-1 pt-1">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-xs font-medium text-ink hover:bg-brand-tint hover:text-brand transition"
            >
              Home
            </Link>
            <Link
              to="/sell"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-xs font-medium text-ink hover:bg-brand-tint hover:text-brand transition"
            >
              Donate Medicine
            </Link>
            {isAuthenticated && (
              <Link
                to="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-ink hover:bg-brand-tint hover:text-brand transition"
              >
                Donor Dashboard
              </Link>
            )}
            <Link
              to="/disposal-guide"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-xs font-medium text-ink hover:bg-brand-tint hover:text-brand transition"
            >
              Safe Disposal Guide
            </Link>
            {isAuthenticated && (user?.role === "partner" || user?.role === "admin") && (
              <Link
                to="/partner"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-bold text-success bg-success-tint transition flex items-center gap-1.5"
              >
                <PackageIcon className="w-3.5 h-3.5 text-brand" />
                NGO / Partner Portal
              </Link>
            )}
            {user?.role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-warning bg-warning-tint transition"
              >
                Admin Moderation Console
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-ink hover:bg-brand-tint hover:text-brand transition"
              >
                Profile & Preferences
              </Link>
            )}
          </nav>

          <div className="pt-3 border-t border-line flex flex-col gap-2">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2 text-center text-xs font-bold text-danger bg-danger-tint rounded-lg transition cursor-pointer"
              >
                Sign Out ({user?.name})
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2 text-center text-xs font-bold text-ink bg-sunken rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2 text-center text-xs font-bold text-white bg-brand rounded-lg"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}