import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// API Route: Freesound Proxy
app.get('/api/search-sounds', async (req: Request, res: Response) => {
  const { query } = req.query;
  console.log(`[SoundSearch] Received request for: "${query}"`);
  
  // Use the Freesound-specific environment variables, NOT the Gemini key
  const apiKey = process.env.VITE_FREESOUND_API_KEY || process.env.FREESOUND_API_KEY;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  if (!apiKey) {
    console.error('[SoundSearch] Freesound API Key is missing from environment variables.');
    return res.status(500).json({ 
      error: 'Freesound API key not configured. Please add VITE_FREESOUND_API_KEY to your environment variables.' 
    });
  }

  try {
    const freesoundUrl = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query as string)}&token=${apiKey}&fields=id,name,previews,description&page_size=30`;
    
    console.log(`[SoundSearch] Fetching from Freesound...`);
    
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(freesoundUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ClipAnimCreator/1.1.0 (https://github.com/your-username/your-repo)'
      }
    });
    
    clearTimeout(timeoutId);
    console.log(`[SoundSearch] Freesound responded with status: ${response.status}`);
    
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Cache the response for 1 hour to improve performance
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.json(data);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Freesound API timed out' });
    }
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Failed to fetch from Freesound' });
  }
});

async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Vite middleware for development - ONLY load if not on Vercel and in dev mode
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Failed to load Vite server:', e);
    }
  } else {
    // In production or on Vercel, serve static files
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    // For SPA routing
    app.get('*', (_req, res) => {
      // Check if index.html exists in dist, otherwise it might be a Vercel routing issue
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
