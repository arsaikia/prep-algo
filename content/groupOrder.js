/**
 * Section order for the question list: the order a learner should work
 * through them. Algorithms follows neetcode.io, whose sections build on each
 * other (two pointers before sliding window, trees before graphs, 1-D DP
 * before 2-D DP). Problems within a section are ordered by their own `order`
 * field, which follows the same source.
 *
 * `String` is not a neetcode.io section; it sits beside Arrays & Hashing,
 * where neetcode.io files its problems.
 *
 * A domain listed here must name every group it uses; the content build
 * fails otherwise, so a new group cannot silently land in the wrong place.
 * Domains not listed fall back to alphabetical order.
 *
 * Kept as a .js module rather than JSON: the build treats every JSON file
 * under content/ as a content item.
 */
export const GROUP_ORDER = {
    algorithms: [
        'Arrays & Hashing',
        'String',
        'Two Pointers',
        'Sliding Window',
        'Stack',
        'Binary Search',
        'Linked List',
        'Trees',
        'Tries',
        'Heap / Priority Queue',
        'Backtracking',
        'Graphs',
        'Advanced Graphs',
        '1-D Dynamic Programming',
        '2-D Dynamic Programming',
        'Greedy',
        'Intervals',
        'Math & Geometry',
        'Bit Manipulation',
    ],
};

/** Position of `group` within its domain's order, or -1 when unordered. */
export function groupRank(domain, group) {
    const order = GROUP_ORDER[domain];
    return order ? order.indexOf(group) : -1;
}
