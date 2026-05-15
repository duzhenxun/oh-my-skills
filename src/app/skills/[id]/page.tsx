"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Frame } from "@/ui/Frame";
import { useLanguage } from "@/ui/i18n";
import { formatBytes } from "@/core/names";
import type { SkillRecord } from "@/core/model";

const text = {
  zh: { loading: "加载中...", back: "‹ 返回全部技能", global: "全局", project: "项目", enabled: "已启用", stopped: "已停用", installTo: "安装到", disabling: "禁用中...", enabling: "启用中...", disable: "禁用", enable: "启用", deleting: "删除中...", delete: "删除", noDescription: "暂无描述", category: "分类", source: "来源", fileSize: "文件大小", modified: "最后修改", filePath: "文件路径", files: "技能文件", edit: "编辑", notEditable: "不可编辑", preview: "主文件预览", deleteConfirm: "确认删除这个技能吗？", deleted: "已删除技能", failed: "操作失败" },
  en: { loading: "Loading...", back: "‹ Back to All Skills", global: "Global", project: "Project", enabled: "Enabled", stopped: "Disabled", installTo: "Install to", disabling: "Disabling...", enabling: "Enabling...", disable: "Disable", enable: "Enable", deleting: "Deleting...", delete: "Delete", noDescription: "No description", category: "Category", source: "Source", fileSize: "File Size", modified: "Last Modified", filePath: "File Path", files: "Skill Files", edit: "Edit", notEditable: "Not Editable", preview: "Main File Preview", deleteConfirm: "Delete this skill?", deleted: "Skill deleted", failed: "Action failed" },
};

export default function SkillDetailPage() {
  const language = useLanguage();
  const t = text[language];
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [skill, setSkill] = useState<SkillRecord | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  function showNotice(type: "success" | "error", textValue: string) { setNotice({ type, text: textValue }); window.setTimeout(() => setNotice(null), 2400); }
  async function load() { const response = await fetch(`/api/skills/${params.id}`); if (!response.ok) return; const json = await response.json(); setSkill(json.skill); }
  useEffect(() => { load(); }, [params.id]);
  async function toggle() { if (!skill) return; setBusyAction("toggle"); const nextEnabled = !skill.enabled; try { const response = await fetch("/api/skills/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: skill.id, enabled: nextEnabled }) }); if (!response.ok) throw new Error(t.failed); const json = await response.json(); if (json.skill) { setSkill(json.skill); if (json.skill.id !== params.id) router.replace(`/skills/${json.skill.id}`); } else await load(); } catch (error) { showNotice("error", error instanceof Error ? error.message : t.failed); } finally { setBusyAction(""); } }
  async function remove() { if (!window.confirm(t.deleteConfirm)) return; setBusyAction("delete"); try { const response = await fetch(`/api/skills/${params.id}`, { method: "DELETE" }); if (!response.ok) throw new Error(t.failed); showNotice("success", t.deleted); window.setTimeout(() => router.push("/"), 300); } catch (error) { showNotice("error", error instanceof Error ? error.message : t.failed); setBusyAction(""); } }
  if (!skill) return <Frame><p>{t.loading}</p></Frame>;
  return <Frame><Link href="/" style={{ color: "var(--muted)" }}>{t.back}</Link><section className="card" style={{ marginTop: 24 }}><div className="detail-hero"><div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}><div><div className="row"><span className="badge green">{skill.tool.toUpperCase()}</span><span className="badge">{skill.scope === "global" ? t.global : t.project}</span><span className={`badge ${skill.enabled ? "green" : "red"}`}>{skill.enabled ? t.enabled : t.stopped}</span></div><h1>{skill.title}</h1></div><div className="actions"><Link className="btn secondary" href={`/install?copy=${skill.id}`}>{t.installTo}</Link><button className="btn secondary" onClick={toggle} disabled={busyAction !== ""}>{busyAction === "toggle" ? (skill.enabled ? t.disabling : t.enabling) : (skill.enabled ? t.disable : t.enable)}</button><button className="btn danger" onClick={remove} disabled={busyAction !== ""}>{busyAction === "delete" ? t.deleting : t.delete}</button></div></div><p className="summary">{skill.summary || t.noDescription}</p></div><div className="meta-grid"><div><div className="meta-label">{t.category}</div><strong>{skill.category}</strong></div><div><div className="meta-label">{t.source}</div><strong>{skill.locationLabel}</strong></div><div><div className="meta-label">{t.fileSize}</div><strong>{formatBytes(skill.bytes)}</strong></div><div><div className="meta-label">{t.modified}</div><strong>{new Date(skill.updatedAt).toLocaleDateString(language === "zh" ? "zh-CN" : "en-US")}</strong></div><div style={{ gridColumn: "1 / -1" }}><div className="meta-label">{t.filePath}</div><code>{skill.filePath}</code></div></div><div className="preview"><h2>{t.files}</h2><div className="file-list">{(skill.files || []).map((file) => <div className="file-row" key={file.id}><div><strong>{file.relativePath}</strong><p className="summary">{formatBytes(file.bytes)} · {new Date(file.updatedAt).toLocaleString(language === "zh" ? "zh-CN" : "en-US")}</p></div>{file.editable ? <Link className="btn secondary" href={`/skills/${skill.id}/files/${file.id}`}>{t.edit}</Link> : <span className="badge">{t.notEditable}</span>}</div>)}</div></div><div className="preview"><h2>{t.preview}</h2><div className="codebox"><ReactMarkdown remarkPlugins={[remarkGfm]}>{skill.body || skill.raw || ""}</ReactMarkdown></div></div></section>{notice && <div className={`toast ${notice.type}`}>{notice.text}</div>}</Frame>;
}
