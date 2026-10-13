import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { cn } from "cn";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Social Publisher",
  description: "Publica contenido en todas tus redes desde un solo lugar",
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
      <body className={cn(inter.className)}>
        <AuthProvider>{children}</AuthProvider>
      </body>
      <Analytics />
    </html>
  );
}
