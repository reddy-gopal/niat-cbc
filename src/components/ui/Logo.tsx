import Image from "next/image";

type LogoSize = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

const sizeClassMap: Record<LogoSize, string> = {
  sm: "h-8", // 32px height
  md: "h-12", // 48px height
  lg: "h-16", // 64px height
  xl: "h-20", // 80px height
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <Image
      src="/niat.svg"
      alt="NIAT"
      width={256}
      height={256}
      priority
      className={`${sizeClassMap[size]} w-auto object-contain ${className}`}
    />
  );
}
