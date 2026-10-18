import { Geist, Geist_Mono, STIX_Two_Text, Nunito } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
const stix = STIX_Two_Text({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-stix",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

// Loading the variables does not change typography outside workspace shells.
export const workspaceFonts = `${geist.variable} ${geistMono.variable} ${stix.variable} ${nunito.variable}`;
