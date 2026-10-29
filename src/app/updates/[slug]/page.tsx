import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/site-metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PRODUCT_UPDATES } from "@/content/product-updates";
import { UpdateArticle } from "../update-article";
import styles from "../updates.module.css";

export function generateStaticParams() { return PRODUCT_UPDATES.map(update => ({ slug: update.id })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const update = PRODUCT_UPDATES.find(item => item.id === slug);
  return update ? publicPageMetadata({ title: `${update.title} | SolvePlot updates`, description: update.summary, path: `/updates/${update.id}` }) : {};
}
export default async function UpdatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const index = PRODUCT_UPDATES.findIndex(item => item.id === slug);
  if (index < 0) notFound();
  const update = PRODUCT_UPDATES[index];
  const older = PRODUCT_UPDATES[index + 1];
  return <main className={`${styles.main} ${styles.single}`}><Link className={styles.back} href="/updates"><ArrowLeft size={16} />All updates</Link><UpdateArticle update={update} standalone />
    <footer className={styles.footer}><Link href="/updates">Browse release notes</Link>{older && <Link href={`/updates/${older.id}`}>Older update <ArrowRight size={15} /></Link>}</footer></main>;
}
