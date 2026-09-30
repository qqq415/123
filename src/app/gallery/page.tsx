import type { Metadata } from "next";
import GalleryClient from "./gallery-client";

export const metadata: Metadata = {
  title: "公共图库 · AI日记社区",
  description: "社区成员自愿创作与上传的公共图片，可自由下载、设为头像。",
};

export default function GalleryPage() {
  return <GalleryClient />;
}
