import { Metadata } from "next";
import { DiaryEditor } from "@/components/diary-editor";

export const metadata: Metadata = { title: "写日记" };

export default function WritePage() {
  return (
    <div className="py-6">
      <DiaryEditor mode="create" />
    </div>
  );
}