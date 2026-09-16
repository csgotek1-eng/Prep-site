import type { Review } from "./types.ts";

/**
 * The order a moderation queue has to be in.
 *
 * The store returns reviews newest-first and nothing else, which is the
 * right order for a log and the wrong one for a queue. What a moderator
 * opens this screen to do is clear the decisions; everything already
 * decided is reference material. So PENDING comes first whatever its
 * date, and within each group the newest is on top.
 *
 * This lives here, as a pure function over rows, rather than in the
 * query: PostgREST can order by a column but not by "the state that
 * still needs me". Doing it in SQL would mean a CASE expression in a
 * URL string, which is harder to read and impossible to test without a
 * database.
 *
 * APPROVED sits above REJECTED for the same reason PENDING sits above
 * both: it is the group someone is more likely to be looking for. A
 * rejected review is kept as history, and history belongs at the
 * bottom.
 */
const GROUP_ORDER = { PENDING: 0, APPROVED: 1, REJECTED: 2 } as const;

export function sortForModeration(reviews: readonly Review[]): Review[] {
  // A copy: the caller's array is state in a React component, and
  // sorting it in place would mutate a value React believes it owns.
  return [...reviews].sort((a, b) => {
    const group = GROUP_ORDER[a.status] - GROUP_ORDER[b.status];
    if (group !== 0) return group;
    // Newest first inside the group. createdAt rather than updatedAt:
    // within PENDING nothing has been updated, and for the decided
    // groups "when it arrived" is the stable thing to sort on — a
    // re-decision would otherwise jump an old review to the top.
    return b.createdAt.localeCompare(a.createdAt);
  });
}
