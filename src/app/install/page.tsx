"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Frame } from "@/ui/Frame";
import { useLanguage } from "@/ui/i18n";
import type { HubSkill, SkillRecord } from "@/core/model";

const installTargets = [
  { key: "global-agents", label: "Agents Global", hint: "~/.agents/skills/" },
  { key: "global-cursor", label: "Cursor Global", hint: "~/.cursor/skills/" },
  { key: "global-claude", label: "Claude Global", hint: "~/.claude/skills/" },
  { key: "global-opencode", label: "OpenCode Global", hint: "~/.opencode/skills/" },
  { key: "global-trae", label: "Trae Global", hint: "~/.trae/skills/" },
  { key: "global-codex", label: "Codex Global", hint: "~/.codex/skills/" },
];

const text = {
  zh: {
    title: "安装技能", hub: "技能库", repo: "Git 仓库", create: "手动创建", searchPlaceholder: "输入关键词搜索 SkillHub", searching: "搜索中...", search: "搜索", hubHint: "关键词会搜索 SkillHub；点击结果后选择安装位置。", installed: "已安装", notInstalled: "未安装", author: "作者", source: "来源", downloads: "下载", stars: "收藏", viewInstalled: "查看安装信息", viewInstall: "点击查看并安装", repoPlaceholder: "Git 仓库 URL", processing: "处理中...", fetchList: "拉取列表", skillName: "技能名称", skillContent: "SKILL.md 内容", creating: "创建中...", close: "关闭", installTo: "安装到：", installing: "安装中...", install: "安装", destination: "安装到", selectedHub: "已选择 SkillHub 技能", reinstallWarning: (name: string) => `本机已经存在匹配的 skill：${name}。如需重新安装，请先到“全部技能”里手动删除原 skill。`, createSuccess: "技能创建成功", installSuccess: "安装成功", copyExisting: "复制已有技能", backDetail: "返回详情", copyHint: "选择一个目标目录，把这个技能复制过去。", currentPath: "当前路径：", copyTo: "复制到：", copying: "复制中...", copy: "复制", copySuccess: "复制成功", failed: "操作失败",
  },
  en: {
    title: "Install Skills", hub: "SkillHub", repo: "Git Repository", create: "Create Manually", searchPlaceholder: "Search SkillHub", searching: "Searching...", search: "Search", hubHint: "Search SkillHub by keyword, then choose a destination after selecting a result.", installed: "Installed", notInstalled: "Not Installed", author: "Author", source: "Source", downloads: "Downloads", stars: "Stars", viewInstalled: "View install details", viewInstall: "View and install", repoPlaceholder: "Git repository URL", processing: "Processing...", fetchList: "Fetch list", skillName: "Skill name", skillContent: "SKILL.md content", creating: "Creating...", close: "Close", installTo: "Install to:", installing: "Installing...", install: "Install", destination: "Install to", selectedHub: "Selected SkillHub skill", reinstallWarning: (name: string) => `A matching local skill already exists: ${name}. To reinstall it, delete the original skill manually from All Skills first.`, createSuccess: "Skill created", installSuccess: "Installed successfully", copyExisting: "Copy existing skill", backDetail: "Back to details", copyHint: "Choose a destination and copy this skill there.", currentPath: "Current path: ", copyTo: "Copy to:", copying: "Copying...", copy: "Copy", copySuccess: "Copied successfully", failed: "Action failed",
  },
};

export default function InstallPage() {
  const language = useLanguage();
  const t = text[language];
  const [tab, setTab] = useState<"hub" | "create" | "repo">("hub");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HubSkill[]>([]);
  const [selected, setSelected] = useState<HubSkill | null>(null);
  const [copySkill, setCopySkill] = useState<SkillRecord | null>(null);
  const [destination, setDestination] = useState("global-agents");
  const [name, setName] = useState("");
  const [raw, setRaw] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoSkills, setRepoSkills] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function showNotice(type: "success" | "error", textValue: string) {
    setNotice({ type, text: textValue });
    window.setTimeout(() => setNotice(null), 2600);
  }

  useEffect(() => {
    const copyId = new URLSearchParams(window.location.search).get("copy") || "";
    if (!copyId) {
      searchHub("");
      return;
    }
    fetch(`/api/install/copy?id=${encodeURIComponent(copyId)}`).then((response) => response.json()).then((json) => {
      if (json.skill) setCopySkill(json.skill);
      else showNotice("error", json.error || t.failed);
    }).catch((error) => showNotice("error", String(error)));
  }, []);

  async function searchHub(nextQuery = query) {
    setBusyAction("search");
    try {
      const response = await fetch("/api/install/hub-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: nextQuery }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || t.failed);
      setResults(json.skills || []);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : t.failed);
    } finally {
      setBusyAction("");
    }
  }

  async function installHubSelection() {
    if (!selected) return;
    setBusyAction("hub-install");
    try {
      const response = await fetch("/api/install/hub", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destination, name: selected.name, slug: selected.slug || selected.id }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || t.failed);
      showNotice("success", t.installSuccess);
      setSelected(null);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : t.failed);
    } finally {
      setBusyAction("");
    }
  }

  async function createManual() {
    setBusyAction("manual");
    try {
      const response = await fetch("/api/install/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destination, name, raw }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || t.failed);
      showNotice("success", t.createSuccess);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : t.failed);
    } finally {
      setBusyAction("");
    }
  }

  async function inspectRepo() {
    setBusyAction("repo");
    try {
      const response = await fetch("/api/install/repo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoUrl }) });
      const json = await response.json();
      setRepoSkills(json.skills || []);
    } finally {
      setBusyAction("");
    }
  }

  async function installRepoSkill(skillName: string) {
    setBusyAction("repo");
    try {
      const response = await fetch("/api/install/repo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoUrl, skillName, destination }) });
      const json = await response.json();
      showNotice(response.ok ? "success" : "error", response.ok ? t.installSuccess : json.error || t.failed);
    } finally {
      setBusyAction("");
    }
  }

  async function copyExistingSkill() {
    if (!copySkill) return;
    setBusyAction("copy");
    try {
      const response = await fetch("/api/install/copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: copySkill.id, destination }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || t.failed);
      showNotice("success", t.copySuccess);
      setCopySkill(null);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : t.failed);
    } finally {
      setBusyAction("");
    }
  }

  return (
    <Frame>
      <h1>{t.title}</h1>
      <div className="row" style={{ margin: "24px 0" }}>
        <button className={`pill ${tab === "hub" ? "active" : ""}`} onClick={() => setTab("hub")}>{t.hub}</button>
        <button className={`pill ${tab === "repo" ? "active" : ""}`} onClick={() => setTab("repo")}>{t.repo}</button>
        <button className={`pill ${tab === "create" ? "active" : ""}`} onClick={() => setTab("create")}>{t.create}</button>
      </div>
      {tab === "hub" && <>
        <section className="card" style={{ padding: 28 }}>
          <form className="row" onSubmit={(event) => { event.preventDefault(); searchHub(); }}><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} /><button className="btn" type="submit" disabled={busyAction !== ""}>{busyAction === "search" ? t.searching : t.search}</button></form>
          <p className="summary">{t.hubHint}</p>
        </section>
        <section className="card install-results">{results.map((item) => <button key={item.id} className={`hub-result ${item.installed ? "is-installed" : ""}`} onClick={() => setSelected(item)}><div><div className="skill-title"><h3>{item.name}</h3><span className={`badge ${item.installed ? "green" : ""}`}>{item.installed ? t.installed : t.notInstalled}</span>{item.owner && <span className="badge">{t.author} {item.owner}</span>}{item.source && <span className="badge">{t.source} {item.source}</span>}{item.downloads !== undefined && <span className="badge">{t.downloads} {item.downloads}</span>}{item.stars !== undefined && <span className="badge">{t.stars} {item.stars}</span>}</div><p className="summary">{item.description || item.url}</p></div><span className="hub-result-action">{item.installed ? t.viewInstalled : t.viewInstall}</span></button>)}</section>
      </>}
      {tab === "repo" && <section className="card" style={{ padding: 28 }}><div className="row"><input className="search" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} placeholder={t.repoPlaceholder} /><button className="btn" onClick={inspectRepo} disabled={busyAction !== ""}>{busyAction === "repo" ? t.processing : t.fetchList}</button></div><DestinationPicker value={destination} onChange={setDestination} label={t.destination} /><div className="segmented" style={{ marginTop: 18 }}>{repoSkills.map((skill) => <button key={skill} className="pill" onClick={() => installRepoSkill(skill)}>{skill}</button>)}</div></section>}
      {tab === "create" && <section className="card form" style={{ padding: 28 }}><label className="field"><span>{t.skillName}</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><DestinationPicker value={destination} onChange={setDestination} label={t.destination} /><label className="field"><span>{t.skillContent}</span><textarea rows={12} value={raw} onChange={(event) => setRaw(event.target.value)} /></label><button className="btn" onClick={createManual} disabled={busyAction !== ""}>{busyAction === "manual" ? t.creating : t.create}</button></section>}
      {copySkill && <div className="modal-backdrop"><section className="modal"><div className="detail-hero"><div className="row" style={{ justifyContent: "space-between" }}><span className="summary">{t.copyExisting}</span><Link className="btn secondary" href={`/skills/${copySkill.id}`}>{t.backDetail}</Link></div><h1>{copySkill.title}</h1><p className="summary">{copySkill.summary || t.copyHint}</p><p className="summary">{t.currentPath}<code>{copySkill.filePath}</code></p></div><div className="modal-section"><h2>{t.copyTo}</h2><DestinationPicker value={destination} onChange={setDestination} label={t.destination} grid /><div className="row modal-actions" style={{ justifyContent: "space-between", marginTop: 28 }}><span className="summary">{copySkill.title}</span><button className="btn" onClick={copyExistingSkill} disabled={busyAction !== ""}>{busyAction === "copy" ? t.copying : t.copy}</button></div></div></section></div>}
      {selected && <div className="modal-backdrop"><section className="modal"><div className="detail-hero"><div className="row" style={{ justifyContent: "space-between" }}><span className="summary">{t.selectedHub}</span><button className="btn secondary" onClick={() => setSelected(null)}>{t.close}</button></div><h1>{selected.name}</h1><div className="metric-row"><span>{selected.installed ? t.installed : t.notInstalled}</span>{selected.owner && <span>{t.author} {selected.owner}</span>}{selected.source && <span>{t.source} {selected.source}</span>}{selected.downloads !== undefined && <span>{t.downloads} {selected.downloads}</span>}{selected.version && <span>v{selected.version}</span>}</div><p className="summary">{selected.description}</p>{selected.installed && <p className="install-warning">{t.reinstallWarning(selected.installedSkillTitle || selected.name)}</p>}</div><div className="modal-section"><h2>{t.installTo}</h2><DestinationPicker value={destination} onChange={setDestination} label={t.destination} grid /><div className="row modal-actions" style={{ justifyContent: "space-between", marginTop: 28 }}><span className="summary">{selected.name}</span><button className="btn" onClick={installHubSelection} disabled={busyAction !== "" || selected.installed}>{selected.installed ? t.installed : busyAction === "hub-install" ? t.installing : t.install}</button></div></div></section></div>}
      {notice && <div className={`toast ${notice.type}`}>{notice.text}</div>}
    </Frame>
  );
}

function DestinationPicker({ value, onChange, label, grid = false }: { value: string; onChange: (value: string) => void; label: string; grid?: boolean }) {
  if (grid) return <div className="target-grid">{installTargets.map((target) => <button key={target.key} className={`target ${value === target.key ? "active" : ""}`} onClick={() => onChange(target.key)}><strong>{target.label}</strong><p className="summary">{target.hint}</p></button>)}</div>;
  return <label className="field" style={{ marginTop: 16 }}><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{installTargets.map((target) => <option key={target.key} value={target.key}>{target.label}</option>)}</select></label>;
}
