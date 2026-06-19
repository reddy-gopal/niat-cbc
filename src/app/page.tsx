import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getStudentSession, signStudentSession } from "@/lib/session";
import { validateAuthToken } from "@/lib/auth-token";
import { adminClient } from "../../utils/supabase/admin";
import LoginPage from "@/components/login/LoginPage";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getStudentSession();
  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const authToken = typeof params.auth_token === "string" ? params.auth_token : null;
  const bootcampCode = typeof params.bootcamp_code === "string" ? params.bootcamp_code : null;

  if (authToken) {
    const result = await validateAuthToken(authToken);

    if (result.valid && result.userId) {
      const { data: student } = await adminClient
        .from("students")
        .select(
          "id, full_name, mobile, section_id, bootcamp_id, region_id, utm_source, utm_medium, utm_campaign"
        )
        .eq("id", result.userId)
        .maybeSingle();

      if (student) {
        // Existing student — log in and send to dashboard
        const token = await signStudentSession({
          studentId: student.id as string,
          sectionId: student.section_id as string,
          bootcampId: student.bootcamp_id as string,
          regionId: student.region_id as string,
          fullName: student.full_name as string,
          mobile: student.mobile as string,
          utmSource: (student.utm_source as string | null) ?? undefined,
          utmMedium: (student.utm_medium as string | null) ?? undefined,
          utmCampaign: (student.utm_campaign as string | null) ?? undefined,
        });

        const cookieStore = await cookies();
        cookieStore.set("cbc_student", token, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 604800,
          secure: process.env.NODE_ENV === "production",
        });

        redirect("/dashboard");
      }

      // New student — send to join page for SR verification + registration
      if (bootcampCode) {
        redirect(`/${bootcampCode}`);
      }
    }
  }

  return <LoginPage />;
}
