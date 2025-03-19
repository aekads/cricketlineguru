const express = require('express');
const app = express();
const path = require('path');

const admin = require('firebase-admin');
// Convert the environment variable back to a JSON object
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
// Firebase Init
// const serviceAccount = require('./firebaseKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://aekads-88e11-default-rtdb.firebaseio.com/"
});
const db = admin.database();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public')); // Optional static folder for CSS/JS

const PORT = process.env.PORT || 3000;


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
