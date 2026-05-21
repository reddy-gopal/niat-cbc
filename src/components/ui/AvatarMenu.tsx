"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AvatarMenu({
  firstName,
  compact,
}: {
  firstName: string;
  /** Slightly smaller control for tight nav bars (still meets ~44px touch target). */
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const initial = firstName ? firstName.charAt(0).toUpperCase() : "U";

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Account menu"
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-full bg-[var(--primary)] text-white font-heading font-bold flex items-center justify-center shadow-md hover:scale-105 transition-transform touch-manipulation ${
          compact
            ? "min-h-[44px] min-w-[44px] h-10 w-10 text-sm sm:h-11 sm:w-11 sm:text-base"
            : "min-h-[44px] min-w-[44px] h-11 w-11 sm:h-12 sm:w-12 text-base"
        }`}
      >
        {initial}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-[min(100vw-1.5rem,12rem)] sm:w-48 bg-white rounded-xl shadow-lg border border-[var(--border)] py-1 z-[60] animate-[fadeSlideDown_0.2s_ease-out]"
          role="menu"
        >
          <Link
            href="/profile"
            className="block w-full text-left px-4 py-3 sm:py-2 text-sm text-[var(--text-dark)] hover:bg-[var(--bg-tint)] font-medium transition-colors touch-manipulation"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>
          <Link
            href="/help"
            className="block w-full text-left px-4 py-3 sm:py-2 text-sm text-[var(--text-dark)] hover:bg-[var(--bg-tint)] font-medium transition-colors touch-manipulation"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            Help
          </Link>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              handleLogout();
            }}
            className="block w-full text-left px-4 py-3 sm:py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors touch-manipulation"
            role="menuitem"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
