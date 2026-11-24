const { createStudyGuide } = require("../lib/api-handlers");

module.exports = async function studyGuide(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Use POST for a study guide." });
  try {
    const result = await createStudyGuide(request.body || {});
    return response.status(result.status).json(result.body);
  } catch (error) {
    if (error?.fix) console.error(`MindDo fix: ${error.fix}`);
    return response.status(502).json({ error: error?.message || "SmartStudy could not answer right now. Please check the internet and try again." });
  }
};
