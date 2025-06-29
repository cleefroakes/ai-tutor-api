const express = require('express');
const router = express.Router();
const knowledgeBase = require('../knowledge/knowledge.json');
const fetch = require('node-fetch');

router.post('/ask', async (req, res) => {
  const { query, mode } = req.body;
  let answer = 'Sorry, I don’t have an answer for that. Try asking about academic topics!';
  let chart = null;

  // Handle AI Tutor mode (knowledge base)
  if (mode === 'tutor') {
    for (const topic of knowledgeBase.topics) {
      if (query.toLowerCase().includes(topic.keyword)) {
        answer = topic.response;
        if (topic.chart) {
          chart = topic.chart;
        }
        return res.json({ answer, chart });
      }
    }
  }

  // Handle Areola mode (Wikipedia) or fallback if tutor mode fails
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodeURIComponent(query)}&exintro&explaintext`;
    const wikiResponse = await fetch(wikiUrl);
    const wikiData = await wikiResponse.json();
    const page = Object.values(wikiData.query.pages)[0];
    if (page.extract) {
      answer = page.extract.slice(0, 500) + '...';
    } else {
      answer = 'No relevant information found on Wikipedia. Try a different query!';
    }
  } catch (error) {
    console.error('Wikipedia API error:', error);
    answer = 'Error fetching Wikipedia data. Please try again later.';
  }

  res.json({ answer, chart });
});

module.exports = router;