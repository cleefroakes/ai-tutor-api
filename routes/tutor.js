const express = require('express');
const fs = require('fs');
const path = require('path');
const say = require('say');
const router = express.Router(); // Initialize router first
const Student = require('../models/student.js');
const Course = require('../models/course.js');
const Lecture = require('../models/lecture.js');

// Load knowledge base
const knowledgeBase = JSON.parse(fs.readFileSync(path.join(__dirname, '../knowledge/knowledge.json')));

// Simple NLP: keyword matching
function findResponse(topic, question) {
  const topicData = knowledgeBase[topic.toLowerCase()];
  if (!topicData) return { explanation: `Sorry, I don't have information on ${topic} yet.`, chartData: null };

  const questionLower = question.toLowerCase();
  let explanation = 'Could not find a specific answer. Please try rephrasing your question.';
  let chartData = null;

  for (const entry of topicData) {
    if (entry.keywords.some(keyword => questionLower.includes(keyword))) {
      explanation = entry.response;
      chartData = entry.chartData || null;
      break;
    }
  }

  return { explanation, chartData };
}

// Route to get students
router.get('/students', (req, res) => {
  res.json(Student.getStudents());
});

// Tutor endpoint
router.post('/', async (req, res) => {
  const { studentId, courseId, topic, question } = req.body;

  try {
    // Verify student and course
    const student = Student.getById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!student.enrolledCourses.includes(courseId)) {
      return res.status(403).json({ error: 'Student not enrolled in this course' });
    }

    const course = Course.getById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (!course.topics.includes(topic.toLowerCase())) {
      return res.status(400).json({ error: 'Topic not covered in this course' });
    }

    // Get response from knowledge base
    const { explanation, chartData } = findResponse(topic, question);

    // Generate audio
    const audioFile = `audio/response_${Date.now()}.wav`;
    await new Promise((resolve, reject) => {
      say.export(explanation, null, 1, path.join(__dirname, '..', audioFile), (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // Save lecture
    const lecture = Lecture.add({
      courseId,
      topic,
      question,
      response: explanation,
      chartData,
      audioUrl: audioFile,
    });

    res.json({
      explanation,
      chartData,
      audioUrl: `/${audioFile}`,
      lectureId: lecture.id,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

module.exports = router;