export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate min-h-screen max-w-full">
      {/* Fondo: fijo en móvil, estirado en toda la página desde md */}
      <div
        aria-hidden="true"
        style={{ backgroundImage: `url("/home-background.webp")` }}
        className="fixed md:absolute inset-0 -z-10 bg-cover bg-no-repeat bg-[position:40%_60%] md:bg-center"
      />
      {children}
    </div>
  );
}
