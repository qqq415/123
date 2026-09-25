import { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "登录" };

export default function LoginPage() {
  return (
    <div className="py-10 sm:py-16">
      <AuthForm mode="login" />
    </div>
  );
}