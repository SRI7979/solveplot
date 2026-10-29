import type { LessonContent } from "@/lib/lesson-types";
import type { DesmosExpression } from "@/lib/solver-schema";

const row = (latex: string, purpose: string, slider?: { min: number; max: number; step: number }): DesmosExpression => ({ latex, purpose, ...(slider ? { slider } : {}) });
const GRAPHING = { title: "Desmos: graphing and points of interest", href: "https://help.desmos.com/hc/en-us/articles/4406040715149-Getting-Started-Desmos-Graphing-Calculator" };
const REGRESSION = { title: "Desmos: regressions", href: "https://help.desmos.com/hc/en-us/articles/4406972958733-Regressions" };
const FUNCTIONS = { title: "Desmos: supported functions", href: "https://help.desmos.com/hc/en-us/articles/212235786-Supported-Functions" };
const SLIDERS = { title: "Desmos: sliders and movable points", href: "https://help.desmos.com/hc/en-us/articles/202529069-Sliders-and-Movable-Points-in-a-Graph" };
const STATISTICS = { title: "Desmos: statistics", href: "https://help.desmos.com/hc/en-us/articles/4405633253389-Statistics" };
const TRIG = { title: "Desmos: trigonometry and angle settings", href: "https://help.desmos.com/hc/en-us/articles/4406029680653-Trigonometry" };
const SAT_DATA = { title: "College Board: problem-solving and data analysis", href: "https://satsuite.collegeboard.org/sat/whats-on-the-test/math/types/problem-solving" };

/** Original lessons. Reading estimates include trying the calculator and both checks. */
export const SAT_LESSONS: LessonContent[] = [
  {
    slug: "linear-equations", minutes: 6,
    intro: "When an equation has x on both sides, you can graph the two sides separately. The x-coordinate where they meet solves the equation.",
    objectives: ["Recognize an equation that can be solved by an intersection.", "Enter each side without rearranging it.", "Read x rather than the graph’s y-coordinate."],
    sections: [
      { title: "What the equals sign tells you", paragraphs: ["An equation says two expressions have the same value. For 3x + 7 = 2x + 19, you want the input x that makes both sides agree. You do not need to collect the x terms first.", "Give each side its own graph: y = 3x + 7 and y = 2x + 19. Each graph shows one side’s value for many inputs. At their crossing, the input and output are shared."], takeaway: "One equation, two sides: graph each side as y = …" },
      { title: "Read the coordinate the question asks for", paragraphs: ["Select one line, then select the intersection point. Desmos labels it as (x, y). The first number solves the original equation; the second number is the value both sides share.", "If the crossing is outside the window, zoom out or adjust the axis bounds. A blank part of the graph does not prove there is no solution. Parallel distinct lines never meet; overlapping lines represent an equation true for every x in its domain."] },
    ],
    example: {
      question: "If 3x + 7 = 2x + 19, what is x?", techniqueId: "graph-both-sides",
      structure: "A linear equation with an expression on each side; find the input where their values agree.",
      why: "The two graphs have the same y-value at their intersection, which makes the original equation true.", answer: "12",
      steps: [
        { title: "Graph the left side", explanation: "Keep 3x + 7 exactly as it appears and put y = in front of it.", latex: "y=3x+7" },
        { title: "Graph the right side", explanation: "Use a separate row so you have two lines to compare.", latex: "y=2x+19" },
        { title: "Select their crossing", explanation: "The intersection is (12, 43). Read the first coordinate: x = 12. Both original sides equal 43 at that input." },
      ],
      expressions: [row("y=3x+7", "Graph the left side."), row("y=2x+19", "Graph the right side; select the crossing at (12, 43).")],
      graphBounds: { left: -2, right: 18, bottom: -5, top: 60 },
    },
    exploration: {
      title: "Move one side of the equation", prompt: "Change c from 19 to 7, then to 25. Select the intersection each time. Keep the slopes unchanged.",
      expressions: [row("c=19", "Change the constant on the right side.", { min: 1, max: 31, step: 1 }), row("y=3x+7", "The left side stays fixed."), row("y=2x+c", "This line moves when c changes.")],
      graphBounds: { left: -5, right: 25, bottom: -10, top: 80 },
      observations: ["At c = 7, the lines meet at x = 0.", "At c = 25, they meet at x = 18.", "Changing the constant moves the line up or down. You are solving a new equation each time."],
    },
    checks: [
      { id: "linear-equations-coordinate", question: "Your two graphs intersect at (5, 18). The question asks for x. What do you enter?", choices: [{ label: "A", text: "5" }, { label: "B", text: "18" }, { label: "C", text: "23" }], correctLabel: "A", explanation: "The first coordinate is the input x. The second coordinate is the shared output." },
      { id: "linear-equations-rows", question: "Which pair of rows solves 4x − 3 = x + 9?", choices: [{ label: "A", text: "y = 4x − 3 and y = x + 9" }, { label: "B", text: "y = 4x and y = x" }, { label: "C", text: "y = 4x + 3 and y = x − 9" }], correctLabel: "A", explanation: "Copy both complete sides, including their signs. Removing or changing constants changes the equation." },
    ],
    pitfalls: ["Do not submit the y-coordinate when asked for x.", "Check the graph window before deciding there is no intersection.", "Copy parentheses and negative signs exactly as printed."],
    related: ["graphing-equations", "intersections-and-intercepts", "systems-of-equations"], sources: [GRAPHING, SLIDERS],
  },
  {
    slug: "linear-functions", minutes: 7,
    intro: "A linear function changes by the same amount for each equal step in x. When the question gives points, Desmos can fit the line and report its slope and starting value.",
    objectives: ["Keep input and output values paired.", "Fit a line with y₁ ~ mx₁ + b.", "Choose the requested coefficient or function value."],
    sections: [
      { title: "Identify the input and output", paragraphs: ["In f(3) = 15, the input is 3 and the output is 15. That gives the point (3, 15). Record inputs in one list and their matching outputs in another, in the same order.", "A straight-line model is f(x) = mx + b. The parameter m is the change in output for one extra unit of input. The parameter b is the output when x is zero, even if the table does not include zero."] },
      { title: "Let regression find the line", paragraphs: ["Use a tilde, ~, between the output list and the model. Desmos adjusts m and b to fit the paired data. For exact points on a line, the model goes through all of them; measured data may only have a best-fitting line.", "The fitted letters are available in later rows. If you need f(10), define f(x) = mx + b and then enter f(10). Use x in the function definition, not the input list x₁."], takeaway: "Match the model to the question: a linear function needs a linear fit." },
    ],
    example: {
      question: "The linear function f(x) = mx + b satisfies f(1) = 7, f(3) = 15, and f(5) = 23. What is m?", techniqueId: "linear-regression",
      structure: "Points on a line; find its slope coefficient.", why: "A linear regression fits the given input-output pairs and reports the slope as m.", answer: "4",
      steps: [
        { title: "Enter the inputs", explanation: "These are the numbers inside f( ). Keep their original order.", latex: "x_{1}=[1,3,5]" },
        { title: "Enter the outputs", explanation: "Pair 7 with 1, 15 with 3, and 23 with 5.", latex: "y_{1}=[7,15,23]" },
        { title: "Fit the linear model", explanation: "The tilde tells Desmos to find m and b from the lists. Do not add sliders for these fitted letters.", latex: "y_{1}\\sim mx_{1}+b" },
        { title: "Read m", explanation: "Desmos reports m = 4 and b = 3. The question asks for the slope m, so the answer is 4." },
      ],
      expressions: [row("x_{1}=[1,3,5]", "Enter the given inputs."), row("y_{1}=[7,15,23]", "Enter the matching outputs."), row("y_{1}\\sim mx_{1}+b", "Fit the line and read m = 4.")], graphBounds: { left: -1, right: 7, bottom: -2, top: 30 },
    },
    exploration: {
      title: "Change the starting value", prompt: "First read m and b for the displayed data. Then add 5 to every value in the y₁ list: replace it with [12, 20, 28]. Compare the fitted parameters.",
      expressions: [row("x_{1}=[1,3,5]", "Keep these inputs fixed."), row("y_{1}=[7,15,23]", "Edit the outputs as directed."), row("y_{1}\\sim mx_{1}+b", "Read the fitted slope and intercept."), row("f(x)=mx+b", "Graph the fitted function."), row("f(0)", "Read the starting value.")], graphBounds: { left: -1, right: 7, bottom: -2, top: 35 },
      observations: ["The slope stays at 4 because the differences between outputs stay the same.", "The intercept increases from 3 to 8.", "f(0) equals b, so it changes by the same 5 units."],
    },
    checks: [
      { id: "linear-functions-pairs", question: "Which lists represent f(2) = 9 and f(6) = 21?", choices: [{ label: "A", text: "x₁ = [2, 6], y₁ = [21, 9]" }, { label: "B", text: "x₁ = [2, 6], y₁ = [9, 21]" }, { label: "C", text: "x₁ = [2, 9], y₁ = [6, 21]" }], correctLabel: "B", explanation: "Each position in the output list must match the same position in the input list." },
      { id: "linear-functions-readout", question: "A fit gives m = 5 and b = 12. Which number is f(0)?", choices: [{ label: "A", text: "0" }, { label: "B", text: "5" }, { label: "C", text: "12" }], correctLabel: "C", explanation: "At x = 0, mx contributes zero. The intercept b is the function’s value at zero." },
    ],
    pitfalls: ["Use ~ to fit unknown coefficients; = describes an already-defined relationship.", "Do not swap the order of just one list.", "Read the requested quantity: slope, intercept, and f(10) are different."], related: ["tables", "regression", "functions-and-transformations"], sources: [REGRESSION],
  },
  {
    slug: "systems-of-equations", minutes: 6,
    intro: "A solution to a system must satisfy every equation at once. For two equations in x and y, a shared point on their graphs gives both values together.",
    objectives: ["Graph a two-equation system as written.", "Read a shared solution as an ordered pair.", "Distinguish one crossing from parallel or overlapping lines."],
    sections: [
      { title: "Both equations must be true", paragraphs: ["A point on just one line satisfies just one equation. A system asks for a point that belongs to both. This is why graphing the two complete equations is often enough.", "You can enter equations such as 2x + y = 7 directly. You do not need to isolate y first. Use separate rows, then select their crossing on the graph."] },
      { title: "Read the whole point before answering", paragraphs: ["The label (3, 7) means x = 3 and y = 7. If a question asks for x + y, put 3 + 7 into another calculator row. If it asks only for x, report the first coordinate.", "Two distinct straight lines have one shared point unless they are parallel. Parallel lines with different intercepts have none. If the equations draw exactly the same line, every point on that line is a solution. A narrow graph window can hide a distant crossing, so check the equations or expand the view."] },
    ],
    example: {
      question: "The system y = 2x + 1 and y = −x + 10 has solution (x, y). What is x?", techniqueId: "graph-both-sides", structure: "Two linear equations; find the x-coordinate of their shared point.", why: "The intersection belongs to both lines, so its coordinates satisfy both equations.", answer: "3",
      steps: [
        { title: "Enter the first equation", explanation: "Copy the full equation into its own row.", latex: "y=2x+1" },
        { title: "Enter the second equation", explanation: "Keep the negative sign before x.", latex: "y=-x+10" },
        { title: "Read the intersection", explanation: "Select the crossing at (3, 7). The question asks for x, so use 3. The point gives y = 7 as well." },
      ], expressions: [row("y=2x+1", "Graph the first equation."), row("y=-x+10", "Graph the second equation and select (3, 7).")], graphBounds: { left: -2, right: 10, bottom: -2, top: 14 },
    },
    exploration: {
      title: "Parallel, overlapping, or intersecting?", prompt: "The first equation is fixed. Set m = 2 and b = 5 in the second equation, then change b to 1. Finally set m = −1 and b = 10.",
      expressions: [row("m=2", "Change the second line’s slope.", { min: -4, max: 4, step: 1 }), row("b=5", "Change the second line’s intercept.", { min: -5, max: 10, step: 1 }), row("y=2x+1", "The first line stays fixed."), row("y=mx+b", "Use m and b to change the second line.")], graphBounds: { left: -5, right: 10, bottom: -5, top: 15 },
      observations: ["m = 2 and b = 5 produces distinct parallel lines: no solution.", "m = 2 and b = 1 makes the lines overlap: infinitely many solutions.", "m = −1 and b = 10 produces the example’s single intersection at (3, 7)."],
    },
    checks: [
      { id: "systems-coordinate", question: "Two graphs meet at (−2, 5). What is y?", choices: [{ label: "A", text: "−2" }, { label: "B", text: "3" }, { label: "C", text: "5" }], correctLabel: "C", explanation: "The second coordinate is y. The first coordinate is x." },
      { id: "systems-parallel", question: "What happens to y = 3x + 1 and y = 3x + 6?", choices: [{ label: "A", text: "They meet once." }, { label: "B", text: "They are distinct parallel lines." }, { label: "C", text: "They are the same line." }], correctLabel: "B", explanation: "The slopes agree, but the intercepts differ. The lines stay the same distance apart and never meet." },
    ], pitfalls: ["A point on one graph is not automatically a solution of the system.", "Do not confuse the order (x, y).", "Overlapping lines and parallel distinct lines have different solution counts."], related: ["linear-equations", "intersections-and-intercepts", "sliders"], sources: [GRAPHING, SLIDERS],
  },
  {
    slug: "quadratics", minutes: 7,
    intro: "A quadratic graph is a parabola. Its intercepts answer questions about zeros; its turning point answers questions about a minimum or maximum.",
    objectives: ["Choose a vertex or intercept based on the question.", "Read a maximum output from the vertex’s y-coordinate.", "Check domain restrictions before using an extreme value."],
    sections: [
      { title: "Choose the point you need", paragraphs: ["A quadratic has an x² term and no higher power of x. Its graph turns once. That turning point is called the vertex. A downward-opening parabola has its largest y-value there; an upward-opening parabola has its smallest.", "A zero is different: it is an input where the graph meets the x-axis. A problem asking when a height reaches zero needs an intercept. A problem asking for the greatest height needs the vertex’s output."] },
      { title: "Use the graph before changing the equation", paragraphs: ["Enter the quadratic exactly as given, even if it is expanded. Select the curve, then select its turning point. You can read the coordinate without rewriting the equation into vertex form.", "Pay attention to limits in a word problem. If only 0 ≤ x ≤ 3 is allowed and the vertex is at x = 4, that vertex cannot supply the answer for the allowed interval. Use a restriction and inspect the allowed endpoints too."], takeaway: "Maximum or minimum value means y; the input where it occurs means x." },
    ],
    example: {
      question: "What is the maximum value of f(x) = −x² + 8x + 9?", techniqueId: "vertex-read", structure: "A downward-opening quadratic; find its greatest output.", why: "The highest point is the vertex, and its y-coordinate is the maximum function value.", answer: "25",
      steps: [
        { title: "Graph the function", explanation: "The negative x² coefficient makes this parabola open downward.", latex: "y=-x^2+8x+9" },
        { title: "Select the top of the curve", explanation: "Select the graph and then the turning point. The label is (4, 25)." },
        { title: "Read the requested value", explanation: "The maximum output is 25. The other coordinate, 4, is the input where that maximum happens." },
      ], expressions: [row("y=-x^2+8x+9", "Select the vertex (4, 25); its y-coordinate is the maximum.")], graphBounds: { left: -3, right: 11, bottom: -8, top: 32 },
    },
    exploration: {
      title: "Move the vertex", prompt: "Move k from 2 to 6 while keeping a = 1. Then set a = −1. Select the vertex after each change.",
      expressions: [row("a=1", "Set a to 1 or −1 to change the opening direction.", { min: -2, max: 2, step: 1 }), row("k=2", "Move the turning point vertically.", { min: -5, max: 10, step: 1 }), row("y=a(x-3)^2+k", "Track the vertex while changing the sliders.")], graphBounds: { left: -3, right: 9, bottom: -10, top: 15 },
      observations: ["With a = 1, the vertex moves from (3, 2) to (3, 6) and is a minimum.", "With a = −1, (3, 6) becomes a maximum.", "At a = 0, the x² term disappears. The graph is a horizontal line, not a parabola."],
    },
    checks: [
      { id: "quadratics-maximum", question: "A downward-opening parabola has vertex (6, 40). What is its maximum value?", choices: [{ label: "A", text: "6" }, { label: "B", text: "40" }, { label: "C", text: "46" }], correctLabel: "B", explanation: "The vertex’s y-coordinate gives the greatest output." },
      { id: "quadratics-zero", question: "Which points matter when a question asks for the zeros of a quadratic?", choices: [{ label: "A", text: "The x-intercepts" }, { label: "B", text: "Only the vertex" }, { label: "C", text: "Only the y-intercept" }], correctLabel: "A", explanation: "A zero is an input where the output is zero, so it lies on the x-axis." },
    ], pitfalls: ["Maximum value and x-value of the maximum are not the same quantity.", "A restricted interval may exclude the vertex.", "An upward-opening quadratic has no maximum over all real inputs."], related: ["intersections-and-intercepts", "functions-and-transformations", "restrictions"], sources: [GRAPHING, SLIDERS],
  },
  {
    slug: "polynomials", minutes: 7,
    intro: "For a polynomial equation equal to zero, the graph’s x-intercepts show the real solutions. You can find them without guessing a factorization first.",
    objectives: ["Graph an expanded polynomial without rearranging it.", "Locate every visible real zero, including a point where the curve only touches the axis.", "Use the requested sign or size to choose a root."],
    sections: [
      { title: "A zero is an x-intercept", paragraphs: ["A polynomial combines numbers and nonnegative whole-number powers of x. When the question sets that expression equal to zero, graph y = the expression. Its real solutions appear where y is zero.", "The curve may cross the x-axis or touch it and turn back. Both are zeros. Select the curve and inspect the labeled intercepts, rather than counting only obvious crossings."], takeaway: "For p(x) = 0, graph y = p(x) and read the x-intercepts." },
      { title: "Use the wording to choose a root", paragraphs: ["A question might ask for the greatest solution, a positive solution, or the number of distinct real solutions. Find all relevant intercepts before choosing one. The greatest root is the rightmost one, not the point with the greatest y-value.", "If x = r is a zero, x − r is a factor of the polynomial. This connects a graph to a factor question. A numerical picture is still limited: enlarge the window and zoom near crowded points before deciding you have found every root."] },
    ],
    example: {
      question: "What is the greatest real solution of x³ − 2x² − 5x + 6 = 0?", techniqueId: "intercept-read", structure: "An expanded cubic equal to zero; choose its rightmost real root.", why: "The zeros of the polynomial are exactly the x-intercepts of its graph.", answer: "3",
      steps: [
        { title: "Graph the full polynomial", explanation: "Keep all four terms and their signs. There is no need to factor it first.", latex: "y=x^3-2x^2-5x+6" },
        { title: "Select the x-intercepts", explanation: "The labeled intercepts are (−2, 0), (1, 0), and (3, 0)." },
        { title: "Choose the greatest input", explanation: "The rightmost intercept has x = 3, so the greatest real solution is 3." },
      ], expressions: [row("y=x^3-2x^2-5x+6", "Select all three x-intercepts and read the greatest x-value.")], graphBounds: { left: -4, right: 5, bottom: -15, top: 15 },
    },
    exploration: {
      title: "Watch two roots coincide", prompt: "Move c from 4 to 1 in the factored expression. Count distinct x-intercepts at each setting, then try c = −2.",
      expressions: [row("c=4", "Move one of the roots.", { min: -3, max: 5, step: 1 }), row("y=(x+2)(x-1)(x-c)", "Inspect the x-intercepts as c changes.")], graphBounds: { left: -4, right: 6, bottom: -15, top: 15 },
      observations: ["At c = 4, the distinct roots are −2, 1, and 4.", "At c = 1, two factors share the root 1. The graph touches the axis there; it is still a root.", "At c = −2, the repeated root is −2. In each repeated-root case, there are only two distinct real solutions."],
    },
    checks: [
      { id: "polynomials-factor", question: "A polynomial has an x-intercept at (5, 0). Which factor does that give?", choices: [{ label: "A", text: "x + 5" }, { label: "B", text: "x − 5" }, { label: "C", text: "5x" }], correctLabel: "B", explanation: "The factor x − 5 becomes zero at x = 5." },
      { id: "polynomials-touch", question: "A curve touches the x-axis at x = 2 and turns back. Is 2 a real zero?", choices: [{ label: "A", text: "Yes, because the output there is zero." }, { label: "B", text: "No, it must cross the axis." }, { label: "C", text: "Only if 2 is the greatest root." }], correctLabel: "A", explanation: "Crossing is not required. Touching the axis also means p(2) = 0." },
    ], pitfalls: ["A repeated root counts once when asked for distinct solutions.", "Do not assume all roots are in the initial graph window.", "The rightmost intercept gives the greatest root; the highest part of the curve does not."], related: ["intersections-and-intercepts", "quadratics", "answer-choice-testing"], sources: [GRAPHING],
  },
  {
    slug: "exponents-and-radicals", minutes: 6,
    intro: "Desmos can evaluate powers and roots directly. The main job is entering the structure correctly: which number is the base, which part is the exponent, and what belongs under the root.",
    objectives: ["Enter fractional exponents and radicals with grouping.", "Distinguish a negative base from a negative sign outside a power.", "Recognize when a numerical check is not a proof of an identity."],
    sections: [
      { title: "Keep the exponent together", paragraphs: ["In 16^(3/2), the whole fraction 3/2 is the exponent. Enter it in parentheses after the caret when typing. Desmos handles the power and division for you; you do not have to evaluate the root separately.", "For a square root, use the sqrt key or type sqrt. Make sure the root covers the entire intended expression. The expressions √(9 + 16) and √9 + 16 have different groupings and different values."] },
      { title: "Check signs and domains", paragraphs: ["The expression (−3)² squares a negative base and gives 9. The expression −3² puts a minus sign in front of 3² and gives −9. Parentheses tell the calculator which operation you intend.", "In real-number questions, a square root needs a nonnegative input, and a denominator cannot be zero. Testing one allowed input can reject a wrong answer choice, but a match at one input does not establish that two expressions are identical for every allowed input."], takeaway: "Copy the grouping before asking the calculator for a value." },
    ],
    example: {
      question: "What is the value of 16^(3/2) ÷ 8?", techniqueId: "calculator-arithmetic", structure: "A numerical expression with a fractional exponent and division.", why: "The expression can be evaluated directly once the fractional exponent is grouped correctly.", answer: "8",
      steps: [
        { title: "Enter the complete expression", explanation: "The fraction 3/2 belongs entirely in the exponent; the division by 8 is outside it.", latex: "\\frac{16^{\\frac{3}{2}}}{8}" },
        { title: "Check the displayed grouping", explanation: "Look for 3/2 as the superscript on 16, with the whole power above the denominator 8. Correct the entry if the 8 appears inside the exponent." },
        { title: "Read the numerical result", explanation: "Desmos gives 8. No intermediate rounding is needed." },
      ], expressions: [row("\\frac{16^{\\frac{3}{2}}}{8}", "Evaluate the complete expression; the result is 8.")], graphBounds: null,
    },
    exploration: {
      title: "Change the grouping", prompt: "Compare the four expressions. Change 3 to 4 in the first two rows, then change 16 to 27 in the last two. Describe which operation happens first in each row.",
      expressions: [row("(-3)^2", "Square the entire negative base."), row("-3^2", "Apply the negative sign after squaring."), row("\\sqrt{9+16}", "Add inside the root first."), row("\\sqrt{9}+16", "Take the root of 9 only.")], graphBounds: null,
      observations: ["Initially, the first two rows give 9 and −9; after the edit, they give 16 and −16.", "The last two rows initially give 5 and 19.", "With 27 in place of 16, they give 6 and 30. Matching numbers do not make different groupings equivalent."],
    },
    checks: [
      { id: "exponents-sign", question: "What is the value of (−4)²?", choices: [{ label: "A", text: "−16" }, { label: "B", text: "−8" }, { label: "C", text: "16" }], correctLabel: "C", explanation: "The parentheses make −4 the base, so the whole negative number is squared." },
      { id: "exponents-domain", question: "In real numbers, which input makes √(x − 2) undefined?", choices: [{ label: "A", text: "x = 1" }, { label: "B", text: "x = 2" }, { label: "C", text: "x = 6" }], correctLabel: "A", explanation: "At x = 1, the number inside the square root is −1. The other inputs give nonnegative radicands." },
    ], pitfalls: ["Leaving parentheses out of a fractional exponent can change the calculation.", "A negative sign outside a power is not part of the base.", "One matching test value does not prove an algebraic identity."], related: ["introduction-to-desmos", "answer-choice-testing", "nonlinear-functions"], sources: [FUNCTIONS],
  },
  {
    slug: "nonlinear-functions", minutes: 7,
    intro: "Exponential functions change by a repeated factor rather than a repeated difference. When the problem gives function values, fit the stated model and evaluate it at the requested input.",
    objectives: ["Distinguish equal differences from equal ratios.", "Fit an exponential model to paired values.", "Evaluate a fitted function without copying rounded coefficients."],
    sections: [
      { title: "Look for repeated multiplication", paragraphs: ["For equally spaced inputs, outputs such as 3, 6, 12 multiply by 2 each time. That is an exponential pattern. Outputs such as 3, 6, 9 instead add 3 each time and fit a line.", "In f(x) = ab^x, a is the output at x = 0. For a positive starting value a and positive base b, values of b greater than 1 give growth, while 0 < b < 1 gives decay. The number b is a multiplier, not a percent by itself."] },
      { title: "Fit the model the problem gives you", paragraphs: ["Enter the input and output lists, then fit y₁ ~ ab^(x₁). Here, x₁ is a list used in the regression. After the fit, define f(x) = ab^x with an ordinary x so you can ask for one new input.", "Not every curved graph is exponential. Quadratics, rational functions, and radicals have different structures. If a question states the model, use that model. If it asks you to choose one, compare the stated relationships rather than choosing a curve that looks close."], takeaway: "Fit with the list x₁; evaluate with the function’s input x." },
    ],
    example: {
      question: "The exponential function f(x) = ab^x satisfies f(0) = 3, f(1) = 6, and f(2) = 12. What is f(4)?", techniqueId: "exponential-regression", structure: "Values of an exponential function; find another function value.", why: "The regression identifies the starting value and multiplier, which can then be used in the function definition.", answer: "48",
      steps: [
        { title: "Enter the inputs", explanation: "Use the given x-values in their printed order.", latex: "x_{1}=[0,1,2]" },
        { title: "Enter the matching outputs", explanation: "Each value must match the input in the same list position.", latex: "y_{1}=[3,6,12]" },
        { title: "Fit the exponential model", explanation: "Desmos reports a = 3 and b = 2 for these data.", latex: "y_{1}\\sim ab^{x_{1}}" },
        { title: "Define the fitted function", explanation: "Use the fitted letters directly, rather than retyping rounded values.", latex: "f(x)=ab^x" },
        { title: "Evaluate the requested input", explanation: "The output at x = 4 is 48.", latex: "f(4)" },
      ], expressions: [row("x_{1}=[0,1,2]", "Enter the given inputs."), row("y_{1}=[3,6,12]", "Enter the given outputs."), row("y_{1}\\sim ab^{x_{1}}", "Fit a = 3 and b = 2."), row("f(x)=ab^x", "Define the fitted function."), row("f(4)", "Read 48.")], graphBounds: { left: -1, right: 5, bottom: -3, top: 60 },
    },
    exploration: {
      title: "Compare growth and decay", prompt: "Start with b = 2. Then change b to 1, then to 0.5. Keep a = 3 and compare f(0), f(1), and f(2).",
      expressions: [row("a=3", "The starting value."), row("b=2", "Adjust the positive growth or decay multiplier.", { min: 0.25, max: 3, step: 0.25 }), row("f(x)=ab^x", "Graph the exponential model."), row("f([0,1,2])", "Read the outputs at three consecutive inputs.")], graphBounds: { left: -2, right: 5, bottom: -2, top: 30 },
      observations: ["b = 2 gives [3, 6, 12]. Each one-unit step doubles the output.", "b = 1 gives [3, 3, 3], so the graph is constant.", "b = 0.5 gives [3, 1.5, 0.75]. The output is halved at each step, and f(0) remains 3."],
    },
    checks: [
      { id: "nonlinear-pattern", question: "For x = 0, 1, 2, the outputs are 5, 15, 45. Which model type matches this pattern?", choices: [{ label: "A", text: "Linear: add 10 each time." }, { label: "B", text: "Exponential: multiply by 3 each time." }, { label: "C", text: "Constant: the output does not change." }], correctLabel: "B", explanation: "The differences are not equal, but each output is three times the previous one." },
      { id: "nonlinear-decay", question: "In f(x) = 80(0.9)^x, what happens with each one-unit increase in x?", choices: [{ label: "A", text: "The output increases by 90%." }, { label: "B", text: "The output decreases by 90%." }, { label: "C", text: "The output keeps 90% of its previous value." }], correctLabel: "C", explanation: "Multiplying by 0.9 keeps 90%, which is a 10% decrease." },
    ], pitfalls: ["A multiplier of 1.2 means 20% growth, not 120% growth.", "Use ordinary x when defining f(x); x₁ belongs to the data list.", "A fit to noisy data is a model, not an exact promise about future values."], related: ["regression", "linear-functions", "ratios-and-percentages"], sources: [REGRESSION],
  },
  {
    slug: "ratios-and-percentages", minutes: 6,
    intro: "Desmos handles the arithmetic in a percentage or rate problem. First identify the original amount and what the question asks you to report.",
    objectives: ["Choose the base amount for a percentage.", "Calculate a changed total using a multiplier.", "Keep units attached when working with rates."],
    sections: [
      { title: "A percentage needs a base", paragraphs: ["Twenty-five percent means 25 out of 100. A 25% discount on $80 is based on the original $80. The discount amount and the sale price are different answers, so underline which one the question requests.", "A decrease of p% keeps 1 − p/100 of the original. An increase keeps 1 + p/100. You can enter that multiplier directly in Desmos instead of finding the change separately and then adding or subtracting it."], takeaway: "Changed total = original amount × the fraction that remains." },
      { title: "Rates and repeated changes", paragraphs: ["A rate connects quantities with different units, such as dollars per hour. If the rate is $15 per hour and the time is 6 hours, enter 15 × 6; the result is dollars. If a result has the wrong units, check whether you multiplied or divided in the correct direction.", "Two percentage changes use two successive bases. A 20% increase followed by a 20% decrease does not return to the starting amount: the decrease acts on the larger, updated amount. Enter both multipliers rather than adding the percentages." ] },
    ],
    example: {
      question: "A jacket originally costs $80. Its price is reduced by 25%. What is the sale price, in dollars?", techniqueId: "calculator-arithmetic", structure: "An original price and a percent decrease; find the remaining total.", why: "Multiplying by 1 − 25/100 keeps the portion of the original price that remains after the discount.", answer: "60",
      steps: [
        { title: "Identify the requested amount", explanation: "The question asks for the price after the discount, not the number of dollars taken off." },
        { title: "Enter the remaining-price calculation", explanation: "Use the original 80 and the stated 25% in the same row.", latex: "80\\left(1-\\frac{25}{100}\\right)" },
        { title: "Read the price", explanation: "The calculator gives 60, so the sale price is $60. The $20 discount is a different quantity." },
      ], expressions: [row("80\\left(1-\\frac{25}{100}\\right)", "Calculate the price remaining after a 25% discount.")], graphBounds: null,
    },
    exploration: {
      title: "Change the discount", prompt: "Move p from 25 to 10, then to 50. Compare the discount amount and the final price. Then inspect the last row’s increase-and-decrease calculation.",
      expressions: [row("p=25", "Set the discount percentage.", { min: 0, max: 100, step: 5 }), row("80\\left(\\frac{p}{100}\\right)", "Dollars taken off."), row("80\\left(1-\\frac{p}{100}\\right)", "Dollars still paid."), row("100(1.2)(0.8)", "A 20% increase followed by a 20% decrease.")], graphBounds: null,
      observations: ["At p = 10, the discount is $8 and the price is $72.", "At p = 50, both quantities are $40. Their sum is always the original $80.", "100(1.2)(0.8) gives 96. Equal increase and decrease percentages do not cancel when their bases differ."],
    },
    checks: [
      { id: "percent-increase", question: "Which entry gives the new total after increasing 200 by 15%?", choices: [{ label: "A", text: "200(0.15)" }, { label: "B", text: "200(1.15)" }, { label: "C", text: "200 − 15" }], correctLabel: "B", explanation: "The new total includes the original 100% plus the added 15%, so the multiplier is 1.15." },
      { id: "percent-base", question: "A price rises from $50 to $60. Which expression finds the percent increase?", choices: [{ label: "A", text: "100(60 − 50)/50" }, { label: "B", text: "100(60 − 50)/60" }, { label: "C", text: "60/50" }], correctLabel: "A", explanation: "Divide the change by the original price, then multiply by 100. This gives a 20% increase." },
    ], pitfalls: ["Do not report the discount amount when asked for the final price.", "Percent increase uses the original amount as its base.", "Rates must use compatible units; convert minutes to hours when necessary."], related: ["introduction-to-desmos", "linear-functions", "nonlinear-functions"], sources: [SAT_DATA],
  },
  {
    slug: "statistics-and-data-analysis", minutes: 7,
    intro: "For a list of numerical data, Desmos can calculate the mean and median directly. You still need to know which summary the question asks for and what each entry represents.",
    objectives: ["Enter every observation, including repeated values.", "Use mean and median on the same data list.", "Compare how an extreme value affects the two summaries."],
    sections: [
      { title: "Enter observations, not just distinct values", paragraphs: ["If the data are 2, 2, 4, and 8, enter all four values. Removing a repeated 2 changes the data set. A frequency table also needs care: a value occurring five times represents five observations, not one.", "Store the data in a list such as L = [4, 7, 8, 9, 22]. Then call mean(L) or median(L). Reusing the list reduces the chance of typing a different data set into each calculation."] },
      { title: "Mean and median answer different questions", paragraphs: ["The mean is the total shared equally across all observations. Every value contributes to it, so a very large observation can pull it upward. The median is the middle of the sorted data; for an even number of observations, it is the average of the two middle values.", "Desmos performs the ordering and arithmetic. The question still controls the choice: use mean when asked for the average, and median when asked for the median. Neither number alone tells you how spread out the data are."], takeaway: "Keep the entire data set; choose the statistic the question names." },
    ],
    example: {
      question: "The data set is 4, 7, 8, 9, 22. What is its median?", techniqueId: "statistics-builtin", structure: "A numerical data set; find the median.", why: "The median function finds the middle of the ordered observations without requiring manual sorting.", answer: "8",
      steps: [
        { title: "Store the full data set", explanation: "Enter each of the five observations once, in the order given.", latex: "L=[4,7,8,9,22]" },
        { title: "Ask for the median", explanation: "Use the statistic named by the question.", latex: "\\operatorname{median}(L)" },
        { title: "Read the result", explanation: "The median is 8. The extreme value 22 does not change which observation is in the middle." },
      ], expressions: [row("L=[4,7,8,9,22]", "Store every observation."), row("\\operatorname{median}(L)", "Read the median, 8.")], graphBounds: null,
    },
    exploration: {
      title: "Change one extreme value", prompt: "Compare the mean and median. Replace only the final list entry, 22, with 72. Then replace it with 9.",
      expressions: [row("L=[4,7,8,9,22]", "Edit the final observation."), row("\\operatorname{mean}(L)", "The mean uses every value."), row("\\operatorname{median}(L)", "The median uses the middle ordered position.")], graphBounds: null,
      observations: ["The original mean is 10 and the median is 8.", "Changing 22 to 72 raises the mean to 20, while the median stays 8.", "Changing the final entry to 9 gives mean 7.4 and median 8. Here the middle observation remains the same throughout."],
    },
    checks: [
      { id: "statistics-repeats", question: "A table says 3 occurs twice and 8 occurs once. Which list represents the observations?", choices: [{ label: "A", text: "[3, 8]" }, { label: "B", text: "[3, 3, 8]" }, { label: "C", text: "[2, 1]" }], correctLabel: "B", explanation: "Repeated observations count. The frequency numbers describe how often each value belongs in the list." },
      { id: "statistics-even-median", question: "What does median([2, 4, 8, 10]) return?", choices: [{ label: "A", text: "4" }, { label: "B", text: "6" }, { label: "C", text: "8" }], correctLabel: "B", explanation: "There are four observations. The two middle values are 4 and 8, and their average is 6." },
    ], pitfalls: ["A frequency column is not itself the data set.", "A mean and a median may be different even when both are calculated correctly.", "A change in the mean does not, by itself, tell you the change in spread."], related: ["lists", "tables", "regression"], sources: [STATISTICS, SAT_DATA],
  },
  {
    slug: "geometry", minutes: 6,
    intro: "When a geometry question gives coordinates, start with Desmos’s coordinate tools. The distance function gives a segment’s length directly from its endpoints.",
    objectives: ["Enter points as ordered pairs.", "Use distance for a straight-line length.", "Distinguish a length from an area and choose appropriate units."],
    sections: [
      { title: "Use the information you are given", paragraphs: ["A point (1, 2) means one unit horizontally and two units vertically from the origin. Keep x first and y second whenever you copy a point into the calculator.", "For two endpoints, distance((x₁, y₁), (x₂, y₂)) returns the straight-line length between them. This avoids typing and simplifying a separate distance-formula calculation. The midpoint function is available when you need the point halfway between the endpoints instead."] },
      { title: "A drawing is not a measurement", paragraphs: ["The horizontal and vertical graph scales may differ, so a segment can look steeper or shallower than expected. Trust the given coordinates and a numeric distance readout, rather than measuring the picture by eye.", "For an area or volume problem, first identify the correct shape and quantities from the diagram or the SAT reference information. Then evaluate the appropriate formula in the calculator. A distance is measured in units; an area is measured in square units. Desmos does not decide which quantity the question intends."], takeaway: "Coordinates given, length asked: use distance on the two points." },
    ],
    example: {
      question: "What is the distance between (1, 2) and (7, 10), in coordinate units?", techniqueId: "distance-builtin", structure: "Two endpoints in the coordinate plane; find the segment length.", why: "The distance function uses both coordinate pairs and returns their straight-line separation.", answer: "10",
      steps: [
        { title: "Check the coordinate pairs", explanation: "The first endpoint is (1, 2), and the second is (7, 10). Keep each pair together." },
        { title: "Use the distance function", explanation: "Enter two points, with a comma separating the points as well as the coordinates within them.", latex: "\\operatorname{distance}((1,2),(7,10))" },
        { title: "Read the length", explanation: "The result is 10 coordinate units. It is a straight-line distance, not the horizontal change plus the vertical change." },
      ], expressions: [row("\\operatorname{distance}((1,2),(7,10))", "Calculate the segment length, 10.")], graphBounds: null,
    },
    exploration: {
      title: "Move one endpoint", prompt: "Move t from 7 to 1 while keeping the other coordinates fixed. Compare the plotted points and the numerical distance. Then try t = −5.",
      expressions: [row("t=7", "Move the second point horizontally.", { min: -5, max: 9, step: 1 }), row("A=(1,2)", "The fixed endpoint."), row("B=(t,10)", "The moving endpoint."), row("\\operatorname{distance}(A,B)", "Read the straight-line distance."), row("\\operatorname{midpoint}(A,B)", "Watch the halfway point move.")], graphBounds: { left: -7, right: 11, bottom: -1, top: 13 },
      observations: ["At t = 1, the points lie on the same vertical line and the distance is 8.", "At t = 7 and t = −5, the distance is 10: the horizontal change has the same size in opposite directions.", "The midpoint always has y = 6 because the endpoints’ y-coordinates remain 2 and 10."],
    },
    checks: [
      { id: "geometry-function", question: "Which function directly returns the length between two given points?", choices: [{ label: "A", text: "median" }, { label: "B", text: "midpoint" }, { label: "C", text: "distance" }], correctLabel: "C", explanation: "distance returns a length. midpoint returns an ordered pair, and median summarizes numerical data." },
      { id: "geometry-units", question: "Both coordinate axes measure meters. What units does distance((1, 2), (7, 10)) have?", choices: [{ label: "A", text: "Meters" }, { label: "B", text: "Square meters" }, { label: "C", text: "Cubic meters" }], correctLabel: "A", explanation: "The result is a length. Areas and volumes use square and cubic units, respectively." },
    ], pitfalls: ["Do not reverse x and y in only one endpoint.", "Horizontal change plus vertical change is not the straight-line distance.", "Use the information given, not the apparent size of a diagram."], related: ["advanced-desmos-shortcuts", "circles", "trigonometry"], sources: [FUNCTIONS],
  },
  {
    slug: "circles", minutes: 8,
    intro: "A circle’s center and radius are easy to read from center-radius form. When the equation is expanded, Desmos can fit that form directly, without completing the square by hand.",
    objectives: ["Read the center and radius from a circle’s standard form.", "Fit an expanded equation to the same form using sample inputs.", "Take the positive square root of a fitted radius-squared value."],
    sections: [
      { title: "Recognize center-radius form", paragraphs: ["The equation (x − h)² + (y − k)² = r² describes a circle with center (h, k) and radius r. For (x − 4)² + (y + 3)² = 36, the center is (4, −3) and the radius is 6.", "Notice both details: y + 3 means y − (−3), and the number on the right is the radius squared. If you are given this form already, reading it is quicker than building a regression."] },
      { title: "Fit the form when the equation is expanded", paragraphs: ["For an expanded equation, compare its left side to (x − h)² + (y − k)² − q. The unknown q will represent the radius squared. Desmos can fit h, k, and q by making the two expressions agree on several paired sample inputs.", "The sample pairs below are comparison inputs, not points claimed to lie on the circle. Both formulas already contain the same x² and y² terms. The independent inputs let the fit match the remaining x term, y term, and constant. Keep the original coefficients in the regression."], takeaway: "Fit q = radius squared, then read √q as the positive radius." },
    ],
    example: {
      question: "The equation x² + y² − 8x + 6y − 11 = 0 represents a circle. What is its radius?", techniqueId: "expanded-circle", structure: "An expanded circle equation; find the radius through a center-radius fit.", why: "Matching the expanded expression to center-radius form gives the center and radius squared directly.", answer: "6",
      steps: [
        { title: "Graph the original equation", explanation: "This shows the circle you are analyzing. The fitting rows will supply an exact radius instead of an estimate from the picture.", latex: "x^2+y^2-8x+6y-11=0" },
        { title: "Enter sample x-values", explanation: "These are comparison inputs used to match two forms of the same expression.", latex: "x_{1}=[0,1,0,2,-1,3]" },
        { title: "Enter matching y-values", explanation: "Each position pairs with the same position in x₁. These sample points do not need to lie on the circle.", latex: "y_{1}=[0,0,1,2,3,-1]" },
        { title: "Fit center-radius form", explanation: "Desmos reports h = 4, k = −3, and q = 36. Here q is the radius squared, so it is not yet the requested length.", latex: "x_{1}^2+y_{1}^2-8x_{1}+6y_{1}-11\\sim(x_{1}-h)^2+(y_{1}-k)^2-q" },
        { title: "Read the positive radius", explanation: "The square root of q gives 6. The fitted center is (4, −3).", latex: "\\sqrt{q}" },
      ], expressions: [row("x^2+y^2-8x+6y-11=0", "Graph the given circle."), row("x_{1}=[0,1,0,2,-1,3]", "Enter independent sample x-values."), row("y_{1}=[0,0,1,2,3,-1]", "Enter matching sample y-values."), row("x_{1}^2+y_{1}^2-8x_{1}+6y_{1}-11\\sim(x_{1}-h)^2+(y_{1}-k)^2-q", "Fit h = 4, k = −3, and q = 36."), row("\\sqrt{q}", "Take the positive square root to read radius 6.")], graphBounds: { left: -5, right: 13, bottom: -12, top: 6 },
    },
    exploration: {
      title: "Move the center and change the radius", prompt: "Start with h = 4, k = −3, and q = 36. Move h to 0 without changing q. Then set q = 9. Select points or adjust the graph window to inspect the change.",
      expressions: [row("h=4", "Move the center horizontally.", { min: -5, max: 5, step: 1 }), row("k=-3", "Move the center vertically.", { min: -5, max: 5, step: 1 }), row("q=36", "Set the radius squared.", { min: 1, max: 49, step: 1 }), row("(x-h)^2+(y-k)^2=q", "The circle in center-radius form."), row("(h,k)", "The center."), row("\\sqrt{q}", "The radius.")], graphBounds: { left: -8, right: 12, bottom: -12, top: 8 },
      observations: ["Changing h from 4 to 0 moves the center left 4 units and leaves the radius at 6.", "Setting q = 9 changes the radius to 3, not 9.", "The center stays (h, k) while q changes the circle’s size."],
    },
    checks: [
      { id: "circles-center", question: "What is the center of (x − 2)² + (y + 5)² = 49?", choices: [{ label: "A", text: "(2, −5)" }, { label: "B", text: "(−2, 5)" }, { label: "C", text: "(2, 5)" }], correctLabel: "A", explanation: "Compare the expression to (x − h)² + (y − k)². The term y + 5 is y − (−5)." },
      { id: "circles-radius", question: "Your fit reports q = 81 in (x − h)² + (y − k)² − q. What is the radius?", choices: [{ label: "A", text: "81" }, { label: "B", text: "40.5" }, { label: "C", text: "9" }], correctLabel: "C", explanation: "q is the radius squared. The positive radius is √81 = 9." },
    ], pitfalls: ["A fitted q is radius squared, not radius.", "The sample pairs in the regression are comparison inputs, not points on the circle.", "The example assumes equal positive x² and y² coefficients. Do not reuse it unchanged for every conic equation."], related: ["regression", "bracket-regression", "geometry"], sources: [REGRESSION, GRAPHING],
  },
  {
    slug: "trigonometry", minutes: 7,
    intro: "For a right triangle, identify the sides relative to the named angle. Then use sine, cosine, or tangent in Desmos to calculate the missing length or angle.",
    objectives: ["Identify opposite, adjacent, and hypotenuse.", "Choose a ratio from the sides you know and need.", "Use Degrees for a degree angle and check the result’s units."],
    sections: [
      { title: "Name the sides from the chosen angle", paragraphs: ["The hypotenuse is opposite the right angle and is the longest side. For the other named angle, the opposite side is across from it. The adjacent side touches it and is not the hypotenuse. Switching the named angle swaps opposite and adjacent.", "The core ratios are sin(angle) = opposite/hypotenuse, cos(angle) = adjacent/hypotenuse, and tan(angle) = opposite/adjacent. These relationships tell you which calculator expression matches the diagram; Desmos handles the numerical evaluation."] },
      { title: "Check the angle setting", paragraphs: ["The calculator in SolvePlot starts in Degrees. For a 30° angle, enter sin(30). If you change the calculator to Radians, the same entry means a different angle. Check the setting before interpreting a result.", "Use an inverse function when the unknown is an angle, such as sin⁻¹(0.5) for an angle whose sine is 0.5. An ordinary sine takes an angle and returns a ratio; an inverse sine takes a ratio and returns an angle. For this lesson, keep Degrees selected."], takeaway: "Known angle and hypotenuse, opposite side asked: hypotenuse × sin(angle)." },
    ],
    example: {
      question: "A right triangle has hypotenuse 12 and an acute angle of 30°. What is the length of the side opposite that angle?", techniqueId: "right-triangle-trig", structure: "A right triangle with a known angle and hypotenuse; find the opposite side.", why: "Sine relates the opposite side to the hypotenuse. Multiplying the hypotenuse by the sine of the angle gives the opposite length.", answer: "6",
      steps: [
        { title: "Choose the sine relationship", explanation: "The given 12 is the hypotenuse, and the requested side is opposite 30°. Sine uses exactly these two sides." },
        { title: "Keep the calculator in Degrees", explanation: "The angle is labeled 30°, so confirm Degrees in graph settings if you have changed it." },
        { title: "Evaluate the side length", explanation: "Multiply the hypotenuse by the sine of the angle.", latex: "12\\sin(30)" },
        { title: "Read and check the result", explanation: "The opposite side has length 6. A leg shorter than the hypotenuse is consistent with the triangle." },
      ], expressions: [row("12\\sin(30)", "In Degrees mode, calculate the opposite side: 6.")], graphBounds: null,
    },
    exploration: {
      title: "Change the acute angle", prompt: "Keep Degrees selected. Move a from 30 to 45, then to 60. The hypotenuse stays 12; compare the opposite and adjacent lengths and the plotted triangle.",
      expressions: [row("a=30", "The acute angle in degrees.", { min: 5, max: 85, step: 5 }), row("12\\sin(a)", "The opposite length."), row("12\\cos(a)", "The adjacent length."), row("\\operatorname{polygon}((0,0),(12\\cos(a),0),(12\\cos(a),12\\sin(a)))", "A right triangle with a 12-unit hypotenuse and angle a at the origin.")], graphBounds: { left: -1, right: 13, bottom: -1, top: 13 },
      observations: ["At 30°, the opposite side is 6 and the adjacent side is about 10.392.", "At 45°, both legs are about 8.485.", "At 60°, the values swap: the opposite side is about 10.392 and the adjacent side is 6. The hypotenuse remains 12."],
    },
    checks: [
      { id: "trig-ratio", question: "You know an acute angle and the hypotenuse, and need the adjacent side. Which calculation fits?", choices: [{ label: "A", text: "hypotenuse × sin(angle)" }, { label: "B", text: "hypotenuse × cos(angle)" }, { label: "C", text: "hypotenuse × tan(angle)" }], correctLabel: "B", explanation: "Cosine is adjacent divided by hypotenuse. Multiplying it by the hypotenuse gives the adjacent length." },
      { id: "trig-angle-mode", question: "The diagram gives 40°, and you type sin(40). Which calculator setting should you use?", choices: [{ label: "A", text: "Degrees" }, { label: "B", text: "Radians" }, { label: "C", text: "Either gives the same value." }], correctLabel: "A", explanation: "The number 40 represents a degree angle here. Radian mode interprets the same input differently." },
    ], pitfalls: ["The adjacent side is not the hypotenuse.", "Opposite and adjacent depend on which acute angle you use.", "Do not mix degree inputs with a calculator set to radians.", "A trig ratio is not automatically the requested side length; include the known length when required."], related: ["geometry", "advanced-desmos-shortcuts", "introduction-to-desmos"], sources: [TRIG],
  },
];
