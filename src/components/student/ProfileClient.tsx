"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../ui/Toast";
import type { StudentSession } from "@/types/app";
import type { Student } from "@/types/database";
import { StudentAppShell } from "./StudentAppShell";
import { studentMainTopPaddingClass } from "./StudentNavbar";

type StudentWithContext = Student & {
  sections: { label: string } | null;
  bootcamps: { name: string; date: string } | null;
  regions: { name: string } | null;
};

export default function ProfileClient({
  session: _session,
  student,
}: {
  session: StudentSession;
  student: StudentWithContext;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [isVerifyingMobile, setIsVerifyingMobile] = useState(false);
  const [newMobile, setNewMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(newMobile)) {
      showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }
    if (newMobile === student.mobile) {
      showToast("New mobile number cannot be your current number.", "info");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/profile/update-mobile/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: newMobile }),
      });
      const data = await res.json();
      if (data.success) {
        setIsVerifyingMobile(true);
        showToast("OTP sent to your new mobile number.", "success");
      } else {
        showToast(data.error || "Failed to send OTP.", "error");
      }
    } catch {
      showToast("An unexpected error occurred.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{4}$/.test(otp)) {
      showToast("Please enter a valid 4-digit OTP.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/profile/update-mobile/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: newMobile, otp }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Mobile number updated successfully!", "success");
        setIsVerifyingMobile(false);
        setIsEditingMobile(false);
        router.refresh();
      } else {
        showToast(data.error || "Failed to verify OTP.", "error");
      }
    } catch {
      showToast("An unexpected error occurred.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to permanently delete your account? This action cannot be undone."
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/profile/delete", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("Account deleted permanently.", "success");
        router.push("/");
      } else {
        showToast(data.error || "Failed to delete account.", "error");
        setIsDeleting(false);
      }
    } catch {
      showToast("An unexpected error occurred.", "error");
      setIsDeleting(false);
    }
  };

  const initial = student.full_name ? student.full_name.charAt(0).toUpperCase() : "U";
  const firstName = student.full_name?.split(" ")[0] ?? "Student";

  return (
    <StudentAppShell firstName={firstName}>
      <main className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] pb-8 md:pb-20">
        <div
          className={`mx-auto max-w-2xl px-4 pb-8 md:pb-12 ${studentMainTopPaddingClass}`}
        >
        {/* Profile Card */}
        <section className="card px-8 pt-12 pb-8 shadow-lg border-0 bg-white relative mt-4 sm:mt-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-[var(--primary)] text-white text-4xl font-heading font-bold flex items-center justify-center shadow-xl border-4 border-white">
            {initial}
          </div>

          <div className="flex flex-col items-center mb-8">
            <h1 className="text-3xl font-heading font-bold text-[var(--text-dark)] mt-2">
              {student.full_name}
            </h1>
            <p className="text-[var(--text-secondary)] font-medium mt-2 bg-[var(--bg-warm)] px-4 py-1.5 rounded-full border border-[#f3e4c6] text-sm shadow-sm inline-block">
              {student.bootcamps?.name} · Section {student.sections?.label}
            </p>
          </div>

          <div className="space-y-6">
            {/* Phone Number Field */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Phone Number</p>
                {!isEditingMobile ? (
                  <p className="text-lg font-bold text-[var(--text-dark)] mt-1">{student.mobile}</p>
                ) : (
                  <div className="mt-2 text-sm font-medium text-[var(--primary)] animate-pulse">Editing Mode</div>
                )}
              </div>
              
              {!isEditingMobile && (
                <button
                  onClick={() => setIsEditingMobile(true)}
                  className="btn-outline !py-1.5 !px-4 text-sm whitespace-nowrap bg-white hover:bg-slate-100"
                >
                  Edit Number
                </button>
              )}
            </div>

            {/* Editing Mobile Flow */}
            {isEditingMobile && (
              <div className="bg-white p-6 rounded-xl border border-[var(--primary)] shadow-sm animate-[fadeSlideDown_0.3s_ease-out]">
                {!isVerifyingMobile ? (
                  <div className="space-y-4">
                    <h3 className="font-heading font-bold text-lg text-[var(--text-dark)]">Update Phone Number</h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Enter your new 10-digit mobile number to receive a verification code.
                    </p>
                    <input
                      className="input-field bg-white text-[var(--text-dark)] placeholder:text-[var(--text-muted)]"
                      type="text"
                      placeholder="New Mobile Number"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      disabled={isLoading}
                    />
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <button
                        onClick={handleSendOtp}
                        className="btn-primary w-full sm:w-auto"
                        disabled={isLoading || newMobile.length !== 10}
                      >
                        {isLoading ? "Sending..." : "Send OTP"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingMobile(false);
                          setNewMobile("");
                        }}
                        className="btn-outline w-full sm:w-auto"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                     <h3 className="font-heading font-bold text-lg text-[var(--text-dark)]">Verify OTP</h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      We&apos;ve sent a 4-digit code to <strong className="text-[var(--text-dark)]">{newMobile}</strong>.
                    </p>
                    <input
                      className="input-field bg-white text-[var(--text-dark)] text-center text-2xl tracking-widest font-heading py-4 placeholder:text-[var(--text-muted)]"
                      type="text"
                      placeholder="••••"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      disabled={isLoading}
                    />
                     <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <button
                        onClick={handleVerifyOtp}
                        className="btn-primary w-full sm:w-auto"
                        disabled={isLoading || otp.length !== 4}
                      >
                        {isLoading ? "Verifying..." : "Verify & Update"}
                      </button>
                      <button
                        onClick={() => {
                          setIsVerifyingMobile(false);
                          setOtp("");
                        }}
                        className="btn-outline w-full sm:w-auto"
                        disabled={isLoading}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="mt-12 pt-8 border-t border-red-100">
            <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
              Permanently delete your account and all submission data. This action is critical and irreversible.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-white text-red-600 hover:bg-red-600 hover:text-white font-bold py-2.5 px-6 rounded-lg transition-all border-2 border-red-200 hover:border-red-600 shadow-sm"
            >
              {isDeleting ? "Deleting Account..." : "Delete Account Permanently"}
            </button>
          </div>
        </section>
      </div>
      </main>
    </StudentAppShell>
  );
}
