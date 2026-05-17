import type { HubSkill } from "./model";

function pickString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pickNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function unwrapTotal(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  const directTotal = pickNumber(record.total);
  if (directTotal !== undefined) return directTotal;
  const data = record.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  return pickNumber((data as Record<string, unknown>).total);
}

function unwrapItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  for (const key of ["skills", "items", "results", "data"]) {
    const value = record[key];
    if (Array.isArray(value)) return unwrapItems(value);
    if (value && typeof value === "object") {
      const nested = unwrapItems(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

function mapHubSkill(item: Record<string, unknown>): HubSkill {
  const name = pickString(item.name) || pickString(item.title) || "Untitled";
  const slug = pickString(item.slug) || pickString(item.id);
  return {
    id: slug || name,
    name,
    slug,
    description: pickString(item.description_zh) || pickString(item.description) || pickString(item.summary) || "",
    url: pickString(item.url) || pickString(item.homepage),
    repoUrl: pickString(item.repoUrl) || pickString(item.repositoryUrl) || pickString(item.githubUrl),
    owner: pickString(item.authorName) || pickString(item.displayName) || pickString(item.username) || pickString(item.userName) || pickString(item.ownerName) || pickString(item.owner),
    source: pickString(item.source),
    category: pickString(item.category),
    version: pickString(item.version),
    downloads: pickNumber(item.downloads),
    installs: pickNumber(item.installs),
    stars: pickNumber(item.stars),
    updatedAt: pickNumber(item.updated_at),
  };
}

export async function searchSkillHub(query: string, options: { category?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, Math.floor(options.page || 1));
  const pageSize = Math.max(1, Math.min(100, Math.floor(options.pageSize || 24)));
  const url = new URL("https://api.skillhub.cn/api/skills");
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("sortBy", "score");
  url.searchParams.set("order", "desc");
  if (query.trim()) url.searchParams.set("keyword", query.trim());
  if (options.category?.trim()) url.searchParams.set("category", options.category.trim());

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error("SkillHub search failed");
  const skills = unwrapItems(payload).map(mapHubSkill);
  const total = unwrapTotal(payload);
  return {
    skills,
    page,
    pageSize,
    total,
    hasMore: total === undefined ? skills.length === pageSize : page * pageSize < total,
  };
}
