import type { CSSProperties } from "react";
import styles from "./workspace-loading.module.css";

export type WorkspaceLoadingView = "solve" | "learn" | "history" | "tricks" | "settings" | "profile" | "history-detail";

function Bone({ width = "100%", height = 13, className = "" }: { width?: CSSProperties["width"]; height?: number; className?: string }) {
  return <span className={`${styles.bone} ${className}`} style={{ width, height }} />;
}

function Copy({ short = false }: { short?: boolean }) {
  return <div className={styles.copy}><Bone /><Bone width={short ? "54%" : "86%"} /></div>;
}

function Heading({ title, icon = false, action = true }: { title: string; icon?: boolean; action?: boolean }) {
  return <div className={styles.heading}><div className={styles.headingTitle}>{icon && <Bone width={48} height={48} className={styles.icon} />}<div><div className={styles.headingLabel}>{title}</div><Bone width="min(290px, 52vw)" /></div></div>{action && <Bone width={142} height={43} className={styles.pill} />}</div>;
}

function Graph({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.graph} ${compact ? styles.compactGraph : ""}`}><div className={styles.graphRows}>{[0, 1, 2].map((row) => <div key={row}><Bone width="66%" /><Bone width="35%" /></div>)}</div><div className={styles.grid}><span /><i /></div></div>;
}

function SolverSkeleton() {
  return <><Heading title="New problem" action={false} /><div className={styles.inputModes}><Bone width={150} height={43} className={styles.pill} /><Bone width={150} height={43} className={styles.pill} /></div><div className={styles.upload}><Bone width={58} height={58} className={styles.icon} /><Bone width="min(290px, 80%)" height={23} /><Bone width="min(230px, 68%)" /><Bone width={150} height={43} className={styles.pill} /><Bone width="min(260px, 75%)" height={11} /></div><div className={styles.sample}><div><Bone width={182} height={17} /><Bone width={218} /></div><Bone width={130} height={43} className={styles.pill} /></div></>;
}

function LearnSkeleton() {
  return <><Heading title="Learn" /><div className={styles.catalogToolbar}><div className={styles.inputModes}><Bone width={152} height={41} className={styles.pill} /><Bone width={116} height={41} className={styles.pill} /></div><Bone width={220} height={42} className={styles.pill} /></div><div className={styles.overview}><div className={styles.overviewHeading}><Bone width={46} height={46} className={styles.icon} /><div><Bone width={160} height={20} /><Bone width={150} height={11} /></div></div><div className={styles.stats}>{[0, 1, 2].map((item) => <div key={item}><Bone width="78%" height={10} /><Bone width={65} height={36} /><Bone width="100%" height={7} /><Bone width="65%" height={9} /></div>)}</div><div className={styles.levelProgress}>{[0,1,2].map(item => <div key={item}><Bone width="70%" height={10} /><Bone width="100%" height={4} /></div>)}</div></div><div className={styles.continueCard}><Bone width={92} height={80} className={styles.icon} /><div><Bone width={98} height={10} /><Bone width="70%" height={22} /><Bone width="90%" /></div><Bone width={135} height={43} className={styles.pill} /></div><div className={styles.sectionHeading}><Bone width={170} height={22} /><Bone width={130} height={11} /></div><div className={styles.courseCards}>{[0, 1, 2].map((item) => <div className={styles.courseCard} key={item}><div className={styles.courseArt}><span /><i /></div><div className={styles.courseCopy}><Bone width={64} height={9} /><Bone width="78%" height={19} /><Copy /><Bone width={100} height={11} /></div></div>)}</div><div className={styles.checkpointRow}><Bone width={38} height={38} className={styles.icon} /><div><Bone width={190} height={14} /><Bone width="min(310px, 64vw)" height={10} /></div><Bone width={95} height={12} /></div></>;
}

function LibrarySkeleton({ tricks = false }: { tricks?: boolean }) {
  return <><Heading title={tricks ? "Saved tricks" : "History"} icon /><div className={styles.catalogToolbar}><Bone width={108} height={12} /><Bone width={250} height={42} className={styles.pill} /></div><div className={styles.libraryList}>{[0, 1, 2].map((item) => <div className={styles.libraryCard} key={item}><div className={styles.libraryTop}><Bone width={40} height={40} className={styles.icon} /><div><Bone width={tricks ? "44%" : "65%"} height={18} /><Copy /></div><Bone width={tricks ? 25 : 66} height={tricks ? 25 : 10} /></div>{tricks && <div className={styles.trickSelection}><Bone width="78%" /><Bone width="56%" /></div>}<div className={styles.libraryFooter}><Bone width={tricks ? 150 : 110} height={25} className={styles.pill} /><Bone width={tricks ? 136 : 92} height={tricks ? 33 : 12} className={tricks ? styles.pill : ""} /></div></div>)}</div></>;
}

function SettingsSkeleton() {
  return <><Heading title="Settings" /><div className={styles.settingsLayout}><div><div className={styles.settingsGroup}><Bone width={110} height={20} /><div className={styles.settingRow}><div><Bone width={94} /><Bone width={180} height={10} /></div><Bone width={140} height={39} className={styles.pill} /></div><Bone width={90} height={13} /><div className={styles.paletteGrid}>{[0, 1, 2, 3, 4, 5].map((item) => <div key={item}><div className={styles.swatches}><Bone height={30} /><Bone height={30} /><Bone height={30} /></div><Bone width="65%" height={11} /></div>)}</div><div className={styles.settingRow}><Bone width={92} /><Bone width={170} height={38} className={styles.pill} /></div></div><div className={styles.settingsGroup}><Bone width={120} height={20} /><div className={styles.typeChoices}>{[0, 1].map((item) => <div key={item}><Bone width={38} height={34} /><div><Bone width="75%" /><Bone width="95%" height={10} /></div></div>)}</div></div><div className={styles.settingsGroup}><Bone width={86} height={20} /><Bone width="95%" height={54} className={styles.icon} /></div></div><div className={styles.settingsPreview}><div className={styles.sectionHeading}><Bone width={115} height={13} /><Bone width={65} height={10} /></div><div className={styles.previewFrame}><div className={styles.previewHeader}><Bone width={28} height={28} className={styles.icon} /><Bone width={90} height={13} /></div><div className={styles.previewBody}><Bone width={90} height={10} /><Copy /><Bone height={48} className={styles.icon} /><Bone width={125} height={10} /><Bone width="78%" height={20} /><Copy /><Bone height={80} className={styles.icon} /><Bone height={42} className={styles.pill} /></div></div><Bone width="87%" height={10} /></div></div></>;
}

function ProfileSkeleton() {
  return <><Heading title="Your profile" action={false} /><div className={styles.profileCard}><Bone width={86} height={18} /><div className={styles.settingRow}><Bone width={50} height={12} /><Bone width={196} height={13} /></div><div className={styles.formField}><Bone width={90} height={12} /><Bone height={46} className={styles.field} /></div><Bone width={115} height={41} className={styles.pill} /></div><div className={styles.profileCard}><Bone width={94} height={18} /><Bone width="76%" /><div className={styles.formField}><Bone width={106} height={12} /><Bone height={46} className={styles.field} /></div><div className={styles.formField}><Bone width={134} height={12} /><Bone height={46} className={styles.field} /></div><Bone width={155} height={41} className={styles.pill} /></div><Bone width={100} height={41} className={styles.pill} /></>;
}

function SavedProblemSkeleton() {
  return <div className={styles.savedProblem}><div className={styles.savedSolution}><div className={styles.sectionHeading}><Bone width={96} height={13} /><Bone width={90} height={35} className={styles.pill} /></div><div className={styles.questionCopy}><Copy /><Bone width="68%" /></div><div className={styles.solutionDivider} /><Bone width={170} height={22} /><Bone height={62} className={styles.icon} /><Bone width={130} height={11} /><Bone width="80%" height={24} /><Copy /><div className={styles.solutionStep}><Bone width={26} height={26} className={styles.icon} /><Copy /></div><div className={styles.solutionStep}><Bone width={26} height={26} className={styles.icon} /><Copy /></div></div><div className={styles.savedCalculator}><div className={styles.calculatorToolbar}><Bone width={90} height={17} /><Bone width={122} height={33} className={styles.pill} /></div><Graph /><div className={styles.calculatorFooter}><Bone width={90} height={10} /><Bone width={130} height={31} className={styles.pill} /></div></div></div>;
}

const titleViews: Record<string, WorkspaceLoadingView> = { Solver: "solve", Learn: "learn", History: "history", "Saved tricks": "tricks", Settings: "settings", "Your profile": "profile", "Saved problem": "history-detail" };

/** Route-specific visual hierarchy, shared by route fallbacks and navigation overlays. */
export default function WorkspacePlaceholder({ title, variant = titleViews[title] ?? "history" }: { title: string; variant?: WorkspaceLoadingView }) {
  return <div className={styles.page} data-loading-view={variant} aria-busy="true"><span role="status" className={styles.srOnly}>Loading {title}…</span><div aria-hidden="true">{variant === "solve" ? <SolverSkeleton /> : variant === "learn" ? <LearnSkeleton /> : variant === "history" ? <LibrarySkeleton /> : variant === "tricks" ? <LibrarySkeleton tricks /> : variant === "settings" ? <SettingsSkeleton /> : variant === "profile" ? <ProfileSkeleton /> : <SavedProblemSkeleton />}</div></div>;
}

/** Full-screen exercise loading has no workspace sidebar, matching the player. */
export function ExercisePlaceholder({ checkpoint = false }: { checkpoint?: boolean }) {
  return <div className={styles.exerciseLoading} data-loading-view={checkpoint ? "checkpoint" : "lesson"} aria-busy="true"><span role="status" className={styles.srOnly}>Opening {checkpoint ? "checkpoint" : "lesson"}…</span><div aria-hidden="true"><div className={styles.exerciseHeader}><Bone width="min(48%, 600px)" height={10} className={styles.pill} /><Bone width={38} height={12} /></div><div className={styles.exerciseFrame}><div className={styles.exerciseEyebrow}><Bone width={checkpoint ? 150 : 200} height={11} /></div><div className={styles.exerciseContent}><Bone width={checkpoint ? "82%" : "67%"} height={28} /><Copy />{checkpoint ? <><div className={styles.exerciseCalculator}><div className={styles.calculatorToolbar}><Bone width={85} height={14} /><Bone width={110} height={31} className={styles.pill} /></div><Graph compact /></div><div className={styles.answerChoices}>{[0, 1, 2].map((item) => <Bone key={item} height={62} className={styles.field} />)}</div></> : <><div className={styles.teachingVisual}>{[0, 1, 2].map((item) => <div key={item}><Bone width="55%" height={11} /><Bone width="75%" height={26} /><Bone width="92%" height={11} /></div>)}</div><div className={styles.entryPreview}><Bone width={75} height={11} /><Bone width="45%" height={22} /></div></>}</div><div className={styles.exerciseActions}><Bone width={checkpoint ? 275 : 250} height={56} className={styles.pill} /></div></div></div></div>;
}
