/** User example plus coefficient/wording engineering variants, not external SAT questions. */
export const invariantCases = [
  { id: "approved-980", question: "What is the value of 8x² + 18x + 8xy + 9y + 2y² when 2x + y = 20?", answer: "980" },
  { id: "changed-coefficients", question: "What is the value of 12u^2+12uv+3v^2+10u+5v when 2u+v=7?", answer: "182" },
  { id: "negative-coefficients", question: "If 3r-2s=7, what is the value of 9r^2-12rs+4s^2+6r-4s?", answer: "63" },
  { id: "renamed-cubic", question: "Evaluate 8a^3+12a^2b+6ab^2+b^3 when 2a+b=5.", answer: "125" },
  { id: "decimal", question: "Given 0.5u-v=-2. Evaluate (0.5u-v)^2.", answer: "4" },
  { id: "rational", question: "Evaluate (u+v)^3 when u+v=1/3?", answer: "1/27" },
  { id: "two-constraints-free", question: "Real numbers u, v and w satisfy u+v=3 and v-w=1. What is the value of (u+w)^4?", answer: "16" },
  { id: "unique-pair", question: "What is the value of x^2+y^2 when x+y=5 and x-y=1?", answer: "13" },
  { id: "four-parameters", question: "Evaluate (a+b+c+d)^2 when a+b=3 and c+d=4?", answer: "49" },
  { id: "reordered-target", question: "What is the value of: 2y²+9y+8xy+18x+8x² when y+2x=20?", answer: "980" },
] as const;
export const rejectedInvariantCases = [
  "What is the value of x+y when 2x+y=20?",
  "What is the value of x^2+y^2 when x+y=5?",
  "What is the value of (x+y)^2 when x+y=5 and x+y=6?",
  "Evaluate x+y when xy=3?",
  "Evaluate x/x when x+y=3?",
  "Evaluate (x+y)^2 when x+y=3 and x>0?",
  "Evaluate (x+y)^2 when x+y=3. Also x is positive.",
  "Evaluate (x+y)^2 when x+y=3 for positive integers x and y?",
  "Evaluate (x+y)^2 when x+y=3 or x+y=4?",
  "What is the value of x+y+z when x+y=3?",
  "If x+y=3, what is the value of x+y? Assume x is not real.",
  "Real numbers x and y satisfy x+y=3. What is the value of x+y if x=0?",
  "Real numbers x and y satisfy x+y=3 and x+y=3+0.00000000001. Find (x+y)^2.",
  "What is the value of x when 2x=8?",
] as const;
