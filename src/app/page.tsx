import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-400 to-yellow-500" />
            <span className="font-bold text-xl">Trendly</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white">
                Comenzar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
          Publica en todas tus redes sociales
          <br />
          <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
            desde un solo lugar
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
          Trendly es una plataforma para equipos de marketing que permite crear,
          programar y publicar contenido de forma masiva en Instagram, Facebook
          y LinkedIn de manera rápida y sencilla.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/login">
            <Button
              size="lg"
              className="bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white px-8"
            >
              Empezar ahora
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">
          ¿Qué puedes hacer con Trendly?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4 text-2xl">
              📅
            </div>
            <h3 className="font-semibold text-lg mb-2">
              Calendario de contenidos
            </h3>
            <p className="text-gray-600 text-sm">
              Programa publicaciones con anticipación y visualiza todo tu
              contenido en un calendario claro y organizado.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4 text-2xl">
              🚀
            </div>
            <h3 className="font-semibold text-lg mb-2">Publicación masiva</h3>
            <p className="text-gray-600 text-sm">
              Publica el mismo contenido en Instagram, Facebook y LinkedIn
              simultáneamente con un solo clic.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4 text-2xl">
              🤖
            </div>
            <h3 className="font-semibold text-lg mb-2">Generación con IA</h3>
            <p className="text-gray-600 text-sm">
              Crea captions e imágenes automáticamente con inteligencia
              artificial para agilizar tu flujo de trabajo.
            </p>
          </div>
        </div>
      </section>

      {/* Purpose - importante para Google */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Propósito de la aplicación</h2>
        <p className="text-gray-600 leading-relaxed">
          Trendly está diseñada para ayudar a equipos de marketing y creadores
          de contenido a gestionar su presencia en redes sociales de forma
          eficiente. La aplicación permite conectar cuentas de Instagram,
          Facebook y LinkedIn, crear y programar publicaciones, generar
          contenido con inteligencia artificial y publicar de forma masiva en
          múltiples plataformas desde una única interfaz.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} Trendly. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-gray-800">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-gray-800">
              Términos
            </Link>
            <Link href="/login" className="hover:text-gray-800">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
