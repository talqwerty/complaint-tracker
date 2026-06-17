const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const cors = require('cors');
const path = require('path');

const app = express();
const DB_PATH = process.env.DB_PATH || 'complaints.db';
const db = new DatabaseSync(DB_PATH);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===== Database Setup =====
db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_contact TEXT,
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium',
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    assignee TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id)
  );
`);

// Auto-generate case number
function generateCaseNumber() {
  const date = new Date();
  const prefix = `CST${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}`;
  const last = db.prepare(`SELECT case_number FROM cases WHERE case_number LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}%`);
  const seq = last ? parseInt(last.case_number.slice(-4)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4,'0')}`;
}

// ===== API Routes =====

// GET /api/cases - list all cases with optional filter
app.get('/api/cases', (req, res) => {
  const { status, priority, search } = req.query;
  let query = 'SELECT * FROM cases WHERE 1=1';
  const params = [];

  if (status && status !== 'All') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (priority && priority !== 'All') {
    query += ' AND priority = ?';
    params.push(priority);
  }
  if (search) {
    query += ' AND (customer_name LIKE ? OR subject LIKE ? OR case_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';
  const cases = db.prepare(query).all(...params);
  res.json(cases);
});

// GET /api/cases/stats - dashboard summary
app.get('/api/cases/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM cases').get().count;
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM cases GROUP BY status').all();
  const byPriority = db.prepare('SELECT priority, COUNT(*) as count FROM cases GROUP BY priority').all();
  res.json({ total, byStatus, byPriority });
});

// GET /api/cases/:id - get case detail with notes
app.get('/api/cases/:id', (req, res) => {
  const caseData = db.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.id);
  if (!caseData) return res.status(404).json({ error: 'Case not found' });
  const notes = db.prepare('SELECT * FROM notes WHERE case_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ ...caseData, notes });
});

// POST /api/cases - create new case
app.post('/api/cases', (req, res) => {
  const { customer_name, customer_contact, category, priority, subject, description, assignee } = req.body;

  if (!customer_name || !category || !subject) {
    return res.status(400).json({ error: 'customer_name, category, subject are required' });
  }

  const case_number = generateCaseNumber();
  const stmt = db.prepare(`
    INSERT INTO cases (case_number, customer_name, customer_contact, category, priority, subject, description, assignee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(case_number, customer_name, customer_contact || '', category, priority || 'Medium', subject, description || '', assignee || '');
  const newCase = db.prepare('SELECT * FROM cases WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newCase);
});

// PATCH /api/cases/:id - update case (status, assignee, priority)
app.patch('/api/cases/:id', (req, res) => {
  const caseData = db.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.id);
  if (!caseData) return res.status(404).json({ error: 'Case not found' });

  const allowed = ['status', 'assignee', 'priority', 'customer_contact'];
  const updates = [];
  const params = [];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(req.body[key]);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);

  db.prepare(`UPDATE cases SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// POST /api/cases/:id/notes - add note to case
app.post('/api/cases/:id/notes', (req, res) => {
  const { author, content } = req.body;
  if (!author || !content) return res.status(400).json({ error: 'author and content are required' });

  const caseData = db.prepare('SELECT id FROM cases WHERE id = ?').get(req.params.id);
  if (!caseData) return res.status(404).json({ error: 'Case not found' });

  const result = db.prepare('INSERT INTO notes (case_id, author, content) VALUES (?, ?, ?)').run(req.params.id, author, content);
  db.prepare('UPDATE cases SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(note);
});

// DELETE /api/cases/:id - delete case
app.delete('/api/cases/:id', (req, res) => {
  const caseData = db.prepare('SELECT id FROM cases WHERE id = ?').get(req.params.id);
  if (!caseData) return res.status(404).json({ error: 'Case not found' });

  db.prepare('DELETE FROM notes WHERE case_id = ?').run(req.params.id);
  db.prepare('DELETE FROM cases WHERE id = ?').run(req.params.id);
  res.json({ message: 'Case deleted successfully' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Complaint Tracker running at http://localhost:${PORT}`);
});

module.exports = app;
