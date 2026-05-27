import { notFound } from "next/navigation";
import { FramePreview } from "@/components/personal-video/dev/FramePreview";

export default function FramePreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <FramePreview />;
}
