/** Original SolvePlot teaching examples. These are not copied SAT question-bank items. */
export type EducationalGuide = {
  slug: string;
  title: string;
  description: string;
  shortTitle: string;
  answer: string;
  introduction: readonly string[];
  concept: { heading: string; paragraphs: readonly string[] };
  example: {
    question: string;
    answer: string;
    chart: "linear" | "systems" | "regression" | "quadratic";
    rows: readonly { entry: string; purpose: string }[];
    readout: string;
    check: string;
  };
  algebra: readonly string[];
  calculatorWhen: string;
  algebraWhen: string;
  pitfalls: readonly string[];
  practice: { question: string; answer: string; explanation: string; rows: readonly string[] };
  related: readonly string[];
  sources: readonly { title: string; url: string }[];
};

const calculatorPolicy = { title: "College Board: SAT Suite calculator policy", url: "https://satsuite.collegeboard.org/in-school-assessments/calculator-policy" };
const desmosGuide = { title: "Desmos: graphing calculator user guide", url: "https://help.desmos.com/hc/en-us/articles/202529279-Desmos-Graphing-Calculator-User-Guide" };
const desmosTables = { title: "Desmos: tables and custom regressions", url: "https://help.desmos.com/hc/en-us/articles/4405489674381-Tables" };

export const EDUCATIONAL_GUIDES = [
  {
    slug: "desmos-sat",
    title: "How to use Desmos on SAT Math",
    shortTitle: "Desmos on the SAT",
    description: "Learn when to graph, fit a model, or use algebra on SAT Math, with an original worked equation and calculator steps.",
    answer: "Enter the relationships the question gives you, then read the quantity it asks for. Graphs help with intersections, roots, and minimum values. Regression helps fit unknown parameters. Check the result against every condition before choosing an answer.",
    introduction: [
      "The digital SAT includes Desmos inside Bluebook. Practise in Bluebook before test day so the controls feel familiar. SolvePlot is a study tool for learning these methods; it is separate from the calculator available during the exam.",
      "A calculator can do the calculation, but you still decide what the variables mean and which result answers the question. Start with the original equation whenever possible. Rearranging it first can add work and introduce mistakes.",
    ],
    concept: { heading: "Which calculator method should you try?", paragraphs: [
      "For one equation, try graphing it exactly as written. An equation involving only x can appear as a vertical line. For two equations, graph both and look for an intersection. For a quadratic, inspect its intercepts or vertex, depending on what is asked.",
      "If a table gives values of an unknown model, regression can fit its parameters. Use the model type stated in the question, rather than picking a curve just because it seems to fit. A numerical match does not prove a statement about every possible value.",
    ] },
    example: {
      question: "What value of $x$ satisfies $3x+4=19$?",
      answer: "$x=5$",
      chart: "linear",
      rows: [{ entry: "3x+4=19", purpose: "Type the whole equation in one expression row. Keep the right-hand side." }],
      readout: "The graph is a vertical line at x = 5. Click or tap the line to inspect a coordinate; its x-coordinate is the solution. The y-coordinate can vary because y does not occur in the equation.",
      check: "Substitute 5 into the original equation: $3(5)+4=19$. Both sides agree.",
    },
    algebra: ["Subtract 4 from both sides to get $3x=15$.", "Divide by 3 to get $x=5$."],
    calculatorWhen: "Graphing is useful when rearranging the equation would take several steps or when you want to check an answer. The same idea extends to equations with curves and several solutions.",
    algebraWhen: "For this short equation, subtraction and division are likely simpler than entering a graph. Desmos is an option, not a requirement for every calculation.",
    pitfalls: ["Enter both sides, including signs and parentheses.", "Read the requested coordinate. A vertical line gives x; a horizontal line gives y.", "A blank viewing window does not prove there is no solution. Adjust the axes and inspect the equation.", "Keep exact values when the question needs them. A rounded decimal may hide a difference between choices."],
    practice: { question: "Solve $4x-7=17$", answer: "$x=6$", explanation: "The equation graphs as a vertical line at 6. Algebra gives $4x=24$, so $x=6$; substitution gives $4(6)-7=17$.", rows: ["4x-7=17"] },
    related: ["systems-of-equations", "quadratics", "regression"],
    sources: [calculatorPolicy, desmosGuide],
  },
  {
    slug: "systems-of-equations",
    title: "Solve SAT systems of equations with Desmos",
    shortTitle: "Systems of equations",
    description: "Graph two equations, read their intersection, and check the coordinates. Compare the same original system with elimination.",
    answer: "Graph both equations without rearranging them. An intersection gives values of x and y that satisfy both equations. Read the coordinate the question asks for, then check the pair in the original system.",
    introduction: ["A system asks for values that work in more than one relationship at once. On a graph, the shared points are intersections. You do not have to convert each line to slope-intercept form before entering it.", "Two distinct lines can cross once, be parallel, or represent the same line. A single visible intersection is a solution; seeing no intersection in the current window is not enough to prove that none exists."],
    concept: { heading: "Can Desmos solve a system without substitution?", paragraphs: ["For numerical equations in x and y, often yes: enter one equation per row and inspect their intersection. If the question asks for an expression such as x + y, first check whether one of the given equations already fixes it. Finding both coordinates could be unnecessary.", "For a symbolic question about all possible coefficients, an approximate graph may not establish the claim. Algebra may be needed to prove when lines are parallel or identical."] },
    example: {
      question: "The numbers $x$ and $y$ satisfy $x+y=12$ and $2x-y=3$. What are $x$ and $y$?",
      answer: "$(x,y)=(5,7)$",
      chart: "systems",
      rows: [{ entry: "x+y=12", purpose: "Graph the first relationship exactly as written." }, { entry: "2x-y=3", purpose: "Graph the second relationship on a separate row." }],
      readout: "Select the crossing point at (5, 7). The first coordinate is x = 5 and the second is y = 7. If it is outside the window, zoom out or set a window covering x from 0 to 10 and y from 0 to 15.",
      check: "$5+7=12$ and $2(5)-7=3$, so the pair satisfies both equations.",
    },
    algebra: ["Add the equations. The y terms cancel, leaving $3x=15$.", "Then $x=5$. Substitute into $x+y=12$ to get $y=7$."],
    calculatorWhen: "Graphing is a useful direct route when the equations are awkward to rearrange or one relationship is nonlinear. It also gives a quick way to check a coordinate pair.",
    algebraWhen: "Elimination is short in this example because the y coefficients are opposites. It is also useful when an exact fraction or a general statement about parameters is required.",
    pitfalls: ["Do not read the x-intercept of one line instead of their intersection.", "Keep the minus sign in the second equation. Changing it changes the system.", "If the question asks only for x, do not report the y-coordinate.", "Coincident lines have infinitely many shared points. A numerical screenshot alone does not explain why the equations are equivalent."],
    practice: { question: "Solve $x+y=9$ and $x-y=1$", answer: "$(x,y)=(5,4)$", explanation: "The graphs intersect at (5, 4). Adding the equations gives $2x=10$, then $y=4$. Check: $5+4=9$ and $5-4=1$.", rows: ["x+y=9", "x-y=1"] },
    related: ["desmos-sat", "quadratics", "regression"],
    sources: [desmosGuide],
  },
  {
    slug: "regression",
    title: "When to use regression on SAT Math in Desmos",
    shortTitle: "Regression",
    description: "Fit an original quadratic table in Desmos, evaluate the fitted function, and understand when a fitted model is justified.",
    answer: "Use regression when a question gives data or constraints for a model with unknown parameters. Enter the data, use a tilde (~) to fit the stated model, and evaluate the quantity requested. A fit is only useful if the model and its assumptions match the question.",
    introduction: ["An equals sign defines an equation. A tilde asks Desmos to fit free parameters to data. For a quadratic model, three distinct input values can determine its three coefficients when the data are consistent.", "Fitting three points does not establish that an unknown real-world relationship is quadratic. In the example below, the question explicitly tells us that the function is quadratic."],
    concept: { heading: "How do you fit a quadratic from a table?", paragraphs: ["Keep the input and output values in matching order. You can use a table, or enter two lists called x_1 and y_1. The quadratic model uses a, b, and c as the parameters to fit.", "After the fit, define a function using those parameters and evaluate it. This lets Desmos do the arithmetic while keeping the connection to the original model visible."] },
    example: {
      question: "A quadratic function has values $f(0)=3$, $f(1)=6$, and $f(2)=11$. What is $f(4)$?",
      answer: "$f(4)=27$",
      chart: "regression",
      rows: [{ entry: "x_1=[0,1,2]", purpose: "Enter the three inputs in the order given. The underscore makes the subscript." }, { entry: "y_1=[3,6,11]", purpose: "Enter the corresponding outputs in the same order." }, { entry: "y_1~ax_1^2+bx_1+c", purpose: "Use a tilde, not an equals sign. Desmos fits a = 1, b = 2, and c = 3." }, { entry: "f(x)=ax^2+bx+c", purpose: "Define the fitted quadratic as a function." }, { entry: "f(4)", purpose: "Evaluate the requested input. The result is 27." }],
      readout: "Read 27 beside f(4). The fitted curve passes through all three data points. The three fitted coefficients describe this specified quadratic; do not round them before evaluating the function.",
      check: "The fitted function is $f(x)=x^2+2x+3$. It returns 3, 6, and 11 at inputs 0, 1, and 2. At 4, it gives $16+8+3=27$.",
    },
    algebra: ["Write $f(x)=ax^2+bx+c$. Since $f(0)=3$, $c=3$.", "The other values give $a+b=3$ and $4a+2b=8$. Subtract twice the first equation from the second to get $2a=2$, so $a=1$ and $b=2$.", "Then $f(4)=4^2+2(4)+3=27$."],
    calculatorWhen: "Regression avoids solving for the coefficients by hand when a model is given and enough independent data determine it. It is especially helpful with less convenient values.",
    algebraWhen: "Algebra may be preferable when the question asks for an exact symbolic relationship, a proof, or why a parameter is not determined. A model with too many free parameters can fit the givens without fixing the requested answer.",
    pitfalls: ["Start with a blank graph so a, b, and c are free parameters, rather than values left over from another problem.", "Use ~ for a fit. Using = may graph a relationship or create sliders instead.", "Keep x_1 paired with y_1; reversing just one list changes the data.", "Use the model named by the problem. A good-looking fit is not evidence that you chose the right model.", "A fit to approximate data is approximate. Do not treat a rounded regression coefficient as an exact proof."],
    practice: { question: "A quadratic has $g(0)=2$, $g(1)=5$, and $g(2)=10$. Find $g(3)$", answer: "$g(3)=17$", explanation: "The fitted model is $g(x)=x^2+2x+2$, so $g(3)=9+6+2=17$. The three given outputs agree with this model.", rows: ["x_1=[0,1,2]", "y_1=[2,5,10]", "y_1~ax_1^2+bx_1+c", "g(x)=ax^2+bx+c", "g(3)"] },
    related: ["systems-of-equations", "quadratics", "desmos-sat"],
    sources: [desmosTables, desmosGuide],
  },
  {
    slug: "quadratics",
    title: "Solve SAT quadratic questions with Desmos",
    shortTitle: "Quadratics",
    description: "Use a parabola's vertex and intercepts to answer SAT-style quadratic questions, with a checked example and algebra comparison.",
    answer: "Graph the quadratic, then choose the feature that matches the question: x-intercepts for real roots, an intersection for an equation, or the vertex for an unrestricted minimum or maximum. Check domain restrictions before using the vertex.",
    introduction: ["A quadratic graph is a parabola. Its x-intercepts show where its output is zero. Its vertex gives its turning point. If the leading coefficient is positive, the vertex is the unrestricted minimum; if it is negative, the vertex is the unrestricted maximum.", "Keep the question's target in view. A question asking for the minimum value wants the y-coordinate, not the x-coordinate where that minimum occurs."],
    concept: { heading: "Should you read a root or the vertex?", paragraphs: ["For f(x) = 0, look where the curve meets the x-axis. For the least value of f(x), inspect the lowest permitted point of the curve. These answer different questions even though they use the same graph.", "A domain restriction can change the minimum. If the vertex is outside the allowed interval, check the permitted boundary and how the curve behaves on that interval."] },
    example: {
      question: "For $f(x)=x^2-8x+12$, what is the least possible value of $f(x)$ over all real $x$?",
      answer: "$-4$",
      chart: "quadratic",
      rows: [{ entry: "f(x)=x^2-8x+12", purpose: "Graph the given function. A window from x = 0 to 8 and y = -6 to 14 includes the useful features." }],
      readout: "Click the lowest point of the curve to inspect the vertex (4, -4). The minimum value is the second coordinate, -4. The first coordinate, 4, tells you where it occurs.",
      check: "$f(4)=16-32+12=-4$. Also, $f(x)=(x-4)^2-4$; a square cannot be negative, so no real input produces a smaller value.",
    },
    algebra: ["Complete the square: $x^2-8x+12=(x-4)^2-4$.", "Since $(x-4)^2$ is at least 0, the least output is $-4$, attained when $x=4$."],
    calculatorWhen: "A graph can make roots, intersections, and turning points easy to inspect without first transforming the expression. It is useful when the required value can be read clearly and checked.",
    algebraWhen: "Factoring or completing the square can be shorter for convenient coefficients. It also proves an exact minimum and handles symbolic questions that a rounded coordinate cannot settle.",
    pitfalls: ["Do not report 4 when the question asks for the minimum output; here the answer is -4.", "The roots are 2 and 6 in this example. Neither is the minimum value.", "Check any interval or integer restriction. For x ≥ 5 here, the minimum is f(5) = -3, not -4.", "A graph that seems not to touch an axis may need a different window. Use the equation and conditions to confirm your conclusion."],
    practice: { question: "Find the real solutions of $x^2-8x+12=0$", answer: "$x=2$ or $x=6$", explanation: "Graph the equation or inspect the x-intercepts of the original function. Algebra gives $(x-2)(x-6)=0$, so the roots are 2 and 6. Both make the original expression zero.", rows: ["x^2-8x+12=0"] },
    related: ["systems-of-equations", "regression", "desmos-sat"],
    sources: [desmosGuide],
  },
] as const satisfies readonly EducationalGuide[];

export type EducationalGuideSlug = (typeof EDUCATIONAL_GUIDES)[number]["slug"];
export function getGuide(slug: string): EducationalGuide | undefined { return EDUCATIONAL_GUIDES.find(guide => guide.slug === slug); }
export function guideHref(guide: Pick<EducationalGuide, "slug"> | string): string { return `/guides/${typeof guide === "string" ? guide : guide.slug}`; }
