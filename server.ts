import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // WAHA Proxy Route (Internal replacement for Supabase Edge Function)
  app.post("/api/waha-proxy", async (req, res) => {
    const { waha_url, waha_api_key, endpoint, method, params } = req.body;

    if (!waha_url) {
      return res.status(400).json({ error: "Missing waha_url" });
    }

    try {
      // Clean up URL and prepare endpoint
      const baseUrl = waha_url.endsWith('/') ? waha_url.slice(0, -1) : waha_url;
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      
      // Determine if we need to append query params for GET
      let targetUrl = `${baseUrl}/api${cleanEndpoint}`;
      
      const fetchOptions: any = {
        method: method || 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (waha_api_key) {
        fetchOptions.headers['X-Api-Key'] = waha_api_key;
        fetchOptions.headers['Authorization'] = `Bearer ${waha_api_key}`;
      }

      if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
        fetchOptions.body = JSON.stringify(params || {});
      } else if (params && Object.keys(params).length > 0) {
        const query = new URLSearchParams(params).toString();
        targetUrl += `?${query}`;
      }

      console.log(`[Proxy] Forwarding to: ${targetUrl}`);
      
      const response = await fetch(targetUrl, fetchOptions);
      const contentType = response.headers.get('content-type');
      
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      res.status(response.status).json(data);
    } catch (error: any) {
      console.error(`[Proxy Error]:`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  let vite: any;
  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
  } else {
    // In production, we serve static files from the client build
    app.use((await import('compression')).default());
    app.use(
      (await import('serve-static')).default(path.resolve(__dirname, 'dist/client'), {
        index: false
      })
    );
  }

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;

    try {
      let template, render;
      if (!isProd) {
        // 1. Read index.html
        template = fs.readFileSync(
          path.resolve(__dirname, 'index.html'),
          'utf-8'
        );

        // 2. Apply Vite HTML transforms. This injects the Vite HMR client, and
        //    also applies HTML transforms from Vite plugins, e.g. global preambles
        //    from @vitejs/plugin-react
        template = await vite.transformIndexHtml(url, template);

        // 3. Load the server entry. vite.ssrLoadModule automatically transforms
        //    your ESM source code to be usable in Node.js! There is no bundling
        //    required, and provides efficient invalidation similar to HMR.
        render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render;
      } else {
        // In production, we use the pre-built template and server bundle
        template = fs.readFileSync(
          path.resolve(__dirname, 'dist/client/index.html'),
          'utf-8'
        );
        // @ts-ignore
        render = (await import('./dist/server/entry-server.js')).render;
      }

      // 4. render the app HTML. this assumes entry-server.tsx's exported `render`
      //    function hooks into appropriate framework SSR APIs, for example
      //    ReactDOMServer.renderToString()
      const { html: appHtml } = await render(url);

      // 5. Inject the app-rendered HTML into the template.
      const html = template.replace(`<!--ssr-outlet-->`, appHtml);

      // 6. Send the rendered HTML back.
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e: any) {
      // If an error is caught, let Vite fix the stack trace so it maps back to
      // your actual source code.
      !isProd && vite.ssrFixStacktrace(e);
      console.log(e.stack);
      res.status(500).end(e.stack);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started at http://localhost:${PORT}`);
  });
}

createServer();
