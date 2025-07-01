const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { PythonShell } = require('python-shell');

let lastTopic = null;

function normalizeQuery(query) {
  query = query.toLowerCase().trim().replace(/[?.,!]$/, '');
  query = query.replace(/\b(usa|america|united states of america)\b/gi, 'united states');
  query = query.replace(/\s+/g, ' ').trim();
  return query;
}

async function getWikipediaSummary(query) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=${encodeURIComponent(query)}&limit=1`;
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) throw new Error(`Search HTTP error! status: ${searchResponse.status}`);
    const searchData = await searchResponse.json();
    const [searchTerm, [title]] = searchData;
    if (!title) {
      return { text: `Yo, I can’t find '${query}'. Try something like '${lastTopic || 'another topic'}'!`, imagePrompt: null };
    }

    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodeURIComponent(title)}&exintro&explaintext&exsentences=20`;
    const extractResponse = await fetch(extractUrl);
    if (!extractResponse.ok) throw new Error(`Extract HTTP error! status: ${extractResponse.status}`);
    const extractData = await extractResponse.json();
    const page = Object.values(extractData.query.pages)[0];
    if (page && page.extract) {
      lastTopic = query;
      const chunks = page.extract.match(/(.|\n){1,500}/g) || [page.extract];
      const text = `Here’s the scoop on '${page.title}' from Wikipedia:\n${chunks.join('\n---\n')}`;
      const imagePrompt = `Sci-fi illustration of ${page.title}`;
      return { text, imagePrompt };
    }
    return { text: `Yo, I found '${title}' but got no details on '${query}'. Try again!`, imagePrompt: null };
  } catch (error) {
    console.error('Wikipedia API error:', error.message);
    return { text: `Oops, something went wrong with '${query}'!`, imagePrompt: null };
  }
}

async function generateCustomImage(prompt) {
  const pyshell = new PythonShell('image_gen.py');
  return new Promise((resolve, reject) => {
    pyshell.send(JSON.stringify({ prompt }));
    pyshell.on('message', (message) => {
      resolve(`data:image/png;base64,${message}`);
    });
    pyshell.end((err) => {
      if (err) reject(err);
    });
  });
}

async function generateCustomAudio(text) {
  const pyshell = new PythonShell('tts_gen.py');
  return new Promise((resolve, reject) => {
    pyshell.send(JSON.stringify({ text: text.substring(0, 200) }));
    pyshell.on('message', (message) => {
      resolve(`data:audio/mpeg;base64,${message}`);
    });
    pyshell.end((err) => {
      if (err) reject(err);
    });
  });
}

router.post('/ask', async (req, res) => {
  const { query, mode } = req.body;
  let text = 'Yo, hit me with a question, my man!';
  let imageUrl = null;
  let audioUrl = null;

  if (!query || query.trim() === '') {
    return res.json({ text, imageUrl, audioUrl });
  }

  const normalizedQuery = normalizeQuery(query);

  if (normalizedQuery.startsWith('!wiki')) {
    const wikiQuery = normalizedQuery.slice(5).trim();
    if (wikiQuery) {
      const { text: wikiText, imagePrompt } = await getWikipediaSummary(wikiQuery);
      text = wikiText;
      if (imagePrompt) {
        imageUrl = await generateCustomImage(imagePrompt);
        audioUrl = await generateCustomAudio(text);
      }
      return res.json({ text, imageUrl, audioUrl });
    }
    text = 'Yo, give me something to search for after \'!wiki\'!';
    return res.json({ text, imageUrl, audioUrl });
  }

  if (/what('s| is)?\s*(he|she|it|they)\s*(doing|up to)\??/i.test(normalizedQuery)) {
    if (lastTopic) {
      const { text: wikiText, imagePrompt } = await getWikipediaSummary(lastTopic);
      text = wikiText;
      if (imagePrompt) {
        imageUrl = await generateCustomImage(imagePrompt);
        audioUrl = await generateCustomAudio(text);
      }
      return res.json({ text, imageUrl, audioUrl });
    }
    text = 'Yo, I need some context! Ask about someone or something first.';
    return res.json({ text, imageUrl, audioUrl });
  }

  const { text: wikiText, imagePrompt } = await getWikipediaSummary(normalizedQuery);
  text = wikiText;
  if (imagePrompt) {
    imageUrl = await generateCustomImage(imagePrompt);
    audioUrl = await generateCustomAudio(text);
  }
  res.json({ text, imageUrl, audioUrl });
});

module.exports = router;