const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/', (req, res) => {
  res.send('Gamefind backend is running 🎮');
});

app.get('/courses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courses');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Get topics for a specific course
app.get('/courses/:courseId/topics', async (req, res) => {
  try {
    const { courseId } = req.params;
    const result = await pool.query(
      'SELECT * FROM topics WHERE course_id = $1',
      [courseId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get flashcards for a specific topic
app.get('/topics/:topicId/flashcards', async (req, res) => {
  try {
    const { topicId } = req.params;
    const result = await pool.query(
      'SELECT * FROM flashcards WHERE topic_id = $1',
      [topicId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get questions for a specific topic
app.get('/topics/:topicId/questions', async (req, res) => {
  try {
    const { topicId } = req.params;
    const result = await pool.query(
      'SELECT * FROM questions WHERE topic_id = $1',
      [topicId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add a new topic (for testing/admin use)
app.post('/topics', async (req, res) => {
  try {
    const { course_id, name } = req.body;
    const result = await pool.query(
      'INSERT INTO topics (course_id, name) VALUES ($1, $2) RETURNING *',
      [course_id, name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add a new flashcard (for testing/admin use)
app.post('/flashcards', async (req, res) => {
  try {
    const { topic_id, front_text, back_text } = req.body;
    const result = await pool.query(
      'INSERT INTO flashcards (topic_id, front_text, back_text) VALUES ($1, $2, $3) RETURNING *',
      [topic_id, front_text, back_text]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});