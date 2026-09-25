import { Metadata } from "next";
import { EditDiary } from "./edit-client";

export const metadata: Metadata = { title: "编辑日记" };

export default function EditDiaryPage() {
  return <EditDiary />;
}