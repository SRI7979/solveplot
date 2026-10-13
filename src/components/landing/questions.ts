import { BRAND } from "@/lib/brand";

export const FAQ_GROUPS = [
  {
    title: "Getting started",
    questions: [
      { id: "what-it-does", question: `What does ${BRAND.name} do?`, answer: `Upload a screenshot of one SAT Math question. ${BRAND.name} recommends a way to solve it with Desmos, loads the calculator entries, and explains what each entry does and where to read the answer.` },
      { id: "account", question: "Do I need an account?", answer: "Yes. Sign in with Google or email to use the solver. Your solved questions are saved in History, and methods you save are available in Saved tricks." },
      { id: "uploads", question: "What can I upload?", answer: "Upload a PNG, JPG, or WebP image up to 8 MB. Include the complete question, any diagrams or tables, and the answer choices. Use one question per image." },
      { id: "mobile", question: "Can I use it on my phone?", answer: "Yes. The solver has separate Explanation and Calculator tabs on smaller screens. You can upload a screenshot or choose an image from your phone." },
    ],
  },
  {
    title: "Solving questions",
    questions: [
      { id: "methods", question: "How is the recommended method chosen?", answer: `${BRAND.name} prioritizes graphs, regressions, lists, and other Desmos methods that reduce the work you do by hand. You can inspect the available methods and their calculator rows and hand steps. When a method needs a calculation or fact outside Desmos, the explanation names it.` },
      { id: "other-methods", question: "Can I see another way to solve the same question?", answer: "Open the method selector above the explanation. It shows the available approaches for that question, including a paper method when one is available. If only one method passes the checks, you can still open the selector to inspect its details." },
      { id: "checking", question: "How are solutions checked?", answer: "Calculator entries are tested in a separate Desmos instance before they are shown. Numeric results are compared with the proposed answer where possible. These checks can catch calculator errors, but they cannot guarantee that an image was read correctly or that every explanation is correct. Compare the transcribed question with your image and check the result." },
      { id: "limits", question: "What happens if I reach a usage limit?", answer: "The solver tells you when a limit is reached and when you can try again. Previously saved questions remain available in History. Solving and AI Tutor requests can have separate limits." },
    ],
  },
  {
    title: "Your workspace",
    questions: [
      { id: "appearance", question: "Where do I change the theme and appearance?", answer: "Open Settings from your profile, then Appearance. You can choose from six palettes, three typography styles, button treatments, corner styles, and light, dark, or system mode. The default is Tidal with Modern typography, Raised buttons, and Round corners." },
      { id: "preferences", question: "Are my appearance choices saved?", answer: "Light, dark, or system mode is remembered on this device. Your palette, typography, button, and corner choices last for the browser session. Reset restores the default appearance." },
      { id: "saved-tricks", question: "What are Saved tricks?", answer: "Save a useful method from a solution so you can find it again without searching your full History. Open Saved tricks from the sidebar to review or remove saved methods." },
      { id: "desmos", question: `Is ${BRAND.name} made by Desmos?`, answer: `No. ${BRAND.name} is an independent project that embeds the Desmos graphing calculator. It is not affiliated with or endorsed by Desmos.` },
    ],
  },
] as const;

const featured = new Set(["account", "methods", "other-methods", "appearance"]);
export const LANDING_QUESTIONS = FAQ_GROUPS.flatMap(group => [...group.questions]).filter(item => featured.has(item.id));
