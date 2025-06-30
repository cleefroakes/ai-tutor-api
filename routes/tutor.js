const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

let lastTopic = null;

function normalizeQuery(query) {
  query = query.toLowerCase().trim().replace(/[?.,!]$/, '');
  query = query.replace(/\b(usa|america|united states of america)\b/gi, 'united states');
  query = query.replace(/\s+/g, ' ').trim();
  return query;
}

function extractKeyTerms(query) {
  query = query.replace(/\b(who|what|where|when|why|how|is|are|the|a|an|of|in|on|at)\b/gi, '');
  query = query.replace(/\s+/g, ' ').trim();
  return query;
}

async function getWikipediaSummary(query, context = null) {
  try {
    if (!query && context) query = context;

    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodeURIComponent(query)}&exintro&explaintext`;
    const wikiResponse = await fetch(wikiUrl);
    const wikiData = await wikiResponse.json();
    const page = Object.values(wikiData.query.pages)[0];
    if (page.extract) {
      lastTopic = query;
      return { answer: `Here’s the scoop on '${page.title}' from Wikipedia:\n${page.extract.slice(0, 500)}...`, chart: null };
    }

    // Try variations and key terms
    const variations = [query, query.charAt(0).toUpperCase() + query.slice(1), query.toUpperCase(), extractKeyTerms(query)];
    for (const varQuery of variations) {
      if (!varQuery) continue;
      const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodeURIComponent(varQuery)}&exintro&explaintext`;
      const response = await fetch(url);
      const data = await response.json();
      const pageVar = Object.values(data.query.pages)[0];
      if (pageVar.extract) {
        lastTopic = query;
        return { answer: `Here’s the scoop on '${pageVar.title}' from Wikipedia:\n${pageVar.extract.slice(0, 500)}...`, chart: null };
      }
    }

    return { answer: `Yo, I’m drawing a blank on '${query}'. Try rephrasing or ask about something like '${lastTopic || 'a topic'}'!`, chart: null };
  } catch (error) {
    console.error('Wikipedia API error:', error);
    return { answer: 'Error fetching Wikipedia data. Please try again later.', chart: null };
  }
}

router.post('/ask', async (req, res) => {
  const { query, mode } = req.body;
  let answer = 'Yo, hit me with a question, my man!';
  let chart = null;

  if (!query || query.trim() === '') {
    return res.json({ answer, chart });
  }

  const normalizedQuery = normalizeQuery(query);

  // Handle explicit Wikipedia command
  if (normalizedQuery.startsWith('!wiki')) {
    const wikiQuery = normalizedQuery.slice(5).trim();
    if (wikiQuery) {
      const result = await getWikipediaSummary(wikiQuery);
      return res.json(result);
    }
    answer = 'Yo, give me something to search for after \'!wiki\'!';
    return res.json({ answer, chart });
  }

  // Handle follow-up questions
  if (/what('s| is)?\s*(he|she|it|they)\s*(doing|up to)\??/i.test(normalizedQuery)) {
    if (lastTopic) {
      const result = await getWikipediaSummary(lastTopic, lastTopic);
      return res.json(result);
    }
    answer = 'Yo, I need some context! Ask about someone or something first.';
    return res.json({ answer, chart });
  }

  // Default to Wikipedia for any question
  const result = await getWikipediaSummary(normalizedQuery);
  res.json(result);
});

module.exports = router;