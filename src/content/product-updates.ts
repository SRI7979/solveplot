/** Public release notes. Keep dated measurements separate from product claims. */
export type ProductUpdate = {
  id: string;
  date: string;
  category: "Learn" | "Workspace" | "Solver";
  title: string;
  summary: string;
  changes: readonly string[];
  metrics?: readonly { value: string; label: string }[];
  link?: { href: string; label: string };
  comparison?: "luna-single-problem";
  visual: "solver" | "lesson" | "free" | "tabs" | "progress" | "catalog" | "loading" | "benchmark" | "guides" | "brand";
};

export const PRODUCT_UPDATES: readonly ProductUpdate[] = [
  {
    id: "official-solveplot-profiles",
    date: "2026-10-29",
    category: "Workspace",
    title: "Find SolvePlot on Instagram, YouTube, and TikTok",
    summary: "The homepage footer now links to our three official social profiles.",
    changes: [
      "Added the owner-confirmed Instagram, YouTube channel, and TikTok links to the footer.",
      "The same exact profile URLs are included in SolvePlot's organization metadata, connecting the website to its official accounts.",
    ],
    visual: "brand",
    link: { href: "/", label: "Open SolvePlot" },
  },
  {
    id: "solveplot-search-branding",
    date: "2026-10-29",
    category: "Workspace",
    title: "The SolvePlot icon across browsers and search",
    summary: "Our existing logo now has dedicated browser icons and a web manifest, with clearer site-name metadata.",
    changes: [
      "Added a multi-size favicon and square PNG icons using the existing SolvePlot artwork. The Apple touch icon and sharing image stay available.",
      "The site-name metadata consistently identifies SolvePlot and solveplot.com, with a larger official logo for search engines to read.",
      "These changes help search engines recognize the site. Displaying the logo, indexing pages, and choosing search positions remain their decisions.",
    ],
    visual: "brand",
    link: { href: "/", label: "Open SolvePlot" },
  },
  {
    id: "public-desmos-guides",
    date: "2026-10-28",
    category: "Learn",
    title: "Worked Desmos guides, open to everyone",
    summary: "Read four SAT math guides without signing in, covering calculator basics, systems of equations, regression, and quadratics.",
    changes: [
      "Each guide has an original worked example, Desmos entries, an algebra comparison, and a practice question with an answer.",
      "Find the guides from the homepage. The interactive lessons remain in Learn.",
      "Guide and update pages now share a document sidebar, compact page navigation, and light, dark, and system appearance options.",
      "Page descriptions, sharing previews, and the public sitemap now cover the guides. Search engines can read these public guides without entering your workspace.",
      "The public solver entrance can now be indexed. Signed-in variants, saved questions, account pages, and service endpoints retain indexing restrictions.",
      "The homepage uses a smaller version of the same background artwork. Analytics removes query strings and personal record IDs from page locations.",
    ],
    visual: "guides",
    link: { href: "/guides", label: "Browse guides" },
  },
  {
    id: "desmos-workflow-fixes",
    date: "2026-10-27",
    category: "Solver",
    title: "Less algebra before you reach Desmos",
    summary: "The solver now weighs the whole calculator workflow, including setup, slider adjustments, and graph reading, when choosing a method.",
    changes: [
      "A short formula no longer gets an advantage if it hides algebra you would have to do yourself. Valid graph and slider alternatives stay available.",
      "Fixed a wording issue where “the value of the expression” could leave certain problems with a written solution instead of the available regression. Supported saved problems are repaired when reopened from History.",
      "Sliders start at a value you can explore, rather than opening at the answer. Calculator checks still run before entries are shown.",
      "The model remains GPT-6 Luna Low. This update improves method selection and recovery; it does not establish a new accuracy or speed benchmark.",
    ],
    visual: "solver",
    link: { href: "/solve", label: "Open solver" },
  },
  {
    id: "lesson-feedback-and-updates",
    date: "2026-10-27",
    category: "Learn",
    title: "Clearer feedback while you practise",
    summary: "Hints and explanations open in a focused dialog, and answer feedback is easier to follow.",
    changes: [
      "Correct and incorrect answers get a brief glow and ripple. Completion has its own celebration, with reduced-motion support.",
      "Multiple-choice answers vary in position. Routine “Progress saved” messages have been removed from lessons while saving continues in the background.",
      "The course overview separates completion, first-try accuracy, and checkpoints. Its help button explains what each course teaches.",
      "Updates now have a document-style archive, individual shareable pages, screenshots, and visual comparisons. Find them through Updates on the homepage.",
    ],
    visual: "lesson",
    link: { href: "/learn", label: "Browse lessons" },
  },
  {
    id: "free-to-use",
    visual: "free",
    date: "2026-10-27",
    category: "Workspace",
    title: "Free to use",
    summary: "The homepage now makes it clear: SolvePlot is completely free.",
    changes: [
      "Added a short note below Open SolvePlot and an FAQ covering free access and usage limits. No subscription or payment is required.",
    ],
  },
  {
    id: "sliding-tabs-modern-font",
    visual: "tabs",
    date: "2026-10-27",
    category: "Workspace",
    title: "Sliding tabs and a new default font",
    summary: "The selected Learn tab now slides between Desmos skills and SAT math. Modern is the default workspace font.",
    changes: [
      "The short transition respects reduced-motion preferences and keeps keyboard navigation unchanged.",
      "Existing font choices are preserved. New sessions and Reset to defaults use Modern.",
    ],
  },
  {
    id: "learn-progress-status",
    visual: "progress",
    date: "2026-10-26",
    category: "Learn",
    title: "Cleaner progress labels",
    summary: "Removed device-storage wording from Learn and lesson completion screens.",
    changes: [
      "Routine storage messages no longer appear in the course overview. Saving and sync errors remain visible when needed.",
      "Lessons show “Progress saved” after account sync is confirmed.",
    ],
  },
  {
    id: "desmos-skills",
    visual: "catalog",
    date: "2026-10-26",
    category: "Learn",
    title: "12 Desmos skills lessons",
    summary: "The Desmos skills course now has guided examples, editable calculators, and checks throughout each lesson.",
    changes: [
      "Work from functions and tables through regression, restrictions, and coordinate shortcuts.",
      "Practise with 49 in-lesson checks and three four-question checkpoints. Answer feedback, hints, and worked explanations are included.",
      "The SAT math lessons are unchanged in this update.",
    ],
    metrics: [{ value: "12", label: "Desmos lessons" }, { value: "49", label: "In-lesson checks" }, { value: "3", label: "Checkpoints" }],
    link: { href: "/learn", label: "View lessons" },
  },
  {
    id: "lesson-progress",
    visual: "progress",
    date: "2026-10-26",
    category: "Learn",
    title: "Resume lessons and see your progress",
    summary: "Leaving a lesson saves your place and answers. The course page shows completed lessons, a suggested next step, and lessons you can resume.",
    changes: [
      "Completion screens separate first-try answers, hints, and exercises worked through with help.",
      "The course’s first-try percentage uses your best completed run per lesson. Hinted and assisted answers do not count as first-try correct.",
      "Lesson accents follow your workspace palette. Candy keeps its green accent; other palettes use their own colors.",
      "Answer fields, calculator spacing, section dividers, and mobile layouts have been refined.",
    ],
  },
  {
    id: "workspace-loading",
    visual: "loading",
    date: "2026-10-26",
    category: "Workspace",
    title: "Loading screens that match each page",
    summary: "The solver, lessons, history, saved tricks, and account pages now use loading layouts shaped like the page you’re opening.",
    changes: [
      "Sidebar navigation keeps the destination’s layout visible while its content loads.",
      "History and saved tricks have cleaner card spacing, typography, and empty states.",
      "These are interface changes; navigation speed was not benchmarked.",
    ],
  },
  {
    id: "luna-low",
    visual: "benchmark",
    date: "2026-10-26",
    category: "Solver",
    title: "GPT-6 Luna Low is the solver default",
    summary: "The solver now uses GPT-6 Luna Low, keeping the Desmos-first strategy library and calculator checks. Explanations and the tutor also use Luna Low by default.",
    changes: [
      "GPT-5-mini is no longer the active solver or tutor model, and there is no automatic fallback to it.",
      "Existing bounded correction calls can still use more reasoning within Luna when needed.",
      "The comparison below helped inform this choice. It is a small diagnostic, not a production speed or accuracy guarantee.",
    ],
    comparison: "luna-single-problem",
  },
];

export type ModelComparisonRow = {
  model: string;
  reasoning: "Low" | "Medium";
  current: boolean;
  answer: number;
  correct: boolean;
  method: string;
  originalRows: number;
  errorRows: number;
  seconds: number;
  reasoningTokens: number;
  visibleOutputTokens: number;
  outputTokens: number;
  costUSD: number;
};

/** Historical single-request evidence from docs/model-comparison-2026-10-26.md. */
export const LUNA_COMPARISON = {
  date: "2026-10-26",
  source: { label: "Bedrock Prep · public Similarity 77m", href: "https://www.bedrockprep.com/", diagram: "https://www.bedrockprep.com/diagrams/p_ah7bc5e7.png" },
  expectedAnswer: 16,
  inputTokens: 463,
  cachedInputTokens: 0,
  outputCap: 4096,
  verbosity: "Low",
  format: "JSON",
  requestedTier: "Priority",
  totalCostUSD: 0.023754,
  rows: [
    { model: "GPT-6.1 Sol", reasoning: "Low", current: false, answer: 16, correct: true, method: "Proportion regression", originalRows: 2, errorRows: 0, seconds: 6.006, reasoningTokens: 168, visibleOutputTokens: 223, outputTokens: 391, costUSD: 0.009672 },
    { model: "GPT-6 Luna", reasoning: "Low", current: true, answer: 16, correct: true, method: "Proportion regression", originalRows: 1, errorRows: 0, seconds: 6.819, reasoningTokens: 716, visibleOutputTokens: 263, outputTokens: 979, costUSD: 0.001072 },
    { model: "GPT-6 Luna", reasoning: "Medium", current: false, answer: 16, correct: true, method: "Proportion regression", originalRows: 1, errorRows: 0, seconds: 9.764, reasoningTokens: 1415, visibleOutputTokens: 227, outputTokens: 1642, costUSD: 0.001735 },
    { model: "GPT-5-mini", reasoning: "Low", current: false, answer: 100, correct: false, method: "Incomplete coordinate construction", originalRows: 14, errorRows: 12, seconds: 17.322, reasoningTokens: 2304, visibleOutputTokens: 770, outputTokens: 3074, costUSD: 0.011275 },
  ] satisfies readonly ModelComparisonRow[],
} as const;
