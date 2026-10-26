import { Suspense } from "react";
import { LucideLoaderCircle } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LucideLoaderCircle className="animate-spin h-16 w-16 text-orange-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
