import { SiteFooter, SiteHeader } from "@/components/site-header";
import { MobileTabs } from "@/components/mobile-tabs";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="print:hidden"><SiteHeader /></div>
      <main id="main" className="pb-24 lg:pb-0">
        {children}
      </main>
      <div className="print:hidden"><SiteFooter /></div>
      <div className="print:hidden"><MobileTabs /></div>
    </>
  );
}
