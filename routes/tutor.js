const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const say = require('say');

const knowledgeBase = require('../knowledge/knowledge.json');

router.post('/ask', async (req, res) => {
  const { query } = req.body;
  let answer = 'Sorry, I don’t have an answer for that. Try asking about calculus topics!';
  let chart = null;
  let audio = null;

  // Search knowledge base
  for (const topic of knowledgeBase.topics) {
    if (query.toLowerCase().includes(topic.keyword)) {
      answer = topic.response;
      if (topic.chart) {
        chart = topic.chart;
      }
      break;
    }
  }

  // Ensure public/audio directory exists
  const audioDir = path.join(__dirname, '../public/audio');
  try {
    await fs.mkdir(audioDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create audio directory:', error);
  }

  // Generate audio (Render-compatible, saving to a temp file)
  const audioPath = path.join(audioDir, 'response.mp3');
  try {
    await new Promise((resolve, reject) => {
      say.export(answer, null, 1.0, audioPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    audio = '/audio/response.mp3';
  } catch (error) {
    console.error('Audio generation failed:', error);
  }

  res.json({ answer, chart, audio });
});

module.exports = router;