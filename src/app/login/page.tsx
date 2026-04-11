import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/session";
import LoginPage from "@/components/login/LoginPage";

export default async function StudentLoginPage() {
  const session = await getStudentSession();
  if (session) {
    redirect("/dashboard");
  }

  return <LoginPage />;
}
