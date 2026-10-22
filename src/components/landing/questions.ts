import { BRAND } from "@/lib/brand";

export const FAQ_GROUPS = [
  {
    title: "Getting started",
    questions: [
      { id: "what-it-does", question: `What does ${BRAND.name} do?`, answer: `Upload or type an SAT Math question. ${BRAND.name} fills the Desmos calculator and explains what to enter, what to click, and where to find the answer.` },
      { id: "account", question: "Do I need an account?", answer: "Yes. Sign in with Google or email to use the solver. Your solved questions are saved in History, and methods you save are available in Saved tricks." },
      { id: "uploads", question: "What can I upload?", answer: "Upload a PNG, JPG, or WebP image up to 8 MB. Include the complete question, any diagrams or tables, and the answer choices. Use one question per image." },
      { id: "typed-questions", question: "Can I type or paste a question?", answer: "Yes. Select Type a problem in the solver and enter the full question, including any answer choices. Use ^ for powers, such as x^2. For an image, select Image and upload, drag in, or paste a screenshot." },
      { id: "mobile", question: "Can I use it on my phone?", answer: "Yes. Use the Steps and Calculator tabs to switch between the explanation and graph on smaller screens. You can choose an image from your phone or type a question." },
    ],
  },
  {
    title: "Solving questions",
    questions: [
      { id: "methods", question: "How is the recommended method chosen?", answer: `${BRAND.name} looks for a short Desmos method using graphs, regressions, or lists. If a step needs work outside the calculator, the explanation tells you what to do.` },
      { id: "other-methods", question: "Can I see another way to solve the same question?", answer: "Yes, when another checked method is available. Choose Other methods above the explanation to switch. Some questions also include an algebraic method." },
      { id: "ai-tutor", question: "Can I ask about part of an explanation?", answer: "Yes. Choose Ask AI next to a calculator entry, or highlight text in the explanation and choose Ask AI Tutor. Add a question or leave it blank to request an explanation of the selected part. After the reply, you can request a practice problem with an expandable hint and answer." },
      { id: "checking", question: "How are solutions checked?", answer: "Calculator entries are tested in a separate Desmos instance before they are shown. Numeric results are compared with the proposed answer where possible. These checks can catch calculator errors, but they cannot guarantee that an image was read correctly or that every explanation is correct. Compare the transcribed question with your image and check the result." },
      { id: "limits", question: "What happens if I reach a usage limit?", answer: "The solver tells you when a limit is reached and when you can try again. Previously saved questions remain available in History. Solving and AI Tutor requests can have separate limits." },
    ],
  },
  {
    title: "Your workspace",
    questions: [
      { id: "appearance", question: "Where do I change the theme and appearance?", answer: "Open Settings to choose a color palette, color amount, typography, button style, corner style, and light, dark, or system mode. The default is Candy with Colorful mode, Modern typography, Raised buttons, and Round corners. The calculator keeps its light appearance in every theme." },
      { id: "preferences", question: "Are my appearance choices saved?", answer: "Light, dark, or system mode is remembered on this device. Your palette, color amount, typography, button, and corner choices are saved for the current browser tab. Reset to default restores the default appearance settings." },
      { id: "saved-tricks", question: "What are Saved tricks?", answer: "Choose Save this trick on a solution to keep its method and calculator entries. You can find it in Saved tricks in the sidebar." },
      { id: "desmos", question: `Is ${BRAND.name} made by Desmos?`, answer: `No. ${BRAND.name} is an independent project that embeds the Desmos graphing calculator. It is not affiliated with or endorsed by Desmos.` },
    ],
  },
] as const;

const featured = new Set(["account", "methods", "other-methods", "appearance"]);
export const LANDING_QUESTIONS = FAQ_GROUPS.flatMap(group => [...group.questions]).filter(item => featured.has(item.id));
