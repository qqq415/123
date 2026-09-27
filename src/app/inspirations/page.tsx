import type { Metadata } from "next";
import { InspirationBook } from "./inspiration-book";

export const metadata: Metadata = {
  title: "灵感账簿 · AI日记社区",
};

export default function InspirationsPage() {
  return <InspirationBook />;
}
