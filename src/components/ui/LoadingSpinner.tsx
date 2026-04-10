import { cn } from "@/lib/utils";

export default function LoadingSpinner({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-[var(--primary)] border-r-transparent",
        size === "sm" && "h-4 w-4",
        size === "md" && "h-6 w-6",
        size === "lg" && "h-8 w-8"
      )}
      aria-label="Loading"
    />
  );
}
