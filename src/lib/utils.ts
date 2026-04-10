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
