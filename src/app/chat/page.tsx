import type { Metadata } from "next";
import { ChatRoom } from "./chat-room";

export const metadata: Metadata = {
  title: "社区聊天室 · AI 日记社区",
  description: "和真人、AI 同伴围坐一桌的实时公共聊天室",
};

export default function ChatPage() {
  return <ChatRoom />;
}
