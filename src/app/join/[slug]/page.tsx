import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import JoinPage from "@/components/join/JoinPage";
import { getStudentSession } from "@/lib/session";
import { createClient } from "../../../../utils/supabase/server";

type JoinRouteProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }>;
};

const normalizeUtmValue = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const getSectionBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sections")
    .select(
      `
      id,
      label,
      slug,
      bootcamp_id,
      bootcamps:bootcamp_id (
        id,
        name,
        date,
        region_id,
        regions:region_id (
          id,
          name
        )
      )
    `
    )
    .eq("slug", slug)
    .maybeSingle();

  return data as
    | {
        id: string;
        label: string;
        bootcamp_id: string;
        bootcamps: {
          id: string;
          name: string;
          date: string;
          region_id: string;
          regions: { id: string; name: string } | null;
        } | null;
      }
    | null;
});

export async function generateMetadata({ params }: JoinRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const sectionData = await getSectionBySlug(slug);
  if (!sectionData || !sectionData.bootcamps) {
    return {
      title: "Join — NIAT CBC",
      description: "Join NIAT Community Building Championship",
    };
  }

  const title = `${sectionData.bootcamps.name} — NIAT CBC`;
  const description = `Join Section ${sectionData.label} for the Community Building Championship`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function JoinSlugPage({ params, searchParams }: JoinRouteProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const session = await getStudentSession();

  if (session) {
    redirect("/dashboard");
  }

  const sectionData = await getSectionBySlug(slug);

  if (!sectionData || !sectionData.bootcamps || !sectionData.bootcamps.regions) {
    redirect("/invalid");
  }

  return (
    <JoinPage
      sectionId={sectionData.id}
      sectionLabel={sectionData.label}
      bootcampId={sectionData.bootcamps.id}
      bootcampName={sectionData.bootcamps.name}
      bootcampDate={sectionData.bootcamps.date}
      regionId={sectionData.bootcamps.regions.id}
      regionName={sectionData.bootcamps.regions.name}
      utmSource={normalizeUtmValue(resolvedSearchParams.utm_source)}
      utmMedium={normalizeUtmValue(resolvedSearchParams.utm_medium)}
      utmCampaign={normalizeUtmValue(resolvedSearchParams.utm_campaign)}
    />
  );
}
