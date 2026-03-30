import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// API Route: Freesound Proxy
app.get('/api/search-sounds', async (req: Request, res: Response) => {
  const { query } = req.query;
  // Use the Freesound-specific environment variables, NOT the Gemini key
  const apiKey = process.env.VITE_FREESOUND_API_KEY || process.env.FREESOUND_API_KEY;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  if (!apiKey) {
    console.error('Freesound API Key is missing from environment variables.');
    return res.status(500).json({ 
      error: 'Freesound API key not configured. Please add VITE_FREESOUND_API_KEY to your environment variables.' 
    });
  }

  try {
    const freesoundUrl = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query as string)}&token=${apiKey}&fields=id,name,previews,description&page_size=30`;
    
    const response = await fetch(freesoundUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Failed to fetch from Freesound' });
  }
});

async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production or on Vercel, serve static files
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    // For SPA routing
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not running on Vercel (Vercel handles the serverless execution)
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  }
}

// Start the server setup
startServer();

// Export the app for Vercel serverless functions
export default app;
