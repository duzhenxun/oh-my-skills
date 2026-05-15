export function categoryFor(name: string) {
  const value = name.toLowerCase();
  if (value.includes("wiki")) return "Wiki";
  if (value.includes("image") || value.includes("design")) return "Design";
  if (value.includes("ppt") || value.includes("presentation")) return "Presentation";
  if (value.includes("search")) return "Search";
  if (value.includes("review") || value.includes("test")) return "Quality";
  if (value.includes("notion")) return "Knowledge";
  if (value.includes("video") || value.includes("ffmpeg")) return "Media";
  return "Other";
}

export function slugifySkillName(value: string) {
  const clean = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || "new-skill";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
