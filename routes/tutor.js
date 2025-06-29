const express = require('express');
const router = express.Router();
const knowledgeBase = require('../knowledge/knowledge.json');

router.post('/ask', async (req, res) => {
  const { query } = req.body;
  let answer = 'Sorry, I don’t have an answer for that. Try asking about calculus topics!';
  let chart = null;

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

  res.json({ answer, chart });
});

module.exports = router;