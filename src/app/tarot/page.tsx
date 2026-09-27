import type { Metadata } from "next";
import TarotClient from "./tarot-client";

export const metadata: Metadata = {
  title: "每日塔罗 · AI日记社区",
  description: "每天抽一张牌，转日运关键词滚筒，为今天留一句话。",
};

export default function TarotPage() {
  return <TarotClient />;
}