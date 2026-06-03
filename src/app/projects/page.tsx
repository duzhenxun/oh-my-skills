"use client";

import { useEffect, useState } from "react";
import { Frame } from "@/ui/Frame";
import { useLanguage } from "@/ui/i18n";

interface ProjectItem { path: string; name: string; addedAt: string }

const text = {
  zh: {
    title: "项目管理",
    intro: "添加项目后，会扫描这些本地技能目录：",
    manualTitle: "手动添加项目",
    browse: "浏览",
    picking: "选择中...",
    adding: "添加中...",
    add: "添加",
    pickerHint: "支持项目根目录、`.agents/skills`、`.codex/skills` 或普通 `skills` 根目录。可直接粘贴绝对路径，也可点“浏览”从本机选择目录。",
    tracked: "已跟踪项目",
    availableDefaults: "可跟增项目",
    defaultSource: "默认来源",
    projectSource: "项目",
    remove: "移除",
    added: "项目已添加",
    removed: "项目已移除",
    failed: "操作失败",
  },
  en: {
    title: "Project Management",
    intro: "After adding a project, these local skill folders will be scanned:",
    manualTitle: "Add Project Manually",
    browse: "Browse",
    picking: "Picking...",
    adding: "Adding...",
    add: "Add",
    pickerHint: "Project roots, `.agents/skills`, `.codex/skills`, and generic `skills` roots are supported. Paste an absolute path or use Browse to pick a local directory.",
    tracked: "Tracked Projects",
    availableDefaults: "Available Default Projects",
    defaultSource: "Default Source",
    projectSource: "Project",
    remove: "Remove",
    added: "Project added",
    removed: "Project removed",
    failed: "Action failed",
  },
};

export default function ProjectsPage() {
  const language = useLanguage();
  const t = text[language];
  const [tracked, setTracked] = useState<ProjectItem[]>([]);
  const [availableDefaults, setAvailableDefaults] = useState<ProjectItem[]>([]);
  const [markers, setMarkers] = useState<string[]>([]);
  const [newPath, setNewPath] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function isDefaultSourcePath(projectPath: string) {
    return projectPath.includes("/.agents/skills")
      || projectPath.includes("/.codex/skills")
      || projectPath.includes("/.cursor/skills")
      || projectPath.includes("/.claude/skills")
      || projectPath.includes("/.opencode/skills")
      || projectPath.includes("/.trae/skills");
  }

  function showNotice(type: "success" | "error", textValue: string) {
    setNotice({ type, text: textValue });
    window.setTimeout(() => setNotice(null), 2400);
  }

  async function load() {
    const response = await fetch("/api/projects");
    const json = await response.json();
    setTracked(json.tracked || []);
    setAvailableDefaults(json.availableDefaults || []);
    setMarkers(json.markers || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(path: string) {
    if (!path.trim()) return;
    setBusy("add");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!response.ok) throw new Error(t.failed);
      setNewPath("");
      await load();
      showNotice("success", t.added);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : t.failed);
    } finally {
      setBusy("");
    }
  }

  async function remove(path: string) {
    setBusy("remove");
    await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    await load();
    showNotice("success", t.removed);
    setBusy("");
  }

  async function pickDirectory() {
    setBusy("pick");
    try {
      const response = await fetch("/api/fs/pick-directory", { method: "POST" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || t.failed);
      if (json.path) setNewPath(json.path);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : t.failed);
    } finally {
      setBusy("");
    }
  }

  return (
    <Frame>
      <h1>{t.title}</h1>
      <p className="summary">{t.intro}</p>
      <div className="marker-grid">
        {markers.map((marker, index) => (
          <code className={`marker-chip tone-${index % 6}`} key={marker}>{marker}</code>
        ))}
      </div>
      <section className="card" style={{ padding: 28, marginTop: 24 }}>
        <h2>{t.manualTitle}</h2>
        <div className="row">
          <input className="search" value={newPath} onChange={(event) => setNewPath(event.target.value)} placeholder="/path/to/project-or-skills-root" />
          <button className="btn secondary" onClick={pickDirectory} disabled={busy !== ""}>{busy === "pick" ? t.picking : t.browse}</button>
          <button className="btn" onClick={() => add(newPath)} disabled={!newPath.trim() || busy !== ""}>{busy === "add" ? t.adding : t.add}</button>
        </div>
        <p className="summary">{t.pickerHint}</p>
      </section>
      <section className="card" style={{ padding: 28, marginTop: 24 }}>
        <h2>{t.tracked} ({tracked.length})</h2>
        {tracked.map((project) => (
          <div key={project.path} className="project-row">
            <div className="project-row-main">
              <div className="project-inline">
                <span className={`badge ${isDefaultSourcePath(project.path) ? "green" : "neutral"}`}>
                  {isDefaultSourcePath(project.path) ? t.defaultSource : t.projectSource}
                </span>
                <strong>{project.name}</strong>
                <span className="project-path" title={project.path}>{project.path}</span>
              </div>
              <button className="btn danger" onClick={() => remove(project.path)} disabled={busy !== ""}>{t.remove}</button>
            </div>
          </div>
        ))}
      </section>
      {availableDefaults.length > 0 && (
        <section className="card" style={{ padding: 28, marginTop: 24 }}>
          <h2>{t.availableDefaults} ({availableDefaults.length})</h2>
          {availableDefaults.map((project) => (
            <div key={project.path} className="project-row">
              <div className="project-row-main">
                <div className="project-inline">
                  <span className={`badge ${isDefaultSourcePath(project.path) ? "green" : "neutral"}`}>
                    {isDefaultSourcePath(project.path) ? t.defaultSource : t.projectSource}
                  </span>
                  <strong>{project.name}</strong>
                  <span className="project-path" title={project.path}>{project.path}</span>
                </div>
                <button className="btn secondary" onClick={() => add(project.path)} disabled={busy !== ""}>{t.add}</button>
              </div>
            </div>
          ))}
        </section>
      )}
      {notice && <div className={`toast ${notice.type}`}>{notice.text}</div>}
    </Frame>
  );
}
