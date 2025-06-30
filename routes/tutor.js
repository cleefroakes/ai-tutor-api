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
  return query || query.split(' ')[0]; // Fallback to first word if empty
}

async function getWikipediaSummary(query, context = null) {
  try {
    if (!query && context) query = context;

    // First, search for the best matching article
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=${encodeURIComponent(query)}&limit=1`;
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) throw new Error(`Search HTTP error! status: ${searchResponse.status}`);
    const searchData = await searchResponse.json();
    console.log('Wiki Search response:', JSON.stringify(searchData));
    const [searchTerm, [title]] = searchData; // [query, [title], [description], [url]]
    if (!title) {
      return { answer: `Yo, I can’t find '${query}'. Try something like '${lastTopic || 'another topic'}'!`, chart: null };
    }

    // Get the extract for the found title
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodeURIComponent(title)}&exintro&explaintext&exsentences=10`;
    const extractResponse = await fetch(extractUrl);
    if (!extractResponse.ok) throw new Error(`Extract HTTP error! status: ${extractResponse.status}`);
    const extractData = await extractResponse.json();
    console.log('Wiki Extract response:', JSON.stringify(extractData));
    const page = Object.values(extractData.query.pages)[0];
    if (page && page.extract) {
      lastTopic = query;
      return { answer: `Here’s the scoop on '${page.title}' from Wikipedia:\n${page.extract.trim()}`, chart: null };
    }

    return { answer: `Yo, I found '${title}' but got no details on '${query}'. Try again or check '${lastTopic || 'something else'}'!`, chart: null };
  } catch (error) {
    console.error('Wikipedia API error:', error.message);
    return { answer: `Oops, something went wrong with '${query}'. Maybe try again or ask about '${lastTopic || 'something else'}'!`, chart: null };
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