const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const tutorRoutes = require('./routes/tutor.js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create audio folder if it doesn't exist
const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir);
}

// Routes
app.use('/api/tutor', tutorRoutes);

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Listen on the port Render provides
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ HTTP Server running on port ${PORT}`);
});