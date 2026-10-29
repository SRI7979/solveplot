import { Geist, Geist_Mono, STIX_Two_Text, Nunito } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  preload: false,
});
const stix = STIX_Two_Text({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-stix",
  preload: false,
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  preload: false,
  display: "swap",
});

// Keep custom font choices available, but preload only the default Modern face.
// Other faces load when a page or an appearance preference actually uses them.
export const workspaceFonts = `${geist.variable} ${geistMono.variable} ${stix.variable} ${nunito.variable}`;
