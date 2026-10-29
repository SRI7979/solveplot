"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, ChartNoAxesCombined, Check, ChevronRight, CircleCheck, Flag, GraduationCap, Play, RotateCcw, Search, Target, X } from "lucide-react";
import { LEARN_PATHS, LESSONS, getLessonHref, type LearnPathId } from "@/lib/learn-catalog";
import { checkpointHref, getLearningUnits } from "@/lib/learning-path";
import { useGuestAuth } from "@/components/guest-auth-provider";
import { useLearningProgress, useLearningSyncStatus } from "@/components/use-learning-progress";
import { LearnTheme } from "@/components/learn-theme";
import LearnHelp from "./learn-help";
import styles from "./learn.module.css";

const subscribeToHydration = () => () => {};

export default function LearnCatalog({ initialPath = "desmos", progressScope = "guest", signInNext, previewAccess = false }: { initialPath?: LearnPathId; progressScope?: string; signInNext?: string; previewAccess?: boolean }) {
  const { isGuest, requireSignIn } = useGuestAuth();
  const progress = useLearningProgress(progressScope);
  const syncStatus = useLearningSyncStatus(progressScope);
  const promptedTarget = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (previewAccess || !signInNext || promptedTarget.current === signInNext || !isGuest) return;
    promptedTarget.current = signInNext;
    requireSignIn("lesson", signInNext);
    window.history.replaceState(null, "", initialPath === "sat" ? "/learn?path=sat" : "/learn");
  }, [initialPath, isGuest, previewAccess, requireSignIn, signInNext]);
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [pathId, setPathId] = useState<LearnPathId>(initialPath);
  const [query, setQuery] = useState("");
  const pathButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const path = LEARN_PATHS.find((item) => item.id === pathId)!;
  const search = query.trim().toLowerCase();
  const lessons = LESSONS.filter((lesson) => lesson.path === pathId);
  const units = getLearningUnits(pathId);
  const matches = lessons.filter((lesson) => `${lesson.title} ${lesson.description} ${lesson.category}`.toLowerCase().includes(search));
  const matchingSlugs = new Set(matches.map((lesson) => lesson.slug));
  const groups = units.map((unit) => ({ ...unit, lessons: unit.lessons.filter((lesson) => matchingSlugs.has(lesson.slug)) })).filter((unit) => unit.lessons.length > 0);
  const completed = lessons.filter((lesson) => progress.lessons[lesson.slug]).length;
  const scored = lessons.flatMap((lesson) => {
    const result = progress.lessons[lesson.slug];
    return result && typeof result.firstTryCorrect === "number" ? [result] : [];
  });
  const scoredQuestions = scored.reduce((sum, result) => sum + result.total, 0);
  const firstTry = scored.reduce((sum, result) => sum + (result.firstTryCorrect ?? 0), 0);
  const accuracy = scoredQuestions ? Math.round(firstTry / scoredQuestions * 100) : null;
  const completedCheckpoints = units.filter((unit) => progress.checkpoints[unit.id]).length;
  const checkpointQuestions = units.reduce((sum, unit) => sum + (progress.checkpoints[unit.id]?.total ?? 0), 0);
  const checkpointCorrect = units.reduce((sum, unit) => sum + (progress.checkpoints[unit.id]?.correct ?? 0), 0);
  const recent = lessons.filter((lesson) => {
    const draft = progress.drafts[lesson.slug];
    return draft && draft.completed !== true && (draft.completed === false || !progress.lessons[lesson.slug]) && (draft.step > 0 || Object.keys(draft.attempts).length > 0);
  }).sort((a, b) => Date.parse(progress.drafts[b.slug].updatedAt) - Date.parse(progress.drafts[a.slug].updatedAt))[0];
  const nextLesson = recent ?? lessons.find((lesson) => !progress.lessons[lesson.slug]) ?? lessons[0];
  const nextUnit = units.find((unit) => unit.lessons.every((lesson) => progress.lessons[lesson.slug]) && !progress.checkpoints[unit.id]);
  const suggested = !recent && nextUnit
    ? { title: `${nextUnit.group} checkpoint`, description: "4 questions", href: checkpointHref(nextUnit.id), checkpoint: true, slug: nextUnit.lessons[0].slug }
    : { title: nextLesson.title, description: nextLesson.description, href: getLessonHref(nextLesson), checkpoint: false, slug: nextLesson.slug };
  const resume = Boolean(recent);
  const allComplete = completed === lessons.length;
  const syncLabel = syncStatus === "session-only" ? "Progress kept for this visit" : syncStatus === "sign-in-required" ? "Sign in again to sync" : syncStatus === "setup-required" ? "Account sync unavailable" : syncStatus === "offline" ? "Sync pending" : null;

  function selectPath(id: LearnPathId) {
    setPathId(id);
    setQuery("");
    window.history.replaceState(null, "", id === "sat" ? "/learn?path=sat" : "/learn");
  }
  function openLesson(event: { preventDefault: () => void }, href: string) {
    if (!previewAccess && requireSignIn("lesson", href)) event.preventDefault();
  }

  return <LearnTheme className={styles.page}>
    <header className={styles.heading}>
      <div className={styles.title}><h1>Learn</h1></div>
      <Link href="/solve" className={styles.solverLink}>Open solver <ArrowUpRight size={16} /></Link>
    </header>

    <div className={styles.toolbar}>
      <div className={styles.paths} role="tablist" aria-label="Learning paths">
        {LEARN_PATHS.map((item, index) => {
          const Icon = item.id === "desmos" ? ChartNoAxesCombined : GraduationCap;
          return <button key={item.id} type="button" role="tab" id={`learn-tab-${item.id}`} disabled={!hydrated} aria-selected={pathId === item.id} aria-controls="learn-catalog-panel" tabIndex={pathId === item.id ? 0 : -1} ref={(element) => { pathButtons.current[index] = element; }} onClick={() => selectPath(item.id)} onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? LEARN_PATHS.length - 1 : 1 - index;
            selectPath(LEARN_PATHS[next].id); pathButtons.current[next]?.focus();
          }}><Icon size={18} /><span>{item.id === "sat" ? "SAT math" : item.title}</span></button>;
        })}
      </div>
      <label className={styles.search}><Search size={17} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a lesson" aria-label={`Search ${path.title}`} />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}</label>
    </div>

    <section id="learn-catalog-panel" role="tabpanel" aria-labelledby={`learn-tab-${pathId}`} tabIndex={0} className={styles.catalog}>
      {!search && <>
        <section className={styles.overview} aria-label={`${path.title} progress`}>
          <header className={styles.overviewHeader}><div className={styles.pathHeading}><span className={styles.courseMark}>{pathId === "sat" ? <GraduationCap size={24} /> : <ChartNoAxesCombined size={24} />}</span><div><h2>{path.title}</h2><p>{lessons.length} lessons · {units.length} checkpoints</p></div></div><LearnHelp key={pathId} path={pathId} /></header>
          <dl className={styles.stats}>
            <div><dt><CircleCheck size={17} />Lessons finished</dt><dd aria-label={`${completed} of ${lessons.length} lessons, ${Math.round(completed / lessons.length * 100)}% complete`}>{completed}<span> / {lessons.length}</span><small aria-hidden="true">{Math.round(completed / lessons.length * 100)}%</small></dd><div className={styles.lessonSegments} role="progressbar" aria-label={`${path.title} completion`} aria-valuemin={0} aria-valuemax={lessons.length} aria-valuenow={completed}>{lessons.map(lesson => <i key={lesson.slug} data-complete={Boolean(progress.lessons[lesson.slug])} />)}</div><small>{completed === lessons.length ? "All lessons complete" : `${lessons.length - completed} lessons to go`}</small></div>
            <div><dt><Target size={17} />First-try accuracy</dt><dd data-empty={accuracy === null}>{accuracy === null ? "Not yet" : <>{accuracy}<span>%</span></>}</dd><div className={styles.metricTrack} aria-hidden="true"><span style={{ width: `${accuracy ?? 0}%` }} /></div><small>{scoredQuestions ? `${firstTry} of ${scoredQuestions} answers without hints` : "No first-try results yet"}</small></div>
            <div><dt><Flag size={17} />Checkpoints finished</dt><dd>{completedCheckpoints}<span> / {units.length}</span></dd><div className={styles.checkpointSegments} aria-hidden="true">{units.map(unit => <span key={unit.id} data-complete={Boolean(progress.checkpoints[unit.id])}>{progress.checkpoints[unit.id] ? <Check size={12} /> : <span />}</span>)}</div><small>{checkpointQuestions ? `${checkpointCorrect} of ${checkpointQuestions} answers correct` : "4 questions per checkpoint"}</small></div>
          </dl>
          <div className={styles.levelProgress} data-levels={units.length} style={{ "--level-count": units.length } as CSSProperties} aria-label="Progress by level">{units.map(unit => { const count = unit.lessons.filter(lesson => progress.lessons[lesson.slug]).length; return <div key={unit.id}><span>{unit.group}<strong>{count}/{unit.lessons.length}</strong></span><div aria-hidden="true"><i style={{ width: `${count / unit.lessons.length * 100}%` }} /></div></div>; })}</div>
          {syncLabel && <p className={styles.syncStatus} data-sync-state={syncStatus} role="status"><i aria-hidden="true" />{syncLabel}</p>}
        </section>

        <Link href={suggested.href} className={styles.continueCard} prefetch={isGuest ? false : undefined} onNavigate={(event) => openLesson(event, suggested.href)}>
          <div className={styles.continueArt}><LessonArt slug={suggested.slug} /></div>
          <div className={styles.continueCopy}><span className={styles.continueLabel}>{resume ? "Resume lesson" : suggested.checkpoint ? "Next checkpoint" : allComplete ? "All lessons complete" : completed ? "Next lesson" : "Start here"}</span><h3>{suggested.title}</h3><p>{suggested.description}</p></div>
          <span className={styles.continueAction}>{resume ? <Play size={15} fill="currentColor" /> : allComplete && !suggested.checkpoint ? <RotateCcw size={16} /> : null}{resume ? "Continue" : suggested.checkpoint ? "Try checkpoint" : allComplete ? "Review lesson" : "Start lesson"}<ArrowRight size={18} /></span>
        </Link>
      </>}

      <div className={styles.catalogHeading}><h2>{search ? "Search results" : "Choose a lesson"}</h2><p role="status">{matches.length} {matches.length === 1 ? "lesson" : "lessons"}</p></div>
      {groups.map((unit, groupIndex) => {
        const groupDone = unit.lessons.filter((lesson) => progress.lessons[lesson.slug]).length;
        const checkpoint = progress.checkpoints[unit.id];
        return <section key={unit.id} className={styles.group} aria-labelledby={`group-${unit.id}`}>
          <header className={styles.groupHeading}><span className={styles.levelNumber} aria-hidden="true">{groupIndex + 1}</span><div><span className={styles.level}>{unit.group}</span><h3 id={`group-${unit.id}`}>{unit.title}</h3><p>{unit.description}</p></div><span className={styles.groupCount}>{groupDone} / {unit.lessons.length} complete</span></header>
          <ul className={styles.lessons}>
            {unit.lessons.map((lesson, index) => {
              const completion = progress.lessons[lesson.slug];
              const draft = progress.drafts[lesson.slug];
              const started = Boolean(draft && draft.completed !== true && (draft.completed === false || !completion) && (draft.step > 0 || Object.keys(draft.attempts).length > 0));
              const isNext = !completion && lesson.slug === nextLesson.slug;
              return <li key={lesson.slug} style={{ "--card-order": index } as CSSProperties}><Link href={getLessonHref(lesson)} className={styles.lesson} data-completed={Boolean(completion)} data-next={isNext} prefetch={isGuest ? false : undefined} onNavigate={(event) => openLesson(event, getLessonHref(lesson))} aria-label={`${lesson.title}${completion ? ", completed" : ""}${started ? ", resume lesson" : ""}`}>
                <div className={styles.lessonArt}><LessonArt slug={lesson.slug} /><span className={styles.lessonNumber}>{lessons.indexOf(lesson) + 1}</span>{completion && <span className={styles.completedStamp}><Check size={15} strokeWidth={3} /></span>}</div>
                <div className={styles.lessonText}><div className={styles.lessonMeta}>{completion ? <span className={styles.completedLabel}><Check size={12} />{started ? "Completed · reviewing" : "Completed"}</span> : started ? <span className={styles.startedLabel}>In progress</span> : <span>{lesson.category}</span>}{isNext && !started && <span className={styles.nextLabel}>Suggested next</span>}</div><h4>{lesson.title}</h4><p>{lesson.description}</p><span className={styles.lessonAction}>{started ? "Continue lesson" : completion ? "Review lesson" : "Start lesson"}<ArrowRight size={17} /></span></div>
              </Link></li>;
            })}
          </ul>
          {!search && <Link href={checkpointHref(unit.id)} className={styles.checkpoint} data-completed={Boolean(checkpoint)} aria-label={`${unit.group} section checkpoint, 4 questions${checkpoint ? `, best score ${checkpoint.correct} of ${checkpoint.total}` : ""}`} prefetch={isGuest ? false : undefined} onNavigate={(event) => openLesson(event, checkpointHref(unit.id))}><span className={styles.checkpointIcon}>{checkpoint ? <Check size={20} /> : <Flag size={20} />}</span><span><strong>{unit.group} checkpoint</strong><small>{checkpoint ? `Completed · Best score ${checkpoint.correct} / ${checkpoint.total}` : "4 questions"}</small></span><span className={styles.checkpointAction}>{checkpoint ? "Try again" : "Take checkpoint"}<ChevronRight size={18} /></span></Link>}
        </section>;
      })}
      {!matches.length && <div className={styles.empty}><Search size={25} /><h3>No lessons found</h3><p>Try another search</p><button type="button" className={styles.clearButton} onClick={() => setQuery("")}>Clear search</button></div>}
    </section>
  </LearnTheme>;
}

/** Topic illustrations are decorative, not calculator screenshots or extra exercises. */
function LessonArt({ slug }: { slug: string }) {
  const grid = <g className={styles.artGrid}><path d="M20 35H220M20 65H220M20 95H220M60 15V125M100 15V125M140 15V125M180 15V125" /><path className={styles.artAxis} d="M20 105H220M60 15V125" /></g>;
  let art;
  if (slug === "tables" || slug === "statistics-and-data-analysis") art = <><rect className={styles.artPlate} x="55" y="16" width="132" height="110" rx="12" /><path className={styles.artTable} d="M55 46H187M55 73H187M55 100H187M111 16V126" /><g className={styles.artText}><text x="82" y="36">x</text><text x="149" y="36">y</text><text x="82" y="64">1</text><text x="149" y="64">3</text><text x="82" y="91">2</text><text x="149" y="91">5</text><text x="82" y="118">3</text><text x="149" y="118">7</text></g><circle className={styles.artPoint} cx="202" cy="36" r="5" /></>;
  else if (slug === "graphing-equations") art = <>{grid}<path className={styles.artAxis} d="M23 91H218M67 15V126" /><path className={styles.artTrace} d="M28 117Q82 -26 124 91T215 17" /><circle className={styles.artHalo} cx="124" cy="91" r="12" /><circle className={styles.artPoint} cx="124" cy="91" r="5" /></>;
  else if (slug === "lists" || slug === "answer-choice-testing") art = <><rect className={styles.artPlate} x="29" y="25" width="184" height="86" rx="14" /><text className={styles.artFormula} x="121" y="60" textAnchor="middle">[ 2, 4, 6, 8 ]</text><path className={styles.artAxis} d="M48 74H194" /><g className={styles.artText}><text x="58" y="96">A</text><text x="101" y="96">B</text><text x="144" y="96">C</text><text x="187" y="96">D</text></g><circle className={styles.artRing} cx="143" cy="91" r="14" /></>;
  else if (slug === "sliders" || slug === "functions-and-transformations") art = <>{grid}<path className={styles.artGhost} d="M32 105Q100 -42 188 105" /><path className={styles.artTrace} d="M70 105Q138 -42 226 105" /><path className={styles.artSlider} d="M54 125H184" /><circle className={styles.artPoint} cx="133" cy="125" r="7" /></>;
  else if (slug === "regression" || slug === "quadratics" || slug === "nonlinear-functions") art = <>{grid}<path className={styles.artTrace} d="M29 110Q93 112 126 73T213 18" />{[[65,106],[127,73],[192,31]].map(([x,y]) => <circle key={x} className={styles.artPoint} cx={x} cy={y} r="5" />)}</>;
  else if (slug === "intersections-and-intercepts" || slug === "systems-of-equations") art = <>{grid}<path className={styles.artGhost} d="M33 23L211 112" /><path className={styles.artTrace} d="M35 111L204 27" /><circle className={styles.artHalo} cx="120" cy="68" r="14" /><circle className={styles.artPoint} cx="120" cy="68" r="5" /></>;
  else if (slug === "restrictions") art = <>{grid}<rect className={styles.artShade} x="85" y="16" width="88" height="107" rx="5" /><path className={styles.artGhost} d="M22 26Q123 174 222 27" /><path className={styles.artTrace} d="M86 98Q129 129 173 94" /><path className={styles.artDashed} d="M85 16V123M173 16V123" /><circle className={styles.artPoint} cx="129" cy="111" r="5" /></>;
  else if (slug === "bracket-regression" || slug === "polynomials") art = <><rect className={styles.artPlate} x="22" y="30" width="81" height="82" rx="12" /><rect className={styles.artPlate} x="140" y="30" width="81" height="82" rx="12" /><g className={styles.artText}><text x="62" y="61">2a + 1</text><text x="62" y="91">−a + 7</text><text x="180" y="61">b</text><text x="180" y="91">b</text></g><path className={styles.artTrace} d="M111 61Q120 48 131 61M111 82Q120 69 131 82" /></>;
  else if (slug === "advanced-desmos-shortcuts" || slug === "geometry" || slug === "circles") art = <>{grid}<path className={styles.artTrace} d="M55 104L187 37" /><circle className={styles.artPoint} cx="55" cy="104" r="6" /><circle className={styles.artPoint} cx="187" cy="37" r="6" /><circle className={styles.artRing} cx="121" cy="70" r="7" /><path className={styles.artDashed} d="M55 104H187V37" /></>;
  else art = <>{grid}<path className={styles.artTrace} d="M29 116L202 25" /><circle className={styles.artHalo} cx="132" cy="62" r="14" /><circle className={styles.artPoint} cx="132" cy="62" r="5" /><rect className={styles.artPlate} x="145" y="63" width="66" height="28" rx="8" /><text className={styles.artText} x="178" y="82" textAnchor="middle">f(4)</text></>;
  return <svg viewBox="0 0 240 140" aria-hidden="true" focusable="false">{art}</svg>;
}
