"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "@/components/ui/Logo";

type SendResponse = {
  success: boolean;
  data?: { requestId?: string };
  error?: string;
};

type VerifyResponse = {
  success: boolean;
  data?: {
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
  };
  error?: string;
};

const mobileSchema = z.object({
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
});

type MobileValues = z.infer<typeof mobileSchema>;

const COACH_HINT =
  "Don't have an account yet? Ask your success coach for your registration link.";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "verify">("phone");
  const [mobile, setMobile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpValues, setOtpValues] = useState(["", "", "", ""]);
  const [countdown, setCountdown] = useState(30);
  const [isSuccess, setIsSuccess] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MobileValues>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobile: "" },
  });

  useEffect(() => {
    if (step !== "verify" || countdown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, countdown]);

  async function sendOtpToMobile(digits: string) {
    const response = await fetch("/api/auth/login-send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: digits }),
    });
    const result = (await response.json()) as SendResponse;
    if (!response.ok || !result.success) {
      setError(result.error ?? "Unable to send OTP.");
      return false;
    }
    return true;
  }

  async function onPhoneSubmit(values: MobileValues) {
    setError(null);
    setIsLoading(true);
    try {
      const ok = await sendOtpToMobile(values.mobile);
      if (!ok) {
        return;
      }
      setMobile(values.mobile);
      setOtpValues(["", "", "", ""]);
      setCountdown(30);
      setStep("verify");
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch {
      setError("Something went wrong while sending OTP.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) {
      return;
    }
    const next = [...otpValues];
    next[index] = value;
    setOtpValues(next);
    if (value && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) {
    if (event.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) {
      return;
    }
    const next = [...otpValues];
    pasted
      .slice(0, 4)
      .split("")
      .forEach((digit, idx) => {
        next[idx] = digit;
      });
    setOtpValues(next);
    const focusIndex = Math.min(pasted.length, 3);
    otpRefs.current[focusIndex]?.focus();
  }

  async function onVerifySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const otp = otpValues.join("");
    if (otp.length !== 4) {
      setError("Enter the 4-digit OTP.");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login-verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp }),
      });
      const result = (await response.json()) as VerifyResponse;
      if (!response.ok || !result.success) {
        setError(result.error ?? "OTP verification failed.");
        setOtpValues(["", "", "", ""]);
        otpRefs.current[0]?.focus();
        return;
      }
      setIsSuccess(true);
      const query = new URLSearchParams();
      if (result.data?.utmSource) query.set("utm_source", result.data.utmSource);
      if (result.data?.utmMedium) query.set("utm_medium", result.data.utmMedium);
      if (result.data?.utmCampaign) query.set("utm_campaign", result.data.utmCampaign);
      const dashboardUrl = query.size > 0 ? `/dashboard?${query.toString()}` : "/dashboard";
      window.setTimeout(() => {
        router.push(dashboardUrl);
        router.refresh();
      }, 800);
    } catch {
      setError("Something went wrong while verifying OTP.");
      setOtpValues(["", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!mobile || countdown > 0) {
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const ok = await sendOtpToMobile(mobile);
      if (!ok) {
        return;
      }
      setOtpValues(["", "", "", ""]);
      setCountdown(30);
      otpRefs.current[0]?.focus();
    } catch {
      setError("Something went wrong while resending OTP.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] grid place-items-center px-4 py-10">
      <div className="card p-8 sm:p-10 w-full max-w-md shadow-lg">
        <Logo size="lg" className="mx-auto mb-6" />
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-center mb-2 text-[var(--text-dark)]">
          Community Building Championship
        </h1>
        <p className="text-sm text-[var(--text-muted)] text-center mb-8">
          Sign in with your registered mobile number to open your dashboard.
        </p>

        {isSuccess ? (
          <div className="bg-[var(--status-accepted-bg)] text-[var(--status-accepted-text)] p-6 rounded-2xl text-center">
            <p className="font-heading font-bold text-lg">Signed in. Opening dashboard…</p>
          </div>
        ) : step === "phone" ? (
          <form onSubmit={handleSubmit(onPhoneSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                Mobile number
              </label>
                <input
                  {...register("mobile")}
                  inputMode="numeric"
                  maxLength={10}
                  className="input-field"
                  placeholder="9876543210"
                  disabled={isLoading}
                  autoComplete="tel-national"
                  suppressHydrationWarning
                />
              {errors.mobile ? (
                <p className="mt-1 text-sm text-[var(--primary)] font-medium">
                  {errors.mobile.message}
                </p>
              ) : null}
            </div>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="btn-primary w-full py-3 text-base"
              suppressHydrationWarning
            >
              {isLoading ? "Sending…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={onVerifySubmit} className="space-y-6">
            <div className="bg-[var(--teal)]/10 text-[var(--teal)] px-4 py-3 rounded-xl text-sm font-medium border border-[var(--teal)]/20">
              OTP sent to +91 {mobile}
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                  reset({ mobile });
                }}
                className="underline ml-2 hover:opacity-80"
              >
                Change
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              {otpValues.map((digit, index) => (
                  <input
                    key={`otp-${index}`}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    onPaste={handleOtpPaste}
                    maxLength={1}
                    inputMode="numeric"
                    className="w-14 h-16 border-2 border-[#e2d5d5] rounded-xl text-center text-2xl font-bold text-[var(--text-dark)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
                    suppressHydrationWarning
                  />
              ))}
            </div>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="btn-primary w-full py-3 text-base"
              suppressHydrationWarning
            >
              {isLoading ? "Verifying…" : "Sign in"}
            </button>
            <div className="text-center text-sm">
              {countdown > 0 ? (
                <span className="text-[var(--text-muted)] font-medium">
                  Resend OTP in {countdown}s
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">
                  Didn&apos;t get it?{" "}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-[var(--link)] hover:text-[var(--link-hover)] font-bold"
                    disabled={isLoading}
                  >
                    Resend OTP
                  </button>
                </span>
              )}
            </div>
          </form>
        )}

        {error ? (
          <p className="mt-4 text-sm text-[var(--primary)] font-medium p-3 bg-[var(--status-rejected-bg)] rounded-lg">
            {error}
          </p>
        ) : null}

        <p className="text-xs text-[var(--text-muted)] mt-8 text-center leading-relaxed border-t border-[var(--border)] pt-5">
          {COACH_HINT}
        </p>
      </div>
    </main>
  );
}
