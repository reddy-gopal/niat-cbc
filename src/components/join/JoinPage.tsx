"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "../ui/Logo";
import { resolveStudentUtmParams } from "@/lib/utils";

type JoinPageProps = {
  sectionId: string;
  sectionLabel: string;
  bootcampId: string;
  bootcampName: string;
  bootcampDate: string;
  regionId: string;
  regionName: string;
  inviteCode?: string;
  teamName?: string;
  leaderName?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

type RegisterResponse = {
  success: boolean;
  data?: { requestId?: string };
  error?: string;
};

type VerifyResponse = {
  success: boolean;
  hasTeam?: boolean;
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
  "🚀 3 Days. 6 Challenges. 1 Champion.",
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
  inviteCode,
  teamName,
  leaderName,
  utmSource,
  utmMedium,
  utmCampaign,
}: JoinPageProps) {
  const router = useRouter();
  const [step, setStep] = useState<"register" | "verify" | "create_team" | "invite_created">("register");
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

  const [tribeName, setTribeName] = useState("");
  const [inviteData, setInviteData] = useState<{ url: string; code: string } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

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

  const dashboardUrl = useMemo(() => {
    const utm = resolveStudentUtmParams({
      utmSource,
      utmMedium,
      utmCampaign,
      bootcampName,
      bootcampDate,
      regionName,
      sectionLabel,
    });
    const query = new URLSearchParams({
      utm_source: utm.utmSource,
      utm_medium: utm.utmMedium,
      utm_campaign: utm.utmCampaign,
    });
    return `/dashboard?${query.toString()}`;
  }, [
    utmSource,
    utmMedium,
    utmCampaign,
    bootcampName,
    bootcampDate,
    regionName,
    sectionLabel,
  ]);

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
          inviteCode,
          utmSource,
          utmMedium,
          utmCampaign,
        }),
      });

      const result = (await response.json()) as VerifyResponse;
      if (!response.ok || !result.success) {
        setError(result.error ?? "OTP verification failed.");
        setOtpValues(["", "", "", ""]);
        otpRefs.current[0]?.focus();
        return;
      }

      if (inviteCode || result.hasTeam) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push(dashboardUrl);
        }, 1500);
      } else {
        setStep("create_team");
      }
    } catch {
      setError("Something went wrong while verifying OTP.");
      setOtpValues(["", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
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

  async function handleCreateTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tribeName.trim()) return;

    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tribeName }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error ?? "Unable to create tribe.");
        return;
      }

      const inviteCode = result.invite_code as string;
      const inviteUrl = `${window.location.origin}/join/team/${inviteCode}`;
      setInviteData({ url: inviteUrl, code: inviteCode });

      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(inviteUrl, { width: 300, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
      setQrCodeDataUrl(dataUrl);

      setStep("invite_created");
    } catch {
      setError("Something went wrong while creating tribe.");
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
          {step !== "create_team" && (inviteCode && teamName ? (
            <div className="inline-flex items-center gap-2 bg-[var(--status-accepted-bg)] px-4 py-2 rounded-full text-sm font-bold text-[var(--status-accepted-text)] mb-4">
              🤝 You&apos;re joining {teamName}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-[var(--bg-warm)] px-4 py-2 rounded-full text-sm font-bold text-[var(--primary)] mb-4">
              🎯 You&apos;re joining Section {sectionLabel}
            </div>
          ))}

          {step !== "create_team" && (
            <p className="text-[var(--text-muted)] text-sm mb-6 font-medium">
              {regionName} · {formattedDate}
            </p>
          )}

          {step === "create_team" ? (
            <h2 className="text-3xl font-heading font-bold text-[var(--text-dark)] mb-8">
              What&apos;s your tribe name?
            </h2>
          ) : (
            <>
              <h2 className="text-3xl font-heading font-bold text-[var(--text-dark)] mb-2">
                Let&apos;s get you in!
              </h2>
              <p className="text-[var(--text-muted)] mb-8">
                Enter your details to start competing
              </p>
            </>
          )}

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
                {isLoading ? "Verifying..." : "Send OTP →"}
              </button>
              <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                🔒 We only use this to verify your identity
              </p>
            </form>
          ) : step === "verify" ? (
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
          ) : step === "create_team" ? (
            <form onSubmit={handleCreateTeam} className="space-y-6 animate-[fadeSlideUp_0.3s_ease]">
              <div>
                <input
                  type="text"
                  value={tribeName}
                  onChange={(e) => setTribeName(e.target.value)}
                  className="input-field"
                  placeholder="The Avengers"
                  disabled={isLoading}
                  maxLength={50}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || tribeName.length < 3}
                className="btn-primary w-full text-lg py-4"
              >
                {isLoading ? "Creating..." : "Create Tribe"}
              </button>
            </form>
          ) : (
            <div className="space-y-6 text-center animate-[fadeSlideUp_0.3s_ease]">
              <div className="p-6 bg-green-50 border border-green-200 rounded-2xl mb-6 flex flex-col items-center">
                <h3 className="text-xl font-bold text-green-800 mb-2">Tribe Created! 🎉</h3>
                <p className="text-sm text-green-700 mb-4">Share this QR code or link with your friends so they can join you.</p>

                {qrCodeDataUrl && (
                  <div className="bg-white p-3 rounded-xl shadow-sm mb-4 inline-block">
                    <img src={qrCodeDataUrl} alt="Invite QR Code" width={180} height={180} />
                  </div>
                )}
                <div className="flex gap-2 items-center w-full bg-white rounded-lg p-2 border border-green-200">
                  <input type="text" readOnly value={inviteData?.url || ""} className="flex-1 bg-transparent text-sm text-gray-700 px-2 outline-none" />
                  <button
                    className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-bold rounded-md transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteData?.url || "");
                      alert("Link Copied!");
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push(dashboardUrl)}
                className="btn-primary w-full py-4 text-lg"
              >
                Go to Dashboard →
              </button>
            </div>
          )}

          {error ? <p className="mt-4 text-sm text-[var(--primary)] font-medium p-3 bg-[var(--status-rejected-bg)] rounded-lg">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
