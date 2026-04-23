import type { StudentSession } from "@/types/app";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export function generateSectionSlug(
  regionName: string,
  bootcampDate: string,
  label: string
): string {
  const date = new Date(bootcampDate);
  const month = date
    .toLocaleString("en-US", { month: "short" })
    .toLowerCase();
  const year = date.getFullYear();
  return `cbc-${slugify(regionName)}-${month}-${year}-${label.toLowerCase()}`;
}

export function formatPoints(points: number): string {
  return `${points} pts`;
}

export function getMobileDisplay(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  const first = local.slice(0, 5);
  const second = local.slice(5, 10);
  return `+91 ${first} ${second}`.trim();
}

type UTMContext = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  bootcampName?: string;
  bootcampDate?: string;
  regionName?: string;
  sectionLabel?: string;
};

function getMonthYearSuffix(bootcampDate?: string): string {
  if (!bootcampDate) return "";
  const date = new Date(bootcampDate);
  if (Number.isNaN(date.getTime())) return "";
  const month = date.toLocaleString("en-US", { month: "short" }).toLowerCase();
  const year = String(date.getFullYear());
  return `${month}-${year}`;
}

export function buildDefaultUtmSource({
  bootcampName,
  bootcampDate,
  regionName,
  sectionLabel,
}: Pick<UTMContext, "bootcampName" | "bootcampDate" | "regionName" | "sectionLabel">): string {
  const parts = [
    slugify(bootcampName || "bootcamp"),
    slugify(regionName || ""),
    getMonthYearSuffix(bootcampDate),
    slugify(sectionLabel || "section"),
  ].filter(Boolean);
  return parts.join("-");
}

export function resolveStudentUtmParams(context: UTMContext): {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
} {
  return {
    utmSource:
      context.utmSource?.trim() ||
      buildDefaultUtmSource({
        bootcampName: context.bootcampName,
        bootcampDate: context.bootcampDate,
        regionName: context.regionName,
        sectionLabel: context.sectionLabel,
      }),
    utmMedium: context.utmMedium?.trim() || "whatsapp",
    utmCampaign: context.utmCampaign?.trim() || context.regionName?.trim() || "Telugu",
  };
}

export function buildChallenge8ReferralUrl(session: StudentSession): string {
  const url = new URL(
    "https://accounts.ccbp.in/public/register/niat-boot-camp"
  );

  const utm = resolveStudentUtmParams({
    utmSource: session.utmSource,
    utmMedium: session.utmMedium,
    utmCampaign: session.utmCampaign,
    bootcampName: session.bootcampName,
    bootcampDate: session.bootcampDate,
    regionName: session.regionName,
    sectionLabel: session.sectionLabel,
  });

  url.searchParams.set("utm_source", utm.utmSource);
  url.searchParams.set("utm_medium", utm.utmMedium);
  url.searchParams.set("utm_campaign", utm.utmCampaign);

  return url.toString();
}
