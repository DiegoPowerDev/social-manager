import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { cn } from "cn";

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
    <html lang="es">
      <body className={cn(inter.className, "")}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
