export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ backgroundImage: `url("/background.webp")` }}
      className="bg-cover bg-no-repeat"
    >
      {children}
    </div>
  );
}
