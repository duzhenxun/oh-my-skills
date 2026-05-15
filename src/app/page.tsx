"use client";

import Link from "next/link";
import { CheckCircle2, CircleOff, Grid2X2, Layers3, List, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Frame } from "@/ui/Frame";
import { useLanguage } from "@/ui/i18n";
import { formatBytes } from "@/core/names";
import type { SkillRecord } from "@/core/model";

type StateFilter = "" | "enabled" | "disabled";
type ViewMode = "list" | "card";

const copyTargets = [
  { key: "global-agents", label: "Agents Global" },
  { key: "global-cursor", label: "Cursor Global" },
  { key: "global-claude", label: "Claude Global" },
  { key: "global-opencode", label: "OpenCode Global" },
  { key: "global-trae", label: "Trae Global" },
  { key: "global-codex", label: "Codex Global" },
];

const text = {
  zh: {
    total: "技能总数",
    enabledTotal: "已启用",
    disabledTotal: "已关闭",
    search: "搜索技能...",
    source: "来源",
    all: "全部",
    status: "状态",
    enabled: "启用",
    disabled: "禁用",
    select: "选择",
    selectAll: "全选当前",
    invert: "反选",
    clear: "清空",
    selected: (selected: number, total: number) => `已选 ${selected} / ${total}`,
    bulkInstallTo: "批量安装到",
    bulkEnable: "批量启用",
    bulkDisable: "批量禁用",
    bulkDelete: "批量删除",
    cardView: "卡片视图",
    listView: "列表视图",
    busy: "处理中...",
    scanning: "正在扫描技能目录...",
    empty: "没有找到符合条件的技能。",
    choose: (title: string) => `选择 ${title}`,
    toggle: "切换启用状态",
    size: "大小",
    modified: "修改",
    noDescription: "暂无描述",
    deleteConfirm: (count: number) => `确认删除选中的 ${count} 个技能吗？`,
    done: (count: number) => `已处理 ${count} 个技能`,
    partial: (ok: number, failed: number) => `完成 ${ok} 个，失败 ${failed} 个`,
    failed: "批量操作失败",
  },
  en: {
    total: "Total Skills",
    enabledTotal: "Enabled",
    disabledTotal: "Disabled",
    search: "Search skills...",
    source: "Source",
    all: "All",
    status: "Status",
    enabled: "Enabled",
    disabled: "Disabled",
    select: "Select",
    selectAll: "Select visible",
    invert: "Invert",
    clear: "Clear",
    selected: (selected: number, total: number) => `Selected ${selected} / ${total}`,
    bulkInstallTo: "Install selected to",
    bulkEnable: "Enable selected",
    bulkDisable: "Disable selected",
    bulkDelete: "Delete selected",
    cardView: "Card view",
    listView: "List view",
    busy: "Working...",
    scanning: "Scanning skill folders...",
    empty: "No matching skills found.",
    choose: (title: string) => `Select ${title}`,
    toggle: "Toggle enabled state",
    size: "Size",
    modified: "Modified",
    noDescription: "No description",
    deleteConfirm: (count: number) => `Delete the selected ${count} skills?`,
    done: (count: number) => `Processed ${count} skills`,
    partial: (ok: number, failed: number) => `Completed ${ok}, failed ${failed}`,
    failed: "Bulk action failed",
  },
};

export default function HomePage() {
  const language = useLanguage();
  const t = text[language];
  const [allSkills, setAllSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState<StateFilter>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [bulkDestination, setBulkDestination] = useState("global-agents");
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function showNotice(type: "success" | "error", textValue: string) {
    setNotice({ type, text: textValue });
    window.setTimeout(() => setNotice(null), 2600);
  }

  async function load() {
    setLoading(true);
    const response = await fetch("/api/skills");
    const json = await response.json();
    setAllSkills(json.skills || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    setViewMode((localStorage.getItem("oms-skill-view") as ViewMode) || "list");
  }, []);

  useEffect(() => {
    localStorage.setItem("oms-skill-view", viewMode);
  }, [viewMode]);

  const searchedSkills = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return allSkills;
    return allSkills.filter((skill) => `${skill.title} ${skill.summary}`.toLowerCase().includes(value));
  }, [allSkills, query]);

  const locations = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    searchedSkills.forEach((skill) => {
      const current = map.get(skill.locationKey) || { label: skill.locationLabel, count: 0 };
      current.count += 1;
      map.set(skill.locationKey, current);
    });
    return [...map.entries()].map(([key, value]) => ({ key, ...value }));
  }, [searchedSkills]);

  const locationFilteredSkills = useMemo(() => location ? searchedSkills.filter((skill) => skill.locationKey === location) : searchedSkills, [searchedSkills, location]);
  const stateCounts = useMemo(() => {
    const enabled = locationFilteredSkills.filter((skill) => skill.enabled).length;
    return { all: locationFilteredSkills.length, enabled, disabled: locationFilteredSkills.length - enabled };
  }, [locationFilteredSkills]);
  const skills = useMemo(() => state === "enabled" ? locationFilteredSkills.filter((skill) => skill.enabled) : state === "disabled" ? locationFilteredSkills.filter((skill) => !skill.enabled) : locationFilteredSkills, [locationFilteredSkills, state]);
  const statEnabledCount = locationFilteredSkills.filter((skill) => skill.enabled).length;
  const statDisabledCount = locationFilteredSkills.length - statEnabledCount;
  const statTotal = locationFilteredSkills.length;
  const enabledRate = statTotal ? Math.round((statEnabledCount / statTotal) * 100) : 0;
  const disabledRate = statTotal ? 100 - enabledRate : 0;
  const visibleIds = useMemo(() => skills.map((skill) => skill.id), [skills]);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;

  async function toggle(skill: SkillRecord) {
    await fetch("/api/skills/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: skill.id, enabled: !skill.enabled }) });
    await load();
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(action: "enable" | "disable" | "delete" | "copy") {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (action === "delete" && !window.confirm(t.deleteConfirm(ids.length))) return;
    setBusyAction(action);
    try {
      const response = await fetch("/api/skills/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, action, destination: bulkDestination }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || t.failed);
      setSelectedIds(new Set());
      await load();
      showNotice(json.failed ? "error" : "success", json.failed ? t.partial(json.succeeded, json.failed) : t.done(json.succeeded));
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : t.failed);
    } finally {
      setBusyAction("");
    }
  }

  return (
    <Frame>
      <section className="stats">
        <div className="card stat stat-total">
          <div className="stat-head"><span>{t.total}</span><Layers3 size={22} /></div>
          <div className="stat-main"><strong>{statTotal}</strong><small>100%</small></div>
          <div className="stat-track"><i style={{ width: "100%" }} /></div>
        </div>
        <div className="card stat stat-enabled">
          <div className="stat-head"><span>{t.enabledTotal}</span><CheckCircle2 size={22} /></div>
          <div className="stat-main"><strong>{statEnabledCount}</strong><small>{enabledRate}%</small></div>
          <div className="stat-track"><i style={{ width: `${enabledRate}%` }} /></div>
        </div>
        <div className="card stat stat-disabled">
          <div className="stat-head"><span>{t.disabledTotal}</span><CircleOff size={22} /></div>
          <div className="stat-main"><strong>{statDisabledCount}</strong><small>{disabledRate}%</small></div>
          <div className="stat-track"><i style={{ width: `${disabledRate}%` }} /></div>
        </div>
      </section>

      <section className="toolbar">
        <div className="row">
          <label className="search-wrap">
            <Search size={20} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
          </label>
          <div className="view-toggle" role="group" aria-label={language === "zh" ? "切换浏览方式" : "Switch view mode"}>
            <button className={viewMode === "card" ? "active" : ""} type="button" title={t.cardView} aria-label={t.cardView} onClick={() => setViewMode("card")}><Grid2X2 size={20} /></button>
            <button className={viewMode === "list" ? "active" : ""} type="button" title={t.listView} aria-label={t.listView} onClick={() => setViewMode("list")}><List size={21} /></button>
          </div>
        </div>
        <div className="segmented">
          <strong>{t.source}</strong>
          <button className={`pill ${location === "" ? "active" : ""}`} onClick={() => setLocation("")}>{t.all} ({searchedSkills.length})</button>
          {locations.map((item) => <button key={item.key} className={`pill ${location === item.key ? "active" : ""}`} onClick={() => setLocation(item.key)}>{item.label} ({item.count})</button>)}
        </div>
        <div className="segmented">
          <strong>{t.status}</strong>
          <button className={`pill ${state === "" ? "active" : ""}`} onClick={() => setState("")}>{t.all} ({stateCounts.all})</button>
          <button className={`pill ${state === "enabled" ? "active" : ""}`} onClick={() => setState("enabled")}>{t.enabled} ({stateCounts.enabled})</button>
          <button className={`pill ${state === "disabled" ? "active" : ""}`} onClick={() => setState("disabled")}>{t.disabled} ({stateCounts.disabled})</button>
        </div>
        <div className="bulk-toolbar card">
          <div className="segmented">
            <strong>{t.select}</strong>
            <button className="pill" onClick={() => setSelectedIds(new Set([...selectedIds, ...visibleIds]))}>{t.selectAll} ({skills.length})</button>
            <button className="pill" onClick={() => setSelectedIds((current) => { const next = new Set(current); visibleIds.forEach((id) => next.has(id) ? next.delete(id) : next.add(id)); return next; })}>{t.invert}</button>
            <button className="pill" onClick={() => setSelectedIds(new Set())}>{t.clear}</button>
            <span className="summary">{t.selected(selectedVisibleCount, skills.length)}</span>
          </div>
          {selectedIds.size > 0 && (
            <div className="bulk-actions">
              <select value={bulkDestination} onChange={(event) => setBulkDestination(event.target.value)}>{copyTargets.map((target) => <option key={target.key} value={target.key}>{target.label}</option>)}</select>
              <button className="btn secondary" onClick={() => bulk("copy")} disabled={busyAction !== ""}>{busyAction === "copy" ? t.busy : t.bulkInstallTo}</button>
              <button className="btn secondary" onClick={() => bulk("enable")} disabled={busyAction !== ""}>{t.bulkEnable}</button>
              <button className="btn secondary" onClick={() => bulk("disable")} disabled={busyAction !== ""}>{t.bulkDisable}</button>
              <button className="btn danger" onClick={() => bulk("delete")} disabled={busyAction !== ""}>{t.bulkDelete}</button>
            </div>
          )}
        </div>
      </section>

      {viewMode === "card" ? (
        <section className="skill-card-grid">
          {loading ? <div className="card empty-state">{t.scanning}</div> : skills.length === 0 ? <div className="card empty-state">{t.empty}</div> : skills.map((skill) => (
            <article key={skill.id} className={`skill-card ${selectedIds.has(skill.id) ? "selected" : ""}`}>
              <label className="select-box card-select" onClick={(event) => event.stopPropagation()}>
                <input type="checkbox" aria-label={t.choose(skill.title)} checked={selectedIds.has(skill.id)} onChange={() => toggleSelection(skill.id)} />
                <span />
              </label>
              <Link href={`/skills/${skill.id}`} className="skill-card-body">
                <div className="skill-card-badges">
                  <span className={`badge ${skill.tool === "trae" ? "pink" : "green"}`}>{skill.tool.toUpperCase()}</span>
                  <span className="badge neutral">{skill.scope === "global" ? "GLOBAL" : "PROJECT"}</span>
                </div>
                <h3>{skill.title}</h3>
                <p>{skill.summary || t.noDescription}</p>
              </Link>
              <div className="skill-card-footer">
                <span>{skill.locationLabel}</span>
                <button className={`switch ${skill.enabled ? "on" : ""}`} onClick={() => toggle(skill)} aria-label={t.toggle} />
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="card table">
          {loading ? <div className="skill-row"><div /><p>{t.scanning}</p></div> : skills.length === 0 ? <div className="skill-row"><div /><p>{t.empty}</p></div> : skills.map((skill) => (
            <article key={skill.id} className="skill-row">
              <label className="select-box" onClick={(event) => event.stopPropagation()}>
                <input type="checkbox" aria-label={t.choose(skill.title)} checked={selectedIds.has(skill.id)} onChange={() => toggleSelection(skill.id)} />
                <span />
              </label>
              <div className="skill-list-content">
                <div className="skill-title">
                  <button className={`switch ${skill.enabled ? "on" : ""}`} onClick={() => toggle(skill)} aria-label={t.toggle} />
                  <Link href={`/skills/${skill.id}`}><h3>{skill.title}</h3></Link>
                  <span className="badge">{skill.tool.toUpperCase()}</span>
                  <span className="badge">{skill.locationLabel}</span>
                  <span className={`badge ${skill.enabled ? "green" : "red"}`}>{skill.enabled ? t.enabled : t.disabled}</span>
                  <span className="badge neutral">{t.size} {formatBytes(skill.bytes)}</span>
                  <span className="badge neutral">{t.modified} {new Date(skill.updatedAt).toLocaleString(language === "zh" ? "zh-CN" : "en-US")}</span>
                </div>
                <Link href={`/skills/${skill.id}`} className="summary skill-summary-link">{skill.summary || t.noDescription}</Link>
              </div>
            </article>
          ))}
        </section>
      )}
      {notice && <div className={`toast ${notice.type}`}>{notice.text}</div>}
    </Frame>
  );
}
