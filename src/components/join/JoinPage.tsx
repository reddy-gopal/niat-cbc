"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "../ui/Logo";

type JoinPageProps = {
  sectionId: string;
  sectionLabel: string;
  bootcampId: string;
  bootcampName: string;
  bootcampDate: string;
  regionId: string;
  regionName: string;
};

type RegisterResponse = {
  success: boolean;
  data?: { requestId?: string };
  error?: string;
};

type VerifyResponse = {
  success: boolean;
  error?: string;
};

const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(60, "Name must be at most 60 characters."),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
});

type RegisterValues = z.infer<typeof registerSchema>;

const MOTIVATIONAL_LINES = [
  "🏆 Compete. Connect. Conquer.",
  "🚀 3 Days. 9 Challenges. 1 Champion.",
  "🔥 Your section is counting on you."
];

export default function JoinPage({
  sectionId,
  sectionLabel,
  bootcampId,
  bootcampName,
  bootcampDate,
  regionId,
  regionName,
}: JoinPageProps) {
  const router = useRouter();
  const [step, setStep] = useState<"register" | "verify">("register");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    fullName: string;
    mobile: string;
    requestId?: string;
  } | null>(null);
  const [otpValues, setOtpValues] = useState(["", "", "", ""]);
  const [countdown, setCountdown] = useState(30);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MOTIVATIONAL_LINES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      mobile: "",
    },
  });

  const formattedDate = useMemo(
    () =>
      new Date(bootcampDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [bootcampDate]
  );

  useEffect(() => {
    if (step !== "verify" || countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [step, countdown]);

  async function onRegisterSubmit(values: RegisterValues) {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          mobile: values.mobile,
          sectionId,
          bootcampId,
          regionId,
        }),
      });
      const result = (await response.json()) as RegisterResponse;

      if (!response.ok || !result.success) {
        setError(result.error ?? "Unable to send OTP.");
        return;
      }

      setFormData({
        fullName: values.fullName,
        mobile: values.mobile,
        requestId: result.data?.requestId,
      });
      setOtpValues(["", "", "", ""]);
      setCountdown(30);
      setStep("verify");
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
    if (!formData) {
      return;
    }

    const otp = otpValues.join("");
    if (otp.length !== 4) {
      setError("Enter the 4-digit OTP.");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: formData.mobile,
          otp,
          fullName: formData.fullName,
          sectionId,
          bootcampId,
          regionId,
        }),
      });

      const result = (await response.json()) as VerifyResponse;
      if (!response.ok || !result.success) {
        setError(result.error ?? "OTP verification failed.");
        setOtpValues(["", "", "", ""]);
        otpRefs.current[0]?.focus();
        return;
      }
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch {
      setError("Something went wrong while verifying OTP.");
      setOtpValues(["", "", "", ""]);
      otpRefs.current[0]?.focus();
      setIsLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!formData || countdown > 0) {
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          mobile: formData.mobile,
          sectionId,
          bootcampId,
          regionId,
        }),
      });
      const result = (await response.json()) as RegisterResponse;

      if (!response.ok || !result.success) {
        setError(result.error ?? "Unable to resend OTP.");
        return;
      }

      setFormData((prev) =>
        prev ? { ...prev, requestId: result.data?.requestId } : prev
      );
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
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left Panel */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between" style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}>
        <div className="flex flex-col items-center justify-center flex-grow text-center">
          <Logo size="xl" className="mb-8 drop-shadow-md" />
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-12">
            Community Building Championship
          </h1>
          <div className="h-10">
            <p key={activeIndex} className="text-xl md:text-2xl text-white font-medium animate-[fadeSlideUp_0.5s_ease-out]">
              {MOTIVATIONAL_LINES[activeIndex]}
            </p>
          </div>
        </div>
        <div className="mt-auto self-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 text-white/90 text-sm font-semibold">
          {bootcampName} · {formattedDate}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-1/2 min-h-[65vh] md:min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* Section Info */}
          <div className="inline-flex items-center gap-2 bg-[var(--bg-warm)] px-4 py-2 rounded-full text-sm font-bold text-[var(--primary)] mb-4">
            🎯 You&apos;re joining Section {sectionLabel}
          </div>
          <p className="text-[var(--text-muted)] text-sm mb-6 font-medium">
            {regionName} · {formattedDate}
          </p>

          <h2 className="text-3xl font-heading font-bold text-[var(--text-dark)] mb-2">
            Let&apos;s get you in!
          </h2>
          <p className="text-[var(--text-muted)] mb-8">
            Enter your details to start competing
          </p>

          {isSuccess ? (
            <div className="bg-[var(--status-accepted-bg)] text-[var(--status-accepted-text)] p-6 rounded-2xl text-center animate-[fadeSlideUp_0.3s_ease]">
              <div className="text-4xl mb-4">✅</div>
              <p className="font-heading font-bold text-xl">Verified! Taking you in...</p>
            </div>
          ) : step === "register" ? (
            <form onSubmit={handleSubmit(onRegisterSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                  👤 Your Full Name
                </label>
                <input
                  {...register("fullName")}
                  className="input-field"
                  placeholder="John Doe"
                  disabled={isLoading}
                  suppressHydrationWarning
                />
                {errors.fullName ? (
                  <p className="mt-1 text-sm text-[var(--primary)] font-medium">
                    {errors.fullName.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                  📱 Mobile Number
                </label>
                <input
                  {...register("mobile")}
                  inputMode="numeric"
                  maxLength={10}
                  className="input-field"
                  placeholder="9876543210"
                  disabled={isLoading}
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
                className="btn-primary w-full text-lg mt-2 py-4"
                suppressHydrationWarning
              >
                {isLoading ? "Sending..." : "Send OTP →"}
              </button>
              <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                🔒 We only use this to verify your identity
              </p>
            </form>
          ) : (
            <form onSubmit={onVerifySubmit} className="space-y-6 animate-[fadeSlideUp_0.3s_ease]">
              <div className="bg-[var(--teal)]/10 text-[var(--teal)] px-4 py-3 rounded-xl text-sm font-medium border border-[var(--teal)]/20">
                📲 OTP sent to +91 {formData?.mobile}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setStep("register");
                    setError(null);
                  }}
                  className="underline ml-2 hover:text-[var(--teal)]/80"
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
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(event, index)}
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
                className="btn-primary w-full text-lg py-4"
                suppressHydrationWarning
              >
                {isLoading ? "Verifying..." : "Let's Go! 🚀"}
              </button>

              <div className="text-center text-sm">
                {countdown > 0 ? (
                  <span className="text-[var(--text-muted)] font-medium">🕐 Resend OTP in {countdown}s</span>
                ) : (
                  <span className="text-[var(--text-muted)]">
                    Didn&apos;t get it?{" "}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-[var(--link)] hover:text-[var(--link-hover)] font-bold transition-colors"
                      disabled={isLoading}
                      suppressHydrationWarning
                    >
                      Resend OTP
                    </button>
                  </span>
                )}
              </div>
            </form>
          )}

          {error ? <p className="mt-4 text-sm text-[var(--primary)] font-medium p-3 bg-[var(--status-rejected-bg)] rounded-lg">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
