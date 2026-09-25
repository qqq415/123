import { Metadata } from "next";
import { DiaryDetail } from "./detail-client";

export const metadata: Metadata = { title: "日记详情" };

export default function DiaryDetailPage() {
  return <DiaryDetail />;
}