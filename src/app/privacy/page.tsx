export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-neutral">
      <h1>Política de privacidad</h1>
      <p>Última actualización: 11 de octubre de 2026</p>

      <p>
        Esta Política describe cómo <strong>Social Manager</strong> (“nosotros”,
        “la Plataforma”), operada en el dominio asociado a este servicio, trata
        la información cuando utilizas nuestra aplicación web para gestionar y
        publicar contenido en redes sociales.
      </p>

      <h2>1. Responsable</h2>
      <p>
        El responsable del tratamiento es el operador de la Plataforma. Para
        consultas sobre privacidad puedes escribir a:{" "}
        <strong>diegopacherres15@gmail.com</strong> (sustituye por tu email de
        soporte definitivo).
      </p>

      <h2>2. Datos que recopilamos</h2>
      <ul>
        <li>
          <strong>Cuenta:</strong> email, nombre y credenciales de acceso a la
          Plataforma.
        </li>
        <li>
          <strong>Empresa / espacio de trabajo:</strong> nombre, logo e
          instrucciones de marca que configures.
        </li>
        <li>
          <strong>Redes sociales (OAuth):</strong> al conectar Facebook,
          Instagram, LinkedIn, YouTube u otras, recibimos tokens de acceso (y
          cuando aplique de actualización), identificadores de página, canal o
          perfil, y metadatos básicos (nombre, usuario) necesarios para publicar
          en tu nombre.
        </li>
        <li>
          <strong>Contenido:</strong> textos, imágenes, videos y enlaces que
          subes o generas para publicar o programar.
        </li>
        <li>
          <strong>Uso del servicio:</strong> registros técnicos (fecha de
          publicación, estado, errores de API) para operar el producto.
        </li>
        <li>
          <strong>IA (si está habilitada en tu plan):</strong> los prompts que
          envías para generar textos o imágenes; el resultado se usa para tus
          publicaciones según tu configuración.
        </li>
      </ul>

      <h2>3. Cómo usamos los datos</h2>
      <ul>
        <li>Autenticarte y administrar tu empresa y equipo.</li>
        <li>
          Conectar cuentas de terceros y publicar o programar contenido en las
          redes que autorices.
        </li>
        <li>Generar sugerencias de texto o imagen con proveedores de IA.</li>
        <li>Mejorar la estabilidad del servicio y dar soporte.</li>
        <li>Cumplir obligaciones legales cuando corresponda.</li>
      </ul>
      <p>
        <strong>No vendemos</strong> tus datos personales. No usamos el
        contenido de tus redes para entrenar modelos de IA propios con fines
        ajenos al servicio que contratas, salvo lo que indiquen de forma
        independiente los proveedores terceros (Google, Meta, LinkedIn, etc.) en
        sus propias políticas.
      </p>

      <h2>4. YouTube y Google</h2>
      <p>
        Si conectas YouTube, el acceso se realiza mediante OAuth de Google. La
        Plataforma solicita permisos para:
      </p>
      <ul>
        <li>
          Ver información básica de tu canal (por ejemplo identificador y
          título).
        </li>
        <li>Subir videos a tu canal cuando tú lo solicitas desde la app.</li>
      </ul>
      <p>
        El uso de la información recibida de las APIs de Google se adhiere a la{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , incluido el requisito de uso limitado. Puedes revocar el acceso en
        cualquier momento desde la Plataforma (desconectar cuenta) o desde{" "}
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noopener noreferrer"
        >
          tu cuenta de Google
        </a>
        .
      </p>

      <h2>5. Proveedores y encargados</h2>
      <p>
        Podemos usar servicios de infraestructura y APIs de terceros, por
        ejemplo: alojamiento (p. ej. Vercel), base de datos y autenticación (p.
        ej. Firebase), almacenamiento de archivos (p. ej. Cloudflare R2) y APIs
        de Meta, LinkedIn, Google/YouTube y proveedores de IA. Cada uno trata
        datos según sus propias condiciones, en la medida necesaria para prestar
        el servicio.
      </p>

      <h2>6. Conservación</h2>
      <p>
        Conservamos la información mientras mantengas la cuenta activa o sea
        necesario para prestar el servicio, resolver disputas y cumplir la ley.
        Puedes solicitar la eliminación de tu cuenta y datos asociados
        contactándonos; algunos registros técnicos pueden retenerse un tiempo
        limitado por seguridad o obligación legal.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas razonables (acceso restringido, HTTPS, tokens
        almacenados en sistemas controlados). Ningún sistema es 100% seguro.
      </p>

      <h2>8. Tus derechos</h2>
      <p>
        Según tu jurisdicción, puedes solicitar acceso, corrección o eliminación
        de datos personales, o revocar conexiones a redes sociales. Escríbenos
        al email de contacto indicado arriba.
      </p>

      <h2>9. Cambios</h2>
      <p>
        Podemos actualizar esta Política. La fecha de “última actualización”
        reflejará el cambio. El uso continuado del servicio tras cambios
        relevantes implica la aceptación de la versión vigente cuando la ley lo
        permita.
      </p>
    </main>
  );
}
