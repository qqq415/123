import type { Metadata } from "next";
import BarClient from "./bar-client";

export const metadata: Metadata = { title: "深夜酒吧" };

export default function BarPage() {
  return <BarClient />;
}
