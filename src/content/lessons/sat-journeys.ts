import type { LESSONS } from "@/lib/learn-catalog";
import type { LessonCalculatorSetup, LessonJourney } from "@/lib/lesson-journey-types";
import type { DesmosExpression, GraphBounds } from "@/lib/solver-schema";

type SatLessonSlug = Extract<(typeof LESSONS)[number], { path: "sat" }>["slug"];
type Entry = [latex: string, purpose: string, slider?: { min: number; max: number; step: number }];
const calculator = (entries: Entry[], bounds: GraphBounds | null, caption: string): LessonCalculatorSetup => ({
  expressions: entries.map(([latex, purpose, slider]): DesmosExpression => ({ latex, purpose, ...(slider ? { slider } : {}) })),
  bounds,
  caption,
});
const blank = (caption: string, bounds: GraphBounds | null = null) => calculator([], bounds, caption);
const copies = (entries: Entry[]) => entries.map(([latex, label]) => ({ latex, label }));

const LINEAR_BOUNDS = { left: -2, right: 18, bottom: -5, top: 60 };
const LINEAR: Entry[] = [["y=3x+7", "Graph the complete left side."], ["y=2x+19", "Graph the complete right side."]];
const LINE_FIT: Entry[] = [["x_{1}=[1,3,5]", "Enter the inputs in order."], ["y_{1}=[7,15,23]", "Enter their matching outputs."], ["y_{1}\\sim mx_{1}+b", "Fit a line to the paired values."]];
const LINE_FIT_BOUNDS = { left: -1, right: 12, bottom: -2, top: 50 };
const SYSTEM: Entry[] = [["y=2x+1", "Graph the first equation."], ["y=-x+10", "Graph the second equation."]];
const SYSTEM_BOUNDS = { left: -2, right: 10, bottom: -2, top: 14 };
const QUADRATIC: Entry[] = [["y=-x^2+8x+9", "Graph the quadratic as given."]];
const QUADRATIC_BOUNDS = { left: -3, right: 11, bottom: -5, top: 30 };
const POLYNOMIAL: Entry[] = [["y=x^3-2x^2-5x+6", "Graph the polynomial’s output."]];
const POLYNOMIAL_BOUNDS = { left: -4, right: 5, bottom: -15, top: 20 };
const EXPONENTIAL: Entry[] = [["x_{1}=[0,1,2]", "Enter the given inputs."], ["y_{1}=[3,6,12]", "Enter the matching outputs."], ["y_{1}\\sim ab^{x_{1}}", "Fit the exponential model."]];
const EXPONENTIAL_BOUNDS = { left: -1, right: 5, bottom: -2, top: 60 };
const DATA: Entry[] = [["L=[4,7,8,9,22]", "Store every observation, including any repeats."]];
const POINTS: Entry[] = [["(1,2)", "Plot the first endpoint."], ["(7,10)", "Plot the second endpoint."]];
const POINT_BOUNDS = { left: -3, right: 12, bottom: -3, top: 15 };
const CIRCLE: Entry[] = [["(x-4)^2+(y+3)^2=36", "Graph the given circle."]];
const CIRCLE_BOUNDS = { left: -5, right: 13, bottom: -12, top: 6 };

/** Focused SAT lessons; every independent numeric check starts with an empty calculator. */
export const SAT_JOURNEYS: Record<SatLessonSlug, LessonJourney> = {
  "linear-equations": {
    prerequisite: "Read an ordered pair as (x, y). No equation rearranging is needed.",
    summary: ["Graph each complete side of an equation in its own y = row.", "Select the intersection and read x, the first coordinate.", "Expand the graph window before concluding that the graphs never meet."],
    slides: [
      {
        id: "linear-equations-recognize", phase: "Understand", title: "An equation asks where two values agree",
        body: ["You need to solve 3x + 7 = 2x + 19. Each side changes when x changes. You are looking for the one input that makes the values match.", "Desmos can compare those sides without moving terms across the equals sign."],
        visual: { kind: "flow", items: [{ label: "Left side", math: "3x+7" }, { label: "Compare at the same x", text: "The outputs must match." }, { label: "Right side", math: "2x+19" }] },
        calculator: blank("Start with the original equation. We will graph one side at a time.", LINEAR_BOUNDS),
      },
      {
        id: "linear-equations-coordinate", phase: "Understand", title: "Why a crossing gives the answer",
        body: ["A point (x, y) on a graph records an input and its output. When two graphs cross, they have the same input and the same output.", "That shared input makes both sides of your equation equal. The shared output is useful for checking, but it is not the requested x."],
        visual: { kind: "comparison", items: [{ label: "First coordinate", math: "x", text: "The input you are solving for." }, { label: "Second coordinate", math: "y", text: "The value of both sides at that input." }] },
        calculator: blank("The answer will come from a point’s first coordinate.", LINEAR_BOUNDS),
      },
      {
        id: "linear-equations-left", phase: "Watch", title: "Graph the left side",
        body: ["Put y = before 3x + 7. Keep the 7 and its plus sign. The line now shows the left side’s value for every visible x.", "Select the row, then look at its line in the calculator."],
        entries: copies(LINEAR.slice(0, 1)), calculator: calculator(LINEAR.slice(0, 1), LINEAR_BOUNDS, "Only the left side is graphed so far."),
      },
      {
        id: "linear-equations-right", phase: "Watch", title: "Add the right side in a new row",
        body: ["Enter y = 2x + 19 below the first equation. Do not replace the first row: you need both graphs.", "Find the point where the two lines cross. Select a line, then select that point to keep its label visible."],
        entries: copies(LINEAR.slice(1)), calculator: calculator(LINEAR, LINEAR_BOUNDS, "Both complete sides are visible. Select their intersection."),
      },
      {
        id: "linear-equations-read", phase: "Watch", title: "Use the first coordinate",
        body: ["The label is (12, 43). The first number tells you x = 12. The second says that both sides have value 43.", "Read the original question once more: it asks for x, so enter 12."],
        visual: { kind: "table", columns: ["At the crossing", "Meaning"], rows: [["x = 12", "The solution of the equation"], ["y = 43", "The shared value of its two sides"]] },
        calculator: calculator(LINEAR, LINEAR_BOUNDS, "Select the crossing to check the two coordinates yourself."),
      },
      {
        id: "linear-equations-choice", phase: "Check", title: "Which number solves the equation?",
        body: ["For a different equation, the two side graphs meet at (5, 18). The question asks for x."],
        check: { kind: "choice", correctId: "x", choices: [{ id: "x", text: "5", feedback: "Yes. The first coordinate is x." }, { id: "y", text: "18", feedback: "18 is the shared output. The question asks for the input x." }, { id: "sum", text: "23", feedback: "You do not add the coordinates unless the question asks for their sum." }], hint: "An ordered pair is written (x, y).", explanation: "The input is 5, so that is the solution of the original equation." },
        calculator: blank("This check is about reading a point, so no graph is needed."),
      },
      {
        id: "linear-equations-explore", phase: "Explore", title: "Move the second line",
        body: ["The right side now has a slider c in place of 19. Set c to 7, then to 25. Select the crossing after each change.", "The first line stays fixed. Changing one constant changes the equation and therefore the input where the sides agree."],
        note: "If a point moves outside the window, zoom out before deciding there is no solution.",
        calculator: calculator([["c=19", "Move the right-side constant.", { min: 1, max: 31, step: 1 }], ["y=3x+7", "Keep the left side fixed."], ["y=2x+c", "Watch the right side move."]], { left: -5, right: 25, bottom: -10, top: 80 }, "Try c = 7 and c = 25; compare the intersection’s x-coordinate."),
      },
      {
        id: "linear-equations-fresh-check", phase: "Try it", title: "Solve a new equation",
        body: ["If 4x − 3 = x + 9, what is x?", "Enter the two side graphs in the empty calculator, select the crossing, and submit the requested coordinate."],
        check: { kind: "number", answer: 4, hint: "Use y = 4x − 3 and y = x + 9 in separate rows.", explanation: "The intersection is (4, 13), so x = 4.", wrongFeedback: "Check both signs, then read the first coordinate of the crossing.", commonMistakes: [{ answer: 13, feedback: "13 is the shared y-value. The question asks for x." }, { answer: 2, feedback: "Check that the first row contains −3, not +3." }], solution: ["Graph y = 4x − 3.", "Graph y = x + 9 in another row.", "Select the intersection (4, 13).", "Read the first coordinate: x = 4."] },
        calculator: blank("Your turn: enter both equations. No solution entries are loaded.", { left: -2, right: 8, bottom: -5, top: 25 }),
      },
      {
        id: "linear-equations-window-check", phase: "Check", title: "What if you cannot see a crossing?",
        body: ["You entered both sides, but they do not meet inside the current window. What should you do before deciding there is no solution?"],
        check: { kind: "choice", correctId: "window", choices: [{ id: "none", text: "Submit “no solution” immediately", feedback: "The crossing might be outside the visible part of the graph." }, { id: "window", text: "Check the entries and zoom out", feedback: "Yes. First rule out a copied sign or a hidden crossing." }, { id: "zero", text: "Use x = 0", feedback: "Zero is a solution only if both sides agree at zero." }], hint: "The graph window shows only part of each line.", explanation: "A viewing window is not a restriction in the question. Check the full entries and a wider view." },
        calculator: blank("You can change the window without changing the equation."),
      },
    ],
  },
  "linear-functions": {
    prerequisite: "Know that f(3) = 15 pairs the input 3 with the output 15.",
    summary: ["Keep input and output lists in matching order.", "Use y₁ ~ mx₁ + b to fit an exact linear relationship.", "Read m for slope, b for the output at zero, or define f(x) to evaluate another input."],
    slides: [
      {
        id: "linear-functions-recognize", phase: "Understand", title: "Use a line fit when the question gives points",
        body: ["A question says f is linear and gives f(1) = 7, f(3) = 15, and f(5) = 23. It asks for the slope m.", "You do not need to calculate a slope formula. Give Desmos the paired values and ask it to fit a line."],
        visual: { kind: "table", columns: ["Input x", "Output f(x)"], rows: [["1", "7"], ["3", "15"], ["5", "23"]], caption: "Each row is one input-output pair." },
        calculator: blank("We will enter these pairs in two matching lists.", LINE_FIT_BOUNDS),
      },
      {
        id: "linear-functions-model", phase: "Understand", title: "Know which fitted number you need",
        body: ["The linear model is f(x) = mx + b. The letter m tells you how much the output changes when x increases by 1.", "The letter b is the output at x = 0. These are different quantities, even though the same regression finds both."],
        visual: { kind: "comparison", items: [{ label: "Slope", math: "m", text: "Change in output for one more input unit." }, { label: "Starting value", math: "b", text: "Output when the input is zero." }] },
        calculator: blank("The question asks for m. Keep that target in mind.", LINE_FIT_BOUNDS),
      },
      {
        id: "linear-functions-pairs", phase: "Watch", title: "Enter the two lists",
        body: ["Put 1, 3, 5 in x₁ and 7, 15, 23 in y₁. The first entries belong together, then the second entries, then the third.", "The small 1 names the list; it is not an exponent. You can type x_1 and y_1 in Desmos."],
        entries: copies(LINE_FIT.slice(0, 2)), calculator: calculator(LINE_FIT.slice(0, 2), LINE_FIT_BOUNDS, "Check that the two lists have the same length and matching order."),
      },
      {
        id: "linear-functions-fit", phase: "Watch", title: "Ask Desmos to find m and b",
        body: ["Enter y₁ ~ mx₁ + b. The tilde means “fit this model to these data.” An equals sign does not make this request.", "Desmos reports m = 4 and b = 3 beneath the regression. Do not create sliders for m and b; the fit supplies them."],
        entries: copies(LINE_FIT.slice(2)), calculator: calculator(LINE_FIT, LINE_FIT_BOUNDS, "Read the fitted parameters below the regression row."),
      },
      {
        id: "linear-functions-read", phase: "Watch", title: "Read the requested parameter",
        body: ["The problem asks for slope, so read m = 4. The output goes up by 4 for each increase of 1 in the input.", "The table steps by 2 in x, which is why its outputs go up by 8. That does not make the slope 8."],
        visual: { kind: "table", columns: ["Change in input", "Change in output"], rows: [["1", "4"], ["2", "8"]] },
        calculator: calculator([...LINE_FIT, ["f(x)=mx+b", "Graph the fitted line using its parameters."]], LINE_FIT_BOUNDS, "The same fitted letters now draw the line."),
      },
      {
        id: "linear-functions-order-check", phase: "Check", title: "Keep each pair together",
        body: ["Which lists represent f(2) = 9 and f(6) = 21?"],
        check: { kind: "choice", correctId: "paired", choices: [{ id: "reversed", text: "x₁ = [2, 6], y₁ = [21, 9]", feedback: "This pairs input 2 with output 21. Only reversing one list changes the data." }, { id: "paired", text: "x₁ = [2, 6], y₁ = [9, 21]", feedback: "Yes. Each position contains a matching input and output." }, { id: "mixed", text: "x₁ = [2, 9], y₁ = [6, 21]", feedback: "9 is an output, so it belongs in y₁ rather than the input list." }], hint: "Read vertically: the first input goes with the first output.", explanation: "Matching positions preserve the original function values." },
        calculator: blank("Read the pairings before entering any data."),
      },
      {
        id: "linear-functions-evaluate", phase: "Explore", title: "Use the fitted function at a new input",
        body: ["The fitted m and b are available in later rows. Define f(x) = mx + b, then evaluate f(10). Desmos returns 43.", "Change the last row to f(0). Compare that output with b. Use x in the function definition; x₁ is the whole input list."],
        entries: copies([["f(x)=mx+b", "Define the function with the fitted letters."], ["f(10)", "Evaluate the function at input 10."]]),
        calculator: calculator([...LINE_FIT, ["f(x)=mx+b", "Define the fitted function."], ["f(10)", "Edit the input to evaluate another value."]], LINE_FIT_BOUNDS, "Change only the final input from 10 to 0 and read the new result."),
      },
      {
        id: "linear-functions-fresh-check", phase: "Try it", title: "Fit and evaluate a different line",
        body: ["A linear function has f(2) = 11, f(4) = 17, and f(6) = 23. What is f(8)?", "Start with the paired lists. Fit the line, define f, and evaluate the requested input."],
        visual: { kind: "table", columns: ["x", "f(x)"], rows: [["2", "11"], ["4", "17"], ["6", "23"]] },
        check: { kind: "number", answer: 29, hint: "Fit y₁ ~ mx₁ + b, then enter f(x) = mx + b and f(8).", explanation: "The fit gives m = 3 and b = 5. The function row returns f(8) = 29.", wrongFeedback: "Check the input-output order and evaluate f(8), rather than submitting a fitted coefficient.", commonMistakes: [{ answer: 3, feedback: "3 is the slope m. This question asks for the function’s output at 8." }, { answer: 5, feedback: "5 is b, the output at zero. Evaluate f(8) in another row." }, { answer: 23, feedback: "23 is the given output at 6. The question asks for the next input, 8." }], solution: ["Enter x₁ = [2, 4, 6] and y₁ = [11, 17, 23].", "Fit y₁ ~ mx₁ + b to obtain m = 3 and b = 5.", "Define f(x) = mx + b.", "Enter f(8) and read 29."] },
        calculator: blank("Build this fit yourself; the new model is not loaded.", { left: -1, right: 10, bottom: -2, top: 35 }),
      },
      {
        id: "linear-functions-target-check", phase: "Check", title: "Which value is the starting value?",
        body: ["Another linear fit reports m = 5 and b = 12. The question asks for f(0)."],
        check: { kind: "choice", correctId: "intercept", choices: [{ id: "input", text: "0", feedback: "Zero is the input. The question asks for the output at that input." }, { id: "slope", text: "5", feedback: "5 is the slope, which describes a change rather than the starting output." }, { id: "intercept", text: "12", feedback: "Yes. b is the output when x is zero." }], hint: "You can also define f(x) = 5x + 12 and evaluate f(0).", explanation: "f(0) is the y-intercept b, so it equals 12." },
        calculator: blank("Use the meaning of b, or test the supplied line yourself."),
      },
    ],
  },
  "systems-of-equations": {
    prerequisite: "Recognize x and y as the first and second coordinates of a point.",
    summary: ["Enter both complete equations in separate rows.", "Their intersection satisfies both equations at once.", "Read the coordinate or sum the question requests; distinct parallel lines and overlapping lines are different cases."],
    slides: [
      {
        id: "systems-recognize", phase: "Understand", title: "A system needs one point on both graphs",
        body: ["You are given y = 2x + 1 and y = −x + 10. A solution must make both statements true at the same time.", "A point on just one graph is not enough. Look for a shared point."],
        visual: { kind: "flow", items: [{ label: "First equation", math: "y=2x+1" }, { label: "Shared point", text: "The same x and y must work in both." }, { label: "Second equation", math: "y=-x+10" }] },
        calculator: blank("Both equations will be entered as written.", SYSTEM_BOUNDS),
      },
      {
        id: "systems-direct", phase: "Understand", title: "You do not have to isolate y first",
        body: ["Desmos can graph equations such as 2x + y = 13 directly. Moving y or changing signs is unnecessary.", "Keep each equation intact in its own row. If you rearrange it anyway, a sign error can move the line and change the intersection."],
        visual: { kind: "comparison", items: [{ label: "Already written as y = …", math: "y=2x+1", text: "Copy the complete equation." }, { label: "Another valid format", math: "2x+y=13", text: "This can also be graphed directly." }] },
        calculator: blank("A complete equation is enough for Desmos to draw its graph."),
      },
      {
        id: "systems-first", phase: "Watch", title: "Enter the first equation",
        body: ["Graph y = 2x + 1. Every point on this line satisfies the first equation.", "That leaves many possible points. The second equation will narrow the choice."],
        entries: copies(SYSTEM.slice(0, 1)), calculator: calculator(SYSTEM.slice(0, 1), SYSTEM_BOUNDS, "This line satisfies only the first condition."),
      },
      {
        id: "systems-second", phase: "Watch", title: "Add the second condition",
        body: ["Graph y = −x + 10 in a new row. Keep the minus sign before x.", "Select the crossing. You should see the point (3, 7). It belongs to both lines."],
        entries: copies(SYSTEM.slice(1)), calculator: calculator(SYSTEM, SYSTEM_BOUNDS, "Select the common point of the two graphs."),
      },
      {
        id: "systems-read", phase: "Watch", title: "Match the requested quantity",
        body: ["At (3, 7), x is 3 and y is 7. Our example asks for x, so the answer is 3.", "If a question asked for x + y instead, enter 3 + 7 in another row. Do not assume every system asks for the first coordinate."],
        visual: { kind: "table", columns: ["Question asks for", "Use"], rows: [["x", "First coordinate"], ["y", "Second coordinate"], ["x + y", "Add the two coordinates"]] },
        calculator: calculator(SYSTEM, SYSTEM_BOUNDS, "Read the point before choosing which value to submit."),
      },
      {
        id: "systems-coordinate-check", phase: "Check", title: "Read y from an intersection",
        body: ["Two graphs meet at (−2, 5). What is y?"],
        check: { kind: "choice", correctId: "second", choices: [{ id: "first", text: "−2", feedback: "−2 is the first coordinate, x." }, { id: "sum", text: "3", feedback: "3 is the sum of the coordinates. This question asks for y alone." }, { id: "second", text: "5", feedback: "Yes. y is the second coordinate." }], hint: "The order is (x, y).", explanation: "The point tells you x = −2 and y = 5." },
        calculator: blank("No graph is needed to read the supplied coordinate label."),
      },
      {
        id: "systems-explore", phase: "Explore", title: "Compare no crossing with complete overlap",
        body: ["The first line is y = 2x + 1. With m = 2 and b = 5, the second line is parallel and separate: no point is shared.", "Change b to 1. The lines now overlap, so every point on that line is shared. Finally change m to −1 and b to 10 to recover one intersection."],
        calculator: calculator([["m=2", "Set the second line’s slope.", { min: -4, max: 4, step: 1 }], ["b=5", "Set the second line’s intercept.", { min: -5, max: 10, step: 1 }], ["y=2x+1", "Keep the first line fixed."], ["y=mx+b", "Compare the moving line with the fixed line."]], { left: -5, right: 10, bottom: -5, top: 15 }, "Try (m, b) = (2, 5), then (2, 1), then (−1, 10)."),
      },
      {
        id: "systems-of-equations-fresh-check", phase: "Try it", title: "Solve this system for y",
        body: ["The system is 2x + y = 13 and x − y = 2. What is y?", "Copy both equations exactly into the empty calculator. Read the requested coordinate at their intersection."],
        check: { kind: "number", answer: 3, hint: "You can enter 2x + y = 13 directly; it does not need to start with y =.", explanation: "The shared point is (5, 3). The second coordinate gives y = 3.", wrongFeedback: "Check that the second equation has −y, then read y rather than x.", commonMistakes: [{ answer: 5, feedback: "5 is the x-coordinate. The requested y is the second coordinate." }, { answer: 8, feedback: "8 is x + y. This question asks for y alone." }], solution: ["Enter 2x + y = 13 in one row.", "Enter x − y = 2 in another row.", "Select the intersection (5, 3).", "Read y = 3."] },
        calculator: blank("Enter the two equations and find their common point.", { left: -2, right: 10, bottom: -3, top: 15 }),
      },
      {
        id: "systems-parallel-check", phase: "Check", title: "Do equal slopes guarantee the same line?",
        body: ["Consider y = 3x + 1 and y = 3x + 6. Which statement is true?"],
        check: { kind: "choice", correctId: "parallel", choices: [{ id: "overlap", text: "They overlap because the slopes match.", feedback: "Matching slopes are not enough. These lines have different y-intercepts." }, { id: "parallel", text: "They are separate parallel lines with no common point.", feedback: "Yes. The slopes match, but the intercepts keep them apart." }, { id: "one", text: "They must meet exactly once.", feedback: "Distinct lines with the same slope do not meet." }], hint: "Compare both the coefficient of x and the constant.", explanation: "The shared slope makes the lines parallel. Their different intercepts mean they do not overlap." },
        calculator: blank("You may graph the two equations to check your reasoning."),
      },
    ],
  },
  quadratics: {
    prerequisite: "Know that a graph point is written (input, output).",
    summary: ["For a maximum or minimum output, inspect the vertex rather than an intercept.", "The y-coordinate is the extreme value; x tells you where it occurs.", "If the question restricts x, compare only the permitted part of the graph."],
    slides: [
      {
        id: "quadratics-recognize", phase: "Understand", title: "Find the greatest output without rewriting",
        body: ["The function is f(x) = −x² + 8x + 9. The question asks for its maximum value.", "Its graph is a parabola. We will use the highest point instead of rewriting the expression into another form."],
        calculator: blank("Start from the exact quadratic in the question.", QUADRATIC_BOUNDS),
      },
      {
        id: "quadratics-point-choice", phase: "Understand", title: "A vertex answers a different question from a zero",
        body: ["A vertex is the turning point. A downward-opening parabola has its highest output there; an upward-opening parabola has its lowest.", "An x-intercept answers “where is the output zero?” That is not the same as a maximum or minimum."],
        visual: { kind: "comparison", items: [{ label: "Maximum or minimum value", text: "Read the vertex’s y-coordinate." }, { label: "A zero or solution when f(x) = 0", text: "Read an x-intercept’s x-coordinate." }] },
        calculator: blank("Choose the kind of point from the wording of the question."),
      },
      {
        id: "quadratics-graph", phase: "Watch", title: "Graph the quadratic as written",
        body: ["Enter y = −x² + 8x + 9. The minus sign before x² makes this parabola open downward.", "You are looking for the top of the curve, not either place where it reaches the x-axis."],
        entries: copies(QUADRATIC), calculator: calculator(QUADRATIC, QUADRATIC_BOUNDS, "The whole turning point is visible in this window."),
      },
      {
        id: "quadratics-vertex", phase: "Watch", title: "Select the turning point",
        body: ["Select the curve or its expression row, then select the marked point at the top. Desmos labels it (4, 25).", "This says the largest output happens at input 4. The output itself is 25."],
        calculator: calculator(QUADRATIC, QUADRATIC_BOUNDS, "Select the vertex and keep its coordinate label visible."),
      },
      {
        id: "quadratics-read", phase: "Watch", title: "Separate “how much” from “when”",
        body: ["If this output represented height, the greatest height would be 25. The input 4 would tell you when that height occurred.", "Our question asks for the maximum value, so submit 25. You can add the point (4, 25) to confirm its position on the curve."],
        entries: copies([["(4,25)", "Mark the vertex you read from the graph."]]),
        calculator: calculator([...QUADRATIC, ["(4,25)", "Mark the read vertex."]], QUADRATIC_BOUNDS, "The first coordinate locates the maximum; the second is the maximum."),
      },
      {
        id: "quadratics-coordinate-check", phase: "Check", title: "Read a maximum value",
        body: ["A downward-opening parabola has vertex (6, 17). What is its maximum value?"],
        check: { kind: "choice", correctId: "value", choices: [{ id: "input", text: "6", feedback: "6 tells you where the maximum occurs. It is not the maximum output." }, { id: "value", text: "17", feedback: "Yes. The maximum is the vertex’s y-coordinate." }, { id: "zero", text: "0", feedback: "Zero is the output at an x-intercept, not at this vertex." }], hint: "A function value is an output, so look at y.", explanation: "The highest point has output 17." },
        calculator: blank("Use the supplied vertex label to distinguish input from output."),
      },
      {
        id: "quadratics-restrict", phase: "Explore", title: "What if the vertex is not allowed?",
        body: ["Now allow only 0 ≤ x ≤ 3 in the worked example. The restriction hides the rest of the curve, including the vertex at x = 4.", "Select the endpoint (3, 24). On this allowed interval, 24 is the maximum. Remove the restriction and compare it with the unrestricted curve."],
        entries: copies([["y=-x^2+8x+9\\{0\\le x\\le3\\}", "Keep only the permitted inputs."]]),
        calculator: calculator([["y=-x^2+8x+9\\{0\\le x\\le3\\}", "Restrict the quadratic to the allowed interval."], ["(0,9)", "Mark the left endpoint."], ["(3,24)", "Mark the right endpoint."]], QUADRATIC_BOUNDS, "Only the restricted segment counts for this version of the question."),
      },
      {
        id: "quadratics-fresh-check", phase: "Try it", title: "Find another maximum",
        body: ["For all real x, f(x) = −2x² + 12x + 1. What is the maximum value of f?", "Enter the quadratic, select its vertex, and submit the output coordinate."],
        check: { kind: "number", answer: 19, hint: "Graph y = −2x² + 12x + 1. Find its highest point.", explanation: "The vertex is (3, 19), so the maximum output is 19.", wrongFeedback: "Check the negative coefficient of x² and read the vertex’s y-coordinate.", commonMistakes: [{ answer: 3, feedback: "3 is the input where the maximum occurs. The question asks for the maximum value." }, { answer: 1, feedback: "1 is the output at x = 0. The vertex is higher than the y-intercept." }], solution: ["Graph y = −2x² + 12x + 1.", "Select the top of the parabola.", "Read the vertex (3, 19).", "Submit its output, 19."] },
        calculator: blank("The fresh quadratic is not loaded. Enter it yourself.", { left: -2, right: 8, bottom: -5, top: 25 }),
      },
      {
        id: "quadratics-domain-check", phase: "Check", title: "Respect the allowed inputs",
        body: ["A graph’s vertex is at x = 7, but a question allows only 0 ≤ x ≤ 5. Can you automatically use that vertex for the requested maximum?"],
        check: { kind: "choice", correctId: "restrict", choices: [{ id: "always", text: "Yes, the vertex always gives the answer.", feedback: "The vertex’s input is outside this question’s allowed interval." }, { id: "restrict", text: "No. Restrict the graph and compare the allowed points.", feedback: "Yes. The answer must come from the permitted interval, often an endpoint." }, { id: "none", text: "No maximum exists.", feedback: "A restricted graph can still have a maximum at an endpoint." }], hint: "The input at the answer must satisfy the question’s restriction.", explanation: "A graph point outside the allowed domain cannot answer the restricted question." },
        calculator: blank("The domain is part of the problem, not just a viewing preference."),
      },
    ],
  },
  polynomials: {
    prerequisite: "Know that y = 0 is the horizontal x-axis.",
    summary: ["Graph the polynomial as y = … to solve when its output equals zero.", "Each x-intercept is a real root; read its x-coordinate.", "A graph can touch the axis without crossing it and still have a root."],
    slides: [
      {
        id: "polynomials-recognize", phase: "Understand", title: "Use intercepts when a polynomial equals zero",
        body: ["Find the greatest real solution of x³ − 2x² − 5x + 6 = 0. The question asks which input makes the polynomial’s output zero.", "Graph the left side as y. Its points on the x-axis show those inputs without needing to factor the expression first."],
        visual: { kind: "flow", items: [{ label: "Equation", math: "x^3-2x^2-5x+6=0" }, { label: "Graph the output", math: "y=x^3-2x^2-5x+6" }, { label: "Read roots", text: "Find the points where y is zero." }] },
        calculator: blank("We will find all visible roots before choosing the greatest one.", POLYNOMIAL_BOUNDS),
      },
      {
        id: "polynomials-root-meaning", phase: "Understand", title: "A root is an input, not the zero output",
        body: ["At an x-intercept, the point looks like (some input, 0). The zero is the output that the equation requires.", "The input is the solution. “Greatest root” means the rightmost root on the x-axis, not the highest point of the curve."],
        visual: { kind: "comparison", items: [{ label: "Root", text: "An x-value that produces zero." }, { label: "Maximum", text: "A greatest y-value, if one exists. This is a different question." }] },
        calculator: blank("Pay attention to whether the question asks for an input or an output."),
      },
      {
        id: "polynomials-graph", phase: "Watch", title: "Copy every term and sign",
        body: ["Enter y = x³ − 2x² − 5x + 6. Keep both minus signs and the final +6.", "Select the curve to show its points of interest. Look along the horizontal axis."],
        entries: copies(POLYNOMIAL), calculator: calculator(POLYNOMIAL, POLYNOMIAL_BOUNDS, "Three x-intercepts are visible in this window."),
      },
      {
        id: "polynomials-intercepts", phase: "Watch", title: "Read each intercept",
        body: ["Select the intercepts from left to right. Their labels are (−2, 0), (1, 0), and (3, 0).", "Each point has output zero, so each first coordinate solves the equation."],
        visual: { kind: "table", columns: ["Point", "Root"], rows: [["(−2, 0)", "−2"], ["(1, 0)", "1"], ["(3, 0)", "3"]] },
        calculator: calculator(POLYNOMIAL, POLYNOMIAL_BOUNDS, "Select all three intercepts, not just the first one you notice."),
      },
      {
        id: "polynomials-select", phase: "Watch", title: "Choose the root the question requests",
        body: ["The greatest of −2, 1, and 3 is 3. It is the rightmost intercept.", "If the question asked for the least root, you would choose −2 instead. The graph is the same; the requested result changes."],
        entries: copies([["(3,0)", "Mark the greatest root you read."]]),
        calculator: calculator([...POLYNOMIAL, ["(3,0)", "Mark the rightmost intercept."]], POLYNOMIAL_BOUNDS, "The requested root is the first coordinate of the rightmost intercept."),
      },
      {
        id: "polynomials-root-check", phase: "Check", title: "Choose the greatest root from these points",
        body: ["A polynomial has x-intercepts (−4, 0), (2, 0), and (7, 0). What is its greatest real root?"],
        check: { kind: "choice", correctId: "right", choices: [{ id: "zero", text: "0", feedback: "Zero is the output at every x-intercept. The root is an input." }, { id: "left", text: "−4", feedback: "−4 is the least root, at the leftmost intercept." }, { id: "right", text: "7", feedback: "Yes. 7 is the largest of the three x-values." }], hint: "Read the first coordinate of the rightmost intercept.", explanation: "The roots are −4, 2, and 7; the greatest is 7." },
        calculator: blank("The intercept labels are supplied, so compare their x-values."),
      },
      {
        id: "polynomials-touch", phase: "Explore", title: "A root does not have to cross the axis",
        body: ["This graph crosses the x-axis at −1, but only touches it at 2 before turning upward again.", "Select the point (2, 0). Its output is still zero, so 2 is a root. Counting only crossings would miss it."],
        calculator: calculator([["y=(x-2)^2(x+1)", "Compare an axis crossing with an axis touch."]], { left: -3, right: 4, bottom: -10, top: 20 }, "Look closely at x = 2: touching the axis is enough to produce zero."),
      },
      {
        id: "polynomials-fresh-check", phase: "Try it", title: "Find the greatest root of another cubic",
        body: ["What is the greatest real solution of x³ − 4x² − 7x + 10 = 0?", "Graph the polynomial in the empty calculator and inspect its x-intercepts."],
        check: { kind: "number", answer: 5, hint: "Enter y = x³ − 4x² − 7x + 10. Select the rightmost x-intercept.", explanation: "The intercepts are (−2, 0), (1, 0), and (5, 0). The greatest root is 5.", wrongFeedback: "Read an x-intercept’s first coordinate, then choose the greatest of the roots.", commonMistakes: [{ answer: -2, feedback: "−2 is a root, but it is the least one." }, { answer: 1, feedback: "1 is the middle root. There is another intercept farther right." }, { answer: 0, feedback: "0 is the output at an intercept. Submit the requested input." }, { answer: 10, feedback: "10 is the constant term and y-intercept, not an x-intercept." }], solution: ["Graph y = x³ − 4x² − 7x + 10.", "Select its x-intercepts at −2, 1, and 5.", "Choose the rightmost intercept, (5, 0).", "Submit the root 5."] },
        calculator: blank("Enter the new polynomial yourself.", { left: -4, right: 7, bottom: -40, top: 30 }),
      },
      {
        id: "polynomials-touch-check", phase: "Check", title: "Does touching count?",
        body: ["A graph touches the x-axis at (4, 0) and turns around without crossing it. Is 4 a real root?"],
        check: { kind: "choice", correctId: "root", choices: [{ id: "root", text: "Yes, because the output is zero there.", feedback: "Correct. A root only requires output zero." }, { id: "cross", text: "No, it must cross from one side to the other.", feedback: "Crossing is not required. A touch can also have y = 0." }, { id: "output", text: "The root is 0, not 4.", feedback: "Zero is the output; 4 is the input that produces it." }], hint: "Use the definition of a root rather than the direction of the curve.", explanation: "Since the point (4, 0) lies on the graph, input 4 produces output zero." },
        calculator: blank("The definition of a root applies to both crossings and touches."),
      },
    ],
  },
  "exponents-and-radicals": {
    prerequisite: "Recognize a fraction and know how parentheses group a calculation.",
    summary: ["Put a fractional exponent entirely in the exponent position.", "Preserve the grouping of the original expression before evaluating.", "A square-root calculation returns the nonnegative root; an equation like x² = 25 asks a different question."],
    slides: [
      {
        id: "exponents-recognize", phase: "Understand", title: "When the expression is already given, enter it accurately",
        body: ["Evaluate 16^(3/2) divided by 8. There are no unknowns to solve for here; the task is to obtain the value of a supplied expression.", "Desmos can do this arithmetic directly. The main skill is keeping the exponent and the division in the right places."],
        visual: { kind: "flow", items: [{ label: "Power first", math: "16^{3/2}" }, { label: "Then divide", math: "\\frac{16^{3/2}}{8}" }] },
        calculator: blank("We will build the supplied expression without changing its grouping."),
      },
      {
        id: "exponents-grouping", phase: "Understand", title: "The whole fraction belongs in the exponent",
        body: ["In 16^(3/2), both 3 and 2 belong to the exponent. If you type with a keyboard, use parentheses around 3/2.", "Dividing 16³ by 2 is a different operation. The same numbers in different positions can give different results."],
        visual: { kind: "comparison", items: [{ label: "Original power", math: "16^{3/2}", text: "The exponent is three halves." }, { label: "Changed grouping", math: "\\frac{16^3}{2}", text: "This divides the cube by two instead." }] },
        calculator: blank("Check the displayed expression, not just the keys you pressed."),
      },
      {
        id: "exponents-power", phase: "Watch", title: "Enter the power",
        body: ["Enter 16^(3/2). Desmos displays the exponent as a fraction above the base and returns 64.", "Check that the 2 is still in the exponent. This intermediate result is not yet the answer to the full question."],
        entries: copies([["16^{3/2}", "Keep the whole fraction in the exponent."]]),
        calculator: calculator([["16^{3/2}", "Evaluate the power before the final division."]], null, "The power alone is 64; the question still includes division by 8."),
      },
      {
        id: "exponents-divide", phase: "Watch", title: "Finish the original calculation",
        body: ["Now enter the complete expression with the power above a denominator of 8. Desmos returns 8.", "A fraction bar makes the grouping easy to inspect: the entire power is the numerator."],
        entries: copies([["\\frac{16^{3/2}}{8}", "Divide the complete power by 8."]]),
        calculator: calculator([["16^{3/2}", "The power from the previous step."], ["\\frac{16^{3/2}}{8}", "Evaluate the complete expression."]], null, "Read the second row for the full question’s value."),
      },
      {
        id: "exponents-compare", phase: "Watch", title: "Check an entry that looks similar",
        body: ["The second expression below puts only 3 in the exponent and divides by both 2 and 8. It returns 256, not 8.", "If your answer seems surprising, compare the displayed grouping against the question before trying a different method."],
        calculator: calculator([["\\frac{16^{3/2}}{8}", "The original expression: fractional exponent, then divide by 8."], ["\\frac{16^3}{2(8)}", "A different expression, shown only to compare the grouping."]], null, "These rows intentionally represent different calculations."),
      },
      {
        id: "exponents-root-check", phase: "Check", title: "What does a one-half power mean?",
        body: ["For a positive number, a power of 1/2 gives its square root. What is 9^(1/2)?"],
        check: { kind: "choice", correctId: "root", choices: [{ id: "half", text: "4.5", feedback: "4.5 is 9 divided by 2. A one-half exponent is a root, not halving." }, { id: "root", text: "3", feedback: "Yes. 3 is the nonnegative number whose square is 9." }, { id: "square", text: "81", feedback: "81 is 9 squared. The exponent here is 1/2, not 2." }], hint: "You can enter 9^(1/2) in the calculator to check.", explanation: "The principal square root of 9 is 3." },
        calculator: blank("Type the supplied power if you want to check its meaning."),
      },
      {
        id: "exponents-explore", phase: "Explore", title: "Change the root using the denominator",
        body: ["The slider a is the denominator of the exponent in 16^(1/a). At a = 2, this is a square root. At a = 4, it is a fourth root.", "Try those two settings. Desmos returns 4 and 2 respectively: 4² and 2⁴ both equal 16."],
        calculator: calculator([["a=2", "Choose the denominator of the exponent.", { min: 1, max: 4, step: 1 }], ["16^{1/a}", "Evaluate the root selected by a."]], null, "Move a between 2 and 4 and compare the displayed value."),
      },
      {
        id: "exponents-and-radicals-fresh-check", phase: "Try it", title: "Evaluate a new fractional power",
        body: ["What is 81^(3/2) divided by 9?", "Use the empty calculator. Check the position of the whole exponent before submitting the final value."],
        check: { kind: "number", answer: 81, hint: "Enter (81^(3/2))/9. The entire 3/2 belongs in the exponent.", explanation: "The power evaluates to 729. Dividing that result by 9 gives 81.", wrongFeedback: "Check that the exponent is 3/2 and that the final division by 9 is outside the power.", commonMistakes: [{ answer: 729, feedback: "729 is the value of the power alone. The question also divides it by 9." }, { answer: 9, feedback: "9 is the square root of 81. The given exponent is 3/2, not just 1/2." }], solution: ["Enter the full numerator 81^(3/2).", "Place that power over the denominator 9.", "Read the value of the complete expression: 81."] },
        calculator: blank("No part of the new calculation is entered for you."),
      },
      {
        id: "exponents-principal-check", phase: "Check", title: "A root calculation and an equation are different tasks",
        body: ["Desmos returns 5 for sqrt(25). Which statement about the equation x² = 25 is correct?"],
        check: { kind: "choice", correctId: "both", choices: [{ id: "positive", text: "Its only solution is 5.", feedback: "−5 also squares to 25. The equation asks for every input that works." }, { id: "both", text: "It has solutions −5 and 5.", feedback: "Yes. Both inputs give 25 when squared." }, { id: "negative", text: "sqrt(25) should have returned −5.", feedback: "The square-root function returns the nonnegative root. Solving x² = 25 is a separate task." }], hint: "Square both candidate inputs to test them.", explanation: "The principal square root is 5, while the equation x² = 25 has two real solutions." },
        calculator: blank("You may test 5² and (−5)² in separate rows."),
      },
    ],
  },
  "nonlinear-functions": {
    prerequisite: "Read input-output pairs and recognize a number raised to a power.",
    summary: ["Use an exponential model when the question specifies f(x) = ab^x.", "Fit the data with y₁ ~ ab^(x₁), then define f(x) = ab^x.", "Evaluate the requested input instead of submitting one of the fitted parameters."],
    slides: [
      {
        id: "nonlinear-recognize", phase: "Understand", title: "Focus on an exponential function",
        body: ["This lesson covers one nonlinear pattern: f(x) = ab^x. Suppose f(0) = 3, f(1) = 6, and f(2) = 12. We want f(4).", "The question supplies the exponential form, so use that model. Do not fit a line merely because the data are in a table."],
        visual: { kind: "table", columns: ["x", "f(x)"], rows: [["0", "3"], ["1", "6"], ["2", "12"]] },
        calculator: blank("We will fit the stated exponential model to these pairs.", EXPONENTIAL_BOUNDS),
      },
      {
        id: "nonlinear-multiplier", phase: "Understand", title: "An exponential change multiplies",
        body: ["For equal steps in x, these outputs multiply by 2: 3 becomes 6, then 6 becomes 12. Their added differences are not constant.", "In ab^x, a is the value at x = 0 and b is the multiplier for a one-unit increase in x. For this positive-growth example, both are positive."],
        visual: { kind: "comparison", items: [{ label: "Linear change", text: "Adds the same amount for each equal input step." }, { label: "Exponential change", text: "Multiplies by the same factor for each equal input step." }] },
        calculator: blank("Use the model named by the question; a pattern in a short table alone need not identify every possible function."),
      },
      {
        id: "nonlinear-lists", phase: "Watch", title: "Store the given pairs",
        body: ["Enter inputs 0, 1, 2 in x₁ and outputs 3, 6, 12 in y₁. Each position must keep its original pair.", "These are the only values you need to supply. The fit will find the missing parameters."],
        entries: copies(EXPONENTIAL.slice(0, 2)), calculator: calculator(EXPONENTIAL.slice(0, 2), EXPONENTIAL_BOUNDS, "The matching lists contain the original data only."),
      },
      {
        id: "nonlinear-fit", phase: "Watch", title: "Fit the exponential model",
        body: ["Enter y₁ ~ ab^(x₁). The input list belongs in the exponent. Desmos reports a = 3 and b = 2.", "Use a tilde to fit unknown parameters. You do not need to create sliders for a and b."],
        entries: copies(EXPONENTIAL.slice(2)), calculator: calculator(EXPONENTIAL, EXPONENTIAL_BOUNDS, "Read a and b from the regression result."),
      },
      {
        id: "nonlinear-evaluate", phase: "Watch", title: "Define f and ask for the requested output",
        body: ["Add f(x) = ab^x using the fitted letters. Then enter f(4). The result is 48.", "Use ordinary x in the function definition. Using x₁ there would reuse the entire original input list instead."],
        entries: copies([["f(x)=ab^x", "Define the function with the fitted parameters."], ["f(4)", "Evaluate the requested input."]]),
        calculator: calculator([...EXPONENTIAL, ["f(x)=ab^x", "Graph the fitted exponential function."], ["f(4)", "Read the requested output."]], EXPONENTIAL_BOUNDS, "The final row answers f(4); a and b alone do not."),
      },
      {
        id: "nonlinear-model-check", phase: "Check", title: "Put the input in the correct place",
        body: ["The stated model is f(x) = ab^x. Which row asks Desmos to fit this model to x₁ and y₁?"],
        check: { kind: "choice", correctId: "exponential", choices: [{ id: "linear", text: "y₁ ~ ax₁ + b", feedback: "That fits a line. It does not match the given exponential model." }, { id: "exponential", text: "y₁ ~ ab^(x₁)", feedback: "Yes. The input list is in the exponent." }, { id: "multiply", text: "y₁ ~ abx₁", feedback: "That multiplies by the input instead of raising b to the input power." }], hint: "In the original model, x appears as an exponent.", explanation: "Replace x with the input list in the same position: y₁ ~ ab^(x₁)." },
        calculator: blank("Compare the location of x in the given model and each candidate."),
      },
      {
        id: "nonlinear-explore", phase: "Explore", title: "Change the growth multiplier",
        body: ["Here a is fixed at 3 and b is an editable slider. Try b = 2, then b = 1, then b = 0.5. Keep the starting value unchanged.", "For positive a, b above 1 gives growth, b equal to 1 gives a constant value, and b between 0 and 1 gives decay. Read f(4) after each change."],
        calculator: calculator([["a=3", "Keep the positive starting value fixed."], ["b=2", "Change the positive multiplier.", { min: 0.25, max: 2.5, step: 0.25 }], ["f(x)=ab^x", "Observe the function for this multiplier."], ["f(4)", "Compare the output at the same input."]], EXPONENTIAL_BOUNDS, "Change only b to compare growth, constant output, and decay."),
      },
      {
        id: "nonlinear-functions-fresh-check", phase: "Try it", title: "Fit a different exponential function",
        body: ["An exponential function f(x) = ab^x has f(0) = 2, f(1) = 6, and f(2) = 18. What is f(3)?", "Build the paired lists, fit the model, then evaluate the new input."],
        visual: { kind: "table", columns: ["x", "f(x)"], rows: [["0", "2"], ["1", "6"], ["2", "18"]] },
        check: { kind: "number", answer: 54, hint: "After fitting y₁ ~ ab^(x₁), define f(x) = ab^x and enter f(3).", explanation: "The fit gives a = 2 and b = 3. Evaluating f(3) gives 54.", wrongFeedback: "Keep the input in the exponent and evaluate f(3) after fitting the parameters.", commonMistakes: [{ answer: 3, feedback: "3 is the fitted multiplier b, not the requested function output." }, { answer: 18, feedback: "18 is the given output at input 2. The question asks for input 3." }, { answer: 30, feedback: "30 continues by adding the last difference. This model grows by a constant multiplier instead." }], solution: ["Enter x₁ = [0, 1, 2] and y₁ = [2, 6, 18].", "Fit y₁ ~ ab^(x₁).", "Define f(x) = ab^x using the fitted letters.", "Enter f(3) and read 54."] },
        calculator: blank("Create the new exponential fit yourself.", { left: -1, right: 4, bottom: -2, top: 65 }),
      },
      {
        id: "nonlinear-target-check", phase: "Check", title: "Which row answers f(6)?",
        body: ["You have already fitted a and b. The question asks for f(6). Which next step gives that quantity?"],
        check: { kind: "choice", correctId: "evaluate", choices: [{ id: "parameter", text: "Read b and submit it.", feedback: "b is the multiplier. It is not the output at input 6." }, { id: "multiply", text: "Multiply b by 6.", feedback: "The input belongs in an exponent, not a simple product." }, { id: "evaluate", text: "Define f(x) = ab^x and evaluate f(6).", feedback: "Yes. This uses the fitted model at the requested input." }], hint: "A function-value question needs an evaluation row after the fit.", explanation: "The fitted parameters define the model; f(6) then returns the requested output." },
        calculator: blank("Match the final calculation to the quantity the question requests."),
      },
    ],
  },
  "ratios-and-percentages": {
    prerequisite: "Know that percent means “out of 100.”",
    summary: ["Identify the original amount and the percentage change.", "For a decrease, multiply by 1 minus the percent divided by 100; for an increase, use plus.", "Distinguish the change amount from the final amount."],
    slides: [
      {
        id: "percentages-recognize", phase: "Understand", title: "Find the final price after one discount",
        body: ["An item costs $80 before a 25% discount. The question asks for its sale price, before tax.", "There are two possible amounts: how much is removed, and how much remains. Read which one the question requests before typing."],
        visual: { kind: "flow", items: [{ label: "Original price", text: "$80 is the starting amount." }, { label: "Discount", text: "25 out of every 100 is removed." }, { label: "Requested amount", text: "The price after the discount." }] },
        calculator: blank("We will calculate the amount left after the discount."),
      },
      {
        id: "percentages-kept", phase: "Understand", title: "A discount leaves part of the original",
        body: ["The whole original price is 100%. Removing 25% leaves 75%. Written as a multiplier, that is 1 − 25/100.", "This small translation is the only setup. Desmos can evaluate the fraction, subtraction, and multiplication together."],
        visual: { kind: "comparison", items: [{ label: "Part removed", math: "\\frac{25}{100}", text: "Use this to calculate the discount amount." }, { label: "Part kept", math: "1-\\frac{25}{100}", text: "Use this to calculate the sale price." }] },
        calculator: blank("The requested final price uses the part kept."),
      },
      {
        id: "percentages-factor", phase: "Watch", title: "Enter the fraction that remains",
        body: ["Enter 1 − 25/100. Desmos returns 0.75, meaning 75% of the original price remains.", "This is a multiplier, not a price. It still needs to be applied to the original $80."],
        entries: copies([["1-25/100", "Calculate the fraction of the original price kept."]]),
        calculator: calculator([["1-25/100", "Read the remaining fraction."]], null, "0.75 is the part kept, not the dollar answer."),
      },
      {
        id: "percentages-apply", phase: "Watch", title: "Apply it to the original price",
        body: ["Enter 80(1 − 25/100). The parentheses keep the entire remaining fraction together.", "Desmos returns 60, so the sale price is $60 before tax."],
        entries: copies([["80(1-25/100)", "Multiply the original price by the part kept."]]),
        calculator: calculator([["1-25/100", "The remaining fraction."], ["80(1-25/100)", "Evaluate the sale price."]], null, "The second row is the final dollar amount."),
      },
      {
        id: "percentages-distinguish", phase: "Watch", title: "Compare the discount with the sale price",
        body: ["The discount itself is 80(25/100), which gives $20. The sale price is $60. Both numbers are meaningful, but only one answers our question.", "You can check the amounts: the part removed and the part kept add back to the original $80."],
        entries: copies([["80(25/100)", "Compare the amount removed."]]),
        calculator: calculator([["80(1-25/100)", "Sale price: the amount kept."], ["80(25/100)", "Discount: the amount removed."]], null, "Compare the two readouts and reread what the question asks for."),
      },
      {
        id: "percentages-target-check", phase: "Check", title: "Choose the expression for the sale price",
        body: ["A $50 item is discounted by 10%. Which expression gives its price after the discount?"],
        check: { kind: "choice", correctId: "kept", choices: [{ id: "removed", text: "50(10/100)", feedback: "This gives the discount amount, not the price left to pay." }, { id: "kept", text: "50(1 − 10/100)", feedback: "Yes. It applies the remaining 90% to the original price." }, { id: "dollars", text: "50 − 10", feedback: "10% is not the same as $10. The discount depends on the original price." }], hint: "The final price uses the fraction kept, not the fraction removed.", explanation: "A 10% discount leaves 1 − 10/100 of the starting price." },
        calculator: blank("Choose the setup before evaluating it."),
      },
      {
        id: "percentages-explore", phase: "Explore", title: "Use plus for an increase",
        body: ["The slider p changes a percent. One expression applies a decrease to 80; the other applies an increase.", "Try p = 10, then p = 25. Both use the same original amount. A plus sign keeps the original whole and adds the stated fraction."],
        calculator: calculator([["p=10", "Choose the percent change.", { min: 0, max: 50, step: 5 }], ["80(1-p/100)", "Price after a percentage decrease."], ["80(1+p/100)", "Amount after a percentage increase."]], null, "Compare how the plus and minus signs change the result."),
      },
      {
        id: "ratios-and-percentages-fresh-check", phase: "Try it", title: "Calculate another sale price",
        body: ["An item originally costs $120. It is discounted by 15%. What is the sale price before tax?", "Enter the setup in the empty calculator. Submit the final price in dollars."],
        check: { kind: "number", answer: 102, unit: "dollars", hint: "Multiply 120 by the remaining fraction 1 − 15/100.", explanation: "120(1 − 15/100) = 102, so the sale price is $102.", wrongFeedback: "Use the original $120 and calculate the amount remaining after the percentage discount.", commonMistakes: [{ answer: 18, feedback: "$18 is the discount amount. Subtract it from the original price to find what remains." }, { answer: 105, feedback: "That subtracts $15. The given reduction is 15% of $120, not $15." }, { answer: 138, feedback: "138 comes from a 15% increase. A discount uses a minus sign." }], solution: ["Identify 120 as the original amount and 15 as the percent removed.", "Enter 120(1 − 15/100).", "Read the final price, $102."] },
        calculator: blank("Build the percentage calculation yourself."),
      },
      {
        id: "percentages-increase-check", phase: "Check", title: "What does a 20% increase keep?",
        body: ["A quantity increases by 20%. Which multiplier gives the new amount from the original amount?"],
        check: { kind: "choice", correctId: "increase", choices: [{ id: "part", text: "0.20", feedback: "0.20 gives only the added part. It leaves out the original whole." }, { id: "decrease", text: "0.80", feedback: "0.80 represents a 20% decrease." }, { id: "increase", text: "1.20", feedback: "Yes. Keep the original 100% and add another 20%." }], hint: "An increase includes the starting amount plus the additional fraction.", explanation: "1 + 20/100 = 1.20. Multiply the original amount by that factor." },
        calculator: blank("Think about the original whole as well as the extra part."),
      },
    ],
  },
  "statistics-and-data-analysis": {
    prerequisite: "Read a list of data values. Repeated observations count separately.",
    summary: ["Enter every observation in a list, keeping repeated values.", "Use median(L) for the middle of sorted data and mean(L) for the average.", "With an even number of observations, the median averages the two middle values."],
    slides: [
      {
        id: "statistics-recognize", phase: "Understand", title: "Let the requested statistic choose the command",
        body: ["The data are 4, 7, 8, 9, and 22. The question asks for the median.", "Desmos has separate commands for mean and median. Using the wrong one can produce a reasonable-looking number that answers a different question."],
        visual: { kind: "comparison", items: [{ label: "Median", text: "The middle after the observations are ordered." }, { label: "Mean", text: "The sum divided by the number of observations." }] },
        calculator: blank("This example asks for the median, so we will use median()."),
      },
      {
        id: "statistics-middle", phase: "Understand", title: "See what the median is locating",
        body: ["These five values are already ordered. The third observation has two values before it and two after it, so it is the middle.", "Desmos can find that middle even if you enter the data in a different order. Do not delete repeated values: each is an observation."],
        visual: { kind: "table", columns: ["Position", "Value"], rows: [["1", "4"], ["2", "7"], ["3 (middle)", "8"], ["4", "9"], ["5", "22"]] },
        calculator: blank("The command will locate the middle for you; the table explains its meaning."),
      },
      {
        id: "statistics-list", phase: "Watch", title: "Store the observations in a list",
        body: ["Enter L = [4, 7, 8, 9, 22]. Square brackets tell Desmos that these are separate entries in one list.", "Check that all five original observations appear. The list name L will let the next row refer to the whole data set."],
        entries: copies(DATA), calculator: calculator(DATA, null, "The list holds every original observation."),
      },
      {
        id: "statistics-median", phase: "Watch", title: "Ask for the median",
        body: ["Enter median(L). Desmos returns 8, matching the middle observation in the ordered data.", "You can type median on a keyboard; Desmos turns it into the function name automatically."],
        entries: copies([["\\operatorname{median}(L)", "Find the middle of the data."]]),
        calculator: calculator([...DATA, ["\\operatorname{median}(L)", "Read the median."]], null, "The median row answers the question."),
      },
      {
        id: "statistics-compare", phase: "Watch", title: "Compare it with the mean",
        body: ["Add mean(L). It returns 10. The mean is larger than the median because the high value 22 pulls the average upward.", "Both commands work correctly. Our question still asks for the median, so the answer remains 8."],
        entries: copies([["\\operatorname{mean}(L)", "Compare the average with the median."]]),
        calculator: calculator([...DATA, ["\\operatorname{median}(L)", "Median: the ordered middle."], ["\\operatorname{mean}(L)", "Mean: the arithmetic average."]], null, "Read the row whose function name matches the question."),
      },
      {
        id: "statistics-repeat-check", phase: "Check", title: "Should repeated values be removed?",
        body: ["A data set contains 2, 2, 5, and 9. Which list should you enter?"],
        check: { kind: "choice", correctId: "all", choices: [{ id: "unique", text: "L = [2, 5, 9]", feedback: "This removes one observation and changes both the count and the data." }, { id: "all", text: "L = [2, 2, 5, 9]", feedback: "Yes. Both occurrences of 2 belong in the list." }, { id: "sum", text: "L = [4, 5, 9]", feedback: "Adding the two 2s together also changes the observations. Keep them separate." }], hint: "A repeated value can represent a different observation with the same measurement.", explanation: "Enter all four observations. Built-in statistics use each list entry separately." },
        calculator: blank("Preserve the data before choosing a statistic."),
      },
      {
        id: "statistics-outlier", phase: "Explore", title: "Change the largest observation",
        body: ["Replace 22 in the list with 122. Watch median(L) and mean(L) update.", "The median stays at 8 because the middle position has not changed. The mean rises from 10 to 30 because it uses every value in the sum."],
        calculator: calculator([...DATA, ["\\operatorname{median}(L)", "Watch the middle as you edit the largest value."], ["\\operatorname{mean}(L)", "Watch the mean respond to the larger value."]], null, "Edit only the last value: change 22 to 122."),
      },
      {
        id: "statistics-and-data-analysis-fresh-check", phase: "Try it", title: "Find the median of six observations",
        body: ["What is the median of 3, 7, 7, 10, 13, and 20?", "There are now an even number of observations. Enter all six in the empty calculator and use the requested command."],
        check: { kind: "number", answer: 8.5, hint: "Enter the full list, including both 7s, then use median(L). With six observations, the two middle positions are third and fourth.", explanation: "The middle observations are 7 and 10. Their average is 8.5, which median(L) returns.", wrongFeedback: "Keep both copies of 7 and use median, not mean. An even-length list uses the average of its two middle values.", commonMistakes: [{ answer: 7, feedback: "7 is only the lower of the two middle observations. The median uses both 7 and 10." }, { answer: 10, feedback: "10 is the upper middle observation. Average it with the lower middle value, 7. Here 10 also happens to be the mean." }, { answer: 8, feedback: "The median can be a decimal. Do not round 8.5 down to a whole number." }], solution: ["Enter L = [3, 7, 7, 10, 13, 20].", "Enter median(L).", "The result is 8.5; it averages the third and fourth ordered observations."] },
        calculator: blank("Enter all six observations and calculate their median."),
      },
      {
        id: "statistics-meaning-check", phase: "Check", title: "Can the median be absent from the data?",
        body: ["The ordered data are 2, 4, 8, and 12. Their median is 6. Is that allowed even though 6 is not listed?"],
        check: { kind: "choice", correctId: "average", choices: [{ id: "must", text: "No, a median must be one of the observations.", feedback: "With an even number of observations, averaging the middle two can produce a new value." }, { id: "average", text: "Yes, it is the average of the two middle observations.", feedback: "Correct. The middle values are 4 and 8, whose average is 6." }, { id: "maximum", text: "No, the median should be the largest value.", feedback: "The largest value is the maximum, not the median." }], hint: "There is no single middle position when the count is even.", explanation: "The median of an even-length list is the average of the two middle sorted values." },
        calculator: blank("You can test median([2, 4, 8, 12]) if you want to confirm."),
      },
    ],
  },
  geometry: {
    prerequisite: "Read a point’s first coordinate as x and its second as y.",
    summary: ["For distance between two coordinate points, use distance((x₁, y₁), (x₂, y₂)).", "Keep each point’s two coordinates together.", "A horizontal or vertical coordinate difference alone does not usually give the diagonal distance."],
    slides: [
      {
        id: "geometry-recognize", phase: "Understand", title: "Find the distance between two points",
        body: ["The endpoints are (1, 2) and (7, 10). The question asks for the straight-line distance between them.", "Desmos has a distance command for two points, so you can use the coordinates directly without writing a distance formula."],
        visual: { kind: "table", columns: ["Point", "x-coordinate", "y-coordinate"], rows: [["First", "1", "2"], ["Second", "7", "10"]] },
        calculator: blank("Keep each point as an ordered pair.", POINT_BOUNDS),
      },
      {
        id: "geometry-pairing", phase: "Understand", title: "Do not mix the coordinate pairs",
        body: ["The pair (1, 2) describes one location. The pair (7, 10) describes another. Rearranging them as (1, 7) and (2, 10) would create different points.", "The distance command takes the two complete points as its inputs."],
        visual: { kind: "flow", items: [{ label: "First complete point", math: "(1,2)" }, { label: "Distance between", text: "Use both x and y from each location." }, { label: "Second complete point", math: "(7,10)" }] },
        calculator: blank("The outside parentheses will contain two inside coordinate pairs.", POINT_BOUNDS),
      },
      {
        id: "geometry-first-point", phase: "Watch", title: "Plot the first endpoint",
        body: ["Enter (1, 2). Locate it one unit right of the y-axis and two units above the x-axis.", "Plotting the endpoints helps you catch a swapped coordinate before calculating."],
        entries: copies(POINTS.slice(0, 1)), calculator: calculator(POINTS.slice(0, 1), POINT_BOUNDS, "The first point should be at x = 1, y = 2."),
      },
      {
        id: "geometry-second-point", phase: "Watch", title: "Add the second endpoint",
        body: ["Enter (7, 10) in another row. This point is both to the right of and above the first.", "The segment between them is diagonal. Counting only its horizontal or vertical change would leave out part of the separation."],
        entries: copies(POINTS.slice(1)), calculator: calculator(POINTS, POINT_BOUNDS, "Both endpoints are visible. The requested length joins these locations."),
      },
      {
        id: "geometry-distance", phase: "Watch", title: "Evaluate the distance command",
        body: ["Enter distance((1, 2), (7, 10)). Desmos returns 10, the straight-line distance in coordinate units.", "The outer parentheses hold the two points; each inner pair keeps that point’s x and y together."],
        entries: copies([["\\operatorname{distance}((1,2),(7,10))", "Measure between the two complete points."]]),
        calculator: calculator([...POINTS, ["\\operatorname{distance}((1,2),(7,10))", "Read the straight-line distance."]], POINT_BOUNDS, "The numeric distance is shown in the final row."),
      },
      {
        id: "geometry-command-check", phase: "Check", title: "Choose the correct pair structure",
        body: ["Which entry measures the distance between (−2, 3) and (4, 8)?"],
        check: { kind: "choice", correctId: "paired", choices: [{ id: "paired", text: "distance((−2, 3), (4, 8))", feedback: "Yes. Both original coordinate pairs remain intact." }, { id: "mixed", text: "distance((−2, 4), (3, 8))", feedback: "This groups the two x-values into one point and the two y-values into another, changing the locations." }, { id: "horizontal", text: "4 − (−2)", feedback: "This measures only the horizontal change. The points also differ vertically." }], hint: "Copy each ordered pair as one unit.", explanation: "The built-in takes two points, each with its own x and y." },
        calculator: blank("Check the pairing before calculating."),
      },
      {
        id: "geometry-explore", phase: "Explore", title: "Move one point vertically",
        body: ["The first endpoint stays at (1, 2). The second is now (7, h). Change h from 2 to 10 and watch the distance.", "At h = 2 the points are level, so the distance is just the horizontal gap, 6. Moving h away from 2 makes the straight-line distance larger."],
        calculator: calculator([["h=2", "Move the second endpoint up or down.", { min: -6, max: 12, step: 1 }], ["(1,2)", "Keep the first endpoint fixed."], ["(7,h)", "Watch the second endpoint move."], ["\\operatorname{distance}((1,2),(7,h))", "Measure the current separation."]], POINT_BOUNDS, "Compare the distance at h = 2 with the distance at h = 10."),
      },
      {
        id: "geometry-fresh-check", phase: "Try it", title: "Measure a new segment",
        body: ["What is the distance between (−1, 2) and (8, 14)?", "Use the empty calculator. Plotting the endpoints is optional, but keep their coordinate pairs intact in the distance command."],
        check: { kind: "number", answer: 15, unit: "units", hint: "Enter distance((−1, 2), (8, 14)). Keep the negative sign on the first point’s x-coordinate.", explanation: "The distance command returns 15 coordinate units.", wrongFeedback: "Use both complete points in distance(). Counting one coordinate change does not measure the diagonal.", commonMistakes: [{ answer: 9, feedback: "9 is the horizontal change. The second point is also higher than the first." }, { answer: 12, feedback: "12 is the vertical change. The points also differ horizontally." }, { answer: 21, feedback: "Adding horizontal and vertical changes measures a two-leg route, not the direct segment." }], solution: ["Keep the endpoints as (−1, 2) and (8, 14).", "Enter distance((−1, 2), (8, 14)).", "Read the distance 15."] },
        calculator: blank("Enter the new coordinate points and measure their distance.", { left: -4, right: 12, bottom: -2, top: 18 }),
      },
      {
        id: "geometry-translation-check", phase: "Check", title: "Does moving both points change their distance?",
        body: ["You move both endpoints 5 units to the right without moving either one up or down. What happens to the distance between them?"],
        check: { kind: "choice", correctId: "same", choices: [{ id: "five", text: "It increases by 5.", feedback: "Both endpoints move together. Their separation does not gain 5 units." }, { id: "same", text: "It stays the same.", feedback: "Yes. Moving both endpoints by the same amount keeps the segment’s length." }, { id: "double", text: "It doubles.", feedback: "A shared shift moves the segment; it does not stretch it." }], hint: "Compare the separation of the two points, not their distance from the y-axis.", explanation: "A shared translation changes location but preserves the distance between the endpoints." },
        calculator: blank("You may compare any pair with the same pair shifted equally to the right."),
      },
    ],
  },
  circles: {
    prerequisite: "Know that a radius goes from the center to the circle, while a diameter goes all the way through the center.",
    summary: ["Graph the given circle and a horizontal line through its supplied center.", "The two intersections are endpoints of a diameter.", "Subtract their x-coordinates and divide by 2 to obtain the radius."],
    slides: [
      {
        id: "circles-recognize", phase: "Understand", title: "Use a diameter to measure a radius",
        body: ["A circle has center (4, −3) and equation (x − 4)² + (y + 3)² = 36. What is its radius?", "We will graph the circle, find a horizontal diameter through the given center, and let Desmos calculate half its length."],
        visual: { kind: "comparison", items: [{ label: "Radius", text: "Center to circle." }, { label: "Diameter", text: "Circle to circle, through the center: two radii." }] },
        calculator: blank("The center is supplied, so no center-finding algebra is needed.", CIRCLE_BOUNDS),
      },
      {
        id: "circles-center-line", phase: "Understand", title: "A diameter must pass through the center",
        body: ["The center’s y-coordinate is −3. Every point on the horizontal line y = −3 has that same height, so the line passes through the center.", "Where it meets the circle on either side, it marks the endpoints of a diameter. A line at another height would usually give a shorter chord."],
        visual: { kind: "flow", items: [{ label: "Given center", math: "(4,-3)" }, { label: "Same height", math: "y=-3" }, { label: "Two intersections", text: "The endpoints of a horizontal diameter." }] },
        calculator: blank("Use the center’s supplied y-coordinate for the horizontal line.", CIRCLE_BOUNDS),
      },
      {
        id: "circles-graph", phase: "Watch", title: "Graph the circle exactly as given",
        body: ["Enter (x − 4)² + (y + 3)² = 36. Desmos can graph this directly; there is no need to isolate y.", "The number 36 on the right is not the radius. We will measure the circle to see the actual length."],
        entries: copies(CIRCLE), calculator: calculator(CIRCLE, CIRCLE_BOUNDS, "Graph the complete circle equation, including both squares."),
      },
      {
        id: "circles-diameter", phase: "Watch", title: "Draw the line through the center",
        body: ["Add y = −3. Select the circle or the line, then select the two intersections.", "Their labels are (−2, −3) and (10, −3). Both are at the center’s height, so the segment between them is a diameter."],
        entries: copies([["y=-3", "Draw a horizontal line through the supplied center."]]),
        calculator: calculator([...CIRCLE, ["y=-3", "Locate the diameter’s endpoints."]], CIRCLE_BOUNDS, "Select both circle-line intersections and read their x-coordinates."),
      },
      {
        id: "circles-radius", phase: "Watch", title: "Take half the horizontal diameter",
        body: ["The horizontal length is the right endpoint’s x-coordinate minus the left endpoint’s: 10 − (−2). That diameter is 12.", "Enter (10 − (−2))/2 to get the radius, 6. The tiny hand step is choosing half a diameter; Desmos handles the arithmetic. In this equation, 36 is the radius squared."],
        entries: copies([["\\frac{10-(-2)}{2}", "Subtract the endpoint coordinates and halve the diameter."]]),
        calculator: calculator([...CIRCLE, ["y=-3", "The horizontal diameter line."], ["\\frac{10-(-2)}{2}", "Read the radius from half the measured diameter."]], CIRCLE_BOUNDS, "The graph supplies the endpoints; the final row supplies the radius."),
      },
      {
        id: "circles-measure-check", phase: "Check", title: "Distinguish radius, diameter, and squared radius",
        body: ["For the worked circle, the horizontal diameter is 12 and the equation has 36 on its right side. Which number is the radius?"],
        check: { kind: "choice", correctId: "radius", choices: [{ id: "diameter", text: "12", feedback: "12 measures all the way across the circle through the center. A radius is half that length." }, { id: "square", text: "36", feedback: "36 is the radius squared in this equation. It is not the radius itself." }, { id: "radius", text: "6", feedback: "Yes. Half of the 12-unit diameter is 6." }], hint: "A diameter is made of two radii.", explanation: "The radius is 12/2 = 6. Its square is 36, which agrees with the given equation." },
        calculator: blank("Choose the requested measure rather than a different number from the same circle."),
      },
      {
        id: "circles-explore", phase: "Explore", title: "Move the center without changing the size",
        body: ["The slider h changes only the center’s horizontal location. Move h from 4 to 0 and inspect the two intersections with y = −3 again.", "Their x-coordinates move, but their separation stays 12. A new location does not by itself change the radius."],
        calculator: calculator([["h=4", "Move the center left or right.", { min: -2, max: 6, step: 1 }], ["(x-h)^2+(y+3)^2=36", "Keep the circle’s size fixed while moving its center."], ["y=-3", "Keep a horizontal line through the center."]], { left: -10, right: 14, bottom: -12, top: 6 }, "Move h and compare the gap between the diameter endpoints."),
      },
      {
        id: "circles-fresh-check", phase: "Try it", title: "Measure the radius of a new circle",
        body: ["A circle has center (−2, 1) and equation (x + 2)² + (y − 1)² = 25. What is its radius?", "Graph the circle and a horizontal line through its center. Use their intersections to measure the diameter, then halve it."],
        check: { kind: "number", answer: 5, unit: "units", hint: "The center’s height is 1, so add y = 1. Read the two intersection x-values and compute half their difference.", explanation: "The diameter endpoints are (−7, 1) and (3, 1). Half the horizontal gap is (3 − (−7))/2 = 5.", wrongFeedback: "Use the horizontal line through y = 1 and halve the full distance across the circle.", commonMistakes: [{ answer: 10, feedback: "10 is the full diameter. The question asks for a radius, half as long." }, { answer: 25, feedback: "25 is the radius squared in this equation. The radius itself is a length." }, { answer: 3, feedback: "3 is the right endpoint’s x-coordinate, not its distance from the center." }], solution: ["Graph (x + 2)² + (y − 1)² = 25.", "Add y = 1 through the supplied center.", "Select the intersections (−7, 1) and (3, 1).", "Enter (3 − (−7))/2 and read the radius 5."] },
        calculator: blank("Enter the new circle and its center-height line yourself.", { left: -10, right: 6, bottom: -7, top: 9 }),
      },
      {
        id: "circles-chord-check", phase: "Check", title: "Which line gives a diameter?",
        body: ["A circle has center (2, 5). Which horizontal line can you use to find a diameter’s endpoints?"],
        check: { kind: "choice", correctId: "height", choices: [{ id: "xcoord", text: "y = 2", feedback: "2 is the center’s x-coordinate. A horizontal line uses the center’s y-coordinate." }, { id: "axis", text: "y = 0", feedback: "The x-axis does not pass through this center. Its intersections, if any, would not be a diameter’s endpoints." }, { id: "height", text: "y = 5", feedback: "Yes. It passes through the center at height 5." }], hint: "A horizontal line keeps y fixed at the center’s height.", explanation: "A diameter passes through the center, so its horizontal line is y = 5." },
        calculator: blank("Use the given center to choose a line before measuring."),
      },
    ],
  },
  trigonometry: {
    prerequisite: "Identify the hypotenuse of a right triangle and the side opposite a specified acute angle.",
    summary: ["Use sine for an opposite side when an acute angle and the hypotenuse are given.", "Choose Degrees when the angle is measured in degrees.", "Multiply the hypotenuse by sin(angle); the resulting opposite side is shorter than the hypotenuse."],
    slides: [
      {
        id: "trigonometry-recognize", phase: "Understand", title: "Find an opposite side from an angle and hypotenuse",
        body: ["In a right triangle, an acute angle is 30° and the hypotenuse is 12. Find the side opposite that 30° angle.", "This lesson covers that specific setup. First identify the given angle, then name the sides relative to it."],
        visual: { kind: "table", columns: ["Part of the triangle", "How to identify it"], rows: [["Hypotenuse", "The long side across from the 90° angle"], ["Opposite side", "Across from the specified 30° angle"], ["Adjacent side", "Touches the 30° angle, excluding the hypotenuse"]] },
        calculator: blank("Identify the two relevant sides before choosing a trig command."),
      },
      {
        id: "trigonometry-ratio", phase: "Understand", title: "Sine connects these two sides",
        body: ["For the specified angle, sine is the opposite side divided by the hypotenuse. That means the opposite side is the hypotenuse multiplied by sine of the angle.", "Choosing this relationship is the setup you do by hand. Desmos handles the sine value and multiplication."],
        visual: { kind: "flow", items: [{ label: "Given", text: "Hypotenuse and acute angle" }, { label: "Use sine", math: "\\sin(\\theta)=\\frac{\\text{opposite}}{\\text{hypotenuse}}" }, { label: "Find opposite", text: "Multiply the hypotenuse by sine of the angle." }] },
        calculator: blank("We need a side length, not an inverse-trig angle calculation."),
      },
      {
        id: "trigonometry-degrees", phase: "Watch", title: "Check the angle setting and evaluate sine",
        body: ["Open the calculator’s graph settings and check that Degrees is selected. The question’s angle is 30°, so entering 30 in Radians would mean something else.", "Enter sin(30). In Degrees, the result is 0.5. This is a side-length ratio, not the requested side length yet."],
        entries: copies([["\\sin(30)", "Evaluate sine of the given angle in Degrees."]]),
        calculator: calculator([["\\sin(30)", "Read the sine ratio with Degrees selected."]], null, "Use Degrees. The sine value should be 0.5."),
      },
      {
        id: "trigonometry-multiply", phase: "Watch", title: "Apply the ratio to the hypotenuse",
        body: ["Enter 12 sin(30). Multiplying by the hypotenuse converts the ratio into the opposite side’s length.", "The result is 6. In this triangle, the side opposite 30° is half as long as the hypotenuse."],
        entries: copies([["12\\sin(30)", "Multiply the given hypotenuse by sine of the angle."]]),
        calculator: calculator([["\\sin(30)", "The ratio from the previous step."], ["12\\sin(30)", "Calculate the opposite side length."]], null, "The final row gives a side length, not just a ratio."),
      },
      {
        id: "trigonometry-read", phase: "Watch", title: "Check that the result matches the side requested",
        body: ["The question asks for the opposite side, so report 6. It should be shorter than the hypotenuse, 12.", "Dividing 12 by sin(30) would return 24. That is too long to be this triangle’s opposite side; it uses the relationship in the wrong direction."],
        visual: { kind: "comparison", items: [{ label: "Known hypotenuse → opposite", math: "12\\sin(30^{\\circ})", text: "Multiply by the ratio." }, { label: "Check the length", text: "The opposite side must be shorter than the hypotenuse." }] },
        calculator: calculator([["12\\sin(30)", "The requested opposite side."]], null, "In Degrees, this expression returns 6."),
      },
      {
        id: "trigonometry-ratio-check", phase: "Check", title: "Which ratio matches the known sides?",
        body: ["You know an acute angle and the hypotenuse. You want the opposite side. Which relationship matches those two sides?"],
        check: { kind: "choice", correctId: "sine", choices: [{ id: "sine", text: "sin(angle) = opposite / hypotenuse", feedback: "Yes. Sine connects exactly the side you need and the side you know." }, { id: "cosine", text: "cos(angle) = adjacent / hypotenuse", feedback: "This relationship finds the adjacent side, not the opposite side asked for here." }, { id: "tangent", text: "tan(angle) = opposite / adjacent", feedback: "This would use the adjacent side, which is not the given length in this setup." }], hint: "Match the side names before entering numbers.", explanation: "Sine connects opposite and hypotenuse. Multiply the known hypotenuse by sine of the given angle." },
        calculator: blank("Choose the relationship from the given and requested sides."),
      },
      {
        id: "trigonometry-explore", phase: "Explore", title: "Keep the hypotenuse fixed and change the angle",
        body: ["Keep Degrees selected. The hypotenuse remains 12 while the slider a changes the acute angle.", "Try a = 15, 30, and 60. The opposite side grows as the angle grows, but it remains shorter than 12 for these acute angles."],
        calculator: calculator([["a=30", "Change the acute angle in degrees.", { min: 10, max: 80, step: 5 }], ["12\\sin(a)", "Read the opposite side for the current angle."]], null, "Change a while leaving the hypotenuse fixed. Use Degrees throughout."),
      },
      {
        id: "trigonometry-fresh-check", phase: "Try it", title: "Find the opposite side in another triangle",
        body: ["A right triangle has hypotenuse 18 and an acute angle of 30°. What is the length of the side opposite that angle?", "Check Degrees, then enter the calculation in the empty calculator."],
        check: { kind: "number", answer: 9, unit: "units", hint: "Multiply the given hypotenuse by sine of the given angle: 18 sin(30), with Degrees selected.", explanation: "In Degrees, sin(30) = 0.5. Multiplying the hypotenuse 18 by this ratio gives 9.", wrongFeedback: "Check Degrees, use sine for opposite/hypotenuse, and multiply by the hypotenuse.", commonMistakes: [{ answer: 0.5, feedback: "0.5 is the sine ratio. Multiply it by the given hypotenuse to obtain a length." }, { answer: 36, feedback: "36 comes from dividing by the ratio. The opposite side must be shorter than the hypotenuse 18." }, { answer: 18, feedback: "18 is the given hypotenuse, not the opposite side." }], solution: ["Check that the calculator uses Degrees.", "Use the opposite/hypotenuse relationship, so opposite = 18 sin(30).", "Enter 18 sin(30).", "Read the opposite side length, 9."] },
        calculator: blank("No calculation is preloaded. Check Degrees and enter your setup."),
      },
      {
        id: "trigonometry-setting-check", phase: "Check", title: "What should you check before changing your formula?",
        body: ["You entered sin(30) for a 30° angle, but the calculator does not show 0.5. What should you check first?"],
        check: { kind: "choice", correctId: "degrees", choices: [{ id: "degrees", text: "Whether the calculator is set to Degrees", feedback: "Yes. The same entry has a different meaning in Radians." }, { id: "inverse", text: "Replace sine with inverse sine", feedback: "Inverse sine finds an angle from a ratio. That is not this task." }, { id: "negative", text: "Remove the negative sign from the result", feedback: "Changing the output hides the cause. Check the angle unit instead." }], hint: "The number 30 must use the same angle unit as the question.", explanation: "Use Degrees for an angle written as 30°. Check units before changing an otherwise correct expression." },
        calculator: blank("The calculator’s angle setting is part of a correct trig entry."),
      },
    ],
  },
};
