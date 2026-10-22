import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import ThemeProvider from "@/components/theme-provider";
import AppearanceProvider from "@/components/appearance-provider";
import { workspaceFonts } from "@/components/workspace-fonts";
import { BRAND } from "@/lib/brand";
import { SITE_METADATA } from "@/lib/site-metadata";
import "katex/dist/katex.min.css";
import "./globals.css";
import "./solve/solver-ui.css";
import "@/components/raised-buttons.css";
import "@/components/app-controls.css";
import RaisedButtonFeedback from "@/components/raised-buttons";
import WorkspaceAccountProvider from "@/components/workspace-account-provider";

// Carry existing browser preferences into the renamed keys before the first paint.
// The previous prefix is retained only for this migration.
const themeInit = `(()=>{try{for(const [storage,keys] of [[localStorage,["theme","sidebar-collapsed"]],[sessionStorage,["appearance","solver:split"]]]){for(const key of keys){if(storage.getItem("solveplot-"+key)===null){const previous=storage.getItem("desmo-"+key);if(previous!==null)storage.setItem("solveplot-"+key,previous)}}}const value=localStorage.getItem("solveplot-theme");const dark=value==="dark"||(value==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=dark?"dark":"light"}catch{document.documentElement.dataset.theme="light"}})()`;

export const metadata: Metadata = {
  ...SITE_METADATA,
  title: BRAND.name,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={workspaceFonts} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <RaisedButtonFeedback />
        <ThemeProvider>
          <AppearanceProvider>
            <WorkspaceAccountProvider>{children}</WorkspaceAccountProvider>
          </AppearanceProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
