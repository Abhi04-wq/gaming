import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

let cachedLudoDashJs = null;
let cachedGamezopSdkJs = null;

function ludoGameProxyPlugin() {
  return {
    name: 'ludo-game-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/games-engine/ludo' || req.url === '/games-engine/ludo/') {
          try {
            const resp = await fetch('https://gamescdn.gamezop.com/_game-files/SJRX12TXcRH/index.html');
            let html = await resp.text();
            
            // 1. Inject base tag for all assets to resolve from Gamezop CDN
            html = html.replace('<head>', '<head><base href="https://gamescdn.gamezop.com/_game-files/SJRX12TXcRH/">');
            
            // 2. Safe Gamezop SDK proxy (neutralizes window.parent & window.top cross-origin errors)
            html = html.replace('src="https://static.gamezop.com/sdk/gamezop.js?ver=battlerocking"', 'src="/games-engine/ludo/gamezop.js"');
            
            // 3. Safe game.js proxy (neutralizes window.parent & window.top cross-origin errors)
            html = html.replace('src="js/game.js?ver=1.0.3"', 'src="/games-engine/ludo/game.js"');

            // 4. Injected safety script to auto-dismiss loader if stuck
            const fallbackScript = `
              <script>
                setTimeout(function() {
                  try {
                    var mainL = document.getElementById("mainLoader");
                    var preL = document.getElementById("preLoader");
                    if (mainL) mainL.style.display = "none";
                    if (preL) preL.style.display = "none";
                    var c = document.getElementsByTagName("canvas")[0];
                    if (c) c.style.display = "block";
                    document.body.style.backgroundImage = "none";
                  } catch(e) {}
                }, 3000);
              </script>
            `;
            html = html.replace('</body>', fallbackScript + '</body>');
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
            return;
          } catch (e) {
            res.statusCode = 500;
            res.end('Error: ' + e.message);
            return;
          }
        }
        if (req.url === '/games-engine/ludo/game.js') {
          try {
            if (!cachedLudoDashJs) {
              const resp = await fetch('https://gamescdn.gamezop.com/_game-files/SJRX12TXcRH/js/game.js?ver=1.0.3');
              const raw = await resp.text();
              cachedLudoDashJs = raw
                .replace(/window\.parent/g, 'window')
                .replace(/window\.top/g, 'window')
                .replace('const sdkData = yield Ludo_live.prototypingGame(data);', 'const sdkData = true;')
                .replace(
                  'window.onload = () => {\n    Ludo_live.Main.GAME = new Ludo_live.GameClass();\n};',
                  'function _initLudo() { if (!Ludo_live.Main.GAME) { Ludo_live.Main.GAME = new Ludo_live.GameClass(); } } if (document.readyState === "complete" || document.readyState === "interactive") { setTimeout(_initLudo, 10); } else { window.addEventListener("load", _initLudo); }'
                );
            }
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.end(cachedLudoDashJs);
            return;
          } catch (e) {
            res.statusCode = 500;
            res.end('Error: ' + e.message);
            return;
          }
        }
        if (req.url === '/games-engine/ludo/gamezop.js') {
          try {
            if (!cachedGamezopSdkJs) {
              const resp = await fetch('https://static.gamezop.com/sdk/gamezop.js?ver=battlerocking');
              const raw = await resp.text();
              cachedGamezopSdkJs = raw
                .replace(/window\.parent/g, 'window')
                .replace(/window\.top/g, 'window');
            }
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.end(cachedGamezopSdkJs);
            return;
          } catch (e) {
            res.statusCode = 500;
            res.end('Error: ' + e.message);
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ludoGameProxyPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
