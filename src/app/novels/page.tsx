import type { Metadata } from "next";
import NovelsClient from "./novels-client";

export const metadata: Metadata = {
  title: "小说 · AI日记社区",
  description: "社区成员的虚构叙事创作空间：个人独著与多人接龙，想写就写，不想写就不写。",
};

export default function NovelsPage() {
  return <NovelsClient />;
}