export const sanitizeUsername = (username: string | null | undefined) =>
  (username || "")
    .trim()
    .replace(/[ıİ]/g, (character) => (character === "ı" ? "i" : "I"))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
