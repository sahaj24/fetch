/**
 * Production Emergency Server with Proper API Route Handling
 * This replaces the simple Express fallback to ensure API routes return JSON
 */

const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

// JSON middleware
app.use(express.json());

// Add proper headers for all API routes
app.use('/api/*', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-API-Handler', 'emergency-fallback');
  res.setHeader('X-Environment', 'production');
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Emergency server active',
    timestamp: new Date().toISOString()
  });
});

// Generic API route handler for all YouTube API endpoints
app.all('/api/youtube/*', (req, res) => {
  console.log(`[EMERGENCY] API request to ${req.path} - returning fallback response`);
  res.status(503).json({
    error: 'Service temporarily unavailable',
    message: 'The main application is not available. Please try again later.',
    path: req.path,
    method: req.method,
    emergency: true,
    timestamp: new Date().toISOString()
  });
});

// Generic API route handler for all other API endpoints
app.all('/api/*', (req, res) => {
  console.log(`[EMERGENCY] API request to ${req.path} - returning fallback response`);
  res.status(503).json({
    error: 'Service temporarily unavailable',
    message: 'The main application is not available. Please try again later.',
    path: req.path,
    method: req.method,
    emergency: true,
    timestamp: new Date().toISOString()
  });
});

// Serve static HTML for non-API routes
app.get('*', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Fetch App - Maintenance</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: #f5f5f5;
          }
          .container { 
            text-align: center; 
            background: white; 
            padding: 2rem; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #333; }
          p { color: #666; }
          .status { 
            background: #e3f2fd; 
            padding: 1rem; 
            border-radius: 4px; 
            margin: 1rem 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔧 Fetch App</h1>
          <div class="status">
            <p><strong>Status:</strong> Emergency Mode</p>
            <p>The main application is temporarily unavailable.</p>
            <p>API endpoints are being handled by the emergency fallback.</p>
          </div>
          <p>Please try again in a few minutes.</p>
          <p><small>Timestamp: ${new Date().toISOString()}</small></p>
        </div>
      </body>
    </html>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[EMERGENCY] Server error:', err);
  
  if (req.path.startsWith('/api/')) {
    res.status(500).json({
      error: 'Internal server error',
      emergency: true,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).send('<h1>Error</h1><p>Something went wrong.</p>');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[EMERGENCY] Server running on port ${port}`);
  console.log(`[EMERGENCY] API routes will return proper JSON responses`);
});
