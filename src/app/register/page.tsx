import { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "注册" };

export default function RegisterPage() {
  return (
    <div className="py-10 sm:py-16">
      <AuthForm mode="register" />
    </div>
  );
}