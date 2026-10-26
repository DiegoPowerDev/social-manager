import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { cn } from "@/lib/utils";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "TrendlyStudio",
    template: "%s · TrendlyStudio",
  },
  description:
    "Publica y programa contenido en Facebook, Instagram, LinkedIn, YouTube y TikTok desde un solo lugar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className="bg-black" lang="es">
      <head>
        <meta
          name="google-site-verification"
          content="UyDJJu7xPKsoAR5uGANsl3aasyjDcsLlllKXYiAjiWc"
        />
      </head>
      <body className={cn(inter.className, "min-h-screen antialiased")}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            richColors={false}
            closeButton
            duration={4000}
            icons={{
              success: <CheckCircle2 className="h-4 w-4 text-yellow-500" />,
              error: <XCircle className="h-4 w-4 text-red-500" />,
              loading: (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ),
            }}
            toastOptions={{
              classNames: {
                toast:
                  "group border border-white/10 bg-zinc-900 text-zinc-50 shadow-lg shadow-black/40",
                title: "text-sm font-medium text-zinc-50",
                description: "text-xs text-zinc-400",
                actionButton: "bg-yellow-500 text-black hover:bg-yellow-400",
                cancelButton: "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
                closeButton:
                  "bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700",
                success: "border-yellow-500/30 bg-zinc-900",
                error: "border-red-500/40 bg-zinc-900",
                loading: "border-white/10 bg-zinc-900",
              },
            }}
          />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
