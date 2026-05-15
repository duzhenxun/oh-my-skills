"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Download, Folder, Github, Grid2X2, Maximize, Minimize, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageContext, readStoredLanguage, type Language } from "./i18n";
import packageInfo from "../../package.json";

type Skin = "luma" | "paper" | "graphite" | "mint";

const labels = {
  zh: {
    subtitle: "Agent 技能管理",
    all: "全部技能",
    install: "安装技能",
    projects: "项目管理",
    language: "语言",
    skin: "风格",
    collapse: "收起侧栏",
    expand: "展开侧栏",
    fullscreen: "进入全屏",
    exitFullscreen: "退出全屏",
    openSource: "开源项目",
    currentVersion: "版本",
    luma: "光域",
    paper: "雪白",
    graphite: "石墨夜",
    mint: "青瓷",
  },
  en: {
    subtitle: "Agent Skill Manager",
    all: "All Skills",
    install: "Install Skills",
    projects: "Projects",
    language: "Language",
    skin: "Theme",
    collapse: "Collapse sidebar",
    expand: "Expand sidebar",
    fullscreen: "Enter fullscreen",
    exitFullscreen: "Exit fullscreen",
    openSource: "Open Source",
    currentVersion: "Version",
    luma: "Luma",
    paper: "Paper",
    graphite: "Graphite",
    mint: "Celadon",
  },
};

export function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [skin, setSkin] = useState<Skin>("luma");
  const t = labels[language];
  const languageOptions = [
    { value: "zh" as const, label: "中文" },
    { value: "en" as const, label: "English" },
  ];
  const skinOptions = [
    { value: "luma" as const, label: t.luma },
    { value: "paper" as const, label: t.paper },
    { value: "graphite" as const, label: t.graphite },
    { value: "mint" as const, label: t.mint },
  ];
  const items = [
    { href: "/", label: t.all, icon: Grid2X2 },
    { href: "/install", label: t.install, icon: Download },
    { href: "/projects", label: t.projects, icon: Folder },
  ];

  useEffect(() => {
    setCollapsed(localStorage.getItem("oms-sidebar-collapsed") === "1");
    setLanguage(readStoredLanguage());
    setSkin((localStorage.getItem("oms-skin") as Skin) || "luma");
  }, []);

  useEffect(() => {
    document.body.dataset.skin = skin;
    localStorage.setItem("oms-skin", skin);
  }, [skin]);

  useEffect(() => {
    localStorage.setItem("oms-language", language);
    window.dispatchEvent(new Event("oms-language-change"));
  }, [language]);

  useEffect(() => {
    localStorage.setItem("oms-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => undefined);
      setFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => undefined);
      setFullscreen(false);
    }
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <div className={`shell ${collapsed ? "is-collapsed" : ""}`}>
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-copy">
              <h1>Oh My Skills</h1>
              <p>{t.subtitle}</p>
            </div>
            <div className="sidebar-icons">
              <button title={collapsed ? t.expand : t.collapse} onClick={() => setCollapsed(!collapsed)}>
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <button title={fullscreen ? t.exitFullscreen : t.fullscreen} onClick={toggleFullscreen}>
                {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
          <nav className="nav">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-settings">
            <OptionMenu label={t.language} value={language} options={languageOptions} onChange={setLanguage} />
            <OptionMenu label={t.skin} value={skin} options={skinOptions} onChange={setSkin} />
            <a className="sidebar-version" href="https://github.com/duzhenxun/oh-my-skills" target="_blank" rel="noreferrer">
              <span className="version-source">
                <Github size={20} />
                <span>{t.openSource}</span>
              </span>
              <span>{t.currentVersion}: v{packageInfo.version}</span>
            </a>
          </div>
        </aside>
        <main className="content">{children}</main>
      </div>
    </LanguageContext.Provider>
  );
}

function OptionMenu<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];
  return (
    <div className="option-menu">
      <span>{label}</span>
      <button className={`option-trigger ${open ? "active" : ""}`} type="button" onClick={() => setOpen(!open)}>
        <span>{selected.label}</span>
        <ChevronDown size={17} />
      </button>
      {open && (
        <div className="option-popover">
          {options.map((option) => (
            <button key={option.value} className={option.value === value ? "selected" : ""} type="button" onClick={() => { onChange(option.value); setOpen(false); }}>
              <span>{option.label}</span>
              {option.value === value && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
