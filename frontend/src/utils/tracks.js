export const FRONTEND_KINDS = [
  {
    id: 'exercises',
    label: 'JavaScript exercises',
    description: 'Write code in the editor; graded by running JavaScript tests.',
    matches: (question) => question.type !== 'quiz',
  },
  {
    id: 'quizzes',
    label: 'Quizzes',
    description: 'Multiple-choice concept checks on CSS, the browser, accessibility, performance and React.',
    matches: (question) => question.type === 'quiz',
  },
];

/** Narrows `{ group: questions[] }` to one kind, dropping groups left empty. */
export function filterGroupsByKind(grouped, kind) {
  const result = {};
  Object.entries(grouped || {}).forEach(([group, questions]) => {
    const matching = questions.filter(kind.matches);
    if (matching.length > 0) result[group] = matching;
  });
  return result;
}

/** Splits grouped frontend questions into one section per kind, in display order. */
export function splitFrontendSections(grouped, kinds = FRONTEND_KINDS) {
  return kinds.map((kind) => {
    const groups = filterGroupsByKind(grouped, kind);
    const count = Object.values(groups).reduce((sum, questions) => sum + questions.length, 0);
    return { ...kind, groups, count };
  });
}
