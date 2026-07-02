// Vercel serverless entry — wraps the Express app.
// All /api/* requests are rewritten here (see vercel.json); Express
// routes on the original req.url so the backend routes match unchanged.
import app from '../backend/app.js'

export default app
