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
// Award XP and update streak in one step — call this any time a user does something worth rewarding
app.post('/users/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const today = new Date().toISOString().split('T')[0]; // e.g. "2026-09-29"
    let newStreak = user.current_streak || 0;

    if (!user.last_active_date) {
      // first time ever being active
      newStreak = 1;
    } else {
      const lastDate = new Date(user.last_active_date).toISOString().split('T')[0];

      if (lastDate === today) {
        // already active today — streak stays the same
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === yesterdayStr) {
          newStreak = newStreak + 1; // kept the streak going
        } else {
          newStreak = 1; // streak broken, restart at 1
        }
      }
    }

    // log this XP event (lets us calculate weekly totals later)
    await pool.query(
      'INSERT INTO xp_log (user_id, amount, reason) VALUES ($1, $2, $3)',
      [id, amount, reason]
    );

    // update the user's running totals
    const updated = await pool.query(
      'UPDATE users SET xp_total = xp_total + $1, current_streak = $2, last_active_date = $3 WHERE id = $4 RETURNING *',
      [amount, newStreak, today, id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});
// Create or log in a user (simple - just by username, no password)
app.post('/users/login', async (req, res) => {
  try {
    const { username } = req.body;
    let result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      result = await pool.query(
        'INSERT INTO users (username) VALUES ($1) RETURNING *',
        [username]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get a user's current stats
app.get('/users/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});
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