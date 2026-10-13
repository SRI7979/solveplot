import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND.name} | SAT Math with Desmos`,
  description: `Upload an SAT Math question. ${BRAND.name} shows you how to solve it with the Desmos calculator and explains each entry.`,
};

export default function Page() {
  return <Landing />;
}
