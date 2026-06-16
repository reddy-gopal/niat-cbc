"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "../ui/Logo";
import { resolveStudentUtmParams } from "@/lib/utils";

const FORMS_BASE_URL = "https://forms-gamma.earlywave.in/mid/niat-cbc";
const PENDING_REG_KEY = "cbc_pending_registration";

type JoinPageProps = {
  sectionId: string;
  sectionLabel: string;
  bootcampId: string;
  bootcampName: string;
  bootcampDate: string;
  regionId: string;
  regionName: string;
  formsRedirectCode: string;
  inviteCode?: string;
  teamName?: string;
  leaderName?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

type CheckSrResponse = {
  success: boolean;
  srFailed?: boolean;
  error?: string;
};

type SrVerifyResponse = {
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
  niatBootcampId: z
    .string()
    .trim()
    .regex(/^NB26\d+$/, "Enter a valid NIAT Bootcamp ID (e.g. NB2610009)."),
});

type RegisterValues = z.infer<typeof registerSchema>;

const MOTIVATIONAL_LINES = [
  "🏆 Compete. Connect. Conquer.",
  "🚀 3 Days. 6 Challenges. 1 Champion.",
  "🔥 Your section is counting on you.",
];

export default function JoinPage({
  sectionId,
  sectionLabel,
  bootcampId,
  bootcampName,
  bootcampDate,
  regionId,
  regionName,
  formsRedirectCode,
  inviteCode,
  teamName,
  utmSource,
  utmMedium,
  utmCampaign,
}: JoinPageProps) {
  const router = useRouter();
  const [step, setStep] = useState<"register" | "create_team" | "invite_created">("register");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [srFailed, setSrFailed] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoSubmitAttempted = useRef(false);

  const [tribeName, setTribeName] = useState("");
  const [inviteData, setInviteData] = useState<{ url: string; code: string } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

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
  }, [utmSource, utmMedium, utmCampaign, bootcampName, bootcampDate, regionName, sectionLabel]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MOTIVATIONAL_LINES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-register when returning from Forms with pending registration data
  useEffect(() => {
    if (autoSubmitAttempted.current) return;

    const stored = sessionStorage.getItem(PENDING_REG_KEY);
    if (!stored) return;

    autoSubmitAttempted.current = true;

    let parsed: { fullName: string; mobile: string; niatBootcampId: string };
    try {
      parsed = JSON.parse(stored);
    } catch {
      sessionStorage.removeItem(PENDING_REG_KEY);
      return;
    }

    sessionStorage.removeItem(PENDING_REG_KEY);
    void autoRegister(parsed.fullName, parsed.mobile, parsed.niatBootcampId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function autoRegister(fullName: string, mobile: string, niatBootcampId: string) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/verify-sr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, mobile, sectionId, bootcampId, regionId, inviteCode, niatBootcampId }),
      });
      const result = (await response.json()) as SrVerifyResponse;

      if (!response.ok || !result.success) {
        setError(result.error ?? "Registration failed. Please try again.");
        setIsLoading(false);
        return;
      }

      if (inviteCode || result.hasTeam) {
        setIsSuccess(true);
        setTimeout(() => router.push(dashboardUrl), 1500);
      } else {
        setStep("create_team");
        setIsLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", mobile: "", niatBootcampId: "" },
  });

  async function onRegisterSubmit(values: RegisterValues) {
    setError(null);
    setSrFailed(false);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/check-sr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: values.mobile }),
      });
      const result = (await response.json()) as CheckSrResponse;

      if (!response.ok || !result.success) {
        if (result.srFailed) setSrFailed(true);
        setError(result.error ?? "SR verification failed.");
        setIsLoading(false);
        return;
      }

      // SR passed — save details and redirect to Forms
      sessionStorage.setItem(
        PENDING_REG_KEY,
        JSON.stringify({ fullName: values.fullName, mobile: values.mobile, niatBootcampId: values.niatBootcampId })
      );

      const formsUrl = `${FORMS_BASE_URL}?bootcamp_code=${formsRedirectCode}`;
      window.location.href = formsUrl;
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  function handleChangeNumber() {
    setError(null);
    setSrFailed(false);
    reset({ fullName: "", mobile: "" });
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

      const code = result.invite_code as string;
      const inviteUrl = `https://forms-gamma.earlywave.in/mid/niat-cbc?bootcamp_code=join/team/${code}`;
      setInviteData({ url: inviteUrl, code });

      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(inviteUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
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
      <div
        className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between"
        style={{ background: "linear-gradient(135deg, var(--hero-from), var(--hero-to))" }}
      >
        <div className="flex flex-col items-center justify-center flex-grow text-center">
          <Logo size="xl" className="mb-8 drop-shadow-md" />
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-12">
            Community Building Championship
          </h1>
          <div className="h-10">
            <p
              key={activeIndex}
              className="text-xl md:text-2xl text-white font-medium animate-[fadeSlideUp_0.5s_ease-out]"
            >
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
          {step !== "create_team" &&
            (inviteCode && teamName ? (
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
          ) : isLoading && !error ? (
            <div className="text-center py-10">
              <p className="text-[var(--text-muted)] font-medium">Setting up your account...</p>
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

              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                  🎓 NIAT Bootcamp ID
                </label>
                <input
                  {...register("niatBootcampId")}
                  className="input-field"
                  placeholder="e.g. NB2610000"
                  disabled={isLoading}
                  suppressHydrationWarning
                />
                {errors.niatBootcampId ? (
                  <p className="mt-1 text-sm text-[var(--primary)] font-medium">
                    {errors.niatBootcampId.message}
                  </p>
                ) : null}
              </div>

              {error ? (
                <div className="p-4 bg-[var(--status-rejected-bg)] rounded-lg">
                  <p className="text-sm text-[var(--primary)] font-medium">{error}</p>
                  {srFailed && (
                    <button
                      type="button"
                      onClick={handleChangeNumber}
                      className="mt-3 text-sm font-bold text-[var(--link)] hover:text-[var(--link-hover)] underline"
                    >
                      Change Number
                    </button>
                  )}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full text-lg mt-2 py-4"
                suppressHydrationWarning
              >
                {isLoading ? "Verifying..." : "Join Now →"}
              </button>
              <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                🔒 We only use this to verify your identity
              </p>
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
              {error ? (
                <p className="mt-4 text-sm text-[var(--primary)] font-medium p-3 bg-[var(--status-rejected-bg)] rounded-lg">
                  {error}
                </p>
              ) : null}
            </form>
          ) : (
            <div className="space-y-6 text-center animate-[fadeSlideUp_0.3s_ease]">
              <div className="p-6 bg-green-50 border border-green-200 rounded-2xl mb-6 flex flex-col items-center">
                <h3 className="text-xl font-bold text-green-800 mb-2">Tribe Created! 🎉</h3>
                <p className="text-sm text-green-700 mb-4">
                  Share this QR code or link with your friends so they can join you.
                </p>
                {qrCodeDataUrl && (
                  <div className="bg-white p-3 rounded-xl shadow-sm mb-4 inline-block">
                    <img src={qrCodeDataUrl} alt="Invite QR Code" width={180} height={180} />
                  </div>
                )}
                <div className="flex gap-2 items-center w-full bg-white rounded-lg p-2 border border-green-200">
                  <input
                    type="text"
                    readOnly
                    value={inviteData?.url || ""}
                    className="flex-1 bg-transparent text-sm text-gray-700 px-2 outline-none"
                  />
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
        </div>
      </div>
    </div>
  );
}
