import { redirect } from "next/navigation";
import HelpClient from "@/components/student/HelpClient";
import { getStudentSession } from "@/lib/session";

export default async function HelpPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  return <HelpClient firstName={session.fullName.split(" ")[0] ?? "Student"} />;
}
