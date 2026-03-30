import express, { Request, Response } from 'express';
import path from 'node:path';

const app = express();

// API Route: Freesound Proxy
app.get('/api/search-sounds', async (req: Request, res: Response) => {
  const { query } = req.query;
  console.log(`[SoundSearch] Request for: "${query}"`);
  
  const apiKey = process.env.FREESOUND_API_KEY || process.env.VITE_FREESOUND_API_KEY;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  if (!apiKey) {
    console.error('[SoundSearch] API Key missing');
    return res.status(500).json({ 
      error: 'Freesound API key not configured. Please add FREESOUND_API_KEY to your environment variables.' 
    });
  }

  try {
    // Use Authorization header instead of query param for better security/compatibility
    const freesoundUrl = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query as string)}&fields=id,name,previews,description&page_size=30`;
    
    console.log(`[SoundSearch] Fetching from Freesound...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[SoundSearch] Timeout triggered');
      controller.abort();
    }, 9000);

    try {
      const response = await fetch(freesoundUrl, {
        signal: controller.signal,
        headers: {
          'Authorization': `Token ${apiKey}`,
          'User-Agent': 'ClipAnimCreator/1.1.0 (https://github.com/your-username/your-repo)'
        }
      });
      
      clearTimeout(timeoutId);
      console.log(`[SoundSearch] Status: ${response.status}`);
      
      const text = await response.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('[SoundSearch] JSON Parse Error');
        return res.status(500).json({ error: 'Invalid response from Freesound' });
      }

      if (!response.ok) {
        console.error('[SoundSearch] Freesound Error:', data);
        return res.status(response.status).json(data);
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(data);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[SoundSearch] Global Error:', error.message);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Freesound API timed out' });
    }
    res.status(500).json({ error: `Server Error: ${error.message}` });
  }
});

app.get('/api/test-freesound', async (_req, res) => {
  const apiKey = process.env.FREESOUND_API_KEY || process.env.VITE_FREESOUND_API_KEY;
  
  let freesoundPing = 'Not attempted';
  if (apiKey) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3000);
      const resp = await fetch('https://freesound.org/apiv2/me/', {
        signal: controller.signal,
        headers: { 'Authorization': `Token ${apiKey}` }
      });
      freesoundPing = `Status ${resp.status}`;
    } catch (e: any) {
      freesoundPing = `Error: ${e.message}`;
    }
  }

  res.json({ 
    hasKey: !!apiKey, 
    keyPrefix: apiKey ? apiKey.substring(0, 4) + '...' : 'none',
    freesoundPing,
    nodeVersion: process.version,
    env: process.env.NODE_ENV
  });
});

async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
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
    // In production, serve static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For SPA routing
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not in a serverless environment (like Vercel)
  // Vercel handles the listening part themselves
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  }
}

// Start the server setup
startServer();

// Export the app for Vercel serverless functions
export default app;
