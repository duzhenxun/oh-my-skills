import { usePathname } from "@/ui/router";
import { HomePage } from "@/pages/HomePage";
import { InstallPage } from "@/pages/InstallPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { SkillDetailPage } from "@/pages/SkillDetailPage";
import { SkillFileEditorPage } from "@/pages/SkillFileEditorPage";

function normalize(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

export function App() {
  const pathname = normalize(usePathname());

  const fileMatch = pathname.match(/^\/skills\/([^/]+)\/files\/([^/]+)$/);
  if (fileMatch) {
    return <SkillFileEditorPage id={decodeURIComponent(fileMatch[1])} fileId={decodeURIComponent(fileMatch[2])} />;
  }

  const skillMatch = pathname.match(/^\/skills\/([^/]+)$/);
  if (skillMatch) {
    return <SkillDetailPage id={decodeURIComponent(skillMatch[1])} />;
  }

  if (pathname === "/install") return <InstallPage />;
  if (pathname === "/projects") return <ProjectsPage />;
  return <HomePage />;
}
