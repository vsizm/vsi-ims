import { redirect } from "next/navigation";

export default function LegacyWorkflowRedirect() {
  redirect("/dashboard/programmes");
}
