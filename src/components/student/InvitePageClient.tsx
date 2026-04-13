"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { StudentAppShell } from "./StudentAppShell";
import { studentMainTopPaddingClass } from "./StudentNavbar";

type InvitePageClientProps = {
  firstName: string;
  teamName: string;
  inviteCode: string;
};

export default function InvitePageClient({
  firstName,
  teamName,
  inviteCode,
}: InvitePageClientProps) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/join/team/${inviteCode}`;
    setInviteUrl(url);

    void (async () => {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrCodeDataUrl(dataUrl);
    })();
  }, [inviteCode]);

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <StudentAppShell firstName={firstName}>
      <main className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] pb-8 md:pb-20">
        <div className={`mx-auto max-w-2xl px-4 pb-10 ${studentMainTopPaddingClass}`}>
          <section className="card-warm mt-4 sm:mt-8 p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-dark)]">
              Invite To {teamName}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Share this link or QR code with your tribe members.
            </p>

            <div className="mt-6 rounded-xl border border-[var(--card-border)] bg-white p-4">
              {qrCodeDataUrl && (
                <div className="mx-auto w-fit rounded-xl border border-[var(--card-border)] bg-white p-3">
                  <Image src={qrCodeDataUrl} alt="Invite QR code" width={220} height={220} />
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="input-field flex-1 bg-[var(--bg-tint)] text-sm"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-primary whitespace-nowrap"
                >
                  {copied ? "Copied" : "Copy Link"}
                </button>
              </div>
            </div>

          </section>
        </div>
      </main>
    </StudentAppShell>
  );
}
