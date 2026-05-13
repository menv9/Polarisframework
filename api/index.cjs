// Vercel Serverless Function Entry Point (.cjs = CommonJS)
// Routes all /api/* requests to the Express app

const app = require('../server/index.js')

module.exports = (req, res) => {
  app(req, res)
}
