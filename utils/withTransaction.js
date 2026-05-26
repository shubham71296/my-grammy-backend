const mongoose = require("mongoose");

function isTransactionUnsupported(err) {
  return (
    err?.code === 20 ||
    /replica set|transaction numbers are only allowed/i.test(err?.message || "")
  );
}

/**
 * Run fn in a MongoDB transaction when supported; otherwise run without session.
 */
async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction().catch(() => {});
    }
    if (isTransactionUnsupported(err)) {
      return fn(null);
    }
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = { withTransaction };
