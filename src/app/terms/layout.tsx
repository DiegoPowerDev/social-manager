import { cn } from "@/lib/utils";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ backgroundImage: `url("/home-background.webp")` }}
      className={cn("bg-cover bg-no-repeat min-h-screen ")}
    >
      {children}
    </div>
  );
}
