import mongoose from "mongoose";

/**
 * True when the server rejected the operation purely because it cannot do
 * transactions (a standalone mongod, e.g. a local dev box). Replica sets and
 * Atlas clusters support them, so in production this is never hit.
 */
function isTransactionUnsupported(err) {
  if (!err) return false;
  const msg = String(err.message || "");
  return (
    err.codeName === "IllegalOperation" ||
    err.code === 20 ||
    /Transaction numbers are only allowed on a replica set member or mongos/i.test(msg) ||
    /Transactions are not supported/i.test(msg)
  );
}

/**
 * Run `fn` inside a MongoDB transaction, passing it the session.
 *
 * Every write inside `fn` MUST be issued with that session, otherwise it escapes
 * the transaction and will not roll back.
 *
 * Errors thrown by `fn` abort the transaction and propagate untouched — that is how
 * a failed validation (e.g. FeeCycleError) leaves the database unchanged.
 *
 * If — and only if — the deployment cannot do transactions at all, `fn` is retried
 * once without a session so local development still works. That retry is safe because
 * an unsupported deployment rejects the very first write, so nothing was committed.
 *
 * @param {(session: import('mongoose').ClientSession|null) => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    if (isTransactionUnsupported(err)) {
      console.warn(
        "[withTransaction] Deployment does not support transactions — running without one."
      );
      return fn(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

export default withTransaction;
