export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ backgroundImage: `url("/home-background.webp")` }}
      className="bg-cover bg-center bg-no-repeat min-h-screen max-w-full"
    >
      {children}
    </div>
  );
}
