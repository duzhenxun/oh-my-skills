"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { markdown } from "@codemirror/lang-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SkillFileEntry, SkillRecord } from "@/core/model";
import { readStoredLanguage, type Language } from "@/ui/i18n";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });
type EditorMode = "edit" | "split" | "preview";
type Skin = "luma" | "paper" | "graphite" | "mint";
const text = { zh: { editFile: "编辑文件", file: "文件", edit: "编辑", split: "分屏", preview: "预览", dirty: "有未保存修改", saved: "已保存", saving: "保存中...", save: "保存", failed: "操作失败", savedNotice: "已保存修改" }, en: { editFile: "Edit File", file: "File", edit: "Edit", split: "Split", preview: "Preview", dirty: "Unsaved changes", saved: "Saved", saving: "Saving...", save: "Save", failed: "Action failed", savedNotice: "Changes saved" } };

export default function SkillFileEditorPage() {
  const params = useParams<{ id: string; fileId: string }>();
  const [language, setLanguage] = useState<Language>("en");
  const t = text[language];
  const [skill, setSkill] = useState<SkillRecord | null>(null);
  const [file, setFile] = useState<SkillFileEntry | null>(null);
  const [raw, setRaw] = useState("");
  const [savedRaw, setSavedRaw] = useState("");
  const [mode, setMode] = useState<EditorMode>("split");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  function showNotice(type: "success" | "error", textValue: string) { setNotice({ type, text: textValue }); window.setTimeout(() => setNotice(null), 2400); }
  async function load() { const response = await fetch(`/api/skills/${params.id}/files/${params.fileId}`); const json = await response.json(); if (!response.ok) { showNotice("error", json.error || t.failed); return; } setSkill(json.skill); setFile(json.file); setRaw(json.raw || ""); setSavedRaw(json.raw || ""); }
  useEffect(() => {
    setLanguage(readStoredLanguage());
    const skin = (localStorage.getItem("oms-skin") as Skin) || "luma";
    document.body.dataset.skin = skin;
    load();
  }, [params.id, params.fileId]);
  async function save() { setSaving(true); try { const response = await fetch(`/api/skills/${params.id}/files/${params.fileId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw }) }); const json = await response.json().catch(() => ({})); if (!response.ok) throw new Error(json.error || t.failed); setSavedRaw(raw); showNotice("success", t.savedNotice); } catch (error) { showNotice("error", error instanceof Error ? error.message : t.failed); } finally { setSaving(false); } }
  const previewText = raw.replace(/^---[\s\S]*?---\s*/m, "");
  const hasChanges = raw !== savedRaw;
  return <div className="editor-page"><div className="editor-header"><div className="editor-left"><div className="editor-title"><Link className="editor-back" href={`/skills/${params.id}`}>‹</Link><div><strong>{t.editFile}</strong><span>{skill?.title || "Skill"} / {file?.relativePath || t.file}</span></div></div><div className="editor-controls"><div className="mode-tabs">{(["edit", "split", "preview"] as const).map((item) => <button key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item === "edit" ? t.edit : item === "split" ? t.split : t.preview}</button>)}</div><span className={`save-state ${hasChanges ? "dirty" : ""}`}>{hasChanges ? t.dirty : t.saved}</span><button className="btn" onClick={save} disabled={!hasChanges || saving}>{saving ? t.saving : t.save}</button></div></div></div><div className={`editor-workspace mode-${mode}`}>{(mode === "edit" || mode === "split") && <div className="editor-pane code-pane"><CodeMirror value={raw} height="100%" theme="dark" extensions={[markdown()]} basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: true }} onChange={setRaw} /></div>}{(mode === "preview" || mode === "split") && <div className="editor-pane preview-pane"><div className="markdown-preview"><ReactMarkdown remarkPlugins={[remarkGfm]}>{previewText}</ReactMarkdown></div></div>}</div>{notice && <div className={`toast ${notice.type}`}>{notice.text}</div>}</div>;
}
