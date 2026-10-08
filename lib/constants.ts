/**
 * Spacing between the stored `order` values of job applications in a column
 * (0, 100, 200, ...). Callers pass around *positions* (0, 1, 2, ...); the
 * database stores `position * JOB_ORDER_STEP`, leaving room between neighbors.
 * The server action and the optimistic UI update in `use-board.ts` must use
 * the same step, so keep it here.
 */
export const JOB_ORDER_STEP = 100;
