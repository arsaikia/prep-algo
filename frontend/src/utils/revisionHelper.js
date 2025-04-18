const revisionSequence = [1, 1, 2, 3, 5, 8, 13, 21];

const getQuestionsToReviseToday = (allSolvedQuestions) => {
  const doToday = [];

  allSolvedQuestions.forEach((question) => {
    const solvedCount = question.solveCount;

    // find when to solve next since last solve

    const idx = solvedCount < revisionSequence.length ? solvedCount : (revisionSequence.length - 1);
    const toSolveNext = revisionSequence[idx];

    // console.log("first", idx);

    const daysSinceLastSolve = (new Date() - new Date(question.lastUpdatedAt)) / (1000 * 60 * 60 * 24);

    // console.log(question.name, "\n \t toSolveNext: ", toSolveNext, "\n \t daysSinceLastSolve: ", daysSinceLastSolve);

    // const pastFourAm = new Date().getHours() > 4;

    if ((toSolveNext <= daysSinceLastSolve)) {
      doToday.push(question);
    }
  });

  return doToday;
};

export {
  revisionSequence,
  getQuestionsToReviseToday,
};
