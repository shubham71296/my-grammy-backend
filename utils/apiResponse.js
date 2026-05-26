const sendSuccess = (res, { msg = "success", data = [], totalDataCount, status = 200 } = {}) => {
  const payload = { error: "", msg, success: true, data };
  if (totalDataCount !== undefined) payload.totalDataCount = totalDataCount;
  return res.status(status).json(payload);
};

const sendError = (res, { msg = "failed", status = 500, error = "internal server error", data = [] } = {}) => {
  return res.status(status).json({ error, msg, success: false, data });
};

module.exports = { sendSuccess, sendError };
