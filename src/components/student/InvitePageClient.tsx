"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { StudentAppShell } from "./StudentAppShell";
import { studentMainTopPaddingClass } from "./StudentNavbar";

type Member = {
  fullName: string;
  joinedAt: string;
};

type InvitePageClientProps = {
  firstName: string;
  teamName: string;
  inviteCode: string;
  members: Member[];
};

export default function InvitePageClient({
  firstName,
  teamName,
  inviteCode,
  members,
}: InvitePageClientProps) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = `https://niat-cbc.vercel.app/?bootcamp_code=join/team/${inviteCode}`;
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
  }

  return (
    <StudentAppShell firstName={firstName}>
      <main className="min-h-screen bg-[var(--bg-tint)] text-[var(--text-base)] pb-8 md:pb-20">
        <div className={`mx-auto max-w-2xl px-4 pb-10 ${studentMainTopPaddingClass}`}>
          
          {/* Main Invite Card */}
          <section className="card-warm mt-4 sm:mt-8 p-6 sm:p-8 mb-10">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-dark)]">
              Invite To {teamName}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Share this link or QR code with your tribe members.
            </p>

            <div className="mt-8 rounded-xl border border-[var(--card-border)] bg-white p-6 shadow-sm">
              {qrCodeDataUrl && (
                <div className="mx-auto w-fit rounded-xl border border-[var(--card-border)] bg-white p-3 shadow-inner">
                  <Image src={qrCodeDataUrl} alt="Invite QR code" width={220} height={220} />
                </div>
              )}

              <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="input-field flex-1 bg-[var(--bg-tint)] text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-primary whitespace-nowrap px-8"
                >
                  {copied ? "Copied! ✨" : "Copy Link"}
                </button>
              </div>
            </div>
          </section>

          {/* Members List Section */}
          <section className="card-warm p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold text-[var(--text-dark)] flex items-center gap-3">
                👥 Tribe Members
                <span className="bg-[var(--bg-warm)] text-[var(--primary)] text-xs px-3 py-1 rounded-full border border-[var(--primary)]/10">
                  {members.length}
                </span>
              </h2>
            </div>
            
            <div className="space-y-3">
              {members.map((member, i) => (
                <div 
                  key={`${member.fullName}-${member.joinedAt}`}
                  className="flex items-center justify-between p-4 bg-white border border-[var(--card-border)] rounded-xl shadow-sm transition-all hover:border-[var(--primary)]/30 group"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {member.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-dark)] group-hover:text-[var(--primary)] transition-colors">
                        {member.fullName}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
                        Joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-[var(--primary)] bg-[var(--bg-warm)] px-2 py-1 rounded border border-[var(--primary)]/20 uppercase tracking-tighter">
                    Status: Active
                  </div>
                </div>
              ))}
              
              {members.length === 0 && (
                <div className="text-center py-12 bg-[var(--bg-tint)] rounded-2xl border-2 border-dashed border-[var(--card-border)]">
                  <p className="text-sm text-[var(--text-muted)] font-medium italic">No tribesmen have joined the hunt yet. 🏹</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>
    </StudentAppShell>
  );
}
