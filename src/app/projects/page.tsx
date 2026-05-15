"use client";

import { useEffect, useRef, useState } from "react";
import { Frame } from "@/ui/Frame";
import { useLanguage } from "@/ui/i18n";

interface ProjectItem { path: string; name: string; addedAt: string }
interface DiscoverySnapshot { discovered: string[]; scannedAt: string; roots: string[]; durationMs: number }
type DirectoryInputProps = React.InputHTMLAttributes<HTMLInputElement> & { webkitdirectory?: string; directory?: string };

const text = {
  zh: { title: "项目管理", intro: "添加项目后，会扫描这些本地技能目录：", manualTitle: "手动添加项目", chooseFolder: "选择目录", adding: "添加中...", add: "添加", pickerHint: "可以自行粘贴绝对路径；“选择目录”受浏览器限制，通常只能辅助填入目录名。", scanTitle: "全盘扫描", scanning: "扫描中...", scanComputer: "扫描整台电脑", lastScan: (date: string, seconds: string, count: number) => `上次扫描：${date}，耗时 ${seconds}s，发现 ${count} 个项目`, tracked: "已跟踪项目", remove: "移除", discovered: "发现的项目", addAll: "全部添加", added: "项目已添加", removed: "项目已移除", scanDone: (count: number) => `扫描完成，发现 ${count} 个未跟踪项目`, addedAll: "已添加全部发现项目", pickerToast: "浏览器只能提供目录名，请确认或补全绝对路径", failed: "操作失败" },
  en: { title: "Project Management", intro: "After adding a project, these local skill folders will be scanned:", manualTitle: "Add Project Manually", chooseFolder: "Choose Folder", adding: "Adding...", add: "Add", pickerHint: "You can paste an absolute path. Folder picking is browser-limited and usually only helps fill in the folder name.", scanTitle: "Full Disk Scan", scanning: "Scanning...", scanComputer: "Scan This Computer", lastScan: (date: string, seconds: string, count: number) => `Last scan: ${date}, took ${seconds}s, found ${count} projects`, tracked: "Tracked Projects", remove: "Remove", discovered: "Discovered Projects", addAll: "Add All", added: "Project added", removed: "Project removed", scanDone: (count: number) => `Scan complete, found ${count} untracked projects`, addedAll: "All discovered projects added", pickerToast: "The browser only provides the folder name. Please confirm or complete the absolute path.", failed: "Action failed" },
};

export default function ProjectsPage() {
  const language = useLanguage();
  const t = text[language];
  const [tracked, setTracked] = useState<ProjectItem[]>([]);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [markers, setMarkers] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<DiscoverySnapshot | null>(null);
  const [newPath, setNewPath] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const pickerRef = useRef<HTMLInputElement | null>(null);

  function showNotice(type: "success" | "error", textValue: string) { setNotice({ type, text: textValue }); window.setTimeout(() => setNotice(null), 2400); }
  async function load(discover = false) {
    if (discover) setBusy("scan");
    const response = await fetch(`/api/projects${discover ? "?discover=1" : ""}`);
    const json = await response.json();
    setTracked(json.tracked || []);
    setDiscovered(json.discovered || []);
    setMarkers(json.markers || []);
    setSnapshot(json.snapshot || null);
    if (discover) { showNotice("success", t.scanDone(json.discovered?.length || 0)); setBusy(""); }
  }
  useEffect(() => { load(); }, []);
  async function add(path: string) { if (!path.trim()) return; setBusy("add"); try { const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) }); if (!response.ok) throw new Error(t.failed); setNewPath(""); await load(); showNotice("success", t.added); } catch (error) { showNotice("error", error instanceof Error ? error.message : t.failed); } finally { setBusy(""); } }
  async function remove(path: string) { setBusy("remove"); await fetch("/api/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) }); await load(); showNotice("success", t.removed); setBusy(""); }
  async function addAll() { setBusy("add-all"); for (const path of discovered) await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) }); await load(); showNotice("success", t.addedAll); setBusy(""); }
  function handlePickedFiles(files: FileList | null) { const first = files?.[0] as (File & { webkitRelativePath?: string }) | undefined; const relative = first?.webkitRelativePath; if (!relative) return; setNewPath(relative.split("/")[0]); showNotice("success", t.pickerToast); }

  const directoryInputProps: DirectoryInputProps = { webkitdirectory: "", directory: "" };
  return <Frame><h1>{t.title}</h1><p className="summary">{t.intro}</p><div className="marker-grid">{markers.map((marker, index) => <code className={`marker-chip tone-${index % 6}`} key={marker}>{marker}</code>)}</div><section className="card" style={{ padding: 28, marginTop: 24 }}><h2>{t.manualTitle}</h2><div className="row"><input className="search" value={newPath} onChange={(event) => setNewPath(event.target.value)} placeholder="/path/to/project" /><button className="btn secondary" onClick={() => pickerRef.current?.click()}>{t.chooseFolder}</button><button className="btn" onClick={() => add(newPath)} disabled={!newPath.trim() || busy !== ""}>{busy === "add" ? t.adding : t.add}</button></div><input ref={pickerRef} type="file" multiple hidden onChange={(event) => handlePickedFiles(event.target.files)} {...directoryInputProps} /><p className="summary">{t.pickerHint}</p></section><section className="card" style={{ padding: 28, marginTop: 24 }}><div className="row" style={{ justifyContent: "space-between" }}><h2>{t.scanTitle}</h2><button className="btn" onClick={() => load(true)} disabled={busy !== ""}>{busy === "scan" ? t.scanning : t.scanComputer}</button></div>{snapshot && <p className="summary">{t.lastScan(new Date(snapshot.scannedAt).toLocaleString(language === "zh" ? "zh-CN" : "en-US"), (snapshot.durationMs / 1000).toFixed(1), snapshot.discovered.length)}</p>}</section><section className="card" style={{ padding: 28, marginTop: 24 }}><h2>{t.tracked} ({tracked.length})</h2>{tracked.map((project) => <div key={project.path} className="skill-row"><div /><div className="row" style={{ justifyContent: "space-between" }}><div><strong>{project.name}</strong><p className="summary">{project.path}</p></div><button className="btn danger" onClick={() => remove(project.path)} disabled={busy !== ""}>{t.remove}</button></div></div>)}</section>{discovered.length > 0 && <section className="card" style={{ padding: 28, marginTop: 24 }}><div className="row" style={{ justifyContent: "space-between" }}><h2>{t.discovered} ({discovered.length})</h2><button className="btn secondary" onClick={addAll} disabled={busy !== ""}>{busy === "add-all" ? t.adding : t.addAll}</button></div>{discovered.map((path) => <div key={path} className="skill-row"><div /><div className="row" style={{ justifyContent: "space-between" }}><span>{path}</span><button className="btn secondary" onClick={() => add(path)} disabled={busy !== ""}>{t.add}</button></div></div>)}</section>}{notice && <div className={`toast ${notice.type}`}>{notice.text}</div>}</Frame>;
}
