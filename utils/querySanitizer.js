const FORBIDDEN_QUERY_KEYS = new Set(["$where", "$function", "$accumulator"]);

const DEFAULT_OPTIONS = {
  sort: { createdAt: -1 },
  skip: 0,
  limit: 100,
};

const MAX_LIMIT = 500;

const isPlainObject = (val) =>
  val !== null && typeof val === "object" && !Array.isArray(val);

const hasForbiddenOperator = (obj) => {
  if (!isPlainObject(obj)) return false;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_QUERY_KEYS.has(key)) return true;
    if (key.startsWith("$") && !["$regex", "$options", "$in", "$ne", "$gte", "$lte", "$gt", "$lt", "$or", "$and"].includes(key)) {
      return true;
    }
    if (hasForbiddenOperator(obj[key])) return true;
  }
  return false;
};

const sanitizeQuery = (query = {}, allowedFields = null) => {
  if (!isPlainObject(query)) return {};
  if (hasForbiddenOperator(query)) return {};

  if (!allowedFields) return query;

  const allowed = new Set(allowedFields);
  const sanitized = {};
  for (const [key, value] of Object.entries(query)) {
    if (allowed.has(key)) sanitized[key] = value;
  }
  return sanitized;
};

const sanitizeProjection = (projection = {}) => {
  if (!isPlainObject(projection)) return {};
  const sanitized = { ...projection };
  sanitized.pwd = 0;
  return sanitized;
};

const sanitizeOptions = (options = {}) => {
  const merged = { ...DEFAULT_OPTIONS, ...(isPlainObject(options) ? options : {}) };
  const skip = Math.max(0, Number(merged.skip) || 0);
  let limit = Number(merged.limit);
  if (!limit || limit <= 0) limit = DEFAULT_OPTIONS.limit;
  limit = Math.min(limit, MAX_LIMIT);

  const sort = isPlainObject(merged.sort) ? merged.sort : DEFAULT_OPTIONS.sort;
  const safeSort = {};
  for (const [field, dir] of Object.entries(sort)) {
    safeSort[field] = dir === 1 || dir === "asc" || dir === "ascending" ? 1 : -1;
  }

  return { skip, limit, sort: safeSort };
};

module.exports = {
  sanitizeQuery,
  sanitizeProjection,
  sanitizeOptions,
  DEFAULT_OPTIONS,
  MAX_LIMIT,
};
