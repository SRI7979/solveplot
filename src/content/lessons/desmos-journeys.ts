import type { LESSONS } from "@/lib/learn-catalog";
import type { LessonJourney } from "@/lib/lesson-journey-types";

type DesmosLessonSlug = Extract<(typeof LESSONS)[number], { path: "desmos" }>["slug"];

// Short, authored journeys: observe, make a choice, try the calculator, then transfer.
// Matching setup values deliberately preserve calculator work between related slides.
export const DESMOS_JOURNEYS = {
  "introduction-to-desmos": {
    "prerequisite": "You can read positive and negative numbers. Desmos experience is not needed.",
    "summary": [
      "Enter a calculation on its own row.",
      "Define a function once, then evaluate it with a new input.",
      "Read a point as (input, output)."
    ],
    "slides": [
      {
        "id": "explore-rule",
        "phase": "Explore",
        "title": "Change the input",
        "body": [
          "This rule multiplies the input by 3, then adds 2.",
          "Move the input. Watch the output and the point change."
        ],
        "visual": {
          "kind": "flow",
          "items": [
            {
              "label": "Input",
              "math": "4"
            },
            {
              "label": "Rule",
              "math": "3x+2",
              "text": "Multiply by 3, then add 2"
            },
            {
              "label": "Output",
              "math": "14"
            }
          ]
        },
        "calculator": {
          "expressions": [
            {
              "latex": "f(x)=3x+2",
              "purpose": "Define the function given in the lesson."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 9,
            "bottom": -5,
            "top": 30
          },
          "caption": "Use an expression row to try the rule and inspect its output."
        }
      },
      {
        "id": "enter-a-calculation",
        "phase": "Try it",
        "title": "Try a calculation",
        "body": [
          "Use an input of 4. Which entry tells Desmos to multiply 4 by 3, then add 2?",
          "Click an empty row to try an entry. Desmos shows the result beside it."
        ],
        "calculator": {
          "expressions": [],
          "bounds": {
            "left": -2,
            "right": 9,
            "bottom": -5,
            "top": 30
          },
          "caption": "Use an expression row to try the rule and inspect its output."
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "multiply-then-add",
              "text": "$3(4)+2$",
              "feedback": "The parentheses mean multiply: 3 times 4, then add 2."
            },
            {
              "id": "add-everything",
              "text": "$3+4+2$",
              "feedback": "This adds all three numbers. The rule says to multiply the input by 3 first."
            },
            {
              "id": "add-before-multiplying",
              "text": "$3(4+2)$",
              "feedback": "This adds 2 before multiplying. In this rule, add 2 after multiplying."
            }
          ],
          "correctId": "multiply-then-add",
          "hint": "A number next to parentheses means multiplication. Keep the +2 outside those parentheses.",
          "explanation": "Desmos returns 14 for 3(4)+2."
        }
      },
      {
        "id": "define-a-function",
        "phase": "Watch",
        "title": "Give the rule a name",
        "body": [
          "Save the rule as $f(x)=3x+2$. It is already entered below.",
          "$f$ is the rule’s name. $x$ marks where the input goes."
        ],
        "entries": [
          {
            "latex": "f(x)=3x+2",
            "label": "Define the function"
          }
        ],
        "calculator": {
          "expressions": [
            {
              "latex": "f(x)=3x+2",
              "purpose": "Define the function given in the lesson."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 9,
            "bottom": -5,
            "top": 30
          },
          "caption": "Use an expression row to try the rule and inspect its output."
        }
      },
      {
        "id": "read-an-output",
        "phase": "Watch",
        "title": "Ask for an output",
        "body": [
          "Enter $f(4)$ on a new row. Desmos uses the rule you saved and shows 14.",
          "The number inside the parentheses is the input. The result is the output."
        ],
        "entries": [
          {
            "latex": "f(4)",
            "label": "Evaluate at input 4"
          }
        ],
        "visual": {
          "kind": "comparison",
          "items": [
            {
              "label": "Input",
              "math": "4"
            },
            {
              "label": "Output",
              "math": "14"
            }
          ]
        },
        "calculator": {
          "expressions": [
            {
              "latex": "f(x)=3x+2",
              "purpose": "Define the function given in the lesson."
            },
            {
              "latex": "f(4)",
              "purpose": "Evaluate the worked example at input 4."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 9,
            "bottom": -5,
            "top": 30
          },
          "caption": "Use an expression row to try the rule and inspect its output."
        }
      },
      {
        "id": "choose-an-evaluation",
        "phase": "Check",
        "title": "Use a different input",
        "body": [
          "Keep $f(x)=3x+2$. Which entry asks for the output when the input is 6?"
        ],
        "calculator": {
          "expressions": [
            {
              "latex": "f(x)=3x+2",
              "purpose": "Define the function given in the lesson."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 9,
            "bottom": -5,
            "top": 30
          },
          "caption": "Use an expression row to try the rule and inspect its output."
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "evaluate-at-six",
              "text": "$f(6)$",
              "feedback": "The 6 inside the parentheses supplies the new input."
            },
            {
              "id": "set-output-six",
              "text": "$f(x)=6$",
              "feedback": "Here 6 is the output you want the function to equal. To supply an input, put 6 inside the parentheses."
            },
            {
              "id": "multiply-old-output",
              "text": "$6f(4)$",
              "feedback": "This multiplies the old output by 6. Change the number inside f’s parentheses to use a new input."
            }
          ],
          "correctId": "evaluate-at-six",
          "hint": "Keep the function’s name, then put the requested input in parentheses.",
          "explanation": "f(6) asks Desmos to evaluate the saved rule at input 6. You do not need to rewrite the rule."
        }
      },
      {
        "id": "connect-a-point",
        "phase": "Check",
        "title": "Put the result on the graph",
        "body": [
          "We found $f(4)=14$. A graph point keeps the input first and the output second.",
          "Which point shows this result?"
        ],
        "entries": [
          {
            "latex": "(4,f(4))",
            "label": "Plot input 4 with its output"
          }
        ],
        "calculator": {
          "expressions": [
            {
              "latex": "f(x)=3x+2",
              "purpose": "Define the function given in the lesson."
            },
            {
              "latex": "f(4)",
              "purpose": "Evaluate the worked example at input 4."
            },
            {
              "latex": "(4,f(4))",
              "purpose": "Plot the worked example as input and output."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 9,
            "bottom": -5,
            "top": 30
          },
          "caption": "Use an expression row to try the rule and inspect its output."
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "input-output",
              "text": "$(4,14)$",
              "feedback": "The input is first; the output is second."
            },
            {
              "id": "output-input",
              "text": "$(14,4)$",
              "feedback": "The numbers are reversed. A point uses (input, output), so put 4 first."
            },
            {
              "id": "rule-numbers",
              "text": "$(3,2)$",
              "feedback": "3 and 2 are numbers in the rule. The point needs the input we used and the output Desmos returned."
            }
          ],
          "correctId": "input-output",
          "hint": "Read an ordered pair as (x, y): input first, output second.",
          "explanation": "The point is (4, 14). In Desmos, (4, f(4)) plots that same point without retyping the output."
        }
      },
      {
        "id": "evaluate-a-new-input",
        "phase": "Try it",
        "title": "Find the next output",
        "body": [
          "The calculator has $f(x)=3x+2$. Find $f(7)$.",
          "Add the evaluation on a new row, then enter the output here."
        ],
        "calculator": {
          "expressions": [
            {
              "latex": "f(x)=3x+2",
              "purpose": "The given function. Add the requested evaluation on a new row."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 9,
            "bottom": -5,
            "top": 30
          },
          "caption": "Use an expression row to try the rule and inspect its output."
        },
        "check": {
          "kind": "number",
          "answer": 23,
          "hint": "The function is already defined. On the next row, type f with 7 inside the parentheses.",
          "explanation": "f(7) returns 23. The input is 7, and its output is 23.",
          "wrongFeedback": "Check that you entered f(7) on a new row. Report the result Desmos shows, rather than the input or a number from the rule.",
          "commonMistakes": [
            {
              "answer": 7,
              "feedback": "7 is the input. Enter f(7) and report the output Desmos returns."
            },
            {
              "answer": 14,
              "feedback": "14 was the output for input 4. This time, put 7 inside the parentheses."
            },
            {
              "answer": 21,
              "feedback": "21 includes the multiplication but leaves out +2. Evaluating f(7) uses the whole saved rule."
            },
            {
              "answer": 9,
              "feedback": "9 is 7+2, which leaves out the multiplication. Let f(7) use the whole saved rule."
            }
          ],
          "solution": [
            "Keep f(x)=3x+2 on the first row.",
            "Enter f(7) on a new row.",
            "Read the output: 23."
          ]
        }
      },
      {
        "id": "use-a-new-function",
        "phase": "Try it",
        "title": "Try a new function",
        "body": [
          "This function is named $g$: $g(x)=4x-3$.",
          "Find $g(6)$. Use the calculator and enter only the output."
        ],
        "calculator": {
          "expressions": [
            {
              "latex": "g(x)=4x-3",
              "purpose": "The new given function. Add the requested evaluation on a new row."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 9,
            "bottom": -5,
            "top": 30
          },
          "caption": "Use an expression row to try the rule and inspect its output."
        },
        "check": {
          "kind": "number",
          "answer": 21,
          "hint": "Use the name g this time. Put the requested input inside its parentheses on a new row.",
          "explanation": "g(6) returns 21. The same evaluation steps work with a different function name and rule.",
          "wrongFeedback": "Use g(6) on a new row. Make sure the definition is g(x)=4x−3 and report the returned output.",
          "commonMistakes": [
            {
              "answer": 6,
              "feedback": "6 is the input. The question asks for the output returned by g(6)."
            },
            {
              "answer": 20,
              "feedback": "20 is f(6) from the earlier rule. This function is named g and uses 4x−3."
            },
            {
              "answer": 24,
              "feedback": "24 leaves out the −3. Entering g(6) uses the complete rule."
            },
            {
              "answer": 27,
              "feedback": "This rule subtracts 3. Check that the first row says g(x)=4x−3, then evaluate g(6)."
            },
            {
              "answer": 3,
              "feedback": "3 is 6−3, which leaves out multiplication by 4. Let g(6) apply the complete rule."
            }
          ],
          "solution": [
            "Keep g(x)=4x−3 on the first row.",
            "Enter g(6) on a new row.",
            "Read the output: 21."
          ]
        }
      },
      {
        "id": "recap",
        "phase": "Understand",
        "title": "You can evaluate a function",
        "body": [
          "Define the rule once. Put each new input inside its function’s parentheses.",
          "To plot a result, use (input, output). Desmos can calculate the output inside the point for you."
        ],
        "visual": {
          "kind": "comparison",
          "items": [
            {
              "label": "Define",
              "math": "f(x)=3x+2",
              "text": "Save the rule"
            },
            {
              "label": "Evaluate",
              "math": "f(7)=23",
              "text": "Read an output"
            },
            {
              "label": "Plot",
              "math": "(7,f(7))",
              "text": "Input first, output second"
            }
          ]
        },
        "calculator": {
          "expressions": [
            {
              "latex": "f(x)=3x+2",
              "purpose": "The given function. Add the requested evaluation on a new row."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 9,
            "bottom": -5,
            "top": 30
          },
          "caption": "Use an expression row to try the rule and inspect its output."
        }
      }
    ]
  },
  "graphing-equations": {
    "prerequisite": "You can enter an expression and read an ordered pair as (x, y).",
    "summary": [
      "Try entering an equation exactly as it is written.",
      "An equation involving only x can graph as a vertical line at its solution.",
      "Read a labeled coordinate and check it in the original equation."
    ],
    "slides": [
      {
        "id": "recognize",
        "phase": "Understand",
        "title": "An equation can go straight into Desmos",
        "body": [
          "To solve 3x + 5 = 20, start by entering that equation. You do not have to isolate x first.",
          "Desmos draws the points where the statement is true."
        ],
        "calculator": {
          "caption": "Copy the complete equation into a blank row.",
          "expressions": [],
          "bounds": {
            "left": -2,
            "right": 10,
            "bottom": -4,
            "top": 6
          }
        }
      },
      {
        "id": "enter-equation",
        "phase": "Watch",
        "title": "Keep both sides of the equation",
        "body": [
          "The graph is a vertical line. Every point on it has the same x-coordinate.",
          "The y-coordinate can vary because the original equation does not mention y."
        ],
        "entries": [
          {
            "latex": "3x+5=20",
            "label": "Graph the original equation"
          }
        ],
        "calculator": {
          "caption": "This vertical line contains the x-value that makes the equation true.",
          "expressions": [
            {
              "latex": "3x+5=20",
              "purpose": "Enter the original equation without rearranging it."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 10,
            "bottom": -4,
            "top": 6
          }
        }
      },
      {
        "id": "read-line",
        "phase": "Watch",
        "title": "Read where it crosses the x-axis",
        "body": [
          "Select the line and its crossing with the x-axis. The point is (5, 0).",
          "The requested value is x, so read the first coordinate: 5."
        ],
        "visual": {
          "kind": "comparison",
          "items": [
            {
              "label": "First coordinate",
              "math": "x=5",
              "text": "This solves the equation."
            },
            {
              "label": "Second coordinate",
              "math": "y=0",
              "text": "This just locates the x-axis crossing."
            }
          ]
        },
        "calculator": {
          "caption": "This vertical line contains the x-value that makes the equation true.",
          "expressions": [
            {
              "latex": "3x+5=20",
              "purpose": "Enter the original equation without rearranging it."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 10,
            "bottom": -4,
            "top": 6
          }
        }
      },
      {
        "id": "what-the-line-means",
        "phase": "Check",
        "title": "One x-value, many points",
        "body": [
          "The equation 3x + 5 = 20 draws a vertical line at x = 5. What can change as you move up or down that line?"
        ],
        "calculator": {
          "caption": "This vertical line contains the x-value that makes the equation true.",
          "expressions": [
            {
              "latex": "3x+5=20",
              "purpose": "Enter the original equation without rearranging it."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 10,
            "bottom": -4,
            "top": 6
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "y",
              "text": "The y-coordinate",
              "feedback": "Yes. The equation fixes x but says nothing about y."
            },
            {
              "id": "x",
              "text": "The x-coordinate",
              "feedback": "Moving up or down a vertical line keeps x fixed at 5."
            },
            {
              "id": "neither",
              "text": "Neither coordinate",
              "feedback": "The line contains many points, such as (5, 0) and (5, 2). Their y-values differ."
            }
          ],
          "correctId": "y",
          "hint": "Compare the points (5, 0) and (5, 2). Which coordinate stays the same?",
          "explanation": "Every point on the line has x = 5. Their y-values can differ because y does not appear in the equation."
        }
      },
      {
        "id": "verify",
        "phase": "Watch",
        "title": "Check the value you read",
        "body": [
          "Use 5 in the equation's left side. Desmos gives 20, matching its right side.",
          "This catches a misread coordinate or a typing mistake without rearranging the equation."
        ],
        "entries": [
          {
            "latex": "3(5)+5",
            "label": "Check the original left side"
          }
        ],
        "calculator": {
          "caption": "Compare the arithmetic result with the original right side, 20.",
          "expressions": [
            {
              "latex": "3x+5=20",
              "purpose": "Enter the original equation without rearranging it."
            },
            {
              "latex": "3(5)+5",
              "purpose": "Check the x-value read from the graph."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 10,
            "bottom": -4,
            "top": 6
          }
        }
      },
      {
        "id": "coordinate-check",
        "phase": "Check",
        "title": "Read another vertical line",
        "body": [
          "A different equation graphs as a vertical line through (6, 0). What value of x does it give?"
        ],
        "calculator": {
          "caption": "Read the x-coordinate of this vertical line.",
          "expressions": [
            {
              "latex": "x=6",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 10,
            "bottom": -4,
            "top": 6
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "six",
              "text": "6",
              "feedback": "The first coordinate gives x. All points on this vertical line have x = 6."
            },
            {
              "id": "zero",
              "text": "0",
              "feedback": "0 is the y-coordinate of the axis crossing, not the x-value being solved for."
            },
            {
              "id": "all",
              "text": "Every x-value",
              "feedback": "A vertical line allows different y-values while fixing one x-value."
            }
          ],
          "correctId": "six",
          "hint": "In (x, y), which coordinate names the horizontal position?",
          "explanation": "The line fixes x at 6, even though its points have many different y-values."
        }
      },
      {
        "id": "move-line",
        "phase": "Explore",
        "title": "Change the equation, watch the solution",
        "body": [
          "Move k from 20 to 8, then to 32. Select the x-axis crossing each time.",
          "Only the right side changes. The vertical line moves because a different x-value makes the new equation true."
        ],
        "calculator": {
          "caption": "Move the right-side value with k.",
          "expressions": [
            {
              "latex": "k=20",
              "purpose": "Change the required right side.",
              "slider": {
                "min": -10,
                "max": 35,
                "step": 1
              }
            },
            {
              "latex": "3x+5=k",
              "purpose": "The vertical line marks the current solution."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 10,
            "bottom": -4,
            "top": 6
          }
        },
        "note": "If a graph goes out of view, adjust the window; do not change the problem to bring it back."
      },
      {
        "id": "try-it",
        "phase": "Try it",
        "title": "Solve a new equation",
        "body": [
          "What value of x satisfies 4x - 3 = 25?",
          "Enter the equation, select its x-axis crossing, and report x."
        ],
        "calculator": {
          "caption": "Enter the new equation and read its x-value.",
          "expressions": [],
          "bounds": {
            "left": -2,
            "right": 10,
            "bottom": -4,
            "top": 6
          }
        },
        "check": {
          "kind": "number",
          "answer": 7,
          "hint": "Copy 4x - 3 = 25 into one row. The resulting vertical line gives the input you need.",
          "explanation": "The line crosses the x-axis at (7, 0), so x = 7.",
          "wrongFeedback": "Keep the minus sign and both sides of the equation. Read x from the vertical line, not the right-side value.",
          "commonMistakes": [
            {
              "answer": 0,
              "feedback": "0 is the y-coordinate at the axis crossing. Read its x-coordinate."
            },
            {
              "answer": 25,
              "feedback": "25 is the required output on the right side. You need the input x that produces it."
            },
            {
              "answer": 5.5,
              "feedback": "That would solve 4x + 3 = 25. The given equation has -3."
            }
          ],
          "solution": [
            "Enter 4x - 3 = 25.",
            "Select the vertical line's x-axis crossing, (7, 0).",
            "Read x = 7. The check 4(7) - 3 returns 25."
          ]
        }
      },
      {
        "id": "solve-for-y",
        "phase": "Try it",
        "title": "This time, solve for y",
        "body": [
          "What value of y satisfies 5y - 4 = 16?",
          "Enter both sides exactly as written. Notice which way the solution line runs."
        ],
        "calculator": {
          "caption": "Enter the complete new equation, then read its fixed coordinate.",
          "expressions": [],
          "bounds": {
            "left": -3,
            "right": 7,
            "bottom": -2,
            "top": 8
          }
        },
        "check": {
          "kind": "number",
          "answer": 4,
          "hint": "Enter 5y - 4 = 16. A horizontal line fixes y, so read its vertical position.",
          "explanation": "The horizontal line lies at y = 4. The equation constrains y rather than x.",
          "wrongFeedback": "Keep the y in the original equation. Read the coordinate that stays fixed along the line.",
          "solution": [
            "Enter 5y - 4 = 16.",
            "Select its y-axis crossing, (0, 4).",
            "Report y = 4."
          ],
          "commonMistakes": [
            {
              "answer": 0,
              "feedback": "0 is the x-coordinate at the y-axis crossing. The question asks for y."
            },
            {
              "answer": 16,
              "feedback": "16 is the right side of the equation. The input y must make the left side equal 16."
            }
          ]
        }
      },
      {
        "id": "takeaway",
        "phase": "Understand",
        "title": "Keep the original equation intact",
        "body": [
          "Use its original signs and parentheses. A different equation can produce a convincing but irrelevant graph.",
          "A blank viewing window does not prove there is no solution. Zoom out before deciding what the graph says."
        ],
        "calculator": {
          "caption": "Enter the new equation and read its x-value.",
          "expressions": [],
          "bounds": {
            "left": -2,
            "right": 10,
            "bottom": -4,
            "top": 6
          }
        }
      }
    ]
  },
  "tables": {
    "prerequisite": "You can define a simple function and recognize a point's input and output.",
    "summary": [
      "Put each input and its output in the same table row.",
      "Use a function of the first column as the second heading to generate outputs.",
      "Read the output in the row containing the requested input."
    ],
    "slides": [
      {
        "id": "recognize",
        "phase": "Understand",
        "title": "Each row is one pair",
        "body": [
          "Tables keep inputs beside their matching outputs. They are useful when a question gives several points or asks you to compare function values.",
          "For f(x) = 2x + 1, we will build a table with inputs 1, 2, 3, and 4."
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "Input",
            "Matching output"
          ],
          "rows": [
            [
              "1",
              "f(1)"
            ],
            [
              "2",
              "f(2)"
            ],
            [
              "3",
              "f(3)"
            ],
            [
              "4",
              "f(4)"
            ]
          ],
          "caption": "Read across a row, not down a different column."
        },
        "calculator": {
          "caption": "Use + → Table to build a native Desmos table for this function.",
          "expressions": [
            {
              "latex": "f(x)=2x+1",
              "purpose": "Use this function in the output column."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 7,
            "bottom": -2,
            "top": 16
          }
        }
      },
      {
        "id": "add-table",
        "phase": "Watch",
        "title": "Make the input column",
        "body": [
          "Use the calculator's + menu and choose Table. Enter 1, 2, 3, and 4 under x_1, one number per row.",
          "Keep the function definition in the expression list. The table can use it regardless of row order."
        ],
        "calculator": {
          "caption": "Use + → Table to build a native Desmos table for this function.",
          "expressions": [
            {
              "latex": "f(x)=2x+1",
              "purpose": "Use this function in the output column."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 7,
            "bottom": -2,
            "top": 16
          }
        },
        "note": "This is a real editable Desmos table. Your work continues on the next slide."
      },
      {
        "id": "output-heading",
        "phase": "Watch",
        "title": "Let the function fill the outputs",
        "body": [
          "Replace the second column's heading with f(x_1). This asks the function to evaluate every input in the first column.",
          "The output beside input 4 is 9. You did not need to calculate each row separately."
        ],
        "entries": [
          {
            "latex": "f(x_{1})",
            "label": "Use as the second column heading"
          }
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "x_1",
            "f(x_1)"
          ],
          "rows": [
            [
              "1",
              "3"
            ],
            [
              "2",
              "5"
            ],
            [
              "3",
              "7"
            ],
            [
              "4",
              "9"
            ]
          ]
        },
        "calculator": {
          "caption": "Use + → Table to build a native Desmos table for this function.",
          "expressions": [
            {
              "latex": "f(x)=2x+1",
              "purpose": "Use this function in the output column."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 7,
            "bottom": -2,
            "top": 16
          }
        }
      },
      {
        "id": "match-an-input",
        "phase": "Check",
        "title": "The row number is not the input",
        "body": [
          "This table uses f(x) = 2x + 1. Which output belongs to input 2?",
          "Find the requested input first, then read across its row."
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "Input",
            "Output"
          ],
          "rows": [
            [
              "-1",
              "-1"
            ],
            [
              "2",
              "5"
            ],
            [
              "5",
              "11"
            ]
          ]
        },
        "calculator": {
          "caption": "These lists preserve the three input-output pairs.",
          "expressions": [
            {
              "latex": "x_{1}=[-1,2,5]",
              "purpose": "Use the original given information."
            },
            {
              "latex": "y_{1}=[-1,5,11]",
              "purpose": "Use the original given information."
            },
            {
              "latex": "(x_{1},y_{1})",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 8,
            "bottom": -4,
            "top": 20
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "five",
              "text": "5",
              "feedback": "Input 2 is paired with output 5 in the same row."
            },
            {
              "id": "two",
              "text": "2",
              "feedback": "2 is the input you looked up. Read the other entry in its row."
            },
            {
              "id": "eleven",
              "text": "11",
              "feedback": "11 belongs to input 5. It is not the output for input 2."
            }
          ],
          "correctId": "five",
          "hint": "Locate 2 in the left column. Its output is directly beside it.",
          "explanation": "The table pairs input 2 with output 5. A row position or the largest output cannot replace that pairing."
        }
      },
      {
        "id": "read-row",
        "phase": "Watch",
        "title": "Find the input before reading the output",
        "body": [
          "To find f(3), first locate 3 in the input column. Then read across that same row: its output is 7.",
          "The row number and the input happen to match here. That is not true for every table."
        ],
        "calculator": {
          "caption": "Use + → Table to build a native Desmos table for this function.",
          "expressions": [
            {
              "latex": "f(x)=2x+1",
              "purpose": "Use this function in the output column."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 7,
            "bottom": -2,
            "top": 16
          }
        }
      },
      {
        "id": "pairing-check",
        "phase": "Check",
        "title": "Can you reverse just one column?",
        "body": [
          "A data table contains (2, 7), (5, 16), and (8, 25). You reverse the input column to 8, 5, 2. What keeps the original points?"
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "Original input",
            "Original output"
          ],
          "rows": [
            [
              "2",
              "7"
            ],
            [
              "5",
              "16"
            ],
            [
              "8",
              "25"
            ]
          ]
        },
        "calculator": {
          "caption": "The plotted pairs are the original data.",
          "expressions": [
            {
              "latex": "x_{1}=[2,5,8]",
              "purpose": "Use the original given information."
            },
            {
              "latex": "y_{1}=[7,16,25]",
              "purpose": "Use the original given information."
            },
            {
              "latex": "(x_{1},y_{1})",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": 0,
            "right": 10,
            "bottom": 0,
            "top": 28
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "same",
              "text": "Keep the outputs as 7, 16, 25",
              "feedback": "That would pair input 8 with output 7 and change the first point."
            },
            {
              "id": "zero",
              "text": "Replace the outputs with zero",
              "feedback": "The given outputs are part of the data. Replacing them creates new points."
            },
            {
              "id": "reverse",
              "text": "Reverse the outputs to 25, 16, 7 too",
              "feedback": "Reversing both columns keeps each original pair together."
            }
          ],
          "correctId": "reverse",
          "hint": "Input 8 must still be paired with its original output, 25.",
          "explanation": "You can reorder whole pairs. Reordering only one column changes which output belongs to each input."
        }
      },
      {
        "id": "edit-input",
        "phase": "Explore",
        "title": "Change one input",
        "body": [
          "In your function table, change the input 2 to 5. Its output should change from 5 to 11.",
          "The other rows keep their values. The output heading applies the rule to each row independently."
        ],
        "calculator": {
          "caption": "Use + → Table to build a native Desmos table for this function.",
          "expressions": [
            {
              "latex": "f(x)=2x+1",
              "purpose": "Use this function in the output column."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 7,
            "bottom": -2,
            "top": 16
          }
        }
      },
      {
        "id": "try-it",
        "phase": "Try it",
        "title": "Build a table for a new rule",
        "body": [
          "For g(x) = 3x + 1, make a table with inputs 0, 2, and 5. What output belongs to input 5?",
          "The function is ready, but the new table is yours to build."
        ],
        "calculator": {
          "caption": "Create your own table using the new function.",
          "expressions": [
            {
              "latex": "g(x)=3x+1",
              "purpose": "The rule for the new table."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 7,
            "bottom": -2,
            "top": 22
          }
        },
        "check": {
          "kind": "number",
          "answer": 16,
          "hint": "Add a table with x_1 as its first heading and g(x_1) as its second. Find the row where x_1 is 5.",
          "explanation": "The table's outputs are 1, 7, and 16. Input 5 is paired with 16.",
          "wrongFeedback": "Find 5 in the input column, then read across. Make sure the output heading uses g and the table's actual input-column name.",
          "commonMistakes": [
            {
              "answer": 5,
              "feedback": "5 is the requested input. Read its matching output in the next column."
            },
            {
              "answer": 7,
              "feedback": "7 belongs to input 2. Use the row containing input 5."
            },
            {
              "answer": 15,
              "feedback": "The rule includes +1. Check that the function is 3x + 1 rather than 3x."
            }
          ],
          "solution": [
            "Keep g(x) = 3x + 1 in the calculator.",
            "Add a table and put 0, 2, and 5 in its x_1 column.",
            "Use g(x_1) as the second heading.",
            "Read 16 beside input 5."
          ]
        }
      },
      {
        "id": "read-a-new-table",
        "phase": "Try it",
        "title": "A new rule and a different row order",
        "body": [
          "Let g(x) = -2x + 8. Make a table using inputs -1, 3, and 6. What output belongs to input 3?",
          "The function is loaded. Use the second-column heading g(x_1), or evaluate the input in a new row to check your table."
        ],
        "calculator": {
          "caption": "Build the new table from its given function.",
          "expressions": [
            {
              "latex": "g(x)=-2x+8",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 7,
            "bottom": -6,
            "top": 12
          }
        },
        "check": {
          "kind": "number",
          "answer": 2,
          "hint": "In the table, use g(x_1) as the second heading. Read across from input 3.",
          "explanation": "The input-output pairs are (-1, 10), (3, 2), and (6, -4). The requested output is 2.",
          "wrongFeedback": "Read the output in the row for input 3. Keep the minus sign in the function.",
          "solution": [
            "Keep g(x) = -2x + 8.",
            "Add a table with inputs -1, 3, and 6.",
            "Use g(x_1) as its output heading.",
            "Read 2 beside input 3; g(3) confirms it."
          ],
          "commonMistakes": [
            {
              "answer": 3,
              "feedback": "3 is the input. Read its output, which is in the next column."
            },
            {
              "answer": -4,
              "feedback": "-4 belongs to input 6. Use the row for input 3."
            },
            {
              "answer": 14,
              "feedback": "14 comes from changing -2x to +2x. Copy the given sign."
            }
          ]
        }
      },
      {
        "id": "takeaway",
        "phase": "Understand",
        "title": "A column name refers to the whole column",
        "body": [
          "x_1 names the input column; the subscript is part of its name. f(x_1) or g(x_1) applies a rule to those inputs.",
          "When copying a printed data table, keep its original pairs. A function-generated table instead calculates each output from the heading you supply."
        ],
        "calculator": {
          "caption": "Create your own table using the new function.",
          "expressions": [
            {
              "latex": "g(x)=3x+1",
              "purpose": "The rule for the new table."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 7,
            "bottom": -2,
            "top": 22
          }
        }
      }
    ]
  },
  "intersections-and-intercepts": {
    "prerequisite": "You can enter equations and read an ordered pair as (x, y).",
    "summary": [
      "An intersection gives an input and output that work in both equations.",
      "An x-intercept has output zero; a y-intercept has input zero.",
      "Read the coordinate the question asks for and check for other crossings."
    ],
    "slides": [
      {
        "id": "recognize",
        "phase": "Understand",
        "title": "Look for a shared point",
        "body": [
          "The equations y = 2x + 1 and y = -x + 7 must both be true. Their intersection is a point that lies on both graphs.",
          "This is useful for systems and for questions asking when two outputs are equal."
        ],
        "calculator": {
          "caption": "Put each given equation on its own row.",
          "expressions": [],
          "bounds": {
            "left": -2,
            "right": 6,
            "bottom": -2,
            "top": 11
          }
        }
      },
      {
        "id": "first-line",
        "phase": "Watch",
        "title": "Enter the first equation",
        "body": [
          "Graph y = 2x + 1 exactly as given.",
          "One graph alone has many points. We still need the second condition to find the shared point."
        ],
        "entries": [
          {
            "latex": "y=2x+1",
            "label": "First equation"
          }
        ],
        "calculator": {
          "caption": "The first equation is on the graph.",
          "expressions": [
            {
              "latex": "y=2x+1",
              "purpose": "First given equation."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 6,
            "bottom": -2,
            "top": 11
          }
        }
      },
      {
        "id": "second-line",
        "phase": "Watch",
        "title": "Add the other condition",
        "body": [
          "Enter y = -x + 7 on another row. Keep the minus sign before x.",
          "Select a line, then select the marked crossing. Desmos labels it (2, 5)."
        ],
        "entries": [
          {
            "latex": "y=-x+7",
            "label": "Second equation"
          }
        ],
        "calculator": {
          "caption": "Select a line, then the point where the two lines meet.",
          "expressions": [
            {
              "latex": "y=2x+1",
              "purpose": "First given equation."
            },
            {
              "latex": "y=-x+7",
              "purpose": "Second given equation."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 6,
            "bottom": -2,
            "top": 11
          }
        }
      },
      {
        "id": "read-crossing",
        "phase": "Watch",
        "title": "Choose the requested coordinate",
        "body": [
          "At (2, 5), both equations have input 2 and output 5.",
          "If the question asks for x, report 2. If it asks for the common output, report 5."
        ],
        "visual": {
          "kind": "comparison",
          "items": [
            {
              "label": "Shared input",
              "math": "x=2"
            },
            {
              "label": "Shared output",
              "math": "y=5"
            }
          ]
        },
        "calculator": {
          "caption": "Select a line, then the point where the two lines meet.",
          "expressions": [
            {
              "latex": "y=2x+1",
              "purpose": "First given equation."
            },
            {
              "latex": "y=-x+7",
              "purpose": "Second given equation."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 6,
            "bottom": -2,
            "top": 11
          }
        }
      },
      {
        "id": "read-the-output",
        "phase": "Check",
        "title": "Same point, different question",
        "body": [
          "The two lines meet at (2, 5). A question asks for their common output. Which number should you report?"
        ],
        "calculator": {
          "caption": "Select a line, then the point where the two lines meet.",
          "expressions": [
            {
              "latex": "y=2x+1",
              "purpose": "First given equation."
            },
            {
              "latex": "y=-x+7",
              "purpose": "Second given equation."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 6,
            "bottom": -2,
            "top": 11
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "output",
              "text": "5",
              "feedback": "The output is the second coordinate of the shared point."
            },
            {
              "id": "input",
              "text": "2",
              "feedback": "2 is the shared input. The question asks for the common output."
            },
            {
              "id": "sum",
              "text": "7",
              "feedback": "Adding the coordinates does not give either coordinate of the intersection."
            }
          ],
          "correctId": "output",
          "hint": "An ordered pair is (input, output), or (x, y).",
          "explanation": "Both equations give output 5 when the input is 2. Read the second coordinate for the common output."
        }
      },
      {
        "id": "intercept-check",
        "phase": "Check",
        "title": "What changes when the output must be zero?",
        "body": [
          "You are asked to solve f(x) = 0 using the graph of y = f(x). Which points matter?"
        ],
        "calculator": {
          "caption": "The zeros of f are where this graph meets the horizontal axis.",
          "expressions": [
            {
              "latex": "f(x)=x^2-9",
              "purpose": "Use the original given information."
            },
            {
              "latex": "y=f(x)",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -5,
            "right": 5,
            "bottom": -11,
            "top": 9
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "x-intercepts",
              "text": "Where the graph meets the x-axis",
              "feedback": "Points on the x-axis have y = 0, so their x-values solve f(x) = 0."
            },
            {
              "id": "y-intercept",
              "text": "Where the graph meets the y-axis",
              "feedback": "The y-axis sets x to zero. It does not require the function's output to be zero."
            },
            {
              "id": "vertex",
              "text": "Only the graph's turning point",
              "feedback": "A turning point can have a nonzero output. The condition here is output zero."
            }
          ],
          "correctId": "x-intercepts",
          "hint": "Which axis contains points whose second coordinate is zero?",
          "explanation": "Roots are x-values at x-intercepts. Do not confuse them with the y-intercept, which fixes the input at zero."
        }
      },
      {
        "id": "move-condition",
        "phase": "Explore",
        "title": "Move one line and follow the intersection",
        "body": [
          "Change b from 7 to 4, then to 10. Select the crossing after each change.",
          "The first line stays fixed. Every new intersection must still lie on it and on the moving second line."
        ],
        "calculator": {
          "caption": "Change the second equation with b.",
          "expressions": [
            {
              "latex": "b=7",
              "purpose": "The second line's intercept.",
              "slider": {
                "min": 1,
                "max": 13,
                "step": 1
              }
            },
            {
              "latex": "y=2x+1",
              "purpose": "Keep the first condition fixed."
            },
            {
              "latex": "y=-x+b",
              "purpose": "Move only the second line."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 6,
            "bottom": -3,
            "top": 14
          }
        }
      },
      {
        "id": "try-it",
        "phase": "Try it",
        "title": "Find the common output",
        "body": [
          "Graph y = 3x - 2 and y = -x + 10. What is their common output at the intersection?",
          "This time the question asks for y, not x."
        ],
        "calculator": {
          "caption": "Graph both new equations. The question asks for their shared output.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -3,
            "top": 14
          }
        },
        "check": {
          "kind": "number",
          "answer": 7,
          "hint": "Enter both equations on separate rows. Select their crossing and read its second coordinate.",
          "explanation": "The graphs meet at (3, 7). Their common output is 7.",
          "wrongFeedback": "Find where the two new lines meet, not where either one meets an axis. Read the y-coordinate of that crossing.",
          "commonMistakes": [
            {
              "answer": 3,
              "feedback": "3 is the shared input. The question asks for the output, the second coordinate."
            },
            {
              "answer": 10,
              "feedback": "10 is one line's y-intercept. It is not the output where both lines meet."
            },
            {
              "answer": -2,
              "feedback": "-2 is the other line's y-intercept. Select the crossing between the two lines."
            }
          ],
          "solution": [
            "Enter y = 3x - 2 and y = -x + 10.",
            "Select their intersection, (3, 7).",
            "Report the second coordinate: 7."
          ]
        }
      },
      {
        "id": "choose-the-right-zero",
        "phase": "Try it",
        "title": "There may be more than one zero",
        "body": [
          "For f(x) = (x - 1)² - 9, what is the greater solution of f(x) = 0?",
          "Graph the function, find both x-intercepts, then apply the word greater."
        ],
        "calculator": {
          "caption": "Use the new graph to find both zeros.",
          "expressions": [
            {
              "latex": "f(x)=(x-1)^2-9",
              "purpose": "Use the original given information."
            },
            {
              "latex": "y=f(x)",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -4,
            "right": 6,
            "bottom": -11,
            "top": 9
          }
        },
        "check": {
          "kind": "number",
          "answer": 4,
          "hint": "Select the parabola, then inspect both x-axis crossings. Compare their x-coordinates.",
          "explanation": "The x-intercepts are (-2, 0) and (4, 0). The greater solution is 4.",
          "wrongFeedback": "Look for x-intercepts rather than the vertex or the y-intercept. The question asks for the greater input.",
          "solution": [
            "Graph y = (x - 1)² - 9.",
            "Read both x-intercepts: (-2, 0) and (4, 0).",
            "Choose the greater x-coordinate, 4."
          ],
          "commonMistakes": [
            {
              "answer": -2,
              "feedback": "-2 is a solution, but the other x-intercept has a greater x-coordinate."
            },
            {
              "answer": 1,
              "feedback": "1 is the vertex input. A zero needs output 0."
            },
            {
              "answer": 0,
              "feedback": "0 is the output at both x-intercepts. Report the requested input."
            }
          ]
        }
      },
      {
        "id": "takeaway",
        "phase": "Understand",
        "title": "Name the point you need before clicking",
        "body": [
          "“Both equations” means an intersection. “Output is zero” means an x-intercept. “Input is zero” means a y-intercept.",
          "Curves can meet more than once. Read the question's restrictions and inspect the relevant part of the graph."
        ],
        "visual": {
          "kind": "flow",
          "items": [
            {
              "label": "Both equations",
              "text": "Their crossing"
            },
            {
              "label": "Output zero",
              "text": "x-axis crossing"
            },
            {
              "label": "Input zero",
              "text": "y-axis crossing"
            }
          ]
        },
        "calculator": {
          "caption": "Graph both new equations. The question asks for their shared output.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -3,
            "top": 14
          }
        }
      }
    ]
  },
  "sliders": {
    "prerequisite": "You can graph a line and recognize whether a point lies on it.",
    "summary": [
      "A parameter changes the graph while x and y describe its coordinates.",
      "Set a range and step size that let you test the needed values.",
      "Check a visual match using the condition's actual numbers."
    ],
    "slides": [
      {
        "id": "recognize",
        "phase": "Understand",
        "title": "One number controls a family of lines",
        "body": [
          "In y = mx + 1, changing m changes the line. m is a parameter: one number you adjust while the graph updates.",
          "A condition such as “passes through (2, 7)” gives you something to match."
        ],
        "visual": {
          "kind": "comparison",
          "items": [
            {
              "label": "Parameter",
              "math": "m",
              "text": "Chooses which line you see."
            },
            {
              "label": "Coordinates",
              "math": "(x,y)",
              "text": "Describe points on the chosen line."
            }
          ]
        },
        "calculator": {
          "caption": "Create a parameter before using it in the line.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 5,
            "bottom": -2,
            "top": 14
          }
        }
      },
      {
        "id": "create-slider",
        "phase": "Watch",
        "title": "Start with a trial value",
        "body": [
          "Enter m = 1, then y = mx + 1. The slider changes m without rewriting the equation.",
          "Move it a little and watch the line turn. Every setting still crosses the y-axis at 1."
        ],
        "entries": [
          {
            "latex": "m=1",
            "label": "Create the parameter"
          },
          {
            "latex": "y=mx+1",
            "label": "Use it in the line"
          }
        ],
        "calculator": {
          "caption": "Move m to change the line; x and y remain graph coordinates.",
          "expressions": [
            {
              "latex": "m=1",
              "purpose": "A trial slope, not a fitted answer.",
              "slider": {
                "min": -2,
                "max": 6,
                "step": 1
              }
            },
            {
              "latex": "y=mx+1",
              "purpose": "The line controlled by m."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 5,
            "bottom": -2,
            "top": 14
          }
        }
      },
      {
        "id": "parameter-or-coordinate",
        "phase": "Check",
        "title": "What does the slider control?",
        "body": [
          "The rows are m = 1 and y = mx + 1. When you drag the m slider, what changes?"
        ],
        "calculator": {
          "caption": "Move m to change the line; x and y remain graph coordinates.",
          "expressions": [
            {
              "latex": "m=1",
              "purpose": "A trial slope, not a fitted answer.",
              "slider": {
                "min": -2,
                "max": 6,
                "step": 1
              }
            },
            {
              "latex": "y=mx+1",
              "purpose": "The line controlled by m."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 5,
            "bottom": -2,
            "top": 14
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "slope",
              "text": "The line’s slope",
              "feedback": "m is the multiplier of x. Changing it rotates the line while keeping its y-intercept at 1."
            },
            {
              "id": "input",
              "text": "The graph’s only allowed x-value",
              "feedback": "x still ranges along the line. The slider changes the rule, not one chosen input."
            },
            {
              "id": "intercept",
              "text": "Only the y-intercept",
              "feedback": "The +1 fixes the y-intercept. The changing m controls the slope."
            }
          ],
          "correctId": "slope",
          "hint": "Look at which part of y = mx + 1 contains m.",
          "explanation": "m is a parameter in the rule. Moving it changes the whole line; it does not supply an x-coordinate."
        }
      },
      {
        "id": "target-point",
        "phase": "Watch",
        "title": "Plot what the question requires",
        "body": [
          "Add the given point (2, 7). Move m until the line reaches that point.",
          "At m = 3 the line passes through it. The slider started at 1 only as a trial."
        ],
        "entries": [
          {
            "latex": "(2,7)",
            "label": "Plot the required point"
          }
        ],
        "calculator": {
          "caption": "Adjust m until the line passes through the given point.",
          "expressions": [
            {
              "latex": "m=1",
              "purpose": "A trial slope, not a fitted answer.",
              "slider": {
                "min": -2,
                "max": 6,
                "step": 1
              }
            },
            {
              "latex": "y=mx+1",
              "purpose": "The line controlled by m."
            },
            {
              "latex": "(2,7)",
              "purpose": "The point required by the question."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 5,
            "bottom": -2,
            "top": 14
          }
        }
      },
      {
        "id": "verify-condition",
        "phase": "Watch",
        "title": "Check more than the picture",
        "body": [
          "Set m to 3, then inspect 2m + 1. This is the line's output at the point's input, 2.",
          "It gives 7, matching the required y-coordinate. That confirms the setting."
        ],
        "entries": [
          {
            "latex": "2m+1",
            "label": "Check the required output"
          }
        ],
        "calculator": {
          "caption": "The matching slope is 3. Compare the final row with the required output, 7.",
          "expressions": [
            {
              "latex": "m=3",
              "purpose": "The slope found by matching the required point.",
              "slider": {
                "min": -2,
                "max": 6,
                "step": 1
              }
            },
            {
              "latex": "y=mx+1",
              "purpose": "The line controlled by m."
            },
            {
              "latex": "(2,7)",
              "purpose": "The point required by the question."
            },
            {
              "latex": "2m+1",
              "purpose": "The line's output at x = 2."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 5,
            "bottom": -2,
            "top": 14
          }
        }
      },
      {
        "id": "step-check",
        "phase": "Check",
        "title": "A whole-number step skips the match",
        "body": [
          "A slider jumps from 2 to 3, but the line must lie between those settings. What should you do?"
        ],
        "calculator": {
          "caption": "This whole-number slider skips the matching slope.",
          "expressions": [
            {
              "latex": "m=2",
              "purpose": "Try a whole-number slope."
            },
            {
              "latex": "y=mx-2",
              "purpose": "Use the original given information."
            },
            {
              "latex": "(4,8)",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -4,
            "top": 15
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "round",
              "text": "Pick the closer whole number",
              "feedback": "The condition needs to be satisfied, not just approximated by the nearest available setting."
            },
            {
              "id": "finer",
              "text": "Use a finer step and check the condition",
              "feedback": "The step controls which values you can try. Smaller steps let you test values between the integers."
            },
            {
              "id": "none",
              "text": "Conclude there is no solution",
              "feedback": "Skipping a value does not prove that it cannot work."
            }
          ],
          "correctId": "finer",
          "hint": "A slider setting is a test value. Its step size is not a restriction supplied by the question.",
          "explanation": "Use a suitable step size, then verify the required output. If a precise match remains hard to find, use a graph intersection or regression instead of guessing."
        }
      },
      {
        "id": "explore",
        "phase": "Explore",
        "title": "Separate slope from starting height",
        "body": [
          "Move m between -2 and 4. Notice which direction the line tilts and which point stays fixed.",
          "The fixed point is (0, 1). Changing m does not change the +1 in the equation."
        ],
        "calculator": {
          "caption": "Move m to change the line; x and y remain graph coordinates.",
          "expressions": [
            {
              "latex": "m=1",
              "purpose": "A trial slope, not a fitted answer.",
              "slider": {
                "min": -2,
                "max": 6,
                "step": 1
              }
            },
            {
              "latex": "y=mx+1",
              "purpose": "The line controlled by m."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 5,
            "bottom": -2,
            "top": 14
          }
        }
      },
      {
        "id": "try-it",
        "phase": "Try it",
        "title": "Find a slope between whole numbers",
        "body": [
          "The line y = mx - 2 passes through (4, 8). What is m?",
          "The slider now moves in steps of 0.5. Adjust it, then use a new row to verify the output at x = 4."
        ],
        "calculator": {
          "caption": "This new slope starts at 1. Move it, then check the required point.",
          "expressions": [
            {
              "latex": "m=1",
              "purpose": "Adjust this trial value.",
              "slider": {
                "min": -2,
                "max": 5,
                "step": 0.5
              }
            },
            {
              "latex": "y=mx-2",
              "purpose": "The new line from the question."
            },
            {
              "latex": "(4,8)",
              "purpose": "The point the new line must pass through."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -4,
            "top": 15
          }
        },
        "check": {
          "kind": "number",
          "answer": 2.5,
          "hint": "Move m until the line reaches (4, 8). Add 4m - 2 to check that the output is exactly 8.",
          "explanation": "At m = 2.5, the line's output at x = 4 is 8, so the point lies on it.",
          "wrongFeedback": "Report the slider's value after the line passes through (4, 8). Check the whole expression 4m - 2.",
          "commonMistakes": [
            {
              "answer": 2,
              "feedback": "At m = 2, the output at x = 4 is 6, not 8. The -2 matters."
            },
            {
              "answer": 4,
              "feedback": "4 is the point's input, not the slope parameter."
            },
            {
              "answer": 8,
              "feedback": "8 is the required output. Report m, the slider setting that produces it."
            }
          ],
          "solution": [
            "Use y = mx - 2 and the point (4, 8).",
            "Adjust m to 2.5.",
            "Enter 4m - 2; the result is 8.",
            "Report m = 2.5."
          ]
        }
      },
      {
        "id": "fit-a-different-parameter",
        "phase": "Try it",
        "title": "Move the intercept instead",
        "body": [
          "The line y = 2x + b passes through (3, 11). What value of b works?",
          "This slider changes b rather than the slope. After matching the point, check the line’s output at x = 3."
        ],
        "calculator": {
          "caption": "Adjust b until the new line reaches the point.",
          "expressions": [
            {
              "latex": "b=0",
              "purpose": "Change the vertical intercept."
            },
            {
              "latex": "y=2x+b",
              "purpose": "Use the original given information."
            },
            {
              "latex": "(3,11)",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 5,
            "bottom": -3,
            "top": 16
          }
        },
        "check": {
          "kind": "number",
          "answer": 5,
          "hint": "Adjust b. Add 2(3) + b on another row and compare its output with 11.",
          "explanation": "At b = 5, the line reaches (3, 11), and 2(3) + b returns 11.",
          "wrongFeedback": "Report the slider value, not the point’s input or output. Verify the condition after moving it.",
          "solution": [
            "Move b until y = 2x + b passes through (3, 11).",
            "Set b to 5.",
            "Evaluate 2(3) + b to check the required output, 11.",
            "Report b = 5."
          ],
          "commonMistakes": [
            {
              "answer": 3,
              "feedback": "3 is the given input. The requested parameter is b."
            },
            {
              "answer": 11,
              "feedback": "11 is the required output, not the slider setting."
            },
            {
              "answer": 2,
              "feedback": "2 is the fixed slope. The b slider controls the intercept."
            }
          ]
        }
      },
      {
        "id": "takeaway",
        "phase": "Understand",
        "title": "A slider tests a condition",
        "body": [
          "Use a slider to understand how a parameter changes a graph or to test a manageable set of values.",
          "A near match by eye is not an exact answer. Keep checking the actual condition, especially with decimal values."
        ],
        "calculator": {
          "caption": "This new slope starts at 1. Move it, then check the required point.",
          "expressions": [
            {
              "latex": "m=1",
              "purpose": "Adjust this trial value.",
              "slider": {
                "min": -2,
                "max": 5,
                "step": 0.5
              }
            },
            {
              "latex": "y=mx-2",
              "purpose": "The new line from the question."
            },
            {
              "latex": "(4,8)",
              "purpose": "The point the new line must pass through."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -4,
            "top": 15
          }
        }
      }
    ]
  },
  "lists": {
    "prerequisite": "You can define a function and match each input with its output.",
    "summary": [
      "Square brackets hold the values you want to test.",
      "A function applied to a list evaluates every entry in order.",
      "A list test covers only its listed values, not every number between them."
    ],
    "slides": [
      {
        "id": "recognize",
        "phase": "Understand",
        "title": "Repeat one calculation for several inputs",
        "body": [
          "Suppose f(x) = x² + 2x and the allowed inputs are 1, 2, 3, and 4. You need the largest of those four outputs.",
          "A list lets Desmos evaluate them together, keeping their order."
        ],
        "visual": {
          "kind": "flow",
          "items": [
            {
              "label": "Inputs",
              "math": "[1,2,3,4]"
            },
            {
              "label": "Rule",
              "math": "f(x)=x^2+2x"
            },
            {
              "label": "Task",
              "text": "Compare the four outputs."
            }
          ]
        },
        "calculator": {
          "caption": "Define the input list and the rule.",
          "expressions": [],
          "bounds": {
            "left": -2,
            "right": 6,
            "bottom": -5,
            "top": 35
          }
        }
      },
      {
        "id": "input-list",
        "phase": "Watch",
        "title": "Use brackets for the inputs",
        "body": [
          "Enter L = [1, 2, 3, 4] and define f. L is just a name for this list.",
          "Keep exactly the inputs the question allows. Do not add values because they make the graph look smoother."
        ],
        "entries": [
          {
            "latex": "L=[1,2,3,4]",
            "label": "Name the input list"
          },
          {
            "latex": "f(x)=x^2+2x",
            "label": "Define the rule"
          }
        ],
        "calculator": {
          "caption": "The list contains exactly the inputs being tested.",
          "expressions": [
            {
              "latex": "L=[1,2,3,4]",
              "purpose": "The four permitted inputs."
            },
            {
              "latex": "f(x)=x^2+2x",
              "purpose": "Apply this rule to each input."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 6,
            "bottom": -5,
            "top": 35
          }
        }
      },
      {
        "id": "evaluate-list",
        "phase": "Watch",
        "title": "Apply the rule to the whole list",
        "body": [
          "Enter f(L). Desmos gives [3, 8, 15, 24].",
          "The third output, 15, belongs to the third input, 3. The positions preserve the pairing."
        ],
        "entries": [
          {
            "latex": "f(L)",
            "label": "Evaluate every listed input"
          }
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "Input",
            "Output"
          ],
          "rows": [
            [
              "1",
              "3"
            ],
            [
              "2",
              "8"
            ],
            [
              "3",
              "15"
            ],
            [
              "4",
              "24"
            ]
          ]
        },
        "calculator": {
          "caption": "Outputs stay in the same order as the inputs.",
          "expressions": [
            {
              "latex": "L=[1,2,3,4]",
              "purpose": "The four permitted inputs."
            },
            {
              "latex": "f(x)=x^2+2x",
              "purpose": "Apply this rule to each input."
            },
            {
              "latex": "f(L)",
              "purpose": "Evaluate all four inputs together."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 6,
            "bottom": -5,
            "top": 35
          }
        }
      },
      {
        "id": "keep-the-position",
        "phase": "Check",
        "title": "Outputs keep their input order",
        "body": [
          "The inputs are L = [1, 2, 3, 4], and f(L) returns [3, 8, 15, 24]. Which input produced 15?"
        ],
        "calculator": {
          "caption": "Outputs stay in the same order as the inputs.",
          "expressions": [
            {
              "latex": "L=[1,2,3,4]",
              "purpose": "The four permitted inputs."
            },
            {
              "latex": "f(x)=x^2+2x",
              "purpose": "Apply this rule to each input."
            },
            {
              "latex": "f(L)",
              "purpose": "Evaluate all four inputs together."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 6,
            "bottom": -5,
            "top": 35
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "three",
              "text": "3",
              "feedback": "15 is third in the output list, so it belongs to the third input, 3."
            },
            {
              "id": "fifteen",
              "text": "15",
              "feedback": "15 is an output. Find its position, then read the input in that position."
            },
            {
              "id": "four",
              "text": "4",
              "feedback": "Input 4 is fourth and produces the fourth output, 24."
            }
          ],
          "correctId": "three",
          "hint": "Match the third output with the third input.",
          "explanation": "A list evaluation preserves position. The output 15 comes from input 3."
        }
      },
      {
        "id": "maximum",
        "phase": "Watch",
        "title": "Ask for the largest output",
        "body": [
          "Use max(f(L)). It selects the greatest number from the output list: 24.",
          "max(L) would instead select the largest input. Choose the list that contains the quantity the question asks for."
        ],
        "entries": [
          {
            "latex": "\\operatorname{max}(f(L))",
            "label": "Select the largest output"
          }
        ],
        "calculator": {
          "caption": "max chooses an output from the evaluated list.",
          "expressions": [
            {
              "latex": "L=[1,2,3,4]",
              "purpose": "The four permitted inputs."
            },
            {
              "latex": "f(x)=x^2+2x",
              "purpose": "Apply this rule to each input."
            },
            {
              "latex": "f(L)",
              "purpose": "Evaluate all four inputs together."
            },
            {
              "latex": "\\operatorname{max}(f(L))",
              "purpose": "Read the largest listed output."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 6,
            "bottom": -5,
            "top": 35
          }
        }
      },
      {
        "id": "finite-check",
        "phase": "Check",
        "title": "What did the list actually test?",
        "body": [
          "You evaluate a function at [0, 1, 2, 3]. Does that check every possible input from 0 to 3?"
        ],
        "calculator": {
          "caption": "These are the four tested inputs; the gaps are not added.",
          "expressions": [
            {
              "latex": "L=[0,1,2,3]",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 8,
            "bottom": -4,
            "top": 20
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "endpoints",
              "text": "Yes, because both endpoints are included",
              "feedback": "Including the endpoints does not include the unlisted values between them."
            },
            {
              "id": "fills",
              "text": "Yes, Desmos fills the gaps automatically",
              "feedback": "A list evaluation uses its entries only. It does not add decimal inputs."
            },
            {
              "id": "finite",
              "text": "No; an input such as 1.5 was not tested",
              "feedback": "Exactly. The list contains four values, and 1.5 is not one of them."
            }
          ],
          "correctId": "finite",
          "hint": "Read the entries inside the brackets. Is 1.5 there?",
          "explanation": "Lists are appropriate for a specified set of inputs, answer choices, or justified integer candidates. A continuous interval requires a different check."
        }
      },
      {
        "id": "filter",
        "phase": "Explore",
        "title": "Keep only inputs that pass a test",
        "body": [
          "The row L[f(L) > k] returns inputs whose outputs exceed k. L stays outside the condition because we want inputs back.",
          "Change k from 20 to 50. Compare the surviving inputs with the plotted points."
        ],
        "entries": [
          {
            "latex": "L[f(L)>k]",
            "label": "Filter the inputs"
          }
        ],
        "calculator": {
          "caption": "The threshold changes which listed inputs remain.",
          "expressions": [
            {
              "latex": "L=[1,2,3,4,5,6,7,8]",
              "purpose": "The finite candidates."
            },
            {
              "latex": "f(x)=x^2+2x",
              "purpose": "The rule to test."
            },
            {
              "latex": "k=20",
              "purpose": "The output threshold.",
              "slider": {
                "min": 0,
                "max": 80,
                "step": 5
              }
            },
            {
              "latex": "N=L[f(L)>k]",
              "purpose": "Keep candidate inputs whose outputs exceed k."
            },
            {
              "latex": "(N,f(N))",
              "purpose": "Plot only the surviving pairs."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 9,
            "bottom": -5,
            "top": 90
          }
        }
      },
      {
        "id": "try-it",
        "phase": "Try it",
        "title": "Compare a new set of outputs",
        "body": [
          "For f(x) = x² - 2x and L = [-2, 1, 3], what is the greatest listed output?",
          "Do not assume the largest input produces it. Evaluate the list first."
        ],
        "calculator": {
          "caption": "Only the new inputs and rule are provided. Choose the appropriate calculation.",
          "expressions": [
            {
              "latex": "L=[-2,1,3]",
              "purpose": "Only these three inputs are allowed."
            },
            {
              "latex": "f(x)=x^2-2x",
              "purpose": "The new function."
            }
          ],
          "bounds": {
            "left": -4,
            "right": 5,
            "bottom": -3,
            "top": 14
          }
        },
        "check": {
          "kind": "number",
          "answer": 8,
          "hint": "Evaluate f(L), then apply max to that output list.",
          "explanation": "The output list is [8, -1, 3]. Its largest value is 8, which comes from input -2.",
          "wrongFeedback": "Compare outputs from all three inputs, including the negative one. The question asks for an output, not an input.",
          "commonMistakes": [
            {
              "answer": 3,
              "feedback": "3 is both the largest input and its output here, but input -2 produces a larger output."
            },
            {
              "answer": -1,
              "feedback": "-1 is the smallest output. The question asks for the greatest."
            },
            {
              "answer": -2,
              "feedback": "-2 is the input that produces the greatest output. Report its output instead."
            }
          ],
          "solution": [
            "Keep L = [-2, 1, 3] and f(x) = x² - 2x.",
            "Enter f(L), which returns [8, -1, 3].",
            "Enter max(f(L)) and read 8."
          ]
        }
      },
      {
        "id": "filter-and-count",
        "phase": "Try it",
        "title": "Keep just the inputs that pass",
        "body": [
          "For L = [-3, 0, 2, 5], how many entries are greater than 1?",
          "Try L[L > 1]. This returns the passing entries; count tells you how many there are."
        ],
        "entries": [
          {
            "latex": "\\operatorname{count}(L[L>1])",
            "label": "Count entries that pass the filter"
          }
        ],
        "calculator": {
          "caption": "Only the original list is entered.",
          "expressions": [
            {
              "latex": "L=[-3,0,2,5]",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 8,
            "bottom": -4,
            "top": 20
          }
        },
        "check": {
          "kind": "number",
          "answer": 2,
          "hint": "Filter with L[L > 1]. Count the values in the resulting list, or use count on that list.",
          "explanation": "The filter returns [2, 5]. It contains two entries.",
          "wrongFeedback": "The question asks how many entries pass, rather than their sum or the largest value.",
          "solution": [
            "Enter L[L > 1] to get [2, 5].",
            "Enter count(L[L > 1]).",
            "Read the count, 2."
          ],
          "commonMistakes": [
            {
              "answer": 5,
              "feedback": "5 is a passing value, but it is not the number of passing entries."
            },
            {
              "answer": 7,
              "feedback": "7 is the sum of the passing values. Count the entries instead."
            },
            {
              "answer": 4,
              "feedback": "4 counts every original entry. Only two satisfy the condition."
            }
          ]
        }
      },
      {
        "id": "takeaway",
        "phase": "Understand",
        "title": "Keep inputs and outputs distinct",
        "body": [
          "Use max(L) for a largest input, max(f(L)) for a largest output, and a filter on L when you want inputs that meet a condition.",
          "These operations save repeated arithmetic. They do not expand the set of values you tested."
        ],
        "calculator": {
          "caption": "Only the new inputs and rule are provided. Choose the appropriate calculation.",
          "expressions": [
            {
              "latex": "L=[-2,1,3]",
              "purpose": "Only these three inputs are allowed."
            },
            {
              "latex": "f(x)=x^2-2x",
              "purpose": "The new function."
            }
          ],
          "bounds": {
            "left": -4,
            "right": 5,
            "bottom": -3,
            "top": 14
          }
        }
      }
    ]
  },
  "regression": {
    "prerequisite": "You can define and evaluate a function, and keep inputs paired with their outputs.",
    "summary": [
      "Use the model the question specifies, with input and output lists kept in matching order.",
      "Use ~ to fit unknown coefficients; leave those coefficients unassigned beforehand.",
      "Define f(x) with ordinary x, then evaluate the requested input."
    ],
    "slides": [
      {
        "id": "recognize",
        "phase": "Understand",
        "title": "The values are given, but the rule is missing",
        "body": [
          "A quadratic function has f(1) = 8, f(2) = 15, and f(4) = 35. You need f(10).",
          "Regression can fit the missing coefficients in ax² + bx + c. We use a quadratic because the question says the function is quadratic."
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "Input",
            "Output"
          ],
          "rows": [
            [
              "1",
              "8"
            ],
            [
              "2",
              "15"
            ],
            [
              "4",
              "35"
            ]
          ],
          "caption": "Each row is one given fact about the same function."
        },
        "calculator": {
          "caption": "Start with the three pairs, before choosing any coefficients.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 11,
            "bottom": -5,
            "top": 165
          }
        }
      },
      {
        "id": "pair-data",
        "phase": "Watch",
        "title": "Put matching values in matching positions",
        "body": [
          "The first entries form (1, 8), the second form (2, 15), and the third form (4, 35).",
          "x_1 and y_1 are list names. Keep their subscripts and their pairing."
        ],
        "entries": [
          {
            "latex": "x_{1}=[1,2,4]",
            "label": "Given inputs"
          },
          {
            "latex": "y_{1}=[8,15,35]",
            "label": "Matching outputs"
          }
        ],
        "calculator": {
          "caption": "Positions in the two lists form the given input-output pairs.",
          "expressions": [
            {
              "latex": "x_{1}=[1,2,4]",
              "purpose": "Given inputs, in order."
            },
            {
              "latex": "y_{1}=[8,15,35]",
              "purpose": "Matching outputs, in the same order."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 11,
            "bottom": -5,
            "top": 165
          }
        }
      },
      {
        "id": "fit-model",
        "phase": "Watch",
        "title": "Ask Desmos to fit the unknown coefficients",
        "body": [
          "Use ~ between the output list and the model. It asks Desmos to find a, b, and c that fit these pairs.",
          "An equals sign makes a definition or equality; it does not request this fit. Do not assign a, b, or c with sliders first."
        ],
        "entries": [
          {
            "latex": "y_{1}\\sim ax_{1}^2+bx_{1}+c",
            "label": "Fit the stated quadratic model"
          }
        ],
        "note": "The fit reports a = 1, b = 4, and c = 3. These are coefficients, not the requested f(10).",
        "calculator": {
          "caption": "The tilde asks Desmos to fit a, b, and c to the data.",
          "expressions": [
            {
              "latex": "x_{1}=[1,2,4]",
              "purpose": "Given inputs, in order."
            },
            {
              "latex": "y_{1}=[8,15,35]",
              "purpose": "Matching outputs, in the same order."
            },
            {
              "latex": "y_{1}\\sim ax_{1}^2+bx_{1}+c",
              "purpose": "Fit the quadratic model stated in the question."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 11,
            "bottom": -5,
            "top": 165
          }
        }
      },
      {
        "id": "function-check",
        "phase": "Check",
        "title": "Which row makes a reusable function?",
        "body": [
          "The regression has already fitted a, b, and c. You want a function that can evaluate an input not in x_1. Which definition should you use?"
        ],
        "calculator": {
          "caption": "The fit is done. Choose a definition that will accept a new input.",
          "expressions": [
            {
              "latex": "x_{1}=[1,2,4]",
              "purpose": "Given inputs."
            },
            {
              "latex": "y_{1}=[8,15,35]",
              "purpose": "Matching given outputs."
            },
            {
              "latex": "y_{1}\\sim ax_{1}^2+bx_{1}+c",
              "purpose": "Fit the stated quadratic model."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -5,
            "top": 55
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "list",
              "text": "f(x) = ax_1^2 + bx_1 + c",
              "feedback": "The right side still uses the fixed data list, so it does not apply the rule to the function's input x."
            },
            {
              "id": "refit",
              "text": "f(x) ~ ax² + bx + c",
              "feedback": "The fitting is finished. This step needs an ordinary function definition, not another regression."
            },
            {
              "id": "function",
              "text": "f(x) = ax² + bx + c",
              "feedback": "This uses the fitted coefficients with the function's own input x."
            }
          ],
          "correctId": "function",
          "hint": "A function definition uses = and refers to its input variable on the right side.",
          "explanation": "Use x_1 in the fit to refer to your data. Use x in f(x) so a later call such as f(10) supplies a new input."
        }
      },
      {
        "id": "define-function",
        "phase": "Watch",
        "title": "Make a function for any new input",
        "body": [
          "Define f(x) = ax² + bx + c. Desmos reuses the fitted coefficients.",
          "Use ordinary x here. x_1 still refers to the three old inputs; it is not the input variable of f."
        ],
        "entries": [
          {
            "latex": "f(x)=ax^2+bx+c",
            "label": "Define the fitted function"
          }
        ],
        "visual": {
          "kind": "comparison",
          "items": [
            {
              "label": "Data list",
              "math": "x_1=[1,2,4]",
              "text": "The inputs used for fitting."
            },
            {
              "label": "Function input",
              "math": "f(x)",
              "text": "A placeholder for whichever input you evaluate next."
            }
          ]
        },
        "calculator": {
          "caption": "The function uses x as its input and reuses the fitted coefficients.",
          "expressions": [
            {
              "latex": "x_{1}=[1,2,4]",
              "purpose": "Given inputs, in order."
            },
            {
              "latex": "y_{1}=[8,15,35]",
              "purpose": "Matching outputs, in the same order."
            },
            {
              "latex": "y_{1}\\sim ax_{1}^2+bx_{1}+c",
              "purpose": "Fit the quadratic model stated in the question."
            },
            {
              "latex": "f(x)=ax^2+bx+c",
              "purpose": "Define a reusable function with ordinary x."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 11,
            "bottom": -5,
            "top": 165
          }
        }
      },
      {
        "id": "evaluate",
        "phase": "Watch",
        "title": "Evaluate what the question asked for",
        "body": [
          "Now enter f(10). The result is 143.",
          "The fit found a rule from the three given pairs. This last row uses that rule at the new input, 10."
        ],
        "entries": [
          {
            "latex": "f(10)",
            "label": "Read the requested value"
          }
        ],
        "note": "Scroll down inside the calculator's expression list to see the final row below the fitted parameters.",
        "calculator": {
          "caption": "Read the requested function value from the final row.",
          "expressions": [
            {
              "latex": "x_{1}=[1,2,4]",
              "purpose": "Given inputs, in order."
            },
            {
              "latex": "y_{1}=[8,15,35]",
              "purpose": "Matching outputs, in the same order."
            },
            {
              "latex": "y_{1}\\sim ax_{1}^2+bx_{1}+c",
              "purpose": "Fit the quadratic model stated in the question."
            },
            {
              "latex": "f(x)=ax^2+bx+c",
              "purpose": "Define a reusable function with ordinary x."
            },
            {
              "latex": "f(10)",
              "purpose": "Evaluate the requested input after fitting."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 11,
            "bottom": -5,
            "top": 165
          }
        }
      },
      {
        "id": "pairing-check",
        "phase": "Check",
        "title": "Keep the data intact when reordering it",
        "body": [
          "You change the input list to [4, 1, 2]. Which output list preserves the original three points?"
        ],
        "calculator": {
          "caption": "Read the requested function value from the final row.",
          "expressions": [
            {
              "latex": "x_{1}=[1,2,4]",
              "purpose": "Given inputs, in order."
            },
            {
              "latex": "y_{1}=[8,15,35]",
              "purpose": "Matching outputs, in the same order."
            },
            {
              "latex": "y_{1}\\sim ax_{1}^2+bx_{1}+c",
              "purpose": "Fit the quadratic model stated in the question."
            },
            {
              "latex": "f(x)=ax^2+bx+c",
              "purpose": "Define a reusable function with ordinary x."
            },
            {
              "latex": "f(10)",
              "purpose": "Evaluate the requested input after fitting."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 11,
            "bottom": -5,
            "top": 165
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "unchanged",
              "text": "[8, 15, 35]",
              "feedback": "That would pair input 4 with output 8. Input 4 originally belongs with output 35."
            },
            {
              "id": "paired",
              "text": "[35, 8, 15]",
              "feedback": "The pairs remain (4, 35), (1, 8), and (2, 15). Their order can change together."
            },
            {
              "id": "sorted",
              "text": "[8, 35, 15]",
              "feedback": "The last pair is correct, but inputs 4 and 1 have been paired with the wrong outputs."
            }
          ],
          "correctId": "paired",
          "hint": "Match each input to the output stated in the original question, one position at a time.",
          "explanation": "Reordering both lists together preserves the data. Rearranging just one list creates a different fitting problem."
        }
      },
      {
        "id": "try-it",
        "phase": "Try it",
        "title": "Fit a different quadratic",
        "body": [
          "A quadratic function satisfies f(0) = 1, f(2) = 9, and f(3) = 16. What is f(5)?",
          "Only the new data lists are loaded. Add the fit, define the function, and evaluate the requested input."
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "Input",
            "Output"
          ],
          "rows": [
            [
              "0",
              "1"
            ],
            [
              "2",
              "9"
            ],
            [
              "3",
              "16"
            ]
          ]
        },
        "calculator": {
          "caption": "New data only. Add your own fit, function, and evaluation.",
          "expressions": [
            {
              "latex": "x_{1}=[0,2,3]",
              "purpose": "New given inputs."
            },
            {
              "latex": "y_{1}=[1,9,16]",
              "purpose": "New matching outputs."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 7,
            "bottom": -4,
            "top": 50
          }
        },
        "check": {
          "kind": "number",
          "answer": 36,
          "tolerance": 0.000001,
          "hint": "Fit y_1 ~ ax_1^2 + bx_1 + c. Then define f(x) with ordinary x and evaluate 5.",
          "explanation": "The new data fit a = 1, b = 2, and c = 1. Evaluating the fitted function at 5 gives 36.",
          "wrongFeedback": "Check the three pairings and the x versus x_1 notation. Read f(5), not a fitted coefficient or the last given output.",
          "commonMistakes": [
            {
              "answer": 16,
              "feedback": "16 is the given output at input 3. The question asks for the output at input 5."
            },
            {
              "answer": 5,
              "feedback": "5 is the requested input. Evaluate it in the fitted function and report the output."
            },
            {
              "answer": 1,
              "feedback": "1 is a coefficient and a given output here, but it is not f(5). Add the final evaluation row."
            },
            {
              "answer": 143,
              "feedback": "143 belonged to the earlier dataset and input 10. This question has new data and asks for input 5."
            }
          ],
          "solution": [
            "Use x_1 = [0, 2, 3] and y_1 = [1, 9, 16].",
            "Enter y_1 ~ ax_1^2 + bx_1 + c; the fitted coefficients are 1, 2, and 1.",
            "Define f(x) = ax² + bx + c.",
            "Evaluate f(5) and read 36."
          ]
        }
      },
      {
        "id": "model-choice",
        "phase": "Explore",
        "title": "Compare a line with the stated quadratic",
        "body": [
          "The points and fitted quadratic are plotted. On new rows, add y_1 ~ mx_1 + n, then y = mx + n. Different parameter names keep this trial separate from the quadratic.",
          "The fitted line misses some points; the quadratic passes through all three. The question states that the function is quadratic, so keep that model. Remove the two trial rows when you are done."
        ],
        "visual": {
          "kind": "comparison",
          "items": [
            {
              "label": "Linear",
              "math": "y_1\\sim mx_1+n"
            },
            {
              "label": "Quadratic",
              "math": "y_1\\sim ax_1^2+bx_1+c"
            },
            {
              "label": "Exponential",
              "math": "y_1\\sim pq^{x_1}"
            }
          ]
        },
        "calculator": {
          "caption": "The stated quadratic and given points are ready for comparison.",
          "expressions": [
            {
              "latex": "x_{1}=[0,2,3]",
              "purpose": "The three given inputs."
            },
            {
              "latex": "y_{1}=[1,9,16]",
              "purpose": "Their matching outputs."
            },
            {
              "latex": "y_{1}\\sim ax_{1}^2+bx_{1}+c",
              "purpose": "Fit the stated quadratic model."
            },
            {
              "latex": "f(x)=ax^2+bx+c",
              "purpose": "Define the fitted quadratic for any input."
            },
            {
              "latex": "(x_{1},y_{1})",
              "purpose": "Show the three given data points."
            },
            {
              "latex": "y=f(x)",
              "purpose": "Plot the fitted quadratic for comparison."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 7,
            "bottom": -4,
            "top": 50
          }
        },
        "entries": [
          {
            "latex": "y_{1}\\sim mx_{1}+n",
            "label": "Fit the trial line with different parameter names"
          },
          {
            "latex": "y=mx+n",
            "label": "Plot the trial line beside the quadratic and the points"
          }
        ]
      },
      {
        "id": "fit-and-transfer",
        "phase": "Try it",
        "title": "Build the fit from a fresh table",
        "body": [
          "A quadratic function passes through (0, 3), (1, 6), and (2, 11). What is its output at input 4?",
          "The new input-output lists are loaded. Add the model, define its function, and evaluate the new input."
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "Input",
            "Output"
          ],
          "rows": [
            [
              "0",
              "3"
            ],
            [
              "1",
              "6"
            ],
            [
              "2",
              "11"
            ]
          ]
        },
        "calculator": {
          "caption": "These new lists contain only the given data.",
          "expressions": [
            {
              "latex": "x_{1}=[0,1,2]",
              "purpose": "Use the original given information."
            },
            {
              "latex": "y_{1}=[3,6,11]",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 5,
            "bottom": -3,
            "top": 35
          }
        },
        "check": {
          "kind": "number",
          "answer": 27,
          "hint": "Fit y_1 ~ ax_1² + bx_1 + c. Define f(x) with ordinary x, then enter f(4).",
          "explanation": "The fitted model is x² + 2x + 3. The evaluation f(4) returns 27.",
          "wrongFeedback": "Use the three new pairs. A data-list name is not the input variable of your reusable function.",
          "solution": [
            "Enter y_1 ~ ax_1² + bx_1 + c.",
            "Define f(x) = ax² + bx + c.",
            "Enter f(4).",
            "Read 27."
          ],
          "commonMistakes": [
            {
              "answer": 11,
              "feedback": "11 is the last given output, at input 2. The question asks for input 4."
            },
            {
              "answer": 4,
              "feedback": "4 is the input. Read the result of f(4)."
            },
            {
              "answer": 36,
              "feedback": "36 came from the preceding dataset. This table defines a different quadratic."
            }
          ],
          "tolerance": 0.000001
        }
      },
      {
        "id": "takeaway",
        "phase": "Understand",
        "title": "Check the setup before trusting a prediction",
        "body": [
          "First check the model and the input-output pairs. Then check that your function uses ordinary x.",
          "Finish by evaluating the exact input requested. Stop at a coefficient only when a coefficient is what the question asks for."
        ],
        "visual": {
          "kind": "flow",
          "items": [
            {
              "label": "Pair the data"
            },
            {
              "label": "Fit with ~"
            },
            {
              "label": "Define f(x)"
            },
            {
              "label": "Evaluate the new input"
            }
          ]
        },
        "calculator": {
          "caption": "New data only. Add your own fit, function, and evaluation.",
          "expressions": [
            {
              "latex": "x_{1}=[0,2,3]",
              "purpose": "New given inputs."
            },
            {
              "latex": "y_{1}=[1,9,16]",
              "purpose": "New matching outputs."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 7,
            "bottom": -4,
            "top": 50
          }
        }
      }
    ]
  },
  "functions-and-transformations": {
    "prerequisite": "You can define f(x), evaluate an input, and recognize a parabola's lowest point.",
    "summary": [
      "Name a function once and reuse it in evaluations or new functions.",
      "A change outside f affects outputs; a change inside f affects inputs.",
      "Check a transformation using a familiar point such as the vertex."
    ],
    "slides": [
      {
        "id": "recognize",
        "phase": "Understand",
        "title": "Reuse a function instead of rewriting it",
        "body": [
          "Once f(x) = x² - 4x + 7 is defined, f(3) evaluates it and g(x) = f(x - 2) + 3 creates a related function.",
          "The parentheses tell you which input is being supplied to f."
        ],
        "calculator": {
          "caption": "Start with the original function.",
          "expressions": [],
          "bounds": {
            "left": -3,
            "right": 8,
            "bottom": -2,
            "top": 22
          }
        }
      },
      {
        "id": "define",
        "phase": "Watch",
        "title": "Keep the original rule named f",
        "body": [
          "Enter f(x) = x² - 4x + 7. Select its lowest point: the vertex is (2, 3).",
          "That point will help you see what changes when the graph moves."
        ],
        "entries": [
          {
            "latex": "f(x)=x^2-4x+7",
            "label": "Define the original"
          }
        ],
        "calculator": {
          "caption": "The original function is named f.",
          "expressions": [
            {
              "latex": "f(x)=x^2-4x+7",
              "purpose": "The given function."
            }
          ],
          "bounds": {
            "left": -3,
            "right": 8,
            "bottom": -2,
            "top": 22
          }
        }
      },
      {
        "id": "evaluate",
        "phase": "Watch",
        "title": "An evaluation returns a number",
        "body": [
          "Enter f(3). Desmos returns 4.",
          "This does not change the original rule. It simply asks what output the rule gives at input 3."
        ],
        "entries": [
          {
            "latex": "f(3)",
            "label": "Evaluate one input"
          }
        ],
        "calculator": {
          "caption": "A function call gives one output, not a new function definition.",
          "expressions": [
            {
              "latex": "f(x)=x^2-4x+7",
              "purpose": "The given function."
            },
            {
              "latex": "f(3)",
              "purpose": "Evaluate the function at input 3."
            }
          ],
          "bounds": {
            "left": -3,
            "right": 8,
            "bottom": -2,
            "top": 22
          }
        }
      },
      {
        "id": "choose-the-function",
        "phase": "Check",
        "title": "Evaluate the named function",
        "body": [
          "You defined f(x) = x² - 4x + 7. Which entry evaluates that whole rule at input 3?"
        ],
        "calculator": {
          "caption": "The original function is named f.",
          "expressions": [
            {
              "latex": "f(x)=x^2-4x+7",
              "purpose": "The given function."
            }
          ],
          "bounds": {
            "left": -3,
            "right": 8,
            "bottom": -2,
            "top": 22
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "evaluation",
              "text": "$f(3)$",
              "feedback": "The saved function applies every part of its rule to input 3."
            },
            {
              "id": "product",
              "text": "$3f(x)$",
              "feedback": "This multiplies the function’s output by 3. It does not supply input 3."
            },
            {
              "id": "condition",
              "text": "$f(x)=3$",
              "feedback": "This asks which input gives output 3. That is a different question."
            }
          ],
          "correctId": "evaluation",
          "hint": "To supply an input, put it inside the function name’s parentheses.",
          "explanation": "f(3) evaluates the entire named rule at input 3. Defining it once helps you avoid dropping part of the expression."
        }
      },
      {
        "id": "transform",
        "phase": "Watch",
        "title": "A new function can use the original",
        "body": [
          "Define g(x) = f(x - 2) + 3. The -2 is inside f, while the +3 is outside it.",
          "The new vertex is (4, 6): right 2 and up 3 from (2, 3). Give the new function a different name so both graphs remain available."
        ],
        "entries": [
          {
            "latex": "g(x)=f(x-2)+3",
            "label": "Define the shifted function"
          }
        ],
        "calculator": {
          "caption": "Compare the vertices of f and the shifted function g.",
          "expressions": [
            {
              "latex": "f(x)=x^2-4x+7",
              "purpose": "The given function."
            },
            {
              "latex": "g(x)=f(x-2)+3",
              "purpose": "Move the original graph right 2 and up 3."
            }
          ],
          "bounds": {
            "left": -3,
            "right": 8,
            "bottom": -2,
            "top": 22
          }
        }
      },
      {
        "id": "inside-check",
        "phase": "Check",
        "title": "Which way does an inside change move the graph?",
        "body": [
          "The original vertex is (2, 3). Where is the vertex of g(x) = f(x - 2), without any outside shift?"
        ],
        "calculator": {
          "caption": "The original function is named f.",
          "expressions": [
            {
              "latex": "f(x)=x^2-4x+7",
              "purpose": "The given function."
            }
          ],
          "bounds": {
            "left": -3,
            "right": 8,
            "bottom": -2,
            "top": 22
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "left",
              "text": "(0, 3)",
              "feedback": "The minus sign is inside f. The original input 2 now happens when x is 4, so the graph moves right."
            },
            {
              "id": "right",
              "text": "(4, 3)",
              "feedback": "At x = 4, the inside input x - 2 is 2. The original vertex's output stays 3."
            },
            {
              "id": "down",
              "text": "(2, 1)",
              "feedback": "That would be an outside subtraction, f(x) - 2. Here the change is inside the function."
            }
          ],
          "correctId": "right",
          "hint": "Which x makes the inside input x - 2 equal the original vertex input, 2?",
          "explanation": "The inside input reaches 2 at x = 4. A change inside the function moves where the original features occur."
        }
      },
      {
        "id": "explore",
        "phase": "Explore",
        "title": "Change one shift at a time",
        "body": [
          "With k = 0, set h to 2 and compare the vertices. Then reset h to 0 and set k to 2.",
          "The first change moves the graph horizontally. The second changes every output by the same amount."
        ],
        "calculator": {
          "caption": "Use h for the inside change and k for the outside change.",
          "expressions": [
            {
              "latex": "f(x)=x^2-4x+7",
              "purpose": "The original function."
            },
            {
              "latex": "h=0",
              "purpose": "Horizontal shift.",
              "slider": {
                "min": -3,
                "max": 3,
                "step": 1
              }
            },
            {
              "latex": "k=0",
              "purpose": "Vertical shift.",
              "slider": {
                "min": -3,
                "max": 3,
                "step": 1
              }
            },
            {
              "latex": "g(x)=f(x-h)+k",
              "purpose": "Compare the transformed graph with f."
            }
          ],
          "bounds": {
            "left": -3,
            "right": 8,
            "bottom": -2,
            "top": 22
          }
        }
      },
      {
        "id": "try-it",
        "phase": "Try it",
        "title": "Evaluate a transformed function",
        "body": [
          "Let f(x) = (x - 1)² + 2 and g(x) = f(x - 2) + 3. What is g(4)?",
          "The new f is loaded. Define g as given, then evaluate it at 4."
        ],
        "calculator": {
          "caption": "The new f is ready. Define g and evaluate the requested input yourself.",
          "expressions": [
            {
              "latex": "f(x)=(x-1)^2+2",
              "purpose": "The new starting function."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 8,
            "bottom": -1,
            "top": 30
          }
        },
        "check": {
          "kind": "number",
          "answer": 6,
          "hint": "Keep the inside -2 and outside +3 in the definition of g. Evaluate g(4), not f(4).",
          "explanation": "The call g(4) uses f(2), then adds 3. The resulting output is 6.",
          "wrongFeedback": "Check which function you evaluated and where the shifts sit. g needs both the inside change and the outside change.",
          "commonMistakes": [
            {
              "answer": 11,
              "feedback": "11 is f(4). The question asks for the transformed function g(4)."
            },
            {
              "answer": 3,
              "feedback": "3 is f(2), but g also adds 3 outside the function."
            },
            {
              "answer": 30,
              "feedback": "30 comes from using f(4 + 2) + 3. The definition of g uses x - 2, not x + 2."
            }
          ],
          "solution": [
            "Keep f(x) = (x - 1)² + 2.",
            "Define g(x) = f(x - 2) + 3.",
            "Enter g(4).",
            "Read the output 6."
          ]
        }
      },
      {
        "id": "transfer-a-vertical-shift",
        "phase": "Try it",
        "title": "Keep the outside change outside",
        "body": [
          "Let f(x) = (x + 1)² - 3 and g(x) = f(x) + 4. What is g(-1)?",
          "The original f is ready. Define g without expanding the square, then evaluate it."
        ],
        "calculator": {
          "caption": "Use the function definition as a building block.",
          "expressions": [
            {
              "latex": "f(x)=(x+1)^2-3",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -4,
            "right": 3,
            "bottom": -5,
            "top": 12
          }
        },
        "check": {
          "kind": "number",
          "answer": 1,
          "hint": "Enter g(x) = f(x) + 4, then g(-1). The +4 changes the output after f has run.",
          "explanation": "The call f(-1) returns -3. Adding 4 outside the function makes g(-1) equal 1.",
          "wrongFeedback": "Keep +4 outside f’s parentheses. The requested evaluation uses g, not f.",
          "solution": [
            "Define g(x) = f(x) + 4.",
            "Enter g(-1).",
            "Read the output, 1."
          ],
          "commonMistakes": [
            {
              "answer": -3,
              "feedback": "-3 is f(-1). The new function adds 4 to that output."
            },
            {
              "answer": 13,
              "feedback": "13 comes from moving +4 inside the input. The definition adds 4 outside f."
            },
            {
              "answer": -1,
              "feedback": "-1 is the input. The question asks for g’s output."
            }
          ]
        }
      },
      {
        "id": "takeaway",
        "phase": "Understand",
        "title": "Read the parentheses before using the graph",
        "body": [
          "f(x - 2) changes the input that reaches f. f(x) - 2 changes its output. They do different jobs.",
          "Use a named function and an evaluation to keep these changes together, instead of retyping and expanding the whole expression."
        ],
        "visual": {
          "kind": "comparison",
          "items": [
            {
              "label": "Inside change",
              "math": "f(x-2)",
              "text": "Moves the graph right 2."
            },
            {
              "label": "Outside change",
              "math": "f(x)-2",
              "text": "Moves the graph down 2."
            }
          ]
        },
        "calculator": {
          "caption": "The new f is ready. Define g and evaluate the requested input yourself.",
          "expressions": [
            {
              "latex": "f(x)=(x-1)^2+2",
              "purpose": "The new starting function."
            }
          ],
          "bounds": {
            "left": -2,
            "right": 8,
            "bottom": -1,
            "top": 30
          }
        }
      }
    ]
  },
  "restrictions": {
    "prerequisite": "You can graph a function and read a lowest point or endpoint.",
    "summary": [
      "Use braces to keep only the inputs allowed by the question.",
      "Check whether endpoints are included before using them.",
      "A lowest point outside the allowed interval cannot answer a restricted minimum question."
    ],
    "slides": [
      {
        "id": "recognize",
        "phase": "Understand",
        "title": "Some parts of the graph may not count",
        "body": [
          "The question asks for the minimum of f(x) = (x - 3)² + 2, but only when 0 ≤ x ≤ 2.",
          "The complete curve's lowest point is (3, 2). Its input, 3, is outside the allowed interval."
        ],
        "calculator": {
          "caption": "This first graph has no limit on its inputs.",
          "expressions": [
            {
              "latex": "f(x)=(x-3)^2+2",
              "purpose": "The complete parabola."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 15
          }
        }
      },
      {
        "id": "restrict",
        "phase": "Watch",
        "title": "Add the allowed interval in braces",
        "body": [
          "Append {0 ≤ x ≤ 2} to the function. Only the allowed part remains.",
          "The formula has not changed. You have changed which inputs are permitted in this problem."
        ],
        "entries": [
          {
            "latex": "f(x)=(x-3)^2+2\\left\\{0\\le x\\le2\\right\\}",
            "label": "Define the restricted function"
          }
        ],
        "calculator": {
          "caption": "The function now includes only inputs from 0 through 2.",
          "expressions": [
            {
              "latex": "f(x)=(x-3)^2+2\\left\\{0\\le x\\le2\\right\\}",
              "purpose": "Keep only the allowed interval, including its endpoints."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 15
          }
        }
      },
      {
        "id": "choose-an-allowed-point",
        "phase": "Check",
        "title": "Does that point belong to the allowed graph?",
        "body": [
          "The formula is (x - 3)² + 2, and only 0 ≤ x ≤ 2 is allowed. Which point can answer a question about this restricted graph?"
        ],
        "calculator": {
          "caption": "The function now includes only inputs from 0 through 2.",
          "expressions": [
            {
              "latex": "f(x)=(x-3)^2+2\\left\\{0\\le x\\le2\\right\\}",
              "purpose": "Keep only the allowed interval, including its endpoints."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 15
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "allowed",
              "text": "(2, 3)",
              "feedback": "Its input 2 is inside the permitted interval, including the endpoint."
            },
            {
              "id": "vertex",
              "text": "(3, 2)",
              "feedback": "This is the unrestricted vertex, but its input 3 is outside the allowed interval."
            },
            {
              "id": "below",
              "text": "(2, 2)",
              "feedback": "Its input is allowed, but output 2 does not satisfy the formula at x = 2."
            }
          ],
          "correctId": "allowed",
          "hint": "Check both parts: the input restriction and the function’s output at that input.",
          "explanation": "A valid point must satisfy the function and the restriction. (2, 3) does both."
        }
      },
      {
        "id": "endpoints",
        "phase": "Watch",
        "title": "Check the ends of the allowed graph",
        "body": [
          "Enter f(0) and f(2). They return 11 and 3.",
          "The visible curve decreases all the way across this interval, so its lowest allowed output is at the right endpoint."
        ],
        "entries": [
          {
            "latex": "f(0)",
            "label": "Check the left endpoint"
          },
          {
            "latex": "f(2)",
            "label": "Check the right endpoint"
          }
        ],
        "calculator": {
          "caption": "Compare both endpoints of the allowed graph.",
          "expressions": [
            {
              "latex": "f(x)=(x-3)^2+2\\left\\{0\\le x\\le2\\right\\}",
              "purpose": "Keep only the allowed interval, including its endpoints."
            },
            {
              "latex": "f(0)",
              "purpose": "The included left endpoint's output."
            },
            {
              "latex": "f(2)",
              "purpose": "The included right endpoint's output."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 15
          }
        }
      },
      {
        "id": "read-minimum",
        "phase": "Watch",
        "title": "Report the output, not its location",
        "body": [
          "The minimum value is 3. It occurs at input 2.",
          "Do not report the unrestricted vertex's output, 2. That point was removed by the input restriction."
        ],
        "visual": {
          "kind": "comparison",
          "items": [
            {
              "label": "Allowed lowest point",
              "math": "(2,3)",
              "text": "Report output 3."
            },
            {
              "label": "Excluded vertex",
              "math": "(3,2)",
              "text": "Input 3 is not allowed."
            }
          ]
        },
        "calculator": {
          "caption": "Compare both endpoints of the allowed graph.",
          "expressions": [
            {
              "latex": "f(x)=(x-3)^2+2\\left\\{0\\le x\\le2\\right\\}",
              "purpose": "Keep only the allowed interval, including its endpoints."
            },
            {
              "latex": "f(0)",
              "purpose": "The included left endpoint's output."
            },
            {
              "latex": "f(2)",
              "purpose": "The included right endpoint's output."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 15
          }
        }
      },
      {
        "id": "endpoint-check",
        "phase": "Check",
        "title": "Does the endpoint belong?",
        "body": [
          "A different question allows 0 ≤ x < 2. Does it include input 2?"
        ],
        "calculator": {
          "caption": "The upper endpoint is excluded in this new restriction.",
          "expressions": [
            {
              "latex": "f(x)=(x-3)^2+2\\left\\{0\\le x<2\\right\\}",
              "purpose": "Keep inputs from 0 inclusive to 2 exclusive."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 15
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "yes",
              "text": "Yes, because it is written in the interval",
              "feedback": "The symbol matters. The strict < excludes the endpoint 2."
            },
            {
              "id": "no",
              "text": "No, because the upper inequality is strict",
              "feedback": "Correct. x can approach 2 from below, but x = 2 is excluded."
            },
            {
              "id": "depends",
              "text": "Only if the output at 2 is positive",
              "feedback": "Endpoint inclusion depends on the interval's symbol, not on the sign of the output."
            }
          ],
          "correctId": "no",
          "hint": "Compare < with ≤. Only one includes equality.",
          "explanation": "A strict endpoint is excluded. A graph can approach an output there without ever attaining it, so do not automatically call that output a minimum or maximum."
        }
      },
      {
        "id": "explore",
        "phase": "Explore",
        "title": "Let the interval reach the vertex",
        "body": [
          "Move b from 2 to 3, then to 4. Watch the lowest point of the visible curve.",
          "Once b reaches 3, the original vertex is allowed. Extending the interval to 4 keeps that lowest point."
        ],
        "calculator": {
          "caption": "Change the included right endpoint of the interval.",
          "expressions": [
            {
              "latex": "b=2",
              "purpose": "The included upper input bound.",
              "slider": {
                "min": 1,
                "max": 5,
                "step": 1
              }
            },
            {
              "latex": "y=(x-3)^2+2\\left\\{0\\le x\\le b\\right\\}",
              "purpose": "Show only the permitted part."
            },
            {
              "latex": "(b,(b-3)^2+2)",
              "purpose": "Mark the moving endpoint."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 15
          }
        }
      },
      {
        "id": "try-it",
        "phase": "Try it",
        "title": "Find a new restricted minimum",
        "body": [
          "For f(x) = (x - 4)² + 1 on 1 ≤ x ≤ 3, what is the minimum value?",
          "Build the restricted graph and compare its allowed points. The calculator starts empty."
        ],
        "calculator": {
          "caption": "Build a restricted graph for the new interval before reading its minimum.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 13
          }
        },
        "check": {
          "kind": "number",
          "answer": 2,
          "hint": "Restrict the function to {1 ≤ x ≤ 3}. Compare the endpoint outputs; the unrestricted vertex is outside this interval.",
          "explanation": "The allowed curve decreases to (3, 2). Its minimum output is 2.",
          "wrongFeedback": "Check the input restriction first. Read the smallest allowed output, not the endpoint's input or the full curve's lowest value.",
          "commonMistakes": [
            {
              "answer": 1,
              "feedback": "1 is the unrestricted vertex's output, at x = 4. The allowed interval stops at 3."
            },
            {
              "answer": 3,
              "feedback": "3 is where the minimum occurs. The question asks for its output."
            },
            {
              "answer": 10,
              "feedback": "10 is the left endpoint's output. The right endpoint has a smaller allowed output."
            }
          ],
          "solution": [
            "Enter f(x) = (x - 4)² + 1 with the restriction {1 ≤ x ≤ 3}.",
            "Evaluate f(1) and f(3); they return 10 and 2.",
            "The allowed graph decreases between them, so its minimum value is 2."
          ]
        }
      },
      {
        "id": "find-an-allowed-vertex",
        "phase": "Try it",
        "title": "This interval includes the turning point",
        "body": [
          "For f(x) = -(x - 2)² + 9 on 0 ≤ x ≤ 3, what is the maximum value?",
          "Add the restriction and inspect the allowed graph. A turning point inside the interval must be checked too."
        ],
        "calculator": {
          "caption": "Build the restricted downward-opening parabola.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 4,
            "bottom": 2,
            "top": 11
          }
        },
        "check": {
          "kind": "number",
          "answer": 9,
          "hint": "The vertex is allowed because its input lies between 0 and 3. Read its output, not its x-coordinate.",
          "explanation": "The allowed vertex is (2, 9). Its output, 9, is greater than every other allowed output.",
          "wrongFeedback": "Look at the full allowed piece, including turning points inside it. The question asks for the maximum output.",
          "solution": [
            "Enter f(x) = -(x - 2)² + 9 with {0 ≤ x ≤ 3}.",
            "Select the vertex, (2, 9).",
            "Its input is allowed. Report the output 9."
          ],
          "commonMistakes": [
            {
              "answer": 2,
              "feedback": "2 is where the maximum occurs. The maximum value is its output."
            },
            {
              "answer": 8,
              "feedback": "8 is the right endpoint’s output. The interior vertex is higher."
            },
            {
              "answer": 5,
              "feedback": "5 is the left endpoint’s output. An allowed interior point has a greater output."
            }
          ]
        }
      },
      {
        "id": "takeaway",
        "phase": "Understand",
        "title": "Apply the restriction before choosing an answer",
        "body": [
          "For an included interval, compare the endpoint outputs with any turning points inside it.",
          "Do not replace a continuous interval with an integer list. An allowed turning point could fall between whole-number inputs."
        ],
        "calculator": {
          "caption": "Build a restricted graph for the new interval before reading its minimum.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 13
          }
        }
      }
    ]
  },
  "answer-choice-testing": {
    "prerequisite": "You can create a list and understand that each input produces a matching output.",
    "summary": [
      "Enter the values of the choices as a list, preserving their order.",
      "Test every candidate against the actual condition.",
      "Report the passing candidate, not its test output or list position."
    ],
    "slides": [
      {
        "id": "recognize",
        "phase": "Understand",
        "title": "Use the options as candidate inputs",
        "body": [
          "A question asks which value satisfies 3x + 2 = 11. Its choices are 1, 2, 3, and 4.",
          "A list can test all four. This is useful when the candidates are supplied; a graph can also solve the equation without choices."
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "Choice",
            "Candidate value"
          ],
          "rows": [
            [
              "A",
              "1"
            ],
            [
              "B",
              "2"
            ],
            [
              "C",
              "3"
            ],
            [
              "D",
              "4"
            ]
          ]
        },
        "calculator": {
          "caption": "Put numeric choices in a list before testing them.",
          "expressions": [],
          "bounds": {
            "left": 0,
            "right": 5,
            "bottom": 0,
            "top": 16
          }
        }
      },
      {
        "id": "candidates",
        "phase": "Watch",
        "title": "Enter the values, not the labels",
        "body": [
          "Use L = [1, 2, 3, 4]. A, B, C, and D tell you which option to report; they are not the values to substitute.",
          "Keep the printed order so you can map a passing value back to its choice."
        ],
        "entries": [
          {
            "latex": "L=[1,2,3,4]",
            "label": "List the candidate values"
          }
        ],
        "calculator": {
          "caption": "The list contains the values of the answer choices, not their letters.",
          "expressions": [
            {
              "latex": "L=[1,2,3,4]",
              "purpose": "The four candidate x-values."
            }
          ],
          "bounds": {
            "left": 0,
            "right": 5,
            "bottom": 0,
            "top": 16
          }
        }
      },
      {
        "id": "test-outputs",
        "phase": "Watch",
        "title": "Run the condition on every candidate",
        "body": [
          "Enter 3L + 2. The results are [5, 8, 11, 14].",
          "The required output is 11. It is third, so the third candidate, 3, works."
        ],
        "entries": [
          {
            "latex": "3L+2",
            "label": "Test the left side"
          }
        ],
        "calculator": {
          "caption": "Compare the four outputs with the required output, 11.",
          "expressions": [
            {
              "latex": "L=[1,2,3,4]",
              "purpose": "The four candidate x-values."
            },
            {
              "latex": "3L+2",
              "purpose": "Test every candidate in the equation's left side."
            }
          ],
          "bounds": {
            "left": 0,
            "right": 5,
            "bottom": 0,
            "top": 16
          }
        }
      },
      {
        "id": "filter",
        "phase": "Watch",
        "title": "Return just the candidate that works",
        "body": [
          "The filter L[3L + 2 = 11] returns [3]. The condition is inside the brackets, and L outside tells Desmos to return inputs.",
          "The answer is candidate 3, choice C. The test output 11 is not the requested x-value."
        ],
        "entries": [
          {
            "latex": "L[3L+2=11]",
            "label": "Keep passing candidates"
          }
        ],
        "calculator": {
          "caption": "The filter returns candidate inputs that make the equation true.",
          "expressions": [
            {
              "latex": "L=[1,2,3,4]",
              "purpose": "The four candidate x-values."
            },
            {
              "latex": "3L+2",
              "purpose": "Test every candidate in the equation's left side."
            },
            {
              "latex": "L[3L+2=11]",
              "purpose": "Keep the candidate whose test output is 11."
            }
          ],
          "bounds": {
            "left": 0,
            "right": 5,
            "bottom": 0,
            "top": 16
          }
        }
      },
      {
        "id": "candidate-or-test-output",
        "phase": "Check",
        "title": "Return the choice, not the test result",
        "body": [
          "The input list is [1, 2, 3, 4]. Testing 3L + 2 gives [5, 8, 11, 14]. The question asks which x makes 3x + 2 = 11. What do you report?"
        ],
        "calculator": {
          "caption": "Compare the four outputs with the required output, 11.",
          "expressions": [
            {
              "latex": "L=[1,2,3,4]",
              "purpose": "The four candidate x-values."
            },
            {
              "latex": "3L+2",
              "purpose": "Test every candidate in the equation's left side."
            }
          ],
          "bounds": {
            "left": 0,
            "right": 5,
            "bottom": 0,
            "top": 16
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "candidate",
              "text": "3, the candidate producing 11",
              "feedback": "The matching output is third, so return the third candidate’s value."
            },
            {
              "id": "output",
              "text": "11, the output that matches",
              "feedback": "11 tells you which test passed, but the requested answer is the input that produced it."
            },
            {
              "id": "position",
              "text": "Third, regardless of the printed option values",
              "feedback": "A position helps locate the answer. You still need its candidate value or matching choice label."
            }
          ],
          "correctId": "candidate",
          "hint": "Follow the matching position back to the input list.",
          "explanation": "The passing candidate is 3. The test output 11 is the condition it meets, not the requested x-value."
        }
      },
      {
        "id": "empty-check",
        "phase": "Check",
        "title": "An empty list proves only one thing",
        "body": [
          "You test [1, 2, 3, 4] in 3x + 2 = 10, and none passes. What have you established?"
        ],
        "calculator": {
          "caption": "None of these listed candidates produces the required output 10.",
          "expressions": [
            {
              "latex": "L=[1,2,3,4]",
              "purpose": "The finite set of supplied candidates."
            },
            {
              "latex": "3L+2",
              "purpose": "Test every listed candidate."
            },
            {
              "latex": "L[3L+2=10]",
              "purpose": "Return only candidates whose output is 10; this result is empty."
            }
          ],
          "bounds": {
            "left": 0,
            "right": 5,
            "bottom": 0,
            "top": 16
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "no-real",
              "text": "The equation has no real solution",
              "feedback": "A solution might exist outside your list. This test did not check every real number."
            },
            {
              "id": "none-listed",
              "text": "None of the listed candidates meets the condition",
              "feedback": "That is exactly what the finite test establishes."
            },
            {
              "id": "largest",
              "text": "The largest candidate is the closest answer",
              "feedback": "An empty result does not justify choosing a candidate that fails the condition."
            }
          ],
          "correctId": "none-listed",
          "hint": "The calculator tested the values inside L, not all possible inputs.",
          "explanation": "An empty list says none of those candidates passed. If one printed option should work, recheck the question, options, and condition you typed."
        }
      },
      {
        "id": "explore",
        "phase": "Explore",
        "title": "Change what counts as a match",
        "body": [
          "Move k among 5, 8, 11, and 14, then try 10. Watch which candidate the filter returns.",
          "At 10 the result is empty. The equation can still have an input between the listed candidates."
        ],
        "calculator": {
          "caption": "The same candidates are tested against a changing required output.",
          "expressions": [
            {
              "latex": "L=[1,2,3,4]",
              "purpose": "The fixed candidates."
            },
            {
              "latex": "k=11",
              "purpose": "The required output.",
              "slider": {
                "min": 5,
                "max": 14,
                "step": 1
              }
            },
            {
              "latex": "L[3L+2=k]",
              "purpose": "Return passing candidates."
            },
            {
              "latex": "(L,3L+2)",
              "purpose": "Plot the tested pairs."
            },
            {
              "latex": "y=k",
              "purpose": "Show the required output."
            }
          ],
          "bounds": {
            "left": 0,
            "right": 5,
            "bottom": 0,
            "top": 16
          }
        }
      },
      {
        "id": "try-it",
        "phase": "Try it",
        "title": "Test a new set of choices",
        "body": [
          "Which candidate in [-2, 1, 4, 7] satisfies 3x - 2 = 10?",
          "Report the candidate's value, not its position in the list."
        ],
        "calculator": {
          "caption": "The new candidates are ready. Test the new equation yourself.",
          "expressions": [
            {
              "latex": "L=[-2,1,4,7]",
              "purpose": "The only candidates in this question."
            }
          ],
          "bounds": {
            "left": -3,
            "right": 9,
            "bottom": -10,
            "top": 25
          }
        },
        "check": {
          "kind": "number",
          "answer": 4,
          "hint": "Evaluate 3L - 2 and find the output 10, or filter L with the condition 3L - 2 = 10.",
          "explanation": "The test outputs are [-8, 1, 10, 19]. Output 10 belongs to candidate 4.",
          "wrongFeedback": "Test the original left side on each candidate. Return the input paired with output 10.",
          "commonMistakes": [
            {
              "answer": 10,
              "feedback": "10 is the required test output. The question asks which candidate produces it."
            },
            {
              "answer": 3,
              "feedback": "The match is third in the list, but the third candidate's value is 4."
            },
            {
              "answer": 7,
              "feedback": "Candidate 7 produces 19, so it does not meet the condition."
            }
          ],
          "solution": [
            "Use L = [-2, 1, 4, 7].",
            "Enter 3L - 2 to see [-8, 1, 10, 19].",
            "Alternatively, enter L[3L - 2 = 10], which returns [4].",
            "Report candidate 4."
          ]
        }
      },
      {
        "id": "keep-every-condition",
        "phase": "Try it",
        "title": "One more condition can narrow the list",
        "body": [
          "The choices are [-3, -1, 2, 3]. Which choice satisfies x² = 9 and is negative?",
          "First find every candidate whose square is 9. Then keep the one that also meets the sign condition."
        ],
        "calculator": {
          "caption": "Use both the equation and the negative-value condition.",
          "expressions": [
            {
              "latex": "L=[-3,-1,2,3]",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -4,
            "right": 4,
            "bottom": -1,
            "top": 12
          }
        },
        "check": {
          "kind": "number",
          "answer": -3,
          "hint": "L[L² = 9] returns the two equation matches. Check which one is negative before answering.",
          "explanation": "Both -3 and 3 have square 9, but only -3 satisfies the negative-value condition.",
          "wrongFeedback": "The answer must satisfy every printed condition. Do not stop at the first equation match.",
          "solution": [
            "Enter L[L² = 9] to see [-3, 3].",
            "Keep only the negative candidate.",
            "Report -3."
          ],
          "commonMistakes": [
            {
              "answer": 3,
              "feedback": "3 satisfies x² = 9, but it is not negative."
            },
            {
              "answer": 9,
              "feedback": "9 is the required squared output. Report the candidate whose square produces it."
            },
            {
              "answer": -1,
              "feedback": "-1 is negative, but its square is 1 rather than 9."
            }
          ]
        }
      },
      {
        "id": "takeaway",
        "phase": "Understand",
        "title": "Test the condition, then read the candidate",
        "body": [
          "A list test is a quick way to compare supplied options. It should not require rearranging the whole problem first.",
          "Use exact fractions when the choices give them. Rounded replacements can make an equality test miss a valid candidate."
        ],
        "calculator": {
          "caption": "The new candidates are ready. Test the new equation yourself.",
          "expressions": [
            {
              "latex": "L=[-2,1,4,7]",
              "purpose": "The only candidates in this question."
            }
          ],
          "bounds": {
            "left": -3,
            "right": 9,
            "bottom": -10,
            "top": 25
          }
        }
      }
    ]
  },
  "bracket-regression": {
    "prerequisite": "You know that ~ fits unknown values and that positions in two lists are paired.",
    "summary": [
      "Put each complete condition into matching positions across a tilde.",
      "Use unassigned parameters for the unknown values you want fitted.",
      "Check that the conditions determine the answer, then evaluate the requested quantity."
    ],
    "slides": [
      {
        "id": "recognize",
        "phase": "Understand",
        "title": "Fit several conditions together",
        "body": [
          "The system y = 2x + 1 and y = -x + 7 asks for x + y. Bracket regression can fit both conditions at once.",
          "For two simple lines, graphing their intersection is also direct. Brackets become useful when several conditions share the same unknowns."
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "Condition",
            "Must match"
          ],
          "rows": [
            [
              "2x + 1",
              "y"
            ],
            [
              "-x + 7",
              "y"
            ]
          ]
        },
        "calculator": {
          "caption": "Use a and b for the two unknown values; do not assign trial values.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 11
          }
        }
      },
      {
        "id": "name-unknowns",
        "phase": "Watch",
        "title": "Give the unknown values parameter names",
        "body": [
          "Use a for the unknown x-coordinate and b for the unknown y-coordinate. This avoids the calculator's special graphing roles for x and y.",
          "Do not enter a = 1 or b = 1. The regression needs to choose these values."
        ],
        "visual": {
          "kind": "comparison",
          "items": [
            {
              "label": "Unknown input",
              "math": "x\\rightarrow a"
            },
            {
              "label": "Unknown output",
              "math": "y\\rightarrow b"
            }
          ]
        },
        "calculator": {
          "caption": "Use a and b for the two unknown values; do not assign trial values.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 11
          }
        }
      },
      {
        "id": "pair-conditions",
        "phase": "Watch",
        "title": "Pair whole left sides with whole right sides",
        "body": [
          "The first pair asks 2a + 1 to match b. The second asks -a + 7 to match the same b.",
          "Desmos fits a = 2 and b = 5. You copied both complete conditions instead of extracting a separate set of coefficients."
        ],
        "entries": [
          {
            "latex": "[2a+1,-a+7]\\sim[b,b]",
            "label": "Fit both conditions together"
          }
        ],
        "calculator": {
          "caption": "Each left entry is matched with the right entry in the same position.",
          "expressions": [
            {
              "latex": "[2a+1,-a+7]\\sim[b,b]",
              "purpose": "Fit both complete equations at once."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 11
          }
        }
      },
      {
        "id": "requested-result",
        "phase": "Watch",
        "title": "Use the fitted values in the requested expression",
        "body": [
          "The question asks for x + y. Since a represents x and b represents y, enter a + b.",
          "The result is 7. Reporting only a would answer a different question."
        ],
        "entries": [
          {
            "latex": "a+b",
            "label": "Read the requested sum"
          }
        ],
        "calculator": {
          "caption": "The fitted values can be used directly in the requested calculation.",
          "expressions": [
            {
              "latex": "[2a+1,-a+7]\\sim[b,b]",
              "purpose": "Fit both complete equations at once."
            },
            {
              "latex": "a+b",
              "purpose": "Read the requested sum, not just one fitted parameter."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 11
          }
        }
      },
      {
        "id": "pairing-check",
        "phase": "Check",
        "title": "Read the second pair",
        "body": [
          "What condition does the second position in [2a + 1, -a + 7] ~ [b, b] represent?"
        ],
        "calculator": {
          "caption": "The fitted values can be used directly in the requested calculation.",
          "expressions": [
            {
              "latex": "[2a+1,-a+7]\\sim[b,b]",
              "purpose": "Fit both complete equations at once."
            },
            {
              "latex": "a+b",
              "purpose": "Read the requested sum, not just one fitted parameter."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 11
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "same-list",
              "text": "2a + 1 = -a + 7",
              "feedback": "Those entries sit in the same list. Pairing goes across the tilde, position by position."
            },
            {
              "id": "second-pair",
              "text": "-a + 7 = b",
              "feedback": "The second left entry matches the second right entry."
            },
            {
              "id": "zero",
              "text": "b = 0",
              "feedback": "There is no zero in this condition. The matching right entry is b."
            }
          ],
          "correctId": "second-pair",
          "hint": "Read only the second entry on each side of the tilde.",
          "explanation": "List positions preserve the equations: first with first, second with second. Both lists must have matching lengths."
        }
      },
      {
        "id": "independent-check",
        "phase": "Check",
        "title": "Two copies are still one condition",
        "body": [
          "Would repeating the equation a + b = 10 twice determine a and b individually?"
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "a",
            "b",
            "a + b"
          ],
          "rows": [
            [
              "2",
              "8",
              "10"
            ],
            [
              "4",
              "6",
              "10"
            ]
          ],
          "caption": "Both pairs satisfy the same condition."
        },
        "calculator": {
          "caption": "These two bracket positions repeat exactly the same condition.",
          "expressions": [
            {
              "latex": "[a+b,a+b]\\sim[10,10]",
              "purpose": "Repeat one condition; this does not uniquely determine both parameters."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 11
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "yes",
              "text": "Yes, because there are two entries",
              "feedback": "The second copy adds no information. Both displayed parameter pairs still satisfy it."
            },
            {
              "id": "fit",
              "text": "Yes, if the regression error is zero",
              "feedback": "A perfect fit can still be one of many fits. Zero error does not prove the parameters are unique."
            },
            {
              "id": "no",
              "text": "No, several pairs can satisfy the repeated condition",
              "feedback": "The repeated condition fixes their sum, but it does not fix each value individually."
            }
          ],
          "correctId": "no",
          "hint": "Both (2, 8) and (4, 6) give the required sum. Repeating the same statement does not separate them.",
          "explanation": "Enough independent information is needed for the quantity you want. Here the sum is fixed at 10, but a and b individually are not."
        }
      },
      {
        "id": "try-it",
        "phase": "Try it",
        "title": "Fit two new conditions",
        "body": [
          "The values a and b satisfy 2a + b = 13 and a - b = 2. What is a + b?",
          "Keep the full left sides and pair them with their matching right sides. Do not create sliders for a or b."
        ],
        "calculator": {
          "caption": "The two new conditions are given in the lesson. Build their paired lists.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 8,
            "bottom": -1,
            "top": 12
          }
        },
        "check": {
          "kind": "number",
          "answer": 8,
          "tolerance": 0.000001,
          "hint": "Use [2a + b, a - b] ~ [13, 2], then evaluate the quantity requested.",
          "explanation": "The conditions fit a = 5 and b = 3. Their sum is 8.",
          "wrongFeedback": "Check that the right list matches the conditions in order. After fitting, evaluate a + b instead of reporting one parameter.",
          "commonMistakes": [
            {
              "answer": 5,
              "feedback": "5 is the fitted value of a. The question asks for a + b."
            },
            {
              "answer": 3,
              "feedback": "3 is the fitted value of b. Include both fitted values in the requested sum."
            },
            {
              "answer": 13,
              "feedback": "13 is one condition's right side, not a + b."
            },
            {
              "answer": 7,
              "feedback": "7 was the answer to the earlier system. Fit these two new conditions before reading their sum."
            }
          ],
          "solution": [
            "Enter [2a + b, a - b] ~ [13, 2].",
            "The regression gives a = 5 and b = 3.",
            "Enter a + b and read 8."
          ]
        }
      },
      {
        "id": "explore",
        "phase": "Explore",
        "title": "Change one condition while keeping the other",
        "body": [
          "Move c from 7 to 4, then to 10. Inspect both fitted parameters and the sum.",
          "Only the second condition changes. The first condition must still hold for every new fitted pair."
        ],
        "calculator": {
          "caption": "c changes a given constant; a and b remain fitted unknowns.",
          "expressions": [
            {
              "latex": "c=7",
              "purpose": "Change the constant in the second condition.",
              "slider": {
                "min": 1,
                "max": 13,
                "step": 1
              }
            },
            {
              "latex": "[2a+1,-a+c]\\sim[b,b]",
              "purpose": "Fit both conditions with the new constant."
            },
            {
              "latex": "a+b",
              "purpose": "Read the sum of the fitted values."
            },
            {
              "latex": "(a,b)",
              "purpose": "Plot the fitted point."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 6,
            "bottom": -1,
            "top": 11
          }
        }
      },
      {
        "id": "use-zero-output-conditions",
        "phase": "Try it",
        "title": "A root gives you another kind of condition",
        "body": [
          "A quadratic has the form f(x) = 2x² + bx + c. Its roots are 1 and -3. What is b + c?",
          "A root means the function’s output is zero. Fit the two unknown coefficients using those two complete output conditions."
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "Input",
            "Required output"
          ],
          "rows": [
            [
              "1",
              "0"
            ],
            [
              "-3",
              "0"
            ]
          ]
        },
        "calculator": {
          "caption": "The leading coefficient is given; b and c are still unknown.",
          "expressions": [
            {
              "latex": "a=2",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -5,
            "right": 3,
            "bottom": -10,
            "top": 20
          }
        },
        "check": {
          "kind": "number",
          "answer": -2,
          "hint": "Keep a = 2. Fit [a(1)² + b(1) + c, a(-3)² + b(-3) + c] ~ [0, 0], then evaluate b + c.",
          "explanation": "The two zero-output conditions fit b = 4 and c = -6. The requested sum is -2.",
          "wrongFeedback": "Use both roots, keep the negative root inside parentheses, and read the requested sum after fitting.",
          "solution": [
            "Keep a = 2 as the given coefficient.",
            "Enter [a(1)² + b(1) + c, a(-3)² + b(-3) + c] ~ [0, 0].",
            "The fitted parameters are b = 4 and c = -6.",
            "Enter b + c and read -2."
          ],
          "commonMistakes": [
            {
              "answer": 4,
              "feedback": "4 is b. The question asks for b + c."
            },
            {
              "answer": -6,
              "feedback": "-6 is c. Include both fitted coefficients in the sum."
            },
            {
              "answer": 2,
              "feedback": "2 is the given leading coefficient. It is not b + c."
            }
          ],
          "tolerance": 0.000001
        }
      },
      {
        "id": "takeaway",
        "phase": "Understand",
        "title": "Keep the conditions visible in your setup",
        "body": [
          "Each bracket position should correspond to a statement you can point to in the question.",
          "Read the requested expression after fitting. A reported parameter is useful only if the conditions actually determine it."
        ],
        "calculator": {
          "caption": "The two new conditions are given in the lesson. Build their paired lists.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 8,
            "bottom": -1,
            "top": 12
          }
        }
      }
    ]
  },
  "advanced-desmos-shortcuts": {
    "prerequisite": "You can enter ordered pairs and tell a coordinate point from a single number.",
    "summary": [
      "Choose a built-in by the quantity the question asks for.",
      "Keep each point's two coordinates grouped inside parentheses.",
      "Read either the returned number or the requested coordinate of a returned point."
    ],
    "slides": [
      {
        "id": "recognize",
        "phase": "Understand",
        "title": "Check for a built-in before typing a long formula",
        "body": [
          "A question asks how far apart (1, 2) and (7, 10) are. Desmos has a distance function that accepts the two points directly.",
          "Different built-ins answer different questions, even when they use the same inputs."
        ],
        "visual": {
          "kind": "table",
          "columns": [
            "Question",
            "Built-in",
            "Returns"
          ],
          "rows": [
            [
              "How far apart?",
              "distance",
              "A length"
            ],
            [
              "What point is halfway?",
              "midpoint",
              "A point"
            ],
            [
              "What is the average of a list?",
              "mean",
              "A number"
            ]
          ]
        },
        "calculator": {
          "caption": "Start by identifying the complete coordinate pairs.",
          "expressions": [],
          "bounds": {
            "left": -1,
            "right": 11,
            "bottom": -1,
            "top": 13
          }
        }
      },
      {
        "id": "points",
        "phase": "Watch",
        "title": "Keep each point together",
        "body": [
          "The first point is (1, 2); the second is (7, 10). Plot them on separate rows if you want to see their positions.",
          "Do not regroup them as (1, 7) and (2, 10). That would describe different points."
        ],
        "entries": [
          {
            "latex": "(1,2)",
            "label": "First point"
          },
          {
            "latex": "(7,10)",
            "label": "Second point"
          }
        ],
        "calculator": {
          "caption": "Keep the coordinates grouped into their original points.",
          "expressions": [
            {
              "latex": "(1,2)",
              "purpose": "First given point."
            },
            {
              "latex": "(7,10)",
              "purpose": "Second given point."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 11,
            "bottom": -1,
            "top": 13
          }
        }
      },
      {
        "id": "distance",
        "phase": "Watch",
        "title": "Give distance both complete points",
        "body": [
          "Enter distance((1, 2), (7, 10)). The inner parentheses keep each point together; the outer parentheses belong to the function.",
          "Desmos returns the length 10. No distance formula needs to be entered."
        ],
        "entries": [
          {
            "latex": "\\operatorname{distance}((1,2),(7,10))",
            "label": "Find the distance"
          }
        ],
        "calculator": {
          "caption": "distance returns one length between the two complete points.",
          "expressions": [
            {
              "latex": "(1,2)",
              "purpose": "First given point."
            },
            {
              "latex": "(7,10)",
              "purpose": "Second given point."
            },
            {
              "latex": "\\operatorname{distance}((1,2),(7,10))",
              "purpose": "Find the distance without entering a distance formula."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 11,
            "bottom": -1,
            "top": 13
          }
        }
      },
      {
        "id": "midpoint",
        "phase": "Watch",
        "title": "The same points can answer a different question",
        "body": [
          "midpoint((1, 2), (7, 10)) returns (4, 6). That is a location halfway between the endpoints, not a length.",
          "If a question asks only for its y-coordinate, read the second number."
        ],
        "entries": [
          {
            "latex": "\\operatorname{midpoint}((1,2),(7,10))",
            "label": "Find the midpoint"
          }
        ],
        "calculator": {
          "caption": "midpoint returns a point; distance returns a number.",
          "expressions": [
            {
              "latex": "(1,2)",
              "purpose": "First given point."
            },
            {
              "latex": "(7,10)",
              "purpose": "Second given point."
            },
            {
              "latex": "\\operatorname{distance}((1,2),(7,10))",
              "purpose": "Find the distance without entering a distance formula."
            },
            {
              "latex": "\\operatorname{midpoint}((1,2),(7,10))",
              "purpose": "Locate the point halfway between the endpoints."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 11,
            "bottom": -1,
            "top": 13
          }
        }
      },
      {
        "id": "keep-the-point-pairs",
        "phase": "Check",
        "title": "A point stays inside its parentheses",
        "body": [
          "Which entry gives Desmos the two points (-1, 2) and (2, 6) to measure the distance between them?"
        ],
        "calculator": {
          "caption": "The arguments are two complete points, not four separate inputs.",
          "expressions": [
            {
              "latex": "(-1,2)",
              "purpose": "Use the original given information."
            },
            {
              "latex": "(2,6)",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -3,
            "right": 5,
            "bottom": -1,
            "top": 9
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "points",
              "text": "distance((-1, 2), (2, 6))",
              "feedback": "Each parenthesized pair is one point, so distance receives two points."
            },
            {
              "id": "four",
              "text": "distance(-1, 2, 2, 6)",
              "feedback": "This separates the coordinates into four arguments. The built-in needs two complete points."
            },
            {
              "id": "midpoint",
              "text": "midpoint((-1, 2), (2, 6))",
              "feedback": "The grouping is valid, but midpoint returns a location rather than a distance."
            }
          ],
          "correctId": "points",
          "hint": "Look for one outer pair of function parentheses containing two inner point pairs.",
          "explanation": "Use distance with two complete coordinate pairs. Keep the negative sign inside its original point."
        }
      },
      {
        "id": "quantity-check",
        "phase": "Check",
        "title": "Read the requested part of the result",
        "body": [
          "A midpoint result is (4, 6). The question asks for the midpoint's y-coordinate. What should you report?"
        ],
        "calculator": {
          "caption": "midpoint returns a point; distance returns a number.",
          "expressions": [
            {
              "latex": "(1,2)",
              "purpose": "First given point."
            },
            {
              "latex": "(7,10)",
              "purpose": "Second given point."
            },
            {
              "latex": "\\operatorname{distance}((1,2),(7,10))",
              "purpose": "Find the distance without entering a distance formula."
            },
            {
              "latex": "\\operatorname{midpoint}((1,2),(7,10))",
              "purpose": "Locate the point halfway between the endpoints."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 11,
            "bottom": -1,
            "top": 13
          }
        },
        "check": {
          "kind": "choice",
          "choices": [
            {
              "id": "x",
              "text": "4",
              "feedback": "4 is the x-coordinate. The y-coordinate comes second."
            },
            {
              "id": "y",
              "text": "6",
              "feedback": "6 is the second coordinate, so it gives the midpoint's y-value."
            },
            {
              "id": "sum",
              "text": "10",
              "feedback": "Adding the coordinates does not give the requested coordinate. The distance also happens to be 10 here, but that is a different quantity."
            }
          ],
          "correctId": "y",
          "hint": "Read an ordered pair as (x, y).",
          "explanation": "midpoint returns a point. Use its second coordinate when the question asks for y."
        }
      },
      {
        "id": "explore",
        "phase": "Explore",
        "title": "Move one endpoint",
        "body": [
          "Move t from 6 to 0. The second point moves horizontally while both endpoint heights stay fixed.",
          "Compare distance with midpoint. The length changes, but the midpoint's y-coordinate stays 6."
        ],
        "calculator": {
          "caption": "Compare a length and a point as an endpoint moves.",
          "expressions": [
            {
              "latex": "t=6",
              "purpose": "Horizontal movement of the second point.",
              "slider": {
                "min": 0,
                "max": 9,
                "step": 1
              }
            },
            {
              "latex": "(1,2)",
              "purpose": "The fixed first point."
            },
            {
              "latex": "(1+t,10)",
              "purpose": "The moving second point."
            },
            {
              "latex": "\\operatorname{distance}((1,2),(1+t,10))",
              "purpose": "The changing distance."
            },
            {
              "latex": "\\operatorname{midpoint}((1,2),(1+t,10))",
              "purpose": "The changing midpoint."
            }
          ],
          "bounds": {
            "left": -1,
            "right": 12,
            "bottom": -1,
            "top": 13
          }
        }
      },
      {
        "id": "try-it",
        "phase": "Try it",
        "title": "Find a distance with new endpoints",
        "body": [
          "What is the distance between (-1, 2) and (2, 6)?",
          "The points are plotted. Add the built-in that returns the length between them."
        ],
        "calculator": {
          "caption": "Only the new endpoints are plotted. Add the function the question needs.",
          "expressions": [
            {
              "latex": "(-1,2)",
              "purpose": "First new endpoint."
            },
            {
              "latex": "(2,6)",
              "purpose": "Second new endpoint."
            }
          ],
          "bounds": {
            "left": -3,
            "right": 5,
            "bottom": -1,
            "top": 9
          }
        },
        "check": {
          "kind": "number",
          "answer": 5,
          "hint": "Use distance with the two complete coordinate pairs as its arguments.",
          "explanation": "distance((-1, 2), (2, 6)) returns 5.",
          "wrongFeedback": "Keep the negative x-coordinate and both point pairs. You need the straight-line distance, not just a horizontal or vertical change.",
          "commonMistakes": [
            {
              "answer": 3,
              "feedback": "3 is only the horizontal separation. The endpoints also have different heights."
            },
            {
              "answer": 4,
              "feedback": "4 is only the vertical separation. Use distance to include both directions."
            },
            {
              "answer": 7,
              "feedback": "Adding the horizontal and vertical separations traces two sides of a path, not the direct distance between the points."
            }
          ],
          "solution": [
            "Keep the points as (-1, 2) and (2, 6).",
            "Enter distance((-1, 2), (2, 6)).",
            "Read the returned length: 5."
          ]
        }
      },
      {
        "id": "use-a-new-midpoint",
        "phase": "Try it",
        "title": "Read one coordinate from a new midpoint",
        "body": [
          "Find the midpoint of (-4, 1) and (2, 7). What is the midpoint’s y-coordinate?",
          "Use the midpoint built-in and read the second coordinate of its returned point."
        ],
        "calculator": {
          "caption": "Choose the built-in that returns a point halfway between the endpoints.",
          "expressions": [
            {
              "latex": "(-4,1)",
              "purpose": "Use the original given information."
            },
            {
              "latex": "(2,7)",
              "purpose": "Use the original given information."
            }
          ],
          "bounds": {
            "left": -6,
            "right": 4,
            "bottom": -1,
            "top": 9
          }
        },
        "check": {
          "kind": "number",
          "answer": 4,
          "hint": "Enter midpoint((-4, 1), (2, 7)). The result is a point; y comes second.",
          "explanation": "The midpoint is (-1, 4). Its y-coordinate is 4.",
          "wrongFeedback": "Choose midpoint rather than distance. Report only the coordinate requested by the question.",
          "solution": [
            "Enter midpoint((-4, 1), (2, 7)).",
            "Read the returned point, (-1, 4).",
            "Report its second coordinate, 4."
          ],
          "commonMistakes": [
            {
              "answer": -1,
              "feedback": "-1 is the midpoint’s x-coordinate. The question asks for y."
            },
            {
              "answer": 8,
              "feedback": "8 is the sum of the endpoint y-coordinates. The midpoint is halfway between them."
            },
            {
              "answer": 6,
              "feedback": "6 is the change between the endpoint y-values. Read the midpoint’s second coordinate."
            }
          ]
        }
      },
      {
        "id": "takeaway",
        "phase": "Understand",
        "title": "Choose the tool from the wording",
        "body": [
          "Distance, midpoint, and mean are not interchangeable shortcuts. Start with the quantity the question names.",
          "Then give the built-in the correct points or list and read the appropriate kind of result."
        ],
        "calculator": {
          "caption": "Only the new endpoints are plotted. Add the function the question needs.",
          "expressions": [
            {
              "latex": "(-1,2)",
              "purpose": "First new endpoint."
            },
            {
              "latex": "(2,6)",
              "purpose": "Second new endpoint."
            }
          ],
          "bounds": {
            "left": -3,
            "right": 5,
            "bottom": -1,
            "top": 9
          }
        }
      }
    ]
  }
} satisfies Record<DesmosLessonSlug, LessonJourney>;
