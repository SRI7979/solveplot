import type { LessonContent, LessonExample } from "@/lib/lesson-types";
import type { SliderBounds } from "@/lib/solver-schema";

type ExampleStep = LessonExample["steps"][number] & { slider?: SliderBounds };
function worked(example: Omit<LessonExample, "expressions" | "steps"> & { steps: ExampleStep[] }): LessonExample {
  return {
    ...example,
    steps: example.steps.map(({ title, explanation, latex }) => ({ title, explanation, ...(latex ? { latex } : {}) })),
    expressions: example.steps.flatMap(({ latex, explanation, slider }) => latex ? [{ latex, purpose: explanation, ...(slider ? { slider } : {}) }] : []),
  };
}

const help = {
  basics: { title: "Desmos: Getting started", href: "https://help.desmos.com/hc/en-us/articles/4406040715149-Getting-Started-Desmos-Graphing-Calculator" },
  tables: { title: "Desmos: Tables", href: "https://help.desmos.com/hc/en-us/articles/4405489674381-Tables" },
  lists: { title: "Desmos: Lists", href: "https://help.desmos.com/hc/en-us/articles/4407889068557-Lists" },
  regression: { title: "Desmos: Regressions", href: "https://help.desmos.com/hc/en-us/articles/4406972958733-Regressions" },
  functions: { title: "Desmos: Functions", href: "https://help.desmos.com/hc/en-us/articles/4405177116941-Functions" },
  sliders: { title: "Desmos: Sliders and movable points", href: "https://help.desmos.com/hc/en-us/articles/202529069-Sliders-and-Movable-Points-in-a-Graph" },
  restrictions: { title: "Desmos: Inequalities and restrictions", href: "https://help.desmos.com/hc/en-us/articles/4407885334285-Inequalities-and-Restrictions" },
  builtins: { title: "Desmos: Supported functions", href: "https://help.desmos.com/hc/en-us/articles/212235786-Supported-Functions" },
};

export const DESMOS_LESSONS: LessonContent[] = [
  {
    slug: "introduction-to-desmos", minutes: 5,
    intro: "Start with two places: the expression list, where you type, and the graph, where you see what those entries mean. This lesson uses a function to connect them.",
    objectives: ["Enter a function without rearranging it.", "Evaluate one input and locate its point on the graph.", "Read the coordinate the question actually asks for."],
    sections: [
      { title: "What goes in an expression row?", paragraphs: ["An entry can be a calculation, an equation, a function, or a point. Each new row can refer to something you defined above it.", "For example, f(x) = 3x + 2 names a function. Think of it as an input-output rule: you give it an x-value, and it returns one number."] },
      { title: "An input is not an output", paragraphs: ["In f(4), the input is 4. Desmos calculates the output. On the graph, those two numbers form a point: input first, output second.", "If a question asks for f(4), report the output. If it asks which input produces a particular output, that is a different task."], takeaway: "Before entering anything, identify whether you need an input, an output, or a point." },
    ],
    example: worked({ question: "The function f is defined by f(x) = 3x + 2. What is f(4)?", techniqueId: "function-evaluation", structure: "A linear function evaluated at one given input.", why: "Define the function once, then let Desmos evaluate the requested input.", answer: "14", graphBounds: { left: -2, right: 6, bottom: -3, top: 20 }, steps: [
      { title: "Define the function", explanation: "Copy the given rule into one expression row. The name f lets you reuse it.", latex: "f(x)=3x+2" },
      { title: "Enter the requested input", explanation: "The parentheses tell Desmos to use 4 as the input. This row returns 14.", latex: "f(4)" },
      { title: "Read the answer", explanation: "The question asks for the output, so the answer is 14. On the graph this corresponds to the point (4, 14)." },
    ] }),
    exploration: { title: "Move the input", prompt: "Move the t slider to 0, 2, and 4. Watch the point move and read the output in the last row.", expressions: [
      { latex: "f(x)=3x+2", purpose: "The original function." },
      { latex: "t=0", purpose: "Change the input.", slider: { min: -2, max: 6, step: 1 } },
      { latex: "(t,f(t))", purpose: "The point has input t and output f(t)." },
      { latex: "f(t)", purpose: "Read the current output." },
    ], graphBounds: { left: -3, right: 7, bottom: -6, top: 24 }, observations: ["At t = 0, the output is 2; at t = 2, it is 8; at t = 4, it is 14.", "Moving the slider changes the input, not the function's rule."] },
    checks: [
      { id: "input", question: "What does the 4 in f(4) mean?", choices: [{ label: "A", text: "The input" }, { label: "B", text: "The output" }, { label: "C", text: "The slope" }], correctLabel: "A", explanation: "The number inside the parentheses is the input. Desmos then evaluates the function at that number." },
      { id: "output", question: "For f(x) = 3x + 2, what is f(2)?", choices: [{ label: "A", text: "2" }, { label: "B", text: "6" }, { label: "C", text: "8" }], correctLabel: "C", explanation: "Enter f(2). The result is 8, so the matching point is (2, 8)." },
    ],
    pitfalls: ["Use parentheses: f(4) calls the function; f times 4 does not.", "If the graph looks empty, check the visible axes and zoom before changing your equation."],
    related: ["graphing-equations", "functions-and-transformations", "tables"], sources: [help.basics, help.functions],
  },
  {
    slug: "graphing-equations", minutes: 5,
    intro: "You can often enter an equation exactly as it appears. Desmos draws all the points that make it true, which can let you read the answer directly.",
    objectives: ["Graph a given equation as written.", "Recognize what a vertical solution line means.", "Choose a useful viewing window."],
    sections: [
      { title: "A graph is a set of solutions", paragraphs: ["For y = 2x + 1, many pairs of x and y work, so the graph is a sloping line. Every point on that line satisfies the equation.", "For 3x + 5 = 20, only one x-value works. There is no y-condition, so Desmos draws a vertical line through that x-value."] },
      { title: "Start with the original equation", paragraphs: ["Try the equation before rearranging it. This keeps signs, fractions, and parentheses close to what is printed in the question.", "If the answer is outside the visible window, zoom out or edit the axis bounds. A cropped graph does not mean the equation has no solution."], takeaway: "Read the coordinate that the equation is asking you to find." },
    ],
    example: worked({ question: "What value of x satisfies 3x + 5 = 20?", techniqueId: "graph-raw", structure: "A linear equation in x with one solution.", why: "The equation can be graphed directly. Its vertical line identifies the solution's x-value.", answer: "5", graphBounds: { left: -2, right: 9, bottom: -5, top: 5 }, steps: [
      { title: "Enter the equation as written", explanation: "Keep both sides of the equals sign. Desmos draws a vertical line.", latex: "3x+5=20" },
      { title: "Locate its x-intercept", explanation: "Select the line and the point where it crosses the horizontal axis. The coordinate is (5, 0)." },
      { title: "Read x", explanation: "The x-coordinate is 5. The vertical line means every point on it has that same x-value." },
    ] }),
    exploration: { title: "Change the right side", prompt: "Set k to 8, 20, and 32. Find the x-intercept after each change.", expressions: [
      { latex: "k=20", purpose: "Change the equation's right side.", slider: { min: -10, max: 35, step: 1 } },
      { latex: "3x+5=k", purpose: "The line marks the solution for the current k." },
    ], graphBounds: { left: -6, right: 11, bottom: -5, top: 5 }, observations: ["The three settings produce x = 1, x = 5, and x = 9.", "Each graph is vertical because the equation constrains x but does not constrain y."] },
    checks: [
      { id: "line", question: "The graph of an equation is a vertical line through (6, 0). What is its solution for x?", choices: [{ label: "A", text: "0" }, { label: "B", text: "6" }, { label: "C", text: "Every x-value" }], correctLabel: "B", explanation: "Every point on that vertical line has x = 6. Its y-values vary, but its x-value does not." },
      { id: "window", question: "You entered an equation correctly, but its graph is outside the visible axes. What should you try?", choices: [{ label: "A", text: "Change the equation's numbers" }, { label: "B", text: "Report no solution" }, { label: "C", text: "Zoom out or adjust the viewing window" }], correctLabel: "C", explanation: "The viewing window only controls what you can see. Changing the equation would change the problem." },
    ],
    pitfalls: ["Use the original parentheses, especially around a numerator or denominator.", "A vertical line gives an x-value; a horizontal line gives a y-value."], related: ["intersections-and-intercepts", "linear-equations", "restrictions"], sources: [help.basics],
  },
  {
    slug: "tables", minutes: 6,
    intro: "Tables pair each input with its output. They are especially useful when a question gives several points or asks you to compare values without drawing a complicated graph.",
    objectives: ["Keep inputs and outputs in matching rows.", "Use a function to produce a column of outputs.", "Read a particular value without changing the data."],
    sections: [
      { title: "Keep each pair together", paragraphs: ["The row containing x = 2 must also contain the output that belongs to 2. Switching one column's order while leaving the other unchanged creates different points.", "To make a table in Desmos, use Add Item (+), then Table. Enter inputs in the first column. A second heading such as f(x_1) evaluates your function at those inputs."] },
      { title: "A column is also a list", paragraphs: ["You can name a list x_1 and refer to all its entries at once. Applying f to x_1 returns the outputs in the same order.", "The example uses this list form of a table. The exploration below lets you build the table yourself."], takeaway: "Match by row or list position, not by which number looks largest." },
    ],
    example: worked({ question: "The function f is defined by f(x) = 2x + 1. The input list is 1, 2, 3, 4. What is f(4)?", techniqueId: "list-evaluation", structure: "Evaluate a linear function over a list and read the output for one specified input.", why: "A list evaluation returns all four outputs in their input order.", answer: "9", graphBounds: { left: -1, right: 6, bottom: -2, top: 12 }, steps: [
      { title: "Define the rule", explanation: "Enter the given function. Do not replace x with just one input yet.", latex: "f(x)=2x+1" },
      { title: "Enter the input column", explanation: "The values appear in the same order as the question. The subscript is part of the list's name.", latex: "x_{1}=[1,2,3,4]" },
      { title: "Evaluate the whole column", explanation: "Desmos returns [3, 5, 7, 9]. These outputs match the inputs position by position.", latex: "f(x_{1})" },
      { title: "Read the matching output", explanation: "The input 4 is fourth, so use the fourth output: 9." },
    ] }),
    exploration: { title: "Build a table", prompt: "In the calculator, add a Table with the + menu. Put 0, 2, and 5 in the x_1 column. Replace the second column heading with f(x_1). Then change 2 to 3.", expressions: [{ latex: "f(x)=2x+1", purpose: "Use this function in your table's second heading." }], graphBounds: { left: -1, right: 7, bottom: -2, top: 16 }, observations: ["The initial outputs are 1, 5, and 11.", "Changing the middle input from 2 to 3 changes only its matching output, from 5 to 7."] },
    checks: [
      { id: "pair", question: "Inputs are [2, 5, 8] and their matching outputs are [7, 16, 25]. What is the output for input 5?", choices: [{ label: "A", text: "7" }, { label: "B", text: "16" }, { label: "C", text: "25" }], correctLabel: "B", explanation: "Input 5 is second in the list, so its output is the second output, 16." },
      { id: "order", question: "You reverse the input column of an existing data table. What must happen to the output column to keep the same points?", choices: [{ label: "A", text: "Reverse it too" }, { label: "B", text: "Leave it unchanged" }, { label: "C", text: "Make every output zero" }], correctLabel: "A", explanation: "Each original input-output pair must stay together. Reverse both columns, or neither." },
    ],
    pitfalls: ["Do not sort the input and output columns independently.", "Use the table's actual column name, including its subscript, when writing another expression."], related: ["lists", "regression", "linear-functions"], sources: [help.tables, help.lists],
  },
  {
    slug: "intersections-and-intercepts", minutes: 6,
    intro: "Two curves meeting and one curve crossing an axis answer different questions. Learn which point you need before you start clicking.",
    objectives: ["Find a shared solution by graphing both equations.", "Distinguish x-intercepts, y-intercepts, and intersections.", "Read one coordinate from a labeled point."],
    sections: [
      { title: "An intersection satisfies both equations", paragraphs: ["Where two graphs cross, the same x and y work in both equations. That makes an intersection useful for systems and for questions about equal outputs.", "Keep each given equation on its own row. You do not need to combine the equations before graphing them."] },
      { title: "An intercept lies on an axis", paragraphs: ["At an x-intercept, y is zero. At a y-intercept, x is zero. A root of f(x) = 0 is therefore an x-intercept of y = f(x).", "Select a curve, then select a marked point of interest to display its coordinates. Read the requested coordinate rather than estimating from the grid."], takeaway: "A point (2, 5) has x-coordinate 2 and y-coordinate 5." },
    ],
    example: worked({ question: "The equations y = 2x + 1 and y = -x + 7 form a system. What is the x-coordinate of their intersection?", techniqueId: "graph-both-sides", structure: "Two intersecting lines, asked for the shared x-coordinate.", why: "The point where both lines meet satisfies both equations.", answer: "2", graphBounds: { left: -2, right: 6, bottom: -2, top: 10 }, steps: [
      { title: "Graph the first equation", explanation: "Copy the first line exactly as given.", latex: "y=2x+1" },
      { title: "Graph the second equation", explanation: "Keep the minus sign on x. Both lines are now visible.", latex: "y=-x+7" },
      { title: "Select their intersection", explanation: "The marked crossing is (2, 5). Both equations have output 5 when x is 2." },
      { title: "Answer with the requested coordinate", explanation: "The question asks for x, so report 2 rather than 5." },
    ] }),
    exploration: { title: "Move one line", prompt: "Change b from 7 to 4, then to 10. Select the intersection at each setting. The first line stays fixed.", expressions: [
      { latex: "b=7", purpose: "Change the second line's y-intercept.", slider: { min: 1, max: 13, step: 1 } },
      { latex: "y=2x+1", purpose: "This line stays fixed." },
      { latex: "y=-x+b", purpose: "This line moves when b changes." },
    ], graphBounds: { left: -2, right: 6, bottom: -3, top: 13 }, observations: ["At b = 4, the intersection is (1, 3). At b = 10, it is (3, 7).", "The crossing moves because the second equation changes. The point still lies on both lines."] },
    checks: [
      { id: "root", question: "To solve f(x) = 0 from the graph of y = f(x), which points do you need?", choices: [{ label: "A", text: "The x-intercepts" }, { label: "B", text: "The y-intercept only" }, { label: "C", text: "The highest point only" }], correctLabel: "A", explanation: "At an x-intercept, the graph has y = 0, so f(x) is zero there." },
      { id: "coordinate", question: "Two curves meet at (4, 9). What is their common output at that point?", choices: [{ label: "A", text: "4" }, { label: "B", text: "9" }, { label: "C", text: "13" }], correctLabel: "B", explanation: "The common output is the y-coordinate, 9. The shared input is 4." },
    ],
    pitfalls: ["Check for a second intersection outside the first part of the graph you inspected.", "An x-intercept of one curve is not automatically an intersection with another curve."], related: ["graphing-equations", "systems-of-equations", "quadratics"], sources: [help.basics],
  },
  {
    slug: "sliders", minutes: 6,
    intro: "A slider lets you change one unknown number while watching the graph. It works well when the question describes a visible condition, such as a line passing through a given point.",
    objectives: ["Separate a parameter from graph coordinates.", "Set useful slider bounds and step size.", "Check a visual match numerically."],
    sections: [
      { title: "What changes and what stays fixed?", paragraphs: ["In y = mx + 1, x and y are the graph's coordinates. The parameter m controls which line you are looking at.", "Defining m creates a slider. Drag it to change the line while the +1 stays fixed."] },
      { title: "Use the condition from the question", paragraphs: ["A point on the line gives you something specific to match. Plot the point, then move the line until it passes through it.", "A step of 1 is useful when testing integer possibilities. For noninteger answers, use finer steps or a method that determines the parameter precisely."], takeaway: "A graph that looks close is a starting point. Check the stated condition before reporting a value." },
    ],
    example: worked({ question: "The line y = mx + 1 passes through (2, 7). What is the value of m?", techniqueId: "slider-condition", structure: "One slope parameter in a line constrained to pass through a known point.", why: "Changing m rotates the line. The correct setting makes it pass through the given point.", answer: "3", graphBounds: { left: -1, right: 5, bottom: -2, top: 13 }, steps: [
      { title: "Create the parameter", explanation: "Start m at 1. This is a trial value, not the answer; move its slider next.", latex: "m=1", slider: { min: -2, max: 6, step: 1 } },
      { title: "Graph the given line", explanation: "The graph uses the current m value and keeps the intercept at 1.", latex: "y=mx+1" },
      { title: "Plot the required point", explanation: "Move m until the line goes through this point. The matching setting is m = 3.", latex: "(2,7)" },
      { title: "Check the output at x = 2", explanation: "With m set to 3, this returns 7, matching the point's y-coordinate. Report m = 3.", latex: "2m+1" },
    ] }),
    exploration: { title: "Make the line hit a new point", prompt: "Adjust m so that y = mx + 1 passes through (3, 13). Use the last row to confirm the output is 13.", expressions: [
      { latex: "m=1", purpose: "Adjust the slope.", slider: { min: -2, max: 6, step: 1 } },
      { latex: "y=mx+1", purpose: "The adjustable line." },
      { latex: "(3,13)", purpose: "The point the line must pass through." },
      { latex: "3m+1", purpose: "Check the line's output at x = 3." },
    ], graphBounds: { left: -1, right: 5, bottom: -2, top: 17 }, observations: ["The matching setting is m = 4, and the check returns 13.", "Every line in this exploration still crosses the y-axis at 1."] },
    checks: [
      { id: "parameter", question: "In y = mx + 1, which letter is the parameter you adjust?", choices: [{ label: "A", text: "x" }, { label: "B", text: "m" }, { label: "C", text: "y" }], correctLabel: "B", explanation: "m chooses the line. x and y describe positions on whichever line m selects." },
      { id: "step", question: "A slider moves only in whole-number steps, but the required value is between 2 and 3. What should you do?", choices: [{ label: "A", text: "Choose whichever integer looks closer" }, { label: "B", text: "Assume there is no solution" }, { label: "C", text: "Use finer steps and verify the exact condition" }], correctLabel: "C", explanation: "The slider step controls which values you can test. It does not prove the answer must be an integer." },
    ],
    pitfalls: ["Do not define a regression parameter with a slider if you want regression to fit it.", "Do not assume the default slider range includes every possible answer."], related: ["linear-functions", "functions-and-transformations", "bracket-regression"], sources: [help.sliders],
  },
  {
    slug: "lists", minutes: 6,
    intro: "A list lets Desmos repeat the same calculation for several inputs. You can inspect every result, select one position, or keep only values that meet a condition.",
    objectives: ["Evaluate a function at several inputs at once.", "Keep inputs paired with their outputs.", "Filter a finite list without treating it as a continuous domain."],
    sections: [
      { title: "One rule, several inputs", paragraphs: ["Put numbers inside square brackets, separated by commas. If L = [1, 2, 3, 4], then f(L) evaluates f at each of those four numbers.", "The output order follows the input order. The largest output does not always come from the largest input; read the results instead of assuming."] },
      { title: "Filter only the values you actually listed", paragraphs: ["A filter such as L[f(L) > 20] keeps the entries of L whose outputs exceed 20. It returns inputs, because L is outside the filter brackets.", "This tests a finite set. It does not check every decimal between the entries, so it cannot establish a maximum or minimum over a continuous interval."], takeaway: "Lists are ideal for given choices or justified integer possibilities, not for silently sampling a continuous graph." },
    ],
    example: worked({ question: "For f(x) = x^2 + 2x and the input list 1, 2, 3, 4, what is the greatest value in the output list?", techniqueId: "list-evaluation", structure: "A quadratic function evaluated on a finite list; find the maximum listed output.", why: "Evaluate all listed inputs together, then use max on the resulting list.", answer: "24", graphBounds: { left: -2, right: 6, bottom: -5, top: 35 }, steps: [
      { title: "Enter the inputs", explanation: "These are exactly the inputs specified in the question.", latex: "L=[1,2,3,4]" },
      { title: "Define the function", explanation: "Copy the function without changing its coefficients.", latex: "f(x)=x^2+2x" },
      { title: "Evaluate every input", explanation: "The output list is [3, 8, 15, 24].", latex: "f(L)" },
      { title: "Read the greatest output", explanation: "max selects the largest value in that list, which is 24.", latex: "\\operatorname{max}(f(L))" },
    ] }),
    exploration: { title: "Keep the inputs that pass a test", prompt: "Move k from 20 to 50. Read which inputs remain in the filtered list, then compare them with the highlighted points.", expressions: [
      { latex: "L=[1,2,3,4,5,6,7,8]", purpose: "The finite inputs being tested." },
      { latex: "f(x)=x^2+2x", purpose: "The function applied to every input." },
      { latex: "k=20", purpose: "Change the output threshold.", slider: { min: 0, max: 80, step: 5 } },
      { latex: "N=L[f(L)>k]", purpose: "Keep inputs whose outputs exceed k." },
      { latex: "(N,f(N))", purpose: "Plot only the passing input-output pairs." },
    ], graphBounds: { left: -1, right: 9, bottom: -5, top: 90 }, observations: ["At k = 20, inputs 4 through 8 remain. At k = 50, only 7 and 8 remain.", "The filter returns values from L, not every real number satisfying the inequality."] },
    checks: [
      { id: "position", question: "For L = [1, 2, 3, 4] and f(L) = [3, 8, 15, 24], which output belongs to input 3?", choices: [{ label: "A", text: "8" }, { label: "B", text: "15" }, { label: "C", text: "24" }], correctLabel: "B", explanation: "Input 3 is third, so its matching output is the third entry, 15." },
      { id: "continuous", question: "Does testing [0, 1, 2, 3] check every possible input between 0 and 3?", choices: [{ label: "A", text: "Yes, because the endpoints are included" }, { label: "B", text: "Yes, because Desmos fills the gaps" }, { label: "C", text: "No, values such as 1.5 were not tested" }], correctLabel: "C", explanation: "A list contains only its entries. Use a restricted graph when the question allows every real input in an interval." },
    ],
    pitfalls: ["Check whether the question wants the input or its output.", "Make sure any integer search range is justified by the problem; a short list can miss valid candidates."], related: ["tables", "answer-choice-testing", "restrictions"], sources: [help.lists],
  },
  {
    slug: "regression", minutes: 8,
    intro: "When a question gives data and names a model, regression can find the model's unknown coefficients. You enter the points and the model; Desmos handles the fitting.",
    objectives: ["Choose the model stated in the question.", "Fit coefficients with the tilde symbol.", "Reuse fitted values in a function evaluation."],
    sections: [
      { title: "The model matters", paragraphs: ["A linear model has the form mx + b. A quadratic model has the form ax^2 + bx + c. An exponential model can have the form ab^x. These are different shapes; do not choose one just because it produces an answer.", "Three distinct input-output pairs determine a quadratic when the question says the function is quadratic. Real-world data may instead require an approximate best fit."] },
      { title: "A tilde asks for a fit", paragraphs: ["Use ~ instead of = when asking Desmos to fit unknown coefficients to your lists. The x_1 and y_1 positions must match.", "After fitting, the parameter values can be reused. Define f(x) with ordinary x, then evaluate the input the question asks for."], takeaway: "The fit uses x_1, the list. The function definition uses x, the input variable." },
    ],
    example: worked({ question: "A quadratic function f(x) = ax^2 + bx + c satisfies f(1) = 8, f(2) = 15, and f(4) = 35. What is f(10)?", techniqueId: "three-point-regression", structure: "Three points on a quadratic, asked for another function value.", why: "Fit the quadratic to the three points, then evaluate the fitted function at 10.", answer: "143", graphBounds: { left: -2, right: 11, bottom: -10, top: 165 }, steps: [
      { title: "Enter the inputs", explanation: "Copy the three x-values in their original order.", latex: "x_{1}=[1,2,4]" },
      { title: "Enter the matching outputs", explanation: "The first output belongs to the first input, and so on.", latex: "y_{1}=[8,15,35]" },
      { title: "Fit the quadratic", explanation: "The tilde asks Desmos to find a, b, and c. The fit gives a = 1, b = 4, and c = 3.", latex: "y_{1}\\sim ax_{1}^2+bx_{1}+c" },
      { title: "Define the fitted function", explanation: "Use ordinary x here. Desmos reuses the fitted coefficients.", latex: "f(x)=ax^2+bx+c" },
      { title: "Evaluate the requested input", explanation: "This returns 143, the value of f(10).", latex: "f(10)" },
    ] }),
    exploration: { title: "Check a fitted function against its data", prompt: "Select the three plotted points and compare them with the curve. Then change the last output from 35 to 39 and inspect the new fit.", expressions: [
      { latex: "x_{1}=[1,2,4]", purpose: "Given inputs." }, { latex: "y_{1}=[8,15,35]", purpose: "Edit the last output to 39." },
      { latex: "(x_{1},y_{1})", purpose: "Plot the input-output pairs." }, { latex: "y_{1}\\sim ax_{1}^2+bx_{1}+c", purpose: "Fit all three pairs together." },
      { latex: "f(x)=ax^2+bx+c", purpose: "The fitted curve." }, { latex: "f(10)", purpose: "Compare the prediction after changing the data." },
    ], graphBounds: { left: -1, right: 6, bottom: -5, top: 70 }, observations: ["Initially all three points lie on f(x) = x^2 + 4x + 3, and f(10) is 143.", "After the edit, the curve still fits the three points but f(10) becomes 191. Predictions depend on the data you enter."] },
    checks: [
      { id: "tilde", question: "Which symbol asks Desmos to fit the unknown coefficients in y_1 and x_1?", choices: [{ label: "A", text: "=" }, { label: "B", text: "~" }, { label: "C", text: ">" }], correctLabel: "B", explanation: "The tilde requests a regression. An equals sign defines an equality; it does not request the same fitting operation." },
      { id: "readout", question: "After fitting a quadratic, the question asks for f(10). What should you do next?", choices: [{ label: "A", text: "Report a" }, { label: "B", text: "Report the last given output" }, { label: "C", text: "Define f(x) with the fitted coefficients, then evaluate f(10)" }], correctLabel: "C", explanation: "A fitted coefficient and a function value are different quantities. Evaluate the requested input after defining the function." },
    ],
    pitfalls: ["Do not create sliders for a, b, and c first; regression needs to fit those unknowns.", "Do not use x_1 in the definition of f(x). That would refer to the data list instead of the function's input."], related: ["tables", "bracket-regression", "quadratics"], sources: [help.regression],
  },
  {
    slug: "functions-and-transformations", minutes: 7,
    intro: "Naming a function saves repeated typing. It also lets you compare the original graph with a shifted or stretched version while keeping the original rule intact.",
    objectives: ["Define and evaluate a function.", "Compare vertical and horizontal shifts.", "Check transformations using a recognizable point."],
    sections: [
      { title: "Define once, use again", paragraphs: ["After defining f(x), you can evaluate f(3), graph f(x) + 2, or use f in another function. You do not need to retype the original expression each time.", "The parentheses belong to the function call. f(3) means the output at input 3, not f multiplied by 3."] },
      { title: "Where is the change applied?", paragraphs: ["Adding k outside the function, as in f(x) + k, moves every output up by k. Replacing the input with x - h, as in f(x - h), shifts the graph right by h when h is positive.", "Use an easy landmark, such as a vertex, to check the direction. In the exploration, the original vertex is (2, 3)."], takeaway: "A change outside the function affects outputs; a change inside affects which input reaches each point." },
    ],
    example: worked({ question: "The function f is defined by f(x) = x^2 - 4x + 7. What is f(3)?", techniqueId: "function-evaluation", structure: "A quadratic function evaluated at a specified input.", why: "The given expression already defines the function. Desmos can evaluate it directly.", answer: "4", graphBounds: { left: -2, right: 7, bottom: -1, top: 20 }, steps: [
      { title: "Define f", explanation: "Keep the whole expression in one definition.", latex: "f(x)=x^2-4x+7" },
      { title: "Evaluate at 3", explanation: "Desmos uses 3 as the input everywhere x appears and returns 4.", latex: "f(3)" },
      { title: "Read the output", explanation: "The answer is 4. The corresponding point on the original curve is (3, 4)." },
    ] }),
    exploration: { title: "Shift the same curve two ways", prompt: "Start with h = 0 and k = 0. First set h to 2, keeping k at 0. Then reset h to 0 and set k to 2. Select each curve's vertex.", expressions: [
      { latex: "f(x)=x^2-4x+7", purpose: "The original function has vertex (2, 3)." },
      { latex: "h=0", purpose: "Change the horizontal shift.", slider: { min: -3, max: 3, step: 1 } },
      { latex: "k=0", purpose: "Change the vertical shift.", slider: { min: -3, max: 3, step: 1 } },
      { latex: "g(x)=f(x-h)+k", purpose: "Compare the transformed curve with f." },
    ], graphBounds: { left: -4, right: 8, bottom: -3, top: 20 }, observations: ["With h = 2 and k = 0, the new vertex is (4, 3): the graph moves right.", "With h = 0 and k = 2, the new vertex is (2, 5): the graph moves up."] },
    checks: [
      { id: "vertical", question: "What does g(x) = f(x) + 3 do to the graph?", choices: [{ label: "A", text: "Moves it right 3" }, { label: "B", text: "Moves it up 3" }, { label: "C", text: "Changes every input to 3" }], correctLabel: "B", explanation: "The +3 is outside f, so it adds 3 to every output and moves the graph upward." },
      { id: "horizontal", question: "The vertex of f is (2, 3). Where is the vertex of g(x) = f(x - 1)?", choices: [{ label: "A", text: "(3, 3)" }, { label: "B", text: "(1, 3)" }, { label: "C", text: "(2, 2)" }], correctLabel: "A", explanation: "The original vertex occurs when the input to f is 2. In g, that happens at x = 3, because x - 1 is then 2." },
    ],
    pitfalls: ["f(x - 2) moves the graph right, while f(x) - 2 moves it down.", "Give a transformed function a new name if you want to compare it with the original."], related: ["sliders", "quadratics", "nonlinear-functions"], sources: [help.functions, help.sliders],
  },
  {
    slug: "restrictions", minutes: 6,
    intro: "Sometimes a question allows only part of a graph. A restriction keeps the permitted inputs visible, so a point outside the problem's domain does not become your answer.",
    objectives: ["Add a domain restriction to a graph.", "Distinguish included and excluded endpoints.", "Check endpoints when finding a restricted maximum or minimum."],
    sections: [
      { title: "Keep the allowed inputs", paragraphs: ["Add a condition in curly braces after the equation. A condition such as 0 <= x <= 2 keeps the part whose x-values lie from 0 through 2.", "The restriction does not change the function's formula. It changes which part of its graph is allowed in this problem."] },
      { title: "The unrestricted vertex may not count", paragraphs: ["A parabola's lowest point can sit outside the permitted interval. In that case, check the ends of the allowed graph instead.", "A <= endpoint is included. A < endpoint is excluded, so a graph may approach a value without ever attaining it. Pay attention to the exact symbols."], takeaway: "For a closed interval, compare every allowed turning point with the two endpoint outputs." },
    ],
    example: worked({ question: "For f(x) = (x - 3)^2 + 2 on 0 <= x <= 2, what is the minimum value of f(x)?", techniqueId: "restricted-extremum", structure: "A quadratic on a closed interval whose unrestricted vertex lies outside the allowed domain.", why: "Restrict the graph to the allowed inputs, then compare its endpoint values.", answer: "3", graphBounds: { left: -1, right: 5, bottom: -1, top: 14 }, steps: [
      { title: "Show only the permitted part", explanation: "The braces restrict x to the closed interval from 0 to 2. The vertex at x = 3 is not allowed.", latex: "y=(x-3)^2+2\\left\\{0\\le x\\le2\\right\\}" },
      { title: "Check the left endpoint", explanation: "At x = 0, the output is 11.", latex: "(0-3)^2+2" },
      { title: "Check the right endpoint", explanation: "At x = 2, the output is 3. The visible graph decreases between these endpoints.", latex: "(2-3)^2+2" },
      { title: "Read the allowed minimum", explanation: "The smallest allowed output is 3. The unrestricted vertex output, 2, does not count here." },
    ] }),
    exploration: { title: "Let the interval reach the vertex", prompt: "Move b from 2 to 3, then to 4. Watch the right edge of the allowed graph and identify its lowest point.", expressions: [
      { latex: "b=2", purpose: "Adjust the included right endpoint.", slider: { min: 1, max: 5, step: 1 } },
      { latex: "y=(x-3)^2+2\\left\\{0\\le x\\le b\\right\\}", purpose: "Only show allowed inputs." },
      { latex: "(b,(b-3)^2+2)", purpose: "Mark the moving right endpoint." },
    ], graphBounds: { left: -1, right: 6, bottom: -1, top: 14 }, observations: ["With b = 2, the minimum is 3 at the right endpoint.", "With b = 3 or 4, the vertex (3, 2) is allowed, so the minimum is 2."] },
    checks: [
      { id: "endpoint", question: "Does the restriction 0 <= x < 2 allow x = 2?", choices: [{ label: "A", text: "Yes" }, { label: "B", text: "No" }, { label: "C", text: "Only if the graph is a line" }], correctLabel: "B", explanation: "The strict < excludes 2. By contrast, <= would include it." },
      { id: "vertex", question: "A parabola has its minimum at x = 5, but the question allows only 0 <= x <= 3. Can you report the vertex's output as the restricted minimum?", choices: [{ label: "A", text: "Yes, the vertex always wins" }, { label: "B", text: "Only when its output is positive" }, { label: "C", text: "No, the vertex is outside the allowed domain" }], correctLabel: "C", explanation: "The domain restriction excludes x = 5. Inspect the allowed graph and its endpoints." },
    ],
    pitfalls: ["Do not replace a continuous interval with an integer list; a turning point may lie between integers.", "Keep x-restrictions and y-restrictions distinct: they limit different coordinates."], related: ["quadratics", "lists", "graphing-equations"], sources: [help.restrictions],
  },
  {
    slug: "answer-choice-testing", minutes: 6,
    intro: "If a question gives a short list of possible answers, you can test them together. The useful part is preserving which result belongs to which choice.",
    objectives: ["Enter given numeric choices as a list.", "Test the original condition without changing it.", "Read the passing input rather than the calculated output."],
    sections: [
      { title: "Use exactly the given choices", paragraphs: ["Put the proposed values into a list in their printed order. Apply the same expression to every entry, then compare the results with the required value.", "A choice works only if it satisfies the whole original condition. Matching one part of a multi-condition question is not enough."] },
      { title: "Choose the simpler method", paragraphs: ["A list test is handy when only a few candidates need checking. If graphing the original equation immediately shows the answer, that can be simpler and also works without choices.", "This lesson uses a short equation so you can see exactly how the list and filter behave. The same pattern can test longer expressions."], takeaway: "After a test passes, return to its input or answer-choice label. The calculated output may not be the answer." },
    ],
    example: worked({ question: "Which value in the list 1, 2, 3, 4 satisfies 3x + 2 = 11?", techniqueId: "answer-choice-list", structure: "Test a finite list of candidate values against a linear equation.", why: "Evaluate the left side at every candidate and keep the one whose output equals 11.", answer: "3", graphBounds: { left: 0, right: 5, bottom: 0, top: 16 }, steps: [
      { title: "Enter the candidate values", explanation: "Keep their order so you can connect an output to its original candidate.", latex: "L=[1,2,3,4]" },
      { title: "Test the left side", explanation: "The outputs are [5, 8, 11, 14]. The third output is the required 11.", latex: "3L+2" },
      { title: "Keep the passing candidate", explanation: "The filter returns [3]. It keeps values from L whose test equals 11.", latex: "L[3L+2=11]" },
      { title: "Report the input", explanation: "The candidate is 3. Do not report the test output, 11." },
    ] }),
    exploration: { title: "Change the required output", prompt: "Use k to switch the right side among 5, 8, 11, and 14. Then try 10. Read the filtered list each time.", expressions: [
      { latex: "L=[1,2,3,4]", purpose: "The available candidates." },
      { latex: "k=11", purpose: "The required output.", slider: { min: 5, max: 14, step: 1 } },
      { latex: "L[3L+2=k]", purpose: "Return only candidates that meet the condition." },
      { latex: "(L,3L+2)", purpose: "Plot the candidates and their test outputs." },
      { latex: "y=k", purpose: "The required output as a horizontal line." },
    ], graphBounds: { left: 0, right: 5, bottom: 0, top: 16 }, observations: ["The outputs 5, 8, 11, and 14 match candidates 1, 2, 3, and 4 respectively.", "At k = 10, none of these four candidates passes. That does not mean the equation has no real solution outside the list."] },
    checks: [
      { id: "answer", question: "Testing candidates [2, 4, 6] produces outputs [9, 17, 25]. The required output is 17. Which candidate works?", choices: [{ label: "A", text: "4" }, { label: "B", text: "17" }, { label: "C", text: "2" }], correctLabel: "A", explanation: "17 is the second output, so it belongs to the second candidate, 4." },
      { id: "empty", question: "Your filter returns no values. What have you established?", choices: [{ label: "A", text: "No real number can solve the equation" }, { label: "B", text: "None of the listed candidates passes the test" }, { label: "C", text: "The largest candidate must be correct" }], correctLabel: "B", explanation: "The list test only checks its listed values. Also check your transcription if one printed option is supposed to work." },
    ],
    pitfalls: ["Never substitute answer-choice labels A, B, C, D in place of their numeric values.", "A decimal approximation can obscure an exact equality; keep exact fractions when the question gives them."], related: ["lists", "intersections-and-intercepts", "linear-equations"], sources: [help.lists],
  },
  {
    slug: "bracket-regression", minutes: 8,
    intro: "Bracket regression fits several numerical conditions together. It is useful when the unknowns appear in more than one equation and you want Desmos to find a shared set of values.",
    objectives: ["Keep whole equations when building a bracket regression.", "Pair each left side with its matching right side.", "Distinguish a unique solution from an underdetermined fit."],
    sections: [
      { title: "Put matching conditions in matching positions", paragraphs: ["For two equations, put their left sides in one list and their right sides in a second list, then use a tilde between the lists. The first entries form one condition; the second entries form the other.", "Use parameter names such as a and b for unknown values. x and y have special graphing roles, so this example names the unknown x-value a and the unknown y-value b."] },
      { title: "A fit needs enough independent information", paragraphs: ["Two copies of the same condition do not determine two unknowns. A regression can return one of many possible fits when the problem is underdetermined.", "The example has two lines with different slopes, so it has one shared solution. For this small system, graphing both lines is also simple; brackets become especially useful for several coupled conditions."], takeaway: "A reported parameter is meaningful only if the stated conditions actually determine it." },
    ],
    example: worked({ question: "The equations y = 2x + 1 and y = -x + 7 form a system. What is the value of x + y in its solution?", techniqueId: "bracket-regression", structure: "Two independent linear equations, asked for the sum of the unknown coordinates.", why: "One bracket regression fits both complete equations to the same two unknowns.", answer: "7", graphBounds: { left: -1, right: 5, bottom: -1, top: 9 }, steps: [
      { title: "Name the unknown values", explanation: "Use a for the unknown x-coordinate and b for the unknown y-coordinate. Do not define them with sliders first." },
      { title: "Fit both equations together", explanation: "The first pair says 2a + 1 should equal b; the second says -a + 7 should equal b. Desmos fits a = 2 and b = 5.", latex: "[2a+1,-a+7]\\sim[b,b]" },
      { title: "Read the requested sum", explanation: "Because a represents x and b represents y, this returns x + y = 7.", latex: "a+b" },
    ] }),
    exploration: { title: "Change one condition", prompt: "Change c from 7 to 4, then to 10. Inspect the fitted values of a and b and the sum below them.", expressions: [
      { latex: "c=7", purpose: "Change the second line's constant.", slider: { min: 1, max: 13, step: 1 } },
      { latex: "[2a+1,-a+c]\\sim[b,b]", purpose: "Fit both complete equations together." },
      { latex: "a+b", purpose: "Read the sum of the fitted coordinates." },
      { latex: "(a,b)", purpose: "Plot the fitted solution point." },
    ], graphBounds: { left: -1, right: 6, bottom: -1, top: 12 }, observations: ["At c = 4, the fit is a = 1 and b = 3, so the sum is 4.", "At c = 10, the fit is a = 3 and b = 7, so the sum is 10."] },
    checks: [
      { id: "pairing", question: "In [2a + 1, -a + 7] ~ [b, b], what does the second pair represent?", choices: [{ label: "A", text: "2a + 1 = -a + 7" }, { label: "B", text: "-a + 7 = b" }, { label: "C", text: "b = 0" }], correctLabel: "B", explanation: "Entries pair by position across the tilde. The second entry on the left matches the second entry on the right." },
      { id: "independent", question: "Does writing the same equation twice provide two independent conditions for two unknowns?", choices: [{ label: "A", text: "Yes, there are two rows" }, { label: "B", text: "Only if the numbers are large" }, { label: "C", text: "No, the second copy adds no new information" }], correctLabel: "C", explanation: "Repeated information does not remove another unknown. You need conditions that together determine the requested value." },
    ],
    pitfalls: ["Keep both lists the same length and preserve which sides belong to each equation.", "Never treat a tiny fit error as proof of uniqueness; different parameter sets may satisfy dependent conditions."], related: ["regression", "systems-of-equations", "sliders"], sources: [help.regression, help.lists],
  },
  {
    slug: "advanced-desmos-shortcuts", minutes: 7,
    intro: "Before typing a long formula, check whether Desmos already has a function for the job. A few built-ins can replace repeated coordinate or list calculations.",
    objectives: ["Find the distance between two points with a built-in.", "Recognize when a result is a number versus a point.", "Choose a function that matches the question's requested quantity."],
    sections: [
      { title: "Ask for the quantity you need", paragraphs: ["distance takes two points and returns one length. midpoint takes two points and returns a new point. mean and median work on a data list.", "These functions do different jobs. Decide what the question asks for before choosing one, even when they use the same given numbers."] },
      { title: "Keep the inputs grouped correctly", paragraphs: ["An ordered pair keeps one point's x-coordinate and y-coordinate together. For a two-point function, you need two complete pairs inside the function's outer parentheses.", "A coordinate result may need one final reading step. For example, a midpoint question may ask only for the x-coordinate of the point returned."], takeaway: "Built-ins reduce arithmetic; you still choose the correct inputs and read the requested result." },
    ],
    example: worked({ question: "What is the distance between the points (1, 2) and (7, 10)?", techniqueId: "distance-builtin", structure: "Two fully specified coordinate points, asked for their distance.", why: "The distance built-in computes the length between the two given points directly.", answer: "10", graphBounds: { left: -1, right: 10, bottom: -1, top: 13 }, steps: [
      { title: "Identify the two complete points", explanation: "The first point is (1, 2), and the second is (7, 10). Keep each x-coordinate with its own y-coordinate." },
      { title: "Use the distance function", explanation: "Enter the points as two arguments. Desmos returns the single number 10.", latex: "\\operatorname{distance}((1,2),(7,10))" },
      { title: "Read the length", explanation: "Report 10. This is a distance, not an x-coordinate or a midpoint." },
    ] }),
    exploration: { title: "Compare distance and midpoint", prompt: "Move t from 0 to 3, then to 6. Compare the length returned by distance with the point returned by midpoint.", expressions: [
      { latex: "t=6", purpose: "Move the second point horizontally.", slider: { min: 0, max: 9, step: 1 } },
      { latex: "(1,2)", purpose: "The first point stays fixed." },
      { latex: "(1+t,10)", purpose: "The second point moves with t." },
      { latex: "\\operatorname{distance}((1,2),(1+t,10))", purpose: "Read the length between the two points." },
      { latex: "\\operatorname{midpoint}((1,2),(1+t,10))", purpose: "Read and plot the point halfway between them." },
    ], graphBounds: { left: -1, right: 12, bottom: -1, top: 13 }, observations: ["At t = 0, the points are vertically aligned: the distance is 8 and the midpoint is (1, 6).", "At t = 6, the distance is 10 and the midpoint is (4, 6). The midpoint stays at y = 6 because the endpoint heights do not change."] },
    checks: [
      { id: "quantity", question: "A question asks how far apart two points are. Which built-in directly returns that quantity?", choices: [{ label: "A", text: "midpoint" }, { label: "B", text: "distance" }, { label: "C", text: "median" }], correctLabel: "B", explanation: "distance returns a length. midpoint returns a coordinate point, and median summarizes a list." },
      { id: "midpoint", question: "The midpoint function returns (4, 6), and the question asks for its y-coordinate. What should you report?", choices: [{ label: "A", text: "4" }, { label: "B", text: "10" }, { label: "C", text: "6" }], correctLabel: "C", explanation: "In an ordered pair, the y-coordinate is second. You do not need to add the two coordinates." },
    ],
    pitfalls: ["distance((1, 2), (7, 10)) needs both pairs; dropping parentheses changes the arguments.", "Use the built-in that matches the task instead of trying every function until one output resembles a choice."], related: ["geometry", "statistics-and-data-analysis", "lists"], sources: [help.builtins],
  },
] satisfies LessonContent[];
