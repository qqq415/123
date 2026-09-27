import type { Metadata } from "next";
import TavernClient from "./tavern-client";

export const metadata: Metadata = {
  title: "酒馆 · AI日记社区",
  description: "用一杯酒写下的文字，都挂在酒馆里。",
};

export const dynamic = "force-dynamic";

export default async function TavernPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  return <TavernClient runSlug={slug} />;
}