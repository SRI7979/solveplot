/* eslint-disable @next/next/no-img-element -- the logo mark is cropped with CSS positioning that next/image would change. */
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { BRAND } from '@/lib/brand'
import { ProductShowcase } from './product-showcase'
import { LandingDetails } from './landing-details'
import { AutoSolveFilm } from './auto-solve-film'
import { LandingMotion } from './landing-motion'
import './landing-reset.css'
import './landing.css'
import './landing-refinements.css'
import './landing-editorial.css'
import './auto-solve-hero.css'
import './landing-relaunch.css'

export function Landing() {
  return <div className="solveplot-landing landing-relaunch" id="top">
    <LandingMotion />
    <section className="landing-top auto-solve-hero">
      <Image className="horizon-art" src="/images/solveplot-starlit-coast.png" fill priority unoptimized sizes="100vw" alt="" />
      <header className="landing-nav"><Link href="/" className="landing-logo" aria-label={`${BRAND.name} home`}><span className="provided-mark" aria-hidden="true"><img src="/images/solveplot-logo-source.png" alt=""/></span>{BRAND.wordmark}</Link><nav aria-label="Main navigation"><a href="#preview">Solver</a><a href="#tutor">AI Tutor</a><a href="#experience">Saved tricks</a><a href="#questions">FAQ</a></nav><Link className="nav-cta" href="/solve">Open solver <ArrowUpRight size={15}/></Link></header>
      <main className="landing-hero"><h1>Solve SAT Math<br /><em>with Desmos</em></h1><p>Upload or type an SAT Math question. {BRAND.name} fills the calculator and explains the solution.</p><div className="hero-actions"><Link href="/solve" className="landing-cta">Solve a question <ArrowRight size={17}/></Link></div><span className="hero-footnote">Sign in with Google or email</span></main>
      <AutoSolveFilm />
    </section>
    <div className="landing-content"><ProductShowcase/><LandingDetails/></div>
  </div>
}
