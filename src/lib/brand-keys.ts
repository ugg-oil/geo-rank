export function preprocessBrand(raw: string): string {
  return raw
    .trim()
    .replace(/\.(ai|com|io|co|app)$/i, "")
    .replace(/,?\s*(Inc\.?|LLC|Ltd\.?)$/i, "")
    .trim();
}

export function normalizeBrandKey(value: string): string {
  return preprocessBrand(value)
    .toLowerCase()
    .replace(/[''']s\b/g, "")
    .replace(/[''']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
