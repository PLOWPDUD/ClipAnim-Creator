import express, { Request, Response } from 'express';
import path from 'node:path';

const app = express();

// API Route: Advanced Freesound Proxy with Precise Filters & Search
app.get('/api/search-sounds', async (req: Request, res: Response) => {
  const { query, filter, sort, page, page_size } = req.query;
  const rawQuery = (query as string)?.trim() || '';
  const filterParam = (filter as string)?.trim() || '';
  const sortParam = (sort as string)?.trim() || 'score';
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const pageSize = Math.min(60, Math.max(1, parseInt(page_size as string, 10) || 24));

  console.log(`[SoundSearch] Query: "${rawQuery}", filter: "${filterParam}", sort: "${sortParam}", page: ${pageNum}, page_size: ${pageSize}`);
  
  const apiKey = process.env.FREESOUND_API_KEY || process.env.VITE_FREESOUND_API_KEY;

  if (!apiKey) {
    console.error('[SoundSearch] API Key missing');
    return res.status(500).json({ 
      error: 'Freesound API key not configured. Please add FREESOUND_API_KEY to your environment variables in Settings.' 
    });
  }

  try {
    const fields = 'id,name,tags,description,duration,samplerate,channels,filesize,bitrate,bitdepth,type,license,username,avg_rating,num_downloads,previews,images';
    let freesoundUrl = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(rawQuery || '*')}&fields=${fields}&page=${pageNum}&page_size=${pageSize}&sort=${encodeURIComponent(sortParam)}`;
    
    if (filterParam) {
      freesoundUrl += `&filter=${encodeURIComponent(filterParam)}`;
    }

    console.log(`[SoundSearch] Fetching from Freesound API...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[SoundSearch] Timeout triggered');
      controller.abort();
    }, 12000);

    try {
      const response = await fetch(freesoundUrl, {
        signal: controller.signal,
        headers: {
          'Authorization': `Token ${apiKey}`,
          'User-Agent': 'ClipAnimCreator/1.3.3 (https://github.com/your-username/your-repo)'
        }
      });
      
      clearTimeout(timeoutId);
      console.log(`[SoundSearch] Freesound Status: ${response.status}`);
      
      const text = await response.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('[SoundSearch] JSON Parse Error');
        return res.status(500).json({ error: 'Invalid JSON response from Freesound' });
      }

      if (!response.ok) {
        console.error('[SoundSearch] Freesound Error:', data);
        return res.status(response.status).json(data);
      }

      // Calculate total pages
      const totalCount = data.count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      res.setHeader('Cache-Control', 'public, max-age=1800');
      res.json({
        ...data,
        page: pageNum,
        page_size: pageSize,
        total_pages: totalPages
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[SoundSearch] Global Error:', error.message);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Freesound API timed out. Please try again.' });
    }
    res.status(500).json({ error: `Server Error: ${error.message}` });
  }
});

// API Route: Audio Proxy for seamless CORS audio playback and downloads
app.get('/api/proxy-audio', async (req: Request, res: Response) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const audioRes = await fetch(url);
    if (!audioRes.ok) {
      return res.status(audioRes.status).send('Failed to fetch audio stream');
    }

    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuffer = await audioRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('[AudioProxy] Error fetching remote audio:', err.message);
    res.status(500).send('Audio proxy error');
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
