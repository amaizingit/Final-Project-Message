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
