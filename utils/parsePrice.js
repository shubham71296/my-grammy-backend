/**
 * @returns {{ ok: true, value: number } | { ok: false, msg: string }}
 */
function parseNonNegativePrice(raw, label = "price") {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: false, msg: `Invalid ${label}` };
  }
  const value = Number(raw);
  if (Number.isNaN(value) || value < 0) {
    return { ok: false, msg: `Invalid ${label}` };
  }
  return { ok: true, value };
}

module.exports = { parseNonNegativePrice };
