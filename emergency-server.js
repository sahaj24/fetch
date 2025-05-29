const http = require("http");
const fs = require("fs");
const port = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  if (req.url === "/api/health") {
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({status: "healthy", timestamp: new Date().toISOString()}));
  } else {
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end("<html><body><h1>Fetch App - Emergency Fallback</h1><p>The application is running in emergency fallback mode.</p></body></html>");
  }
});
server.listen(port, () => console.log(`Emergency server running on port ${port}`));
