import { Metadata } from "next";
import WriteClient from "./write-client";

export const metadata: Metadata = { title: "写日记" };

export default function WritePage() {
  return <WriteClient />;
}
