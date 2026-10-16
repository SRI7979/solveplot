export type Method = 'difference' | 'intersections';
export type Step = { title: string; kind: string; instruction: string; latex?: string[]; copy?: string; detail: string };
export const METHODS = {
  difference: { name: 'Read the x-intercepts', summary: 'Graph the difference, then click the positive x-intercept.', steps: [
    { title: 'Graph the difference', kind: 'Type', instruction: 'Enter this as one expression in Desmos.', latex: ['y=x^2-4x+1-(2x+8)'], copy: 'y=x^2-4x+1-(2x+8)', detail: 'At an intersection, both original equations have the same y-value. Their difference is zero, so the x-intercepts give the intersection x-coordinates.' },
    { title: 'Choose the positive intercept', kind: 'Click', instruction: 'Select the point where the curve crosses the x-axis on the right.', detail: 'There are two intercepts: (−1, 0) and (7, 0). The question asks for the positive x-coordinate, so use the point to the right of the y-axis.' },
    { title: 'Read the first coordinate', kind: 'Read', instruction: 'The point is (7, 0), so the x-coordinate is 7.', detail: 'The graph shows the difference of the two functions, so this point has y = 0. On the original graphs, the same x-value gives the intersection (7, 22).' },
  ] as Step[] },
  intersections: { name: 'Graph both equations', summary: 'Enter the two equations and select their intersection on the right.', steps: [
    { title: 'Graph both equations', kind: 'Type', instruction: 'Give each equation its own expression line.', latex: ['y=x^2-4x+1', 'y=2x+8'], copy: 'y=x^2-4x+1\ny=2x+8', detail: 'The teal curve is the quadratic. The blue line is the linear equation. Points where they meet satisfy both equations.' },
    { title: 'Select the right intersection', kind: 'Click', instruction: 'Click where the teal curve meets the blue line on the right.', detail: 'The graphs intersect at (−1, 6) and (7, 22). Use (7, 22), because its x-coordinate is positive.' },
    { title: 'Read the first coordinate', kind: 'Read', instruction: 'At (7, 22), the x-coordinate is 7. You don’t need the y-value.', detail: 'The question asks for x, which is the first coordinate. Both equations give y = 22 when x = 7.' },
  ] as Step[] },
};

