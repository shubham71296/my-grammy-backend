const { sanitizeQuery, sanitizeProjection, sanitizeOptions } = require("./querySanitizer");
const { sendSuccess, sendError } = require("./apiResponse");

const listDocuments = async ({
  Model,
  req,
  res,
  allowedQueryFields = null,
  defaultProjection = {},
  populate = null,
  transform = null,
  enforceQuery = {},
}) => {
  try {
    const { query = {}, projection = defaultProjection, options } = req.body || {};
    const safeQuery = { ...sanitizeQuery(query, allowedQueryFields), ...enforceQuery };
    const safeProjection = sanitizeProjection(projection);
    const safeOptions = sanitizeOptions(options);

    let finder = Model.find(safeQuery, safeProjection, safeOptions);
    if (populate) finder = finder.populate(populate);
    const data = await finder.lean();
    const totalDataCount = await Model.countDocuments(safeQuery);
    const finalData = transform ? await transform(data, req) : data;

    return sendSuccess(res, { data: finalData, totalDataCount });
  } catch (err) {
    console.error("listDocuments error:", err);
    return sendError(res, { status: 500 });
  }
};

module.exports = { listDocuments };
