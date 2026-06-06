module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  res.status(200).json({
    status: 'ok',
    message: 'Vercel Serverless Function 正常工作',
    timestamp: new Date().toISOString(),
    env: {
      hasApiKey: !!process.env.AI_API_KEY,
      hasBaseUrl: !!process.env.AI_BASE_URL,
      hasModel: !!process.env.AI_MODEL
    }
  });
};
