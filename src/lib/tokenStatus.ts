export type TokenStatus = "ok" | "expiring_soon" | "expired" | "unknown";

export function getTokenStatus(expiresAt?: Date | null): TokenStatus {
  if (!expiresAt) return "unknown";

  const now = Date.now();
  const exp =
    expiresAt instanceof Date
      ? expiresAt.getTime()
      : new Date(expiresAt).getTime();
  const daysLeft = (exp - now) / (1000 * 60 * 60 * 24);

  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 7) return "expiring_soon";
  return "ok";
}

export function tokenStatusLabel(status: TokenStatus): string {
  switch (status) {
    case "expired":
      return "Token expirado — reconecta la cuenta";
    case "expiring_soon":
      return "El token vence en menos de 7 días";
    case "unknown":
      return "No se conoce la fecha de expiración";
    default:
      return "Conexión activa";
  }
}
