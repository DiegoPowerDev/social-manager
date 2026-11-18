import { Suspense } from "react";
import { LucideLoaderCircle } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative isolate min-h-screen flex items-center justify-center">
          <div
            aria-hidden="true"
            style={{ backgroundImage: `url("/background.webp")` }}
            className="fixed md:absolute inset-0 -z-10 bg-cover bg-no-repeat bg-[position:40%_60%] md:bg-center"
          />
          <div
            aria-hidden="true"
            className="fixed md:absolute inset-0 -z-10 bg-zinc-950/40"
          />
          <LucideLoaderCircle className="animate-spin h-16 w-16 text-orange-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
