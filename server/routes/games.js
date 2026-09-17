const express = require('express');
const router = express.Router();

let cachedLudoJs = null;
let cachedGamezopJs = null;

// Ludo Game HTML Route - Patched to resolve assets and avoid cross-origin window.parent & window.top SecurityError
router.get('/ludo', async (req, res) => {
  try {
    const response = await fetch('https://gamescdn.gamezop.com/_game-files/SJRX12TXcRH/index.html');
    if (!response.ok) {
      return res.status(502).send('Failed to fetch Ludo game assets from CDN');
    }
    let html = await response.text();

    // 1. Inject base tag so all fonts, audios, and assets resolve from Gamezop CDN
    html = html.replace('<head>', '<head><base href="https://gamescdn.gamezop.com/_game-files/SJRX12TXcRH/">');

    // 2. Redirect game script and Gamezop SDK to our patched proxies
    const backendUrl = `http://localhost:${process.env.PORT || 5000}`;
    html = html.replace('src="js/game.js?ver=1.0.3"', `src="${backendUrl}/api/games/ludo/game.js"`);
    html = html.replace('src="https://static.gamezop.com/sdk/gamezop.js?ver=battlerocking"', `src="${backendUrl}/api/games/ludo/gamezop.js"`);

    // 3. Fallback loader unloader if stuck
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
    res.send(html);
  } catch (err) {
    console.error('[Ludo Proxy Error]', err);
    res.status(500).send('Error loading Ludo game: ' + err.message);
  }
});

// Ludo Game Script Route - Replaces window.parent & window.top with window
router.get('/ludo/game.js', async (req, res) => {
  try {
    if (!cachedLudoJs) {
      const response = await fetch('https://gamescdn.gamezop.com/_game-files/SJRX12TXcRH/js/game.js?ver=1.0.3');
      if (!response.ok) {
        return res.status(502).send('Failed to fetch Ludo game script from CDN');
      }
      const rawScript = await response.text();
      cachedLudoJs = rawScript
        .replace(/window\.parent/g, 'window')
        .replace(/window\.top/g, 'window')
        .replace('const sdkData = yield Ludo_live.prototypingGame(data);', 'const sdkData = true;')
        .replace(
          'window.onload = () => {\n    Ludo_live.Main.GAME = new Ludo_live.GameClass();\n};',
          'function _initLudo() { if (!Ludo_live.Main.GAME) { Ludo_live.Main.GAME = new Ludo_live.GameClass(); } } if (document.readyState === "complete" || document.readyState === "interactive") { setTimeout(_initLudo, 10); } else { window.addEventListener("load", _initLudo); }'
        );
    }

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(cachedLudoJs);
  } catch (err) {
    console.error('[Ludo Game JS Proxy Error]', err);
    res.status(500).send('// Error loading Ludo script: ' + err.message);
  }
});

// Gamezop SDK Route - Replaces window.parent & window.top with window
router.get('/ludo/gamezop.js', async (req, res) => {
  try {
    if (!cachedGamezopJs) {
      const response = await fetch('https://static.gamezop.com/sdk/gamezop.js?ver=battlerocking');
      if (!response.ok) {
        return res.status(502).send('Failed to fetch Gamezop SDK from CDN');
      }
      const rawScript = await response.text();
      cachedGamezopJs = rawScript
        .replace(/window\.parent/g, 'window')
        .replace(/window\.top/g, 'window');
    }

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(cachedGamezopJs);
  } catch (err) {
    console.error('[Gamezop SDK Proxy Error]', err);
    res.status(500).send('// Error loading Gamezop SDK: ' + err.message);
  }
});

module.exports = router;
