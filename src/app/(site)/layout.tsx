import { Suspense } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { GoodNews } from "@/components/good-news";
import { MobileTabs } from "@/components/mobile-tabs";
import { BackToTop, MotionEffects, RouteProgress } from "@/components/motion";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <MotionEffects />
      <div className="print:hidden"><SiteHeader /></div>
      <main id="main" tabIndex={-1} className="pb-24 outline-none focus:ring-0 focus-visible:ring-0 lg:pb-0">
        {children}
      </main>
      <div className="print:hidden"><SiteFooter /></div>
      <div className="print:hidden"><MobileTabs /></div>
      <BackToTop />
      <Suspense fallback={null}>
        <GoodNews />
      </Suspense>
    </>
  );
}
