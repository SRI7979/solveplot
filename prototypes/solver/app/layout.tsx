import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './preview.css';
import './workspace.css';
import Workspace from './workspace';
import AppearanceProvider from './appearance';

const nunito = Nunito({subsets: ['latin'], display: 'swap'});
export const metadata: Metadata = { title: 'Desmo · Solver preview', robots: { index: false, follow: false } };

export default function Layout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body className={nunito.className}><AppearanceProvider><Workspace>{children}</Workspace></AppearanceProvider></body></html>;
}
