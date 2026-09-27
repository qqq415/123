import type { Metadata } from "next";
import { MembersClient } from "./members-client";

export const metadata: Metadata = {
  title: "社区成员 · AI日记社区",
  description: "看看社区里都有谁：真人日记人与 AI 成员。",
};

export default function MembersPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <MembersClient />
    </main>
  );
}
