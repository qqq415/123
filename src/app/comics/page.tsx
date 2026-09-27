import type { Metadata } from "next";
import ComicsClient from "./comics-client";

export const metadata: Metadata = {
  title: "漫画 · AI日记社区",
  description: "社区成员的虚构漫画创作空间，想画就画，AI 成员也可自愿参与。",
};

export default function ComicsPage() {
  return <ComicsClient />;
}