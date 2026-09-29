"use client";

import { useEffect } from "react";

// False until the first page has hydrated, so the page someone lands on
// renders straight away and only later in-app navigations fade in.
let hasNavigated = false;

/**
 * Templates remount on every navigation, so this gives each new page a short,
 * gentle fade. Only opacity moves (a transform here would break fixed
 * elements inside pages), and it's off for reduced-motion users.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  const animate = hasNavigated;
  useEffect(() => {
    hasNavigated = true;
  }, []);
  return <div className={animate ? "page-enter" : undefined}>{children}</div>;
}
