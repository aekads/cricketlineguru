const express = require('express');
const app = express();
const path = require('path');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

// Firebase Init
const serviceAccount = require('./firebaseKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://aekads-88e11-default-rtdb.firebaseio.com/"
});
const db = admin.database();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public')); // Optional static folder for CSS/JS

const PORT = process.env.PORT || 3000;

// Puppeteer Scraper Function (same as before)
async function scrapeAndPush() {
  const url = 'https://cricketlineguru.com/match-detail/nmpl_2025_26/commentary/belapur-blasters-vs-mira-bhayander-lions-26th-match';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 0 });
    await page.waitForSelector('h3', { timeout: 5000 });

    const data = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.innerText.trim() : '';
      };

      const getScores = () => {
        const scoreElements = document.querySelectorAll('div.live_card.ng-star-inserted div.current.comment_current.ng-star-inserted');
        return Array.from(scoreElements).map(el => {
          const team = el.querySelector('div.name')?.innerText.trim() || '';
          const score = el.querySelector('div.score')?.innerText.trim() || '';
          return { team, score };
        });
      };

      const getBatters = () => {
        const table = document.querySelectorAll('table.tab.w-100')[0];
        if (!table) return [];

        const rows = table.querySelectorAll('tr');
        return Array.from(rows).slice(1).map(row => {
          const cols = row.querySelectorAll('td');
          if (cols.length < 6) return null;

          const playerNameRaw = cols[0].innerText.trim();
          const isStriker = playerNameRaw.includes('*');
          const name = playerNameRaw.replace('*', '').trim();

          return {
            name,
            runs: cols[1].innerText.trim(),
            balls: cols[2].innerText.trim(),
            fours: cols[3].innerText.trim(),
            sixes: cols[4].innerText.trim(),
            strikeRate: cols[5].innerText.trim(),
            isStriker
          };
        }).filter(item => item !== null);
      };

      const getBowlers = () => {
        const tables = document.querySelectorAll('table.tab.w-100');
        const table = tables.length > 1 ? tables[1] : null;
        if (!table) return [];

        const rows = table.querySelectorAll('tr');
        return Array.from(rows).slice(1).map(row => {
          const cols = row.querySelectorAll('td');
          if (cols.length < 6) return null;

          return {
            name: cols[0].innerText.trim(),
            overs: cols[1].innerText.trim(),
            maidens: cols[2].innerText.trim(),
            runs: cols[3].innerText.trim(),
            wickets: cols[4].innerText.trim(),
            economy: cols[5].innerText.trim()
          };
        }).filter(item => item !== null);
      };

      return {
        matchTitle: getText('h3'),
        matchStatus: getText('div.last-message.mar_top.ng-star-inserted'),
        currentScore: getScores(),
        batters: getBatters(),
        bowlers: getBowlers(),
        lastUpdated: new Date().toISOString()
      };
    });

    const ref = db.ref('Livematch/nmpl_2025_26_26th_match');
    await ref.set(data);

    console.log(`✅ Firebase updated at ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error('❌ Scraping Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run scraper every 10 seconds
scrapeAndPush();
setInterval(scrapeAndPush, 10000);

// Route: Render EJS Page
app.get('/', (req, res) => {
  res.render('match-details'); // Renders views/match-details.ejs
});

// API route: Provide live data to EJS via fetch
app.get('/api/live-match', async (req, res) => {
  const snapshot = await db.ref('Livematch/nmpl_2025_26_26th_match').once('value');
  res.json(snapshot.val());
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
