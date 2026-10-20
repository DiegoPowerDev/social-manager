import HomeFooter from "@/components/layout/homeFooter";
import HomeHeader from "@/components/layout/homeHeader";

export default function TermsPage() {
  return (
    <main className="min-h-screen space-y-6">
      <HomeHeader />
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-neutral prose-invert text-white bg-zinc-950/50 flex flex-col rounded-xl">
        <h1 className="text-center mb-4 font-bold text-xl">
          Términos del servicio
        </h1>
        <p>Última actualización: 20 de octubre de 2026</p>

        <p>
          Estos Términos del servicio (“Términos”) regulan el acceso y uso de{" "}
          <strong>TrendlyStudio</strong> (“el Servicio”, “la Plataforma”,
          “nosotros”), disponible en{" "}
          <a href="https://www.trendly.studio">https://www.trendly.studio</a>.
        </p>
        <p>
          Al crear una cuenta, contratar un plan o utilizar el Servicio, aceptas
          estos Términos y nuestra{" "}
          <a href="https://www.trendly.studio/policy">Política de privacidad</a>
          . Si no estás de acuerdo, no uses el Servicio.
        </p>

        <h2>1. Descripción del Servicio</h2>
        <p>
          TrendlyStudio es una aplicación web multiempresa que permite a
          organizaciones y equipos de marketing:
        </p>
        <ul>
          <li>
            Conectar cuentas de redes sociales autorizadas (por ejemplo
            Facebook, Instagram, LinkedIn, YouTube y TikTok, según
            disponibilidad y plan).
          </li>
          <li>
            Crear, programar y publicar contenido (texto, imagen, video) desde
            un panel centralizado.
          </li>
          <li>
            Usar funciones opcionales de asistencia con inteligencia artificial
            (generación de textos o imágenes), si el plan contratado las
            incluye.
          </li>
          <li>
            Gestionar miembros del equipo con distintos roles y una biblioteca
            de medios asociada a la empresa.
          </li>
        </ul>
        <p>
          El alcance exacto de funciones depende del plan (gratuito o de pago) y
          de las APIs y políticas de cada plataforma externa.
        </p>

        <h2>2. Elegibilidad y cuentas</h2>
        <ul>
          <li>
            Debes tener capacidad legal para celebrar contratos (en muchos
            países, mayoría de edad o representación válida de una empresa).
          </li>
          <li>
            Eres responsable de la confidencialidad de tus credenciales y de
            toda actividad realizada con tu cuenta o la de tu empresa.
          </li>
          <li>
            La información de registro debe ser veraz y mantenerse actualizada.
          </li>
          <li>
            Los administradores de una empresa son responsables de los miembros
            que inviten y de los permisos que les asignen (admin, editor, viewer
            u otros roles que ofrezcamos).
          </li>
        </ul>

        <h2>3. Empresas (tenants) y equipo</h2>
        <p>
          El Servicio está organizado por empresas o espacios de trabajo. Los
          datos de publicación, cuentas sociales conectadas y medios se asocian
          a la empresa correspondiente. Quien ostente el rol de administrador
          puede, entre otras acciones, gestionar el plan, invitar o eliminar
          miembros y conectar o desconectar redes sociales, según las
          funcionalidades disponibles.
        </p>

        <h2>4. Redes sociales y servicios de terceros</h2>
        <p>
          Al conectar Facebook, Instagram, LinkedIn, YouTube, TikTok u otra
          integración, autorizas a TrendlyStudio a actuar en tu nombre (o en el
          de la página/canal/cuenta que selecciones) dentro de los permisos
          OAuth que concedas, únicamente para las funciones del producto (por
          ejemplo publicar o programar contenido).
        </p>
        <p>
          Cada proveedor (Meta, Google, TikTok, LinkedIn, etc.) tiene sus
          propios términos, políticas de desarrolladores y límites de API. Tú
          debes cumplirlos. No controlamos ni garantizamos:
        </p>
        <ul>
          <li>Disponibilidad o cambios de esas plataformas o de sus APIs.</li>
          <li>Aprobación de apps, permisos o procesos de revisión.</li>
          <li>
            Moderación, rechazo o eliminación de contenido por parte de esas
            redes.
          </li>
          <li>
            Límites de cuota, errores o tiempos de procesamiento externos.
          </li>
        </ul>
        <p>
          Puedes revocar el acceso desconectando la cuenta en TrendlyStudio o
          desde la configuración de permisos de cada plataforma.
        </p>

        <h2>5. Contenido del usuario</h2>
        <p>
          Conservas todos los derechos sobre el contenido que subes, generas o
          publicas (textos, imágenes, videos, enlaces, prompts de IA, etc.). Nos
          concedes una licencia limitada, mundial y no exclusiva para alojar,
          procesar y transmitir ese contenido solo en la medida necesaria para
          operar el Servicio (almacenamiento, publicación en las redes que
          indiques, previsualización en el panel, etc.).
        </p>
        <p>Declaras y garantizas que:</p>
        <ul>
          <li>
            Tienes los derechos necesarios sobre el contenido y las cuentas
            conectadas.
          </li>
          <li>
            El contenido no infringe leyes, derechos de terceros ni las normas
            de las plataformas de destino.
          </li>
          <li>
            No utilizarás el Servicio para spam, fraude, acoso, malware,
            discriminación ilegal u otro uso ilícito.
          </li>
        </ul>
        <p>
          Eres el único responsable de lo que se publica en las redes a través
          de tu cuenta o empresa.
        </p>

        <h2>6. Inteligencia artificial</h2>
        <p>
          Si tu plan incluye IA, las sugerencias de texto o imagen se generan
          mediante proveedores terceros. Los resultados pueden ser inexactos o
          inadecuados; debes revisarlos antes de publicar. El uso de la IA está
          sujeto a cuotas mensuales u otros límites del plan. No garantizamos un
          resultado creativo o comercial concreto.
        </p>

        <h2>7. Planes, pagos y suscripciones</h2>
        <ul>
          <li>
            Algunas funciones requieren un plan de pago. Los precios y
            características se muestran en el sitio o en el panel.
          </li>
          <li>
            Los pagos pueden procesarse mediante proveedores externos (por
            ejemplo PayPal). Sus condiciones de pago aplican al cargo.
          </li>
          <li>
            Las suscripciones pueden renovarse según el intervalo contratado
            (mensual, anual u otro) hasta que se cancelen conforme al flujo
            disponible en la Plataforma o en el proveedor de pagos.
          </li>
          <li>
            Salvo obligación legal o indicación expresa en contrario, las cuotas
            ya cobradas no son reembolsables.
          </li>
          <li>
            Podemos modificar precios o planes con aviso previo razonable para
            ciclos futuros.
          </li>
        </ul>

        <h2>8. Uso aceptable</h2>
        <p>No está permitido, entre otras conductas:</p>
        <ul>
          <li>
            Intentar acceder a datos o empresas de otros clientes, eludir
            medidas de seguridad o abusar de límites técnicos o de API.
          </li>
          <li>
            Revender el Servicio de forma no autorizada o usar automatizaciones
            que vulneren términos de terceros.
          </li>
          <li>
            Interferir con la estabilidad del Servicio o de las plataformas
            conectadas.
          </li>
        </ul>
        <p>
          Podemos suspender o terminar el acceso ante incumplimientos graves o
          riesgos de seguridad.
        </p>

        <h2>9. Propiedad intelectual de TrendlyStudio</h2>
        <p>
          El software, diseño, marcas, textos de la interfaz y demás elementos
          del Servicio (excluyendo tu contenido) son propiedad de TrendlyStudio
          o de sus licenciantes. No se concede ninguna licencia salvo la de uso
          del Servicio según estos Términos.
        </p>

        <h2>10. Disponibilidad y cambios</h2>
        <p>
          El Servicio se presta “tal cual” y “según disponibilidad”. Podemos
          modificar, suspender o discontinuar funciones con el aviso que sea
          razonable cuando sea posible. No garantizamos disponibilidad
          ininterrumpida ni ausencia de errores, en particular cuando dependan
          de APIs de terceros.
        </p>

        <h2>11. Limitación de responsabilidad</h2>
        <p>
          En la máxima medida permitida por la ley aplicable, TrendlyStudio y
          sus operadores no serán responsables por daños indirectos,
          incidentales, especiales, consecuentes, lucro cesante, pérdida de
          datos o de oportunidades de negocio derivados del uso o de la
          imposibilidad de uso del Servicio, ni por fallos, cambios o decisiones
          de Meta, Google, TikTok, LinkedIn, proveedores de pago, IA u otros
          terceros.
        </p>
        <p>
          Nuestra responsabilidad total acumulada por reclamaciones relacionadas
          con el Servicio se limitará, en la medida permitida por la ley, al
          importe que hayas pagado por el Servicio en los tres (3) meses
          anteriores al hecho que originó la reclamación (o cero si usas el plan
          gratuito).
        </p>

        <h2>12. Indemnidad</h2>
        <p>
          Te comprometes a indennizar y mantener indemne a TrendlyStudio frente
          a reclamaciones de terceros derivadas de tu contenido, de tu uso del
          Servicio o del incumplimiento de estos Términos o de las normas de
          plataformas externas.
        </p>

        <h2>13. Terminación</h2>
        <p>
          Puedes dejar de usar el Servicio en cualquier momento y solicitar la
          baja de cuenta según los mecanismos disponibles o contactando a
          soporte. Podemos suspender o cerrar cuentas que incumplan estos
          Términos. Tras la terminación, podremos eliminar o anonimizar datos
          conforme a la Política de privacidad, sin perjuicio de retenciones
          legales.
        </p>

        <h2>14. Ley aplicable</h2>
        <p>
          Estos Términos se interpretarán de acuerdo con las leyes aplicables en
          el país de establecimiento del operador del Servicio, sin perjuicio de
          normas imperativas de protección al consumidor que te correspondan por
          tu residencia.
        </p>

        <h2>15. Contacto</h2>
        <p>
          Consultas sobre estos Términos o sobre el Servicio:{" "}
          <strong>business_manager@trendly.studio</strong>
        </p>
        <p>
          Sitio web:{" "}
          <a href="https://www.trendly.studio">https://www.trendly.studio</a>
        </p>
      </div>
      <HomeFooter />
    </main>
  );
}
