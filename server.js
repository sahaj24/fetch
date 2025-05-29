const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 8080;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from the .next directory if it exists
if (fs.existsSync(path.join(__dirname, '.next/static'))) {
  app.use('/_next/static', express.static(path.join(__dirname, '.next/static')));
}

// Serve the main app
app.get('*', (req, res) => {
  // Try to serve from the Next.js build if available
  const nextAppPath = path.join(__dirname, '.next/server/pages');
  if (fs.existsSync(nextAppPath)) {
    try {
      // Attempt to serve from Next.js static output
      res.sendFile(path.join(nextAppPath, req.path));
    } catch (error) {
      // Fallback to a simple HTML response
      res.send(`
        <html>
          <head>
            <title>Fetch App</title>
          </head>
          <body>
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 1rem;">
              <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Fetch App</h1>
              <p style="margin-bottom: 1rem;">Running via Express server fallback</p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-width: 400px;">
                <a href="/auth/login" style="padding: 1rem; border: 1px solid #ccc; border-radius: 4px; text-align: center;">Login</a>
                <a href="/auth/signup" style="padding: 1rem; border: 1px solid #ccc; border-radius: 4px; text-align: center;">Sign Up</a>
              </div>
            </div>
          </body>
        </html>
      `);
    }
  } else {
    // Fallback HTML if Next.js build is not available
    res.send(`
      <html>
        <head>
          <title>Fetch App</title>
        </head>
        <body>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 1rem;">
            <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Fetch App</h1>
            <p style="margin-bottom: 1rem;">Running via Express server fallback</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-width: 400px;">
              <a href="/auth/login" style="padding: 1rem; border: 1px solid #ccc; border-radius: 4px; text-align: center;">Login</a>
              <a href="/auth/signup" style="padding: 1rem; border: 1px solid #ccc; border-radius: 4px; text-align: center;">Sign Up</a>
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

app.listen(port, () => {
  console.log(`Express fallback server running on port ${port}`);
});
