async function scrape() {
  const response = await fetch("https://www.impact.co.th/th/visitors/event-calendar", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "th-TH,th;q=0.9,en;q=0.8"
        }
      });
  const html = await response.text();
  const events = [];
  const itemRegex = /<div class="eb-category-\d+ eb-event-\d+ eb-event-item-grid-default-layout">([\s\S]*?)(?=<div class="eb-category-\d+ eb-event-\d+ eb-event-item-grid-default-layout"|<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>|$)/gi;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(html)) !== null) {
        const block = itemMatch[1];
        const titleMatch = /<a class="eb-event-title"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
        let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        const dateBlockMatch = /<div class="eb-event-date-time">([\s\S]*?)<\/div>/i.exec(block);
        let date = "";
        if (dateBlockMatch) {
          date = dateBlockMatch[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        }
        events.push({ title, date });
  }
  console.log(events);
}
scrape();
