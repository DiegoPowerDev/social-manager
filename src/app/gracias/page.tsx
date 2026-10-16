import Link from "next/link";
import HomeHeader from "@/components/layout/homeHeader";
import HomeFooter from "@/components/layout/homeFooter";

export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ paypal?: string }>;
}) {
  const params = await searchParams;
  const success = params.paypal === "success";
  const cancel = params.paypal === "cancel";

  return (
    <div className="min-h-screen text-slate-900">
      <HomeHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        {success && (
          <>
            <h1 className="text-3xl font-bold tracking-tight">
              Gracias por suscribirte
            </h1>
            <p className="mt-4 text-slate-600">
              PayPal está confirmando tu pago. En unos minutos activaremos tu
              cuenta (o actualizaremos el plan de tu empresa). Revisa tu correo;
              si ya tenías sesión, entra al panel.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-300"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Ir al dashboard
              </Link>
            </div>
          </>
        )}

        {cancel && (
          <>
            <h1 className="text-3xl font-bold tracking-tight">
              Pago cancelado
            </h1>
            <p className="mt-4 text-slate-600">
              No se realizó ningún cargo. Puedes elegir otro plan cuando
              quieras.
            </p>
            <Link
              href="/plans"
              className="mt-8 rounded-full bg-amber-400 px-6 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-300"
            >
              Ver planes
            </Link>
          </>
        )}

        {!success && !cancel && (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Gracias</h1>
            <p className="mt-4 text-slate-600">
              Si acabas de pagar con PayPal, la activación puede tardar unos
              minutos.
            </p>
            <Link href="/" className="mt-8 text-sm font-medium underline">
              Volver al inicio
            </Link>
          </>
        )}
      </main>
      <HomeFooter />
    </div>
  );
}
