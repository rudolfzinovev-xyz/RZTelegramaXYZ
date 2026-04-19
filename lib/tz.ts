// Convert "UTC+3" / "UTC-5" / "UTC+0" to offset minutes.
function parseOffsetMinutes(timezone: string): number | null {
  const m = timezone.match(/^UTC([+-])(\d+)$/);
  if (!m) return null;
  const sign = m[1] === "+" ? 1 : -1;
  return sign * parseInt(m[2], 10) * 60;
}

// Format a UTC date string in the user's selected timezone.
// Works by shifting the timestamp by the offset and then formatting as UTC
// so the Intl engine doesn't add its own local offset on top.
export function formatInTZ(
  dateStr: string,
  timezone: string,
  opts: Intl.DateTimeFormatOptions = {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  },
): string {
  const offsetMin = parseOffsetMinutes(timezone);
  if (offsetMin === null) return new Date(dateStr).toLocaleString("ru-RU");
  const shifted = new Date(new Date(dateStr).getTime() + offsetMin * 60_000);
  return shifted.toLocaleString("ru-RU", { ...opts, timeZone: "UTC" });
}

export function formatDateInTZ(dateStr: string, timezone: string): string {
  return formatInTZ(dateStr, timezone, { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

export function formatTimeInTZ(dateStr: string, timezone: string): string {
  return formatInTZ(dateStr, timezone, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}
