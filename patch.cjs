const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const newEndpoint = `
  // GET: Fetch LIVE impact events (cached for 1 hour)
  let liveEventsCache = [];
  let lastLiveFetch = 0;
  
  app.get("/api/impact-events/live", async (req, res) => {
    try {
      const now = Date.now();
      if (liveEventsCache.length === 0 || now - lastLiveFetch > 3600000) {
        console.log("Fetching fresh LIVE events from IMPACT...");
        const scraped = await scrapeImpactEventCalendar();
        if (scraped && scraped.length > 0) {
          liveEventsCache = scraped;
          lastLiveFetch = now;
        }
      }
      return res.json({ success: true, events: liveEventsCache });
    } catch (err) {
      console.error("Error fetching live impact events:", err);
      return res.status(500).json({ success: false, error: err.message, events: liveEventsCache });
    }
  });
`;

const updated = code.replace('app.get("/api/impact-events", async (req, res) => {', newEndpoint + '\n  app.get("/api/impact-events", async (req, res) => {');
fs.writeFileSync('server.ts', updated);
