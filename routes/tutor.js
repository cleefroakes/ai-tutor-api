const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const knowledgeBase = require('../knowledge/knowledge.json');

// Predefined responses (from Areola)
const responses = {
  '^\\bhi\\b$': 'Yo, what\'s good, my man?',
  '^\\bhow are you\\b$': 'I\'m vibin\' like a true AI, dawg! What\'s up with you?',
  '^\\bwhat is the weather like\\?\\b$': 'No windows here, but tell me your spot and I’ll guess... or not!',
  '^\\btell me a joke\\b$': 'Why did the scarecrow win an award? He was outstanding in his field!',
  '^\\bwho made you\\?\\b$': 'Cleef Rookie and Grok AI built me to drop knowledge and keep it real!',
  '^\\bwhat is your name\\?\\b$': 'I’m Areola, your smooth-talkin’ AI, ready to chat, my man!',
  '^\\bwhat can you do\\?\\b$': 'I can chat about almost anything, crack jokes, or pull facts from Wikipedia! Ask me stuff like \'who’s the president?\' or select Areola mode for deep dives.'
};

// Question mappings for specific queries (using RegExp objects)
const questionMappings = [
  { pattern: /who('s| is)?\s*(the)?\s*president\s*(of\s*(the)?\s*(usa|united states|america))\??/i, target: 'president of the united states' },
  { pattern: /who('s| is)?\s*(the)?\s*vice president\s*(of\s*(the)?\s*(usa|united states|america))\??/i, target: 'vice president of the united states' },
  { pattern: /who('s| is)?\s*(the)?\s*first lady\s*(of\s*(the)?\s*(usa|united states|america))\??/i, target: 'first lady of the united states' },
  { pattern: /who('s| is)?\s*(the)?\s*leader\s*(of\s*(the)?\s*congress)\??/i, target: 'leader of congress' },
  { pattern: /what('s| is)?\s*(the)?\s*capital\s*(of\s*(.*))\??/i, target: (match) => match[4] },
  { pattern: /who('s| is)?\s*(.*)\??/i, target: (match) => match[2] },
  { pattern: /what('s| is)?\s*(.*)\??/i, target: (match) => match[2] },
  { pattern: /what('s| is)?\s*(the)?\s*deal\s*with\s*(.*)\??/i, target: (match) => match[3] }
];

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

    // Check knowledge.json first
    for (const topic of knowledgeBase.topics) {
      if (query.toLowerCase() === topic.keyword.toLowerCase()) {
        lastTopic = query;
        return { answer: topic.response, chart: topic.chart || null };
      }
    }

    // Query Wikipedia
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodeURIComponent(query)}&exintro&explaintext`;
    const wikiResponse = await fetch(wikiUrl);
    const wikiData = await wikiResponse.json();
    const page = Object.values(wikiData.query.pages)[0];
    if (page.extract) {
      lastTopic = query;
      return { answer: `Here’s the scoop on '${page.title}' from Wikipedia:\n${page.extract.slice(0, 500)}...`, chart: null };
    }

    // Try variations
    const variations = [query, query.charAt(0).toUpperCase() + query.slice(1), query.toUpperCase()];
    for (const varQuery of variations) {
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
  let answer = 'Sorry, I don’t have an answer for that. Try asking about academic topics!';
  let chart = null;

  const normalizedQuery = normalizeQuery(query);

  // Check predefined responses
  for (const pattern in responses) {
    if (new RegExp(pattern, 'i').test(normalizedQuery)) {
      answer = responses[pattern];
      return res.json({ answer, chart });
    }
  }

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

  // Handle AI Tutor (knowledge base) or Areola (Wikipedia) mode
  if (mode === 'tutor') {
    for (const topic of knowledgeBase.topics) {
      if (normalizedQuery.includes(topic.keyword.toLowerCase())) {
        answer = topic.response;
        chart = topic.chart || null;
        lastTopic = normalizedQuery;
        return res.json({ answer, chart });
      }
    }
  }

  // Fallback to question mappings or Wikipedia
  for (const mapping of questionMappings) {
    const match = mapping.pattern.exec(normalizedQuery);
    if (match) {
      const queryExtract = typeof mapping.target === 'function' ? mapping.target(match) : mapping.target;
      const result = await getWikipediaSummary(normalizeQuery(queryExtract));
      return res.json(result);
    }
  }

  // Fallback to key terms
  const keyTerms = extractKeyTerms(normalizedQuery);
  if (keyTerms) {
    const result = await getWikipediaSummary(keyTerms);
    return res.json(result);
  }

  res.json({ answer, chart });
});

module.exports = router;