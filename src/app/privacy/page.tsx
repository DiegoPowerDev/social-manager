import HomeFooter from "@/components/layout/homeFooter";
import HomeHeader from "@/components/layout/homeHeader";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen space-y-6">
      <HomeHeader />
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-neutral prose-invert text-white bg-zinc-950/50 flex flex-col rounded-xl">
        <h1 className="text-center mb-4 font-bold text-xl">
          Política de privacidad
        </h1>
        <p>Última actualización: 20 de octubre de 2026</p>

        <p>
          Esta Política de privacidad describe cómo{" "}
          <strong>TrendlyStudio</strong> (“nosotros”, “la Plataforma”, “el
          Servicio”), accesible en{" "}
          <a href="https://www.trendly.studio">https://www.trendly.studio</a>,
          recopila, usa, almacena y comparte información cuando utilizas nuestra
          aplicación web para gestionar, programar y publicar contenido en redes
          sociales.
        </p>
        <p>
          Al crear una cuenta o usar el Servicio, aceptas esta Política. Si no
          estás de acuerdo, no utilices la Plataforma.
        </p>

        <h2>1. Responsable del tratamiento</h2>
        <p>
          El responsable del tratamiento de los datos personales es el operador
          de TrendlyStudio.
        </p>
        <p>
          Contacto de privacidad y soporte:{" "}
          <strong>business_manager@trendly.studio</strong>
        </p>
        <p>
          (Si usas otro buzón de soporte, sustituye este email por el definitivo
          y mantén el mismo en la consola de Google, Meta y TikTok.)
        </p>

        <h2>2. Datos que recopilamos</h2>
        <ul>
          <li>
            <strong>Cuenta:</strong> dirección de correo electrónico, nombre o
            nombre para mostrar, contraseña (almacenada de forma segura por
            nuestro proveedor de autenticación) e identificadores internos de
            usuario.
          </li>
          <li>
            <strong>Empresa / espacio de trabajo (tenant):</strong> nombre de la
            empresa, logotipo, instrucciones de marca y configuración del plan o
            membresía.
          </li>
          <li>
            <strong>Equipo:</strong> emails y roles (admin, editor, viewer) de
            los miembros que invites a tu empresa.
          </li>
          <li>
            <strong>Conexiones a redes sociales (OAuth):</strong> cuando
            conectas Facebook, Instagram, LinkedIn, YouTube, TikTok u otras
            plataformas compatibles, recibimos y almacenamos de forma segura:
            <ul>
              <li>
                tokens de acceso y, cuando existan, tokens de actualización;
              </li>
              <li>
                identificadores de página, canal, perfil o cuenta (por ejemplo
                page ID, canal de YouTube, open_id de TikTok);
              </li>
              <li>
                metadatos básicos necesarios para operar el servicio (nombre de
                página/canal, nombre de usuario, avatar cuando la API lo
                proporcione).
              </li>
            </ul>
          </li>
          <li>
            <strong>Contenido que tú proporcionas:</strong> textos, imágenes,
            videos, enlaces, fechas de programación y configuraciones de
            publicación.
          </li>
          <li>
            <strong>Datos de uso del servicio:</strong> registros técnicos como
            fecha y estado de publicaciones, errores de API, identificadores de
            empresa y eventos de facturación necesarios para prestar el
            Servicio.
          </li>
          <li>
            <strong>Pagos:</strong> si contratas un plan de pago, el
            procesamiento lo realiza el proveedor de pagos (por ejemplo PayPal).
            Nosotros podemos recibir email del pagador, identificadores de
            suscripción y estado del plan; no almacenamos el número completo de
            tarjeta.
          </li>
          <li>
            <strong>Funciones de IA (si tu plan las incluye):</strong> prompts o
            instrucciones que envías para generar textos o imágenes; el
            resultado se asocia a tu empresa para usarlo en publicaciones según
            tú lo indiques.
          </li>
        </ul>

        <h2>3. Cómo usamos los datos</h2>
        <p>Utilizamos la información para:</p>
        <ul>
          <li>Autenticarte y administrar tu cuenta, empresa y equipo.</li>
          <li>
            Conectar cuentas de terceros que autorices y publicar, programar o
            gestionar contenido en esas redes{" "}
            <strong>
              solo cuando tú (o un miembro autorizado de tu empresa) lo
              solicitas
            </strong>{" "}
            desde la Plataforma.
          </li>
          <li>
            Mostrar en el panel qué cuentas están conectadas (nombre, avatar,
            estado del token).
          </li>
          <li>
            Generar sugerencias de texto o imagen mediante proveedores de IA,
            únicamente si tu plan lo habilita y tú usas esas funciones.
          </li>
          <li>
            Prestar soporte, seguridad, facturación y mejora operativa del
            Servicio.
          </li>
          <li>Cumplir obligaciones legales cuando corresponda.</li>
        </ul>
        <p>
          <strong>No vendemos</strong> datos personales.{" "}
          <strong>No usamos</strong> los datos obtenidos de APIs de terceros
          (Google, Meta, TikTok, LinkedIn, etc.) para anuncios independientes de
          TrendlyStudio, ni para entrenar modelos de IA propios con fines ajenos
          a prestar el Servicio que contratas.
        </p>

        <h2>4. Google y YouTube API Services</h2>
        <p>
          Si conectas una cuenta de Google / YouTube, el acceso se realiza
          mediante OAuth de Google. TrendlyStudio solicita únicamente los
          permisos necesarios para:
        </p>
        <ul>
          <li>
            Leer información básica del canal (por ejemplo identificador y
            título) para asociar la cuenta correcta a tu empresa y mostrarla en
            el panel.
          </li>
          <li>
            Subir y publicar videos en tu canal cuando lo solicitas de forma
            explícita desde la aplicación (publicación inmediata o programada).
          </li>
        </ul>
        <p>
          El uso y la transferencia a cualquier otra app de la información
          recibida de las APIs de Google se adhieren a la{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , incluido el requisito de <strong>Limited Use (uso limitado)</strong>
          .
        </p>
        <p>
          No utilizamos los datos de Google para determinar la solvencia u otros
          fines no relacionados con la funcionalidad visible de la aplicación
          orientada al usuario. Puedes revocar el acceso en cualquier momento:
        </p>
        <ul>
          <li>Desconectando YouTube desde TrendlyStudio, o</li>
          <li>
            Desde{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
            >
              los permisos de tu cuenta de Google
            </a>
            .
          </li>
        </ul>

        <h2>5. Meta (Facebook e Instagram)</h2>
        <p>
          Si conectas Facebook o Instagram, utilizamos las APIs de Meta para
          obtener tokens y datos de páginas o cuentas profesionales necesarios
          para publicar contenido (feed, reels, historias u otros formatos que
          ofrezca el producto) en tu nombre cuando lo indiques en la Plataforma.
        </p>
        <p>
          No utilizamos los datos de Meta para venderlos a terceros ni para
          elaborar perfiles publicitarios ajenos a TrendlyStudio. El tratamiento
          se limita a operar las funciones de publicación y gestión que muestras
          en el producto.
        </p>
        <p>
          Puedes desconectar Facebook o Instagram desde el panel de la
          Plataforma. Para ejercer derechos de eliminación, consulta la sección
          10.
        </p>

        <h2>6. TikTok</h2>
        <p>
          Si conectas TikTok, utilizamos Login Kit y Content Posting API (por
          ejemplo Direct Post) para:
        </p>
        <ul>
          <li>
            Identificar la cuenta autorizada (por ejemplo open_id, nombre para
            mostrar y avatar cuando estén disponibles).
          </li>
          <li>
            Publicar videos y captions que tú (o tu equipo autorizado) hayas
            creado o programado en TrendlyStudio.
          </li>
        </ul>
        <p>
          No publicamos contenido en TikTok sin una acción explícita de
          publicación o una programación que hayas configurado. No utilizamos la
          API de TikTok para acceder a contenido de terceros no autorizados ni
          para fines publicitarios ajenos al Servicio.
        </p>

        <h2>7. LinkedIn y otras integraciones</h2>
        <p>
          Las conexiones a LinkedIn u otras redes se tratan con el mismo
          principio: tokens y metadatos mínimos para publicar el contenido que
          autorices, sin venta de datos ni uso para entrenar modelos propios con
          fines no relacionados con el Servicio.
        </p>

        <h2>8. Proveedores y encargados del tratamiento</h2>
        <p>
          Para operar la Plataforma utilizamos proveedores de infraestructura y
          APIs, entre ellos (según configuración vigente):
        </p>
        <ul>
          <li>Alojamiento y entrega de la aplicación web (p. ej. Vercel).</li>
          <li>
            Autenticación y base de datos (p. ej. Firebase / Google Cloud).
          </li>
          <li>Almacenamiento de medios (p. ej. Cloudflare R2).</li>
          <li>
            APIs de plataformas sociales: Meta, Google/YouTube, TikTok,
            LinkedIn, etc.
          </li>
          <li>
            Proveedores de IA para generación de texto o imagen (si aplica).
          </li>
          <li>Proveedores de pago (p. ej. PayPal) para suscripciones.</li>
          <li>
            Correo transaccional (p. ej. email del dominio TrendlyStudio).
          </li>
        </ul>
        <p>
          Cada proveedor trata los datos según sus propias condiciones y solo en
          la medida necesaria para prestar el Servicio.
        </p>

        <h2>9. Conservación</h2>
        <p>
          Conservamos la información mientras mantengas la cuenta o la empresa
          activa, o mientras sea necesario para prestar el Servicio, resolver
          disputas, prevenir fraude y cumplir la ley. Los tokens de redes
          sociales se conservan mientras la cuenta permanezca conectada; al
          desconectar, dejamos de usarlos para nuevas publicaciones y los
          eliminamos o invalidamos en un plazo razonable, salvo retención legal
          puntual.
        </p>

        <h2>10. Eliminación de cuenta y de datos</h2>
        <p>Puedes solicitar:</p>
        <ul>
          <li>Desconexión de una red social concreta desde el panel.</li>
          <li>
            Eliminación de tu cuenta de usuario o de datos personales asociados.
          </li>
          <li>
            Eliminación o baja de la empresa (tenant), sujeto a que seas
            administrador autorizado.
          </li>
        </ul>
        <p>
          Para solicitar la eliminación, escribe a{" "}
          <strong>business_manager@trendly.studio</strong> desde el email de la
          cuenta, indicando “Eliminación de datos” y el email o empresa
          afectada. Atenderemos la solicitud en un plazo razonable (en muchos
          casos dentro de 30 días), salvo obligaciones legales de conservación.
        </p>
        <p>
          La eliminación de la cuenta en TrendlyStudio no elimina por sí sola el
          contenido ya publicado en Facebook, Instagram, YouTube, TikTok u otras
          redes; ese contenido permanece bajo las reglas de cada plataforma.
        </p>

        <h2>11. Seguridad</h2>
        <p>
          Aplicamos medidas razonables de seguridad: transmisión HTTPS, control
          de acceso por roles, almacenamiento de tokens en sistemas de servidor
          y separación lógica por empresa (tenant). Ningún método de transmisión
          o almacenamiento es completamente seguro.
        </p>

        <h2>12. Tus derechos</h2>
        <p>
          Según la legislación aplicable (por ejemplo en tu país de residencia),
          puedes solicitar acceso, rectificación, oposición, limitación o
          eliminación de datos personales, o información sobre el tratamiento.
          También puedes revocar autorizaciones OAuth desde cada plataforma
          (Google, Meta, TikTok, etc.). Contáctanos en el email indicado en la
          sección 1.
        </p>

        <h2>13. Menores</h2>
        <p>
          El Servicio está dirigido a usuarios y empresas con capacidad legal
          para contratar. No recopilamos de forma consciente datos de menores de
          16 años (u otra edad mínima que exija tu jurisdicción). Si crees que
          un menor nos ha proporcionado datos, contáctanos para eliminarlos.
        </p>

        <h2>14. Transferencias internacionales</h2>
        <p>
          Nuestros proveedores pueden tratar datos en servidores ubicados fuera
          de tu país. Al usar el Servicio aceptas ese tratamiento en la medida
          permitida por la ley aplicable y por las garantías de cada proveedor.
        </p>

        <h2>15. Cambios a esta Política</h2>
        <p>
          Podemos actualizar esta Política para reflejar cambios legales o del
          producto. La fecha de “Última actualización” se modificará en
          consecuencia. Cuando los cambios sean relevantes, podremos notificarte
          por email o mediante un aviso en la Plataforma. El uso continuado del
          Servicio tras la entrada en vigor de la nueva versión implicará su
          aceptación cuando la ley lo permita.
        </p>

        <h2>16. Contacto</h2>
        <p>
          Preguntas sobre esta Política o sobre tus datos:{" "}
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
