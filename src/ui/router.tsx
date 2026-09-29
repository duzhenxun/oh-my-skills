import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

function currentPath() {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

export function usePathname(): string {
  const [pathname, setPathname] = useState(currentPath);
  useEffect(() => {
    function sync() {
      setPathname(currentPath());
    }
    window.addEventListener("popstate", sync);
    window.addEventListener("oms-navigate", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("oms-navigate", sync);
    };
  }, []);
  return pathname;
}

export function navigate(to: string, options: { replace?: boolean } = {}) {
  if (typeof window === "undefined") return;
  if (options.replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new Event("oms-navigate"));
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Link({ href, onClick, children, ...rest }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (rest.target && rest.target !== "_self") return;
    event.preventDefault();
    navigate(href);
  }
  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
