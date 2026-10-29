import type { Checkpoint } from "@/lib/learn-checkpoint-types";
import type { LessonCalculatorSetup } from "@/lib/lesson-journey-types";
import type { GraphBounds } from "@/lib/solver-schema";

const blank = (caption: string, bounds: GraphBounds | null = null): LessonCalculatorSetup => ({ expressions: [], bounds, caption });
const givens = (rows: [string, string][], caption: string, bounds: GraphBounds | null = null): LessonCalculatorSetup => ({
  expressions: rows.map(([latex, purpose]) => ({ latex, purpose })), bounds, caption,
});

// These setups contain only question givens. Evaluations, fits, and answers are
// left for the student; worked instructions live in feedback shown after grading.
export const CHECKPOINTS: Checkpoint[] = [
  {
    id: "desmos-beginner", path: "desmos", group: "Beginner", title: "Beginner checkpoint",
    description: "Use function evaluations, equations, tables, and intersections.",
    questions: [
      {
        id: "evaluate-rule", title: "Evaluate the given function",
        body: ["For f(x) = 5x − 4, what is f(3)?"],
        calculator: givens([["f(x)=5x-4", "The function given in the question."]], "The rule is provided. Add the evaluation you need.", { left: -1, right: 6, bottom: -6, top: 24 }),
        check: { kind: "number", answer: 11, hint: "Use the function's name with input 3 in parentheses.", explanation: "The row f(3) returns 11.", wrongFeedback: "Evaluate the entire rule at input 3 and report its output.", commonMistakes: [{ answer: 3, feedback: "3 is the input. Read the output beside the evaluation." }, { answer: 15, feedback: "The rule also subtracts 4. Evaluate the complete function." }], solution: ["Keep f(x) = 5x − 4 in the first row.", "Enter f(3) in another row.", "Read the output 11."] },
      },
      {
        id: "graph-equation", title: "Solve an equation directly",
        body: ["What value of x satisfies 5x + 2 = 37?"],
        calculator: blank("Enter the full equation and read its solution.", { left: -2, right: 10, bottom: -4, top: 6 }),
        check: { kind: "number", answer: 7, hint: "Enter 5x + 2 = 37 as one equation. Select its crossing with the x-axis.", explanation: "The equation graphs as a vertical line through (7, 0), so x = 7.", wrongFeedback: "Read the x-coordinate of the vertical line. Keep the +2 in your entry.", commonMistakes: [{ answer: 0, feedback: "0 is the y-coordinate at the axis crossing. Read the first coordinate." }, { answer: 37, feedback: "37 is the required value on the right side, not the input x." }], solution: ["Enter 5x + 2 = 37 without rearranging it.", "Select the vertical line's x-axis crossing, (7, 0).", "Report x = 7."] },
      },
      {
        id: "keep-table-pairs", title: "Keep a table's pairs together",
        body: ["A table contains the points (−1, 5), (2, 11), and (4, 15).", "You reorder the input column to [4, −1, 2]. Which output column preserves the original points?"],
        calculator: blank("Match each reordered input to its original output."),
        check: { kind: "choice", correctId: "paired", choices: [{ id: "original", text: "[5, 11, 15]", feedback: "Leaving the outputs unchanged would pair input 4 with 5 instead of 15." }, { id: "paired", text: "[15, 5, 11]", feedback: "Each input still has its original output." }, { id: "reversed", text: "[15, 11, 5]", feedback: "The first pair is correct, but inputs −1 and 2 now have the wrong outputs." }], hint: "Start with input 4: it must stay paired with 15. Then check the other two.", explanation: "The reordered points are (4, 15), (−1, 5), and (2, 11). Reorder complete pairs together." },
      },
      {
        id: "common-output", title: "Read the common output",
        body: ["The lines y = 4x − 1 and y = x + 8 intersect. What is their common y-value at that point?"],
        calculator: blank("Graph both equations, then read the requested coordinate.", { left: -1, right: 6, bottom: -3, top: 18 }),
        check: { kind: "number", answer: 11, hint: "Select the intersection of the two lines. The question asks for its second coordinate.", explanation: "The intersection is (3, 11). The common output is 11.", wrongFeedback: "Find the crossing between the two lines, then report y rather than x.", commonMistakes: [{ answer: 3, feedback: "3 is the shared input. This question asks for the common output." }, { answer: 8, feedback: "8 is one line's y-intercept. Select the intersection of both lines." }, { answer: -1, feedback: "−1 is the other line's y-intercept, not their common output." }], solution: ["Enter y = 4x − 1 and y = x + 8 on separate rows.", "Select their intersection, (3, 11).", "Read its y-coordinate: 11."] },
      },
    ],
  },
  {
    id: "desmos-intermediate", path: "desmos", group: "Intermediate", title: "Intermediate checkpoint",
    description: "Check shifts, candidate lists, quadratic regression, and restrictions.",
    questions: [
      {
        id: "shift-parameters", title: "Follow two shift parameters",
        body: ["The vertex of f(x) is (1, 2). You define g(x) = f(x − h) + k.", "The sliders are set to h = 3 and k = −2. Where is the vertex of g?"],
        calculator: blank("You may use a simple function with the stated vertex to compare the shifts."),
        check: { kind: "choice", correctId: "right-down", choices: [{ id: "left-down", text: "(−2, 0)", feedback: "The inside x − h moves the graph right when h is positive, not left." }, { id: "right-up", text: "(4, 4)", feedback: "The inside shift is correct, but k = −2 moves the output down 2." }, { id: "right-down", text: "(4, 0)", feedback: "The vertex moves right 3 and down 2." }], hint: "An inside subtraction moves the graph right. The outside k changes its height.", explanation: "Starting at (1, 2), h = 3 shifts the vertex to x = 4 and k = −2 changes its output to 0." },
      },
      {
        id: "filter-candidates", title: "Find the candidate that works",
        body: ["Which value in the list [−2, 1, 4, 7] satisfies 4x − 1 = 15?", "Enter the candidate's value, not its list position."],
        calculator: givens([["L=[-2,1,4,7]", "The supplied candidate values."]], "The candidate list is provided. Test the condition yourself."),
        check: { kind: "number", answer: 4, hint: "Test 4L − 1, or filter with L[4L − 1 = 15].", explanation: "The filter returns [4]. Candidate 4 produces the required output 15.", wrongFeedback: "Return the candidate that makes the original equation true, not its test output or position.", commonMistakes: [{ answer: 15, feedback: "15 is the required output. Report the input that produces it." }, { answer: 3, feedback: "3 is the passing candidate’s list position. Its value is 4." }, { answer: 7, feedback: "7 is the largest candidate, but it gives 27 rather than 15." }], solution: ["Keep L = [−2, 1, 4, 7].", "Enter L[4L − 1 = 15].", "Read the surviving candidate, 4."] },
      },
      {
        id: "fit-quadratic", title: "Predict from three quadratic values",
        body: ["A quadratic function satisfies f(0) = 2, f(1) = 6, and f(3) = 20. What is f(5)?"],
        calculator: givens([["x_{1}=[0,1,3]", "The three given inputs."], ["y_{1}=[2,6,20]", "Their matching outputs."]], "Only the data are loaded. Fit the stated model and evaluate the new input.", { left: -1, right: 7, bottom: -3, top: 60 }),
        check: { kind: "number", answer: 42, tolerance: 0.000001, hint: "Fit y_1 ~ ax_1^2 + bx_1 + c. Define f(x) with ordinary x, then evaluate f(5).", explanation: "The fitted coefficients are a = 1, b = 3, and c = 2. The evaluation f(5) returns 42.", wrongFeedback: "Keep the input-output pairs aligned, use a quadratic fit, and evaluate the requested input after defining f.", commonMistakes: [{ answer: 20, feedback: "20 is the given output at input 3. You need the output at input 5." }, { answer: 5, feedback: "5 is the new input. Read the output from its function evaluation." }, { answer: 3, feedback: "3 is a fitted coefficient, not f(5). Finish with the evaluation row." }], solution: ["Use the provided matching lists.", "Enter y_1 ~ ax_1^2 + bx_1 + c.", "Define f(x) = ax^2 + bx + c using ordinary x.", "Enter f(5) and read 42."] },
      },
      {
        id: "restricted-minimum", title: "Respect the allowed inputs",
        body: ["For f(x) = (x − 5)² + 2 on 1 ≤ x ≤ 4, what is the minimum value?"],
        calculator: blank("Apply the interval restriction before choosing a lowest point.", { left: 0, right: 7, bottom: 0, top: 23 }),
        check: { kind: "number", answer: 3, hint: "Add {1 ≤ x ≤ 4} to the function. Compare the outputs at the included endpoints.", explanation: "The restricted curve decreases to (4, 3). Its minimum output is 3.", wrongFeedback: "The full parabola's vertex lies outside the interval. Read the smallest allowed output.", commonMistakes: [{ answer: 2, feedback: "2 is the full curve's minimum at input 5. Input 5 is not allowed." }, { answer: 4, feedback: "4 is the input where the minimum occurs. Report its output." }, { answer: 18, feedback: "18 is the output at the left endpoint. The right endpoint has a smaller output." }], solution: ["Enter f(x) = (x − 5)^2 + 2 with {1 ≤ x ≤ 4}.", "Evaluate f(1) and f(4), giving 18 and 3.", "The allowed curve decreases between these endpoints, so the minimum is 3."] },
      },
    ],
  },
  {
    id: "desmos-advanced", path: "desmos", group: "Advanced", title: "Advanced checkpoint",
    description: "Fit complete conditions and use coordinate tools.",
    questions: [
      {
        id: "paired-conditions", title: "Fit two conditions together",
        body: ["The numbers a and b satisfy 2a + b = 17 and a − b = 1. What is a + b?"],
        calculator: blank("Fit the complete equations in paired lists, then read the requested sum."),
        check: { kind: "number", answer: 11, tolerance: 0.000001, hint: "Try [2a + b, a − b] ~ [17, 1]. Leave a and b unassigned before fitting.", explanation: "The fit gives a = 6 and b = 5. The row a + b returns 11.", wrongFeedback: "Fit both complete conditions and then evaluate the sum. Do not stop at one parameter.", commonMistakes: [{ answer: 6, feedback: "6 is a. The question asks for a + b." }, { answer: 5, feedback: "5 is b. Add the requested sum as another calculator row." }, { answer: 17, feedback: "17 equals 2a + b, not a + b." }], solution: ["Enter [2a + b, a − b] ~ [17, 1].", "Read the fitted parameters a = 6 and b = 5.", "Enter a + b and read 11."] },
      },
      {
        id: "repeated-condition", title: "Notice when a fit cannot determine a value",
        body: ["You are given a + b = 9 and 2a + 2b = 18. You want a alone.", "What can you conclude from these two conditions?"],
        calculator: blank("Consider whether the second equation adds a different condition."),
        check: { kind: "choice", correctId: "not-unique", choices: [{ id: "not-unique", text: "They do not determine a unique value of a.", feedback: "Both equations impose the same sum, so different a-values can work." }, { id: "a-nine", text: "They force a = 9.", feedback: "That is only one possibility, with b = 0. The conditions also allow other pairs." }, { id: "none", text: "No pair of values can satisfy them.", feedback: "Many pairs satisfy both, such as a = 4 and b = 5." }], hint: "The second equation repeats the first condition at twice its size.", explanation: "Both conditions fix a + b at 9. They leave the individual parameters undetermined, so a fitted pair cannot prove a unique a." },
      },
      {
        id: "coordinate-distance", title: "Measure between two endpoints",
        body: ["What is the distance between (−2, 1) and (4, 9)?"],
        calculator: givens([["(-2,1)", "First endpoint from the question."], ["(4,9)", "Second endpoint from the question."]], "The given endpoints are plotted. Choose the appropriate built-in function.", { left: -4, right: 7, bottom: -2, top: 12 }),
        check: { kind: "number", answer: 10, unit: "units", hint: "Use distance with the two complete ordered pairs.", explanation: "distance((−2, 1), (4, 9)) returns 10.", wrongFeedback: "Measure the straight-line distance with both coordinates from each point.", commonMistakes: [{ answer: 6, feedback: "6 measures only the horizontal change. The endpoints also differ vertically." }, { answer: 8, feedback: "8 measures only the vertical change." }, { answer: 14, feedback: "14 adds the horizontal and vertical changes, measuring a two-leg route rather than the straight segment." }], solution: ["Keep the endpoints as (−2, 1) and (4, 9).", "Enter distance((−2, 1), (4, 9)).", "Read the length 10."] },
      },
      {
        id: "coordinate-midpoint", title: "Find the point halfway between",
        body: ["Which point is the midpoint of (−4, 2) and (6, 8)?"],
        calculator: blank("Use midpoint with the two given coordinate pairs."),
        check: { kind: "choice", correctId: "middle", choices: [{ id: "sum", text: "(2, 10)", feedback: "Those are the coordinate sums. They are not halfway between the endpoints." }, { id: "gaps", text: "(5, 3)", feedback: "Those are half the coordinate gaps, measured without the starting location." }, { id: "middle", text: "(1, 5)", feedback: "This is the point halfway between the two given endpoints." }], hint: "Enter midpoint((−4, 2), (6, 8)) and read the returned point.", explanation: "The midpoint command returns (1, 5). It returns a location, while distance returns a length." },
      },
    ],
  },
  {
    id: "sat-algebra", path: "sat", group: "Algebra", title: "Algebra checkpoint",
    description: "Solve linear equations, fit a line, and interpret systems.",
    questions: [
      {
        id: "two-linear-sides", title: "Find where both sides agree",
        body: ["Solve 6x − 5 = 2x + 23 for x."],
        calculator: blank("Graph each side as its own y-expression.", { left: -1, right: 11, bottom: -8, top: 55 }),
        check: { kind: "number", answer: 7, hint: "Enter y = 6x − 5 and y = 2x + 23. Select their intersection.", explanation: "The graphs meet at (7, 37), so the required x-value is 7.", wrongFeedback: "Report the intersection's x-coordinate and check the signs in both equations.", commonMistakes: [{ answer: 37, feedback: "37 is the common output. This question asks for x." }, { answer: 4.5, feedback: "That would follow from entering +5 instead of −5 on the first side. Check the sign." }], solution: ["Enter y = 6x − 5 and y = 2x + 23.", "Select their intersection, (7, 37).", "Read x = 7."] },
      },
      {
        id: "linear-prediction", title: "Evaluate a fitted line",
        body: ["A linear function has f(1) = 8, f(3) = 18, and f(5) = 28. What is f(7)?"],
        calculator: givens([["x_{1}=[1,3,5]", "Given inputs."], ["y_{1}=[8,18,28]", "Matching outputs."]], "Fit the line using the supplied data, then evaluate the new input.", { left: -1, right: 9, bottom: -5, top: 48 }),
        check: { kind: "number", answer: 38, tolerance: 0.000001, hint: "Fit y_1 ~ mx_1 + b. Define f(x) = mx + b, then evaluate f(7).", explanation: "The fitted line has m = 5 and b = 3. Its output at input 7 is 38.", wrongFeedback: "Use a linear model and finish with f(7), rather than reading a coefficient or an old output.", commonMistakes: [{ answer: 28, feedback: "28 belongs to input 5. The question asks for input 7." }, { answer: 5, feedback: "5 is the fitted slope, not f(7)." }, { answer: 35, feedback: "35 leaves out the line's intercept. Evaluate the whole fitted function." }], solution: ["Fit y_1 ~ mx_1 + b using the matching lists.", "Define f(x) = mx + b.", "Enter f(7) and read 38."] },
      },
      {
        id: "system-output", title: "Choose the requested part of a solution",
        body: ["The equations y = 3x − 2 and y = −2x + 13 hold at the same point. What is y at that point?"],
        calculator: blank("Graph both equations and read their shared point.", { left: -1, right: 7, bottom: -4, top: 17 }),
        check: { kind: "number", answer: 7, hint: "Read the second coordinate of the intersection.", explanation: "The intersection is (3, 7), so y = 7.", wrongFeedback: "Find the intersection of both lines. This time the requested coordinate is y.", commonMistakes: [{ answer: 3, feedback: "3 is x at the intersection. Read the second coordinate for y." }, { answer: 13, feedback: "13 is one line's y-intercept, not the shared solution's output." }], solution: ["Enter y = 3x − 2 and y = −2x + 13.", "Select the intersection, (3, 7).", "Report y = 7."] },
      },
      {
        id: "parallel-system", title: "Interpret two parallel lines",
        body: ["You graph y = 2x + 1 and y = 2x − 4. How many solutions does this system have?"],
        calculator: blank("Graph both lines and compare where they lie.", { left: -4, right: 6, bottom: -12, top: 14 }),
        check: { kind: "choice", correctId: "zero", choices: [{ id: "one", text: "One solution", feedback: "One solution would require one crossing. These lines have the same slope and different intercepts." }, { id: "zero", text: "No solutions", feedback: "The distinct parallel lines never share a point." }, { id: "infinite", text: "Infinitely many solutions", feedback: "That would require the equations to graph as the same line. Their intercepts differ." }], hint: "Compare both the slopes and the intercepts; a shared slope alone does not make lines identical.", explanation: "Both slopes are 2, but the intercepts are 1 and −4. The lines are distinct and parallel, so they never meet." },
      },
    ],
  },
  {
    id: "sat-advanced-math", path: "sat", group: "Advanced math", title: "Advanced math checkpoint",
    description: "Read extrema and roots, group powers, and fit an exponential model.",
    questions: [
      {
        id: "quadratic-maximum", title: "Read a parabola's maximum",
        body: ["What is the maximum value of f(x) = −2x² + 16x − 3?"],
        calculator: blank("Graph the function and select its highest point.", { left: -2, right: 10, bottom: -8, top: 36 }),
        check: { kind: "number", answer: 29, hint: "Select the vertex and read its output, not its input.", explanation: "The parabola's vertex is (4, 29). Its maximum value is 29.", wrongFeedback: "Read the y-coordinate of the highest point. Keep the negative leading coefficient.", commonMistakes: [{ answer: 4, feedback: "4 is the input where the maximum occurs. Report the maximum output." }, { answer: -3, feedback: "−3 is the y-intercept. The highest point is elsewhere." }], solution: ["Enter y = −2x^2 + 16x − 3.", "Select the highest point, (4, 29).", "Read the maximum output, 29."] },
      },
      {
        id: "largest-polynomial-root", title: "Inspect every root",
        body: ["What is the greatest real solution of x³ − 3x² − 4x + 12 = 0?"],
        calculator: blank("Graph the polynomial and inspect its x-intercepts.", { left: -4, right: 5, bottom: -15, top: 20 }),
        check: { kind: "number", answer: 3, hint: "Graph y = x^3 − 3x^2 − 4x + 12. Compare the x-coordinates of all its x-intercepts.", explanation: "The x-intercepts occur at −2, 2, and 3. The greatest solution is 3.", wrongFeedback: "Find all the x-intercepts and choose the greatest x-value, not the greatest height.", commonMistakes: [{ answer: 2, feedback: "2 is a root, but another root lies farther right." }, { answer: -2, feedback: "−2 is the smallest root. The question asks for the greatest." }, { answer: 12, feedback: "12 is the y-intercept's output, not a root." }], solution: ["Graph y = x^3 − 3x^2 − 4x + 12.", "Select the x-intercepts at −2, 2, and 3.", "Choose the greatest input, 3."] },
      },
      {
        id: "fractional-exponent", title: "Keep the entire exponent together",
        body: ["You need to evaluate 16 raised to the power 3/2, then divide the result by 4. Which entry keeps that meaning?"],
        calculator: blank("Pay attention to what belongs inside the exponent."),
        check: { kind: "choice", correctId: "grouped", choices: [{ id: "ungrouped", text: "16^3 / 2 / 4", feedback: "This raises 16 to the third power, then divides by 2. The fraction 3/2 must stay inside the exponent." }, { id: "divisor-inside", text: "16^(3/2/4)", feedback: "This puts the final division by 4 inside the exponent, changing the requested calculation." }, { id: "grouped", text: "16^(3/2) / 4", feedback: "The fraction 3/2 is the whole exponent, and division by 4 comes afterward." }], hint: "Group the fractional exponent in parentheses. The final division belongs outside that group.", explanation: "Use 16^(3/2) / 4. Desmos evaluates the power first and then divides its result by 4, giving 16." },
      },
      {
        id: "exponential-prediction", title: "Predict with an exponential model",
        body: ["An exponential function has the form f(x) = ab^x, with f(0) = 4, f(1) = 8, and f(2) = 16. What is f(5)?"],
        calculator: givens([["x_{1}=[0,1,2]", "The given inputs."], ["y_{1}=[4,8,16]", "Their matching outputs."]], "Fit the exponential model stated in the question.", { left: -1, right: 6, bottom: -5, top: 150 }),
        check: { kind: "number", answer: 128, tolerance: 0.000001, hint: "Fit y_1 ~ ab^(x_1), define f(x) = ab^x, and evaluate f(5).", explanation: "The exponential fit gives a = 4 and b = 2. The evaluation f(5) returns 128.", wrongFeedback: "Use the stated exponential model, keep the pairs aligned, and evaluate the requested input.", commonMistakes: [{ answer: 16, feedback: "16 is the given output at input 2. You need the output at input 5." }, { answer: 32, feedback: "32 is the output at input 3. Check the input in the final evaluation." }, { answer: 2, feedback: "2 is the fitted multiplier b, not f(5)." }], solution: ["Fit y_1 ~ ab^(x_1) using the provided lists.", "Define f(x) = ab^x with ordinary x.", "Enter f(5) and read 128."] },
      },
    ],
  },
  {
    id: "sat-data", path: "sat", group: "Problem solving and data", title: "Data and percentages checkpoint",
    description: "Calculate percent changes and interpret mean and median.",
    questions: [
      {
        id: "discount-price", title: "Calculate the amount remaining",
        body: ["An item costs $150 before an 18% discount. What is its sale price before tax?"],
        calculator: blank("Use the original price and the fraction that remains after the discount."),
        check: { kind: "number", answer: 123, unit: "dollars", hint: "Multiply the original amount by 1 − 18/100.", explanation: "150(1 − 18/100) returns 123, so the sale price is $123.", wrongFeedback: "Calculate the final price, not just the discount amount. The percent is applied to the original $150.", commonMistakes: [{ answer: 27, feedback: "$27 is the discount amount. The question asks for the price remaining." }, { answer: 132, feedback: "This subtracts $18 instead of 18% of $150." }, { answer: 177, feedback: "This increases the price by 18%. A discount decreases it." }], solution: ["Enter 150(1 − 18/100).", "Read the remaining amount, 123.", "The sale price is $123."] },
      },
      {
        id: "percentage-increase", title: "Keep the original amount in an increase",
        body: ["A quantity starts at 50 and increases by 30%. What is its new value?"],
        calculator: blank("Include the original whole as well as the added fraction."),
        check: { kind: "choice", correctId: "new-value", choices: [{ id: "added", text: "15", feedback: "15 is only the amount added. Keep the original 50 too." }, { id: "new-value", text: "65", feedback: "The new amount includes 50 plus a 30% increase." }, { id: "decreased", text: "35", feedback: "35 results from a 30% decrease, not an increase." }], hint: "Use the multiplier 1 + 30/100 on the original amount.", explanation: "50(1 + 30/100) returns 65. The increase adds 15 to the original 50." },
      },
      {
        id: "even-median", title: "Use every observation",
        body: ["What is the median of 2, 5, 5, 8, 12, and 16?"],
        calculator: blank("Enter the complete list, including repeated values."),
        check: { kind: "number", answer: 6.5, hint: "Use median on the full six-entry list. An even count has two middle observations.", explanation: "The two middle observations are 5 and 8. median returns their average, 6.5.", wrongFeedback: "Keep both occurrences of 5 and use median rather than mean.", commonMistakes: [{ answer: 5, feedback: "5 is only the lower middle observation. With six values, the median uses the middle two." }, { answer: 8, feedback: "8 is only the upper middle observation. Do not discard the repeated 5." }, { answer: 6, feedback: "A median can be a decimal. Read the full result rather than rounding it down." }], solution: ["Enter L = [2, 5, 5, 8, 12, 16].", "Enter median(L).", "Read the median, 6.5."] },
      },
      {
        id: "outlier-effect", title: "Compare the two statistics",
        body: ["A data set is [1, 3, 5, 7, 9]. You replace only 9 with 99.", "What happens to its mean and median?"],
        calculator: blank("You can compare mean and median for the original and changed lists."),
        check: { kind: "choice", correctId: "mean-only", choices: [{ id: "both", text: "Both the mean and the median increase.", feedback: "The middle position still contains 5, so the median does not increase." }, { id: "neither", text: "Neither changes.", feedback: "The mean uses every value in the sum, including the changed largest value." }, { id: "mean-only", text: "The mean increases; the median stays the same.", feedback: "The large value changes the average without changing the middle observation." }], hint: "Track the middle position separately from the sum of all observations.", explanation: "The median remains 5. The mean changes from 5 to 23 because the total increases while the count stays at five." },
      },
    ],
  },
  {
    id: "sat-geometry", path: "sat", group: "Geometry and trigonometry", title: "Geometry and trigonometry checkpoint",
    description: "Measure coordinate distances, circle radii, and right-triangle sides.",
    questions: [
      {
        id: "segment-distance", title: "Measure a diagonal segment",
        body: ["What is the distance between (2, −1) and (10, 14)?"],
        calculator: blank("Use the two complete coordinate pairs.", { left: -1, right: 13, bottom: -4, top: 17 }),
        check: { kind: "number", answer: 17, unit: "units", hint: "Use distance((2, −1), (10, 14)).", explanation: "The distance command returns 17 units.", wrongFeedback: "Keep the negative y-coordinate and measure the straight segment using both coordinates.", commonMistakes: [{ answer: 8, feedback: "8 measures only the horizontal change." }, { answer: 15, feedback: "15 measures only the vertical change." }, { answer: 23, feedback: "23 adds the horizontal and vertical changes, measuring a two-leg route." }], solution: ["Enter distance((2, −1), (10, 14)).", "Read the distance, 17."] },
      },
      {
        id: "circle-radius", title: "Measure a circle through its center",
        body: ["A circle has center (3, −2) and equation (x − 3)² + (y + 2)² = 49. What is its radius?"],
        calculator: blank("Use a horizontal line through the supplied center to measure a diameter.", { left: -7, right: 13, bottom: -12, top: 8 }),
        check: { kind: "number", answer: 7, unit: "units", hint: "Graph the circle and y = −2. Read the two intersection x-values, then halve their difference.", explanation: "The diameter endpoints are (−4, −2) and (10, −2). Half their horizontal separation is 7.", wrongFeedback: "Measure through the center and halve the full diameter. The right side of this equation is the radius squared.", commonMistakes: [{ answer: 14, feedback: "14 is the full diameter. A radius is half as long." }, { answer: 49, feedback: "49 is the squared radius in this equation, not the radius." }, { answer: 10, feedback: "10 is the right endpoint's x-coordinate, not the radius." }], solution: ["Graph (x − 3)^2 + (y + 2)^2 = 49.", "Add y = −2 through the supplied center.", "Select the intersections at x = −4 and x = 10.", "Enter (10 − (−4))/2 and read the radius, 7."] },
      },
      {
        id: "opposite-side", title: "Find the side opposite the angle",
        body: ["A right triangle has hypotenuse 20 and an acute angle of 30°. What is the length of the side opposite that angle?"],
        calculator: blank("Choose the angle unit and the trig relationship before calculating."),
        check: { kind: "number", answer: 10, unit: "units", hint: "Use Degrees. Multiply the hypotenuse by sine of the given angle.", explanation: "In Degrees, 20 sin(30) returns 10.", wrongFeedback: "Use sine for opposite over hypotenuse, keep Degrees selected, and multiply by the hypotenuse.", commonMistakes: [{ answer: 0.5, feedback: "0.5 is the sine ratio. Multiply it by the hypotenuse to obtain a side length." }, { answer: 40, feedback: "40 comes from dividing by the ratio. The opposite side must be shorter than the hypotenuse." }, { answer: 20, feedback: "20 is the given hypotenuse, not the opposite side." }], solution: ["Check that the calculator is in Degrees.", "Enter 20 sin(30).", "Read the opposite side length, 10."] },
      },
      {
        id: "angle-unit", title: "Check the angle unit",
        body: ["A right-triangle question gives an angle of 45°. Before evaluating sin(45), which calculator setting matches the given angle?"],
        calculator: blank("Match the calculator's angle unit to the question."),
        check: { kind: "choice", correctId: "degrees", choices: [{ id: "radians", text: "Radians", feedback: "45 radians is a different angle from 45°. The degree symbol specifies the unit." }, { id: "degrees", text: "Degrees", feedback: "This matches the 45° angle stated in the question." }, { id: "either", text: "Either; the sine value is the same.", feedback: "The same number represents different angles in the two units, so the resulting sine values differ." }], hint: "The small ° symbol specifies which unit the number uses.", explanation: "Select Degrees for angles written with °. Keep the entry and the given angle in the same unit." },
      },
    ],
  },
];
