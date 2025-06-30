const express = require('express');
const app = express();
const tutorRouter = require('./routes/tutor');
const cors = require('cors');

app.use(express.json());
app.use(cors()); // Enable CORS for all routes
app.use(express.static('public')); // Serve static files from public folder
app.use('/api/tutor', tutorRouter);

// Basic GET route for root
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;