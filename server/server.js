const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const PORT = 3420;
const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS firewall_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ruleId TEXT, change TEXT, projectCode TEXT,
  sourceIp TEXT, sourceDesc TEXT, destIp TEXT, destDesc TEXT,
  port TEXT, protocol TEXT, condition TEXT, status TEXT, notes TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekStart TEXT NOT NULL,
  projectManager TEXT, projectCode TEXT,
  mon REAL DEFAULT 0, tue REAL DEFAULT 0, wed REAL DEFAULT 0, thu REAL DEFAULT 0,
  fri REAL DEFAULT 0, sat REAL DEFAULT 0, sun REAL DEFAULT 0,
  notes TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favourites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  label TEXT,
  icon TEXT,
  sp TEXT,
  folderId TEXT,
  folderName TEXT,
  path TEXT,
  toolKey TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS action_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT 'New Section',
  position INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS action_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sectionId INTEGER NOT NULL,
  title TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  status TEXT DEFAULT 'Not Started',
  dueDate TEXT DEFAULT '',
  comments TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(sectionId) REFERENCES action_sections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS action_subitems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actionId INTEGER NOT NULL,
  title TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  status TEXT DEFAULT 'Not Started',
  dueDate TEXT DEFAULT '',
  comments TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(actionId) REFERENCES action_items(id) ON DELETE CASCADE
);
`);

const app = express();
app.use(cors());
app.use(express.json());

// ───────────────────────────────────────────
// Firewall Rules
// ───────────────────────────────────────────
const FW_FIELDS = ['ruleId','change','projectCode','sourceIp','sourceDesc','destIp','destDesc','port','protocol','condition','status','notes'];

app.get('/api/firewall-rules', (req, res) => {
  const rows = db.prepare('SELECT * FROM firewall_rules ORDER BY id ASC').all();
  res.json(rows);
});

app.post('/api/firewall-rules', (req, res) => {
  const cols = FW_FIELDS;
  const vals = cols.map(c => req.body[c] ?? '');
  const placeholders = cols.map(() => '?').join(',');
  const info = db.prepare(`INSERT INTO firewall_rules (${cols.join(',')}) VALUES (${placeholders})`).run(...vals);
  const row = db.prepare('SELECT * FROM firewall_rules WHERE id=?').get(info.lastInsertRowid);
  res.json(row);
});

app.put('/api/firewall-rules/:id', (req, res) => {
  const cols = FW_FIELDS;
  const sets = cols.map(c => `${c}=?`).join(',');
  const vals = cols.map(c => req.body[c] ?? '');
  db.prepare(`UPDATE firewall_rules SET ${sets}, updatedAt=datetime('now') WHERE id=?`).run(...vals, req.params.id);
  const row = db.prepare('SELECT * FROM firewall_rules WHERE id=?').get(req.params.id);
  res.json(row);
});

app.delete('/api/firewall-rules/:id', (req, res) => {
  db.prepare('DELETE FROM firewall_rules WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/firewall-rules/bulk-delete', (req, res) => {
  const ids = req.body.ids || [];
  if (!ids.length) return res.json({ ok: true, deleted: 0 });
  const placeholders = ids.map(() => '?').join(',');
  const info = db.prepare(`DELETE FROM firewall_rules WHERE id IN (${placeholders})`).run(...ids);
  res.json({ ok: true, deleted: info.changes });
});

app.post('/api/firewall-rules/bulk-update', (req, res) => {
  const { ids = [], fields = {} } = req.body;
  if (!ids.length) return res.json({ ok: true, updated: 0 });
  const allowed = Object.keys(fields).filter(k => FW_FIELDS.includes(k));
  if (!allowed.length) return res.json({ ok: true, updated: 0 });
  const sets = allowed.map(k => `${k}=?`).join(',');
  const vals = allowed.map(k => fields[k]);
  const placeholders = ids.map(() => '?').join(',');
  const info = db.prepare(`UPDATE firewall_rules SET ${sets}, updatedAt=datetime('now') WHERE id IN (${placeholders})`).run(...vals, ...ids);
  res.json({ ok: true, updated: info.changes });
});

// ───────────────────────────────────────────
// Timesheet
// ───────────────────────────────────────────
const TS_FIELDS = ['weekStart','projectManager','projectCode','mon','tue','wed','thu','fri','sat','sun','notes'];

app.get('/api/timesheet', (req, res) => {
  const week = req.query.week;
  let rows;
  if (week) rows = db.prepare('SELECT * FROM timesheet_entries WHERE weekStart=? ORDER BY id ASC').all(week);
  else rows = db.prepare('SELECT * FROM timesheet_entries ORDER BY id ASC').all();
  res.json(rows);
});

app.post('/api/timesheet', (req, res) => {
  const cols = TS_FIELDS;
  const vals = cols.map(c => req.body[c] ?? (['mon','tue','wed','thu','fri','sat','sun'].includes(c) ? 0 : ''));
  const placeholders = cols.map(() => '?').join(',');
  const info = db.prepare(`INSERT INTO timesheet_entries (${cols.join(',')}) VALUES (${placeholders})`).run(...vals);
  const row = db.prepare('SELECT * FROM timesheet_entries WHERE id=?').get(info.lastInsertRowid);
  res.json(row);
});

app.put('/api/timesheet/:id', (req, res) => {
  const cols = TS_FIELDS;
  const sets = cols.map(c => `${c}=?`).join(',');
  const vals = cols.map(c => req.body[c] ?? (['mon','tue','wed','thu','fri','sat','sun'].includes(c) ? 0 : ''));
  db.prepare(`UPDATE timesheet_entries SET ${sets}, updatedAt=datetime('now') WHERE id=?`).run(...vals, req.params.id);
  const row = db.prepare('SELECT * FROM timesheet_entries WHERE id=?').get(req.params.id);
  res.json(row);
});

app.delete('/api/timesheet/:id', (req, res) => {
  db.prepare('DELETE FROM timesheet_entries WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ───────────────────────────────────────────
// Favourites
// ───────────────────────────────────────────
app.get('/api/favourites', (req, res) => {
  res.json(db.prepare('SELECT * FROM favourites ORDER BY id ASC').all());
});

app.post('/api/favourites', (req, res) => {
  const { type, label, icon, sp, folderId, folderName, path: itemPath, toolKey } = req.body;
  const info = db.prepare(`INSERT INTO favourites (type,label,icon,sp,folderId,folderName,path,toolKey) VALUES (?,?,?,?,?,?,?,?)`)
    .run(type || '', label || '', icon || '', sp || '', folderId || '', folderName || '', itemPath || '', toolKey || '');
  const row = db.prepare('SELECT * FROM favourites WHERE id=?').get(info.lastInsertRowid);
  res.json(row);
});

app.delete('/api/favourites/:id', (req, res) => {
  db.prepare('DELETE FROM favourites WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/favourites/by-sp/:sp', (req, res) => {
  db.prepare('DELETE FROM favourites WHERE sp=?').run(req.params.sp);
  res.json({ ok: true });
});

// ───────────────────────────────────────────
// Action Tracker
// ───────────────────────────────────────────
const ACTION_FIELDS = ['title', 'owner', 'status', 'dueDate', 'comments'];

app.get('/api/action-tracker', (req, res) => {
  const sections = db.prepare('SELECT * FROM action_sections ORDER BY position ASC, id ASC').all();
  const items = db.prepare('SELECT * FROM action_items ORDER BY position ASC, id ASC').all();
  const subitems = db.prepare('SELECT * FROM action_subitems ORDER BY position ASC, id ASC').all();
  const result = sections.map(sec => ({
    ...sec,
    actions: items.filter(i => i.sectionId === sec.id).map(act => ({
      ...act,
      subactions: subitems.filter(s => s.actionId === act.id),
    })),
  }));
  res.json(result);
});

app.post('/api/action-sections', (req, res) => {
  const name = req.body.name || 'New Section';
  const posRow = db.prepare('SELECT COALESCE(MAX(position),-1)+1 AS p FROM action_sections').get();
  const info = db.prepare('INSERT INTO action_sections (name, position) VALUES (?, ?)').run(name, posRow.p);
  res.json(db.prepare('SELECT * FROM action_sections WHERE id=?').get(info.lastInsertRowid));
});

app.put('/api/action-sections/:id', (req, res) => {
  db.prepare('UPDATE action_sections SET name=? WHERE id=?').run(req.body.name || 'Untitled Section', req.params.id);
  res.json(db.prepare('SELECT * FROM action_sections WHERE id=?').get(req.params.id));
});

app.delete('/api/action-sections/:id', (req, res) => {
  db.prepare('DELETE FROM action_sections WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/action-items', (req, res) => {
  const sectionId = req.body.sectionId;
  const cols = ACTION_FIELDS;
  const vals = cols.map(c => req.body[c] ?? '');
  const posRow = db.prepare('SELECT COALESCE(MAX(position),-1)+1 AS p FROM action_items WHERE sectionId=?').get(sectionId);
  const placeholders = cols.map(() => '?').join(',');
  const info = db.prepare(`INSERT INTO action_items (sectionId, ${cols.join(',')}, position) VALUES (?, ${placeholders}, ?)`)
    .run(sectionId, ...vals, posRow.p);
  const row = db.prepare('SELECT * FROM action_items WHERE id=?').get(info.lastInsertRowid);
  res.json({ ...row, subactions: [] });
});

app.put('/api/action-items/:id', (req, res) => {
  const cols = ACTION_FIELDS;
  const sets = cols.map(c => `${c}=?`).join(',');
  const vals = cols.map(c => req.body[c] ?? '');
  db.prepare(`UPDATE action_items SET ${sets}, updatedAt=datetime('now') WHERE id=?`).run(...vals, req.params.id);
  res.json(db.prepare('SELECT * FROM action_items WHERE id=?').get(req.params.id));
});

app.delete('/api/action-items/:id', (req, res) => {
  db.prepare('DELETE FROM action_items WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/action-subitems', (req, res) => {
  const actionId = req.body.actionId;
  const cols = ACTION_FIELDS;
  const vals = cols.map(c => req.body[c] ?? '');
  const posRow = db.prepare('SELECT COALESCE(MAX(position),-1)+1 AS p FROM action_subitems WHERE actionId=?').get(actionId);
  const placeholders = cols.map(() => '?').join(',');
  const info = db.prepare(`INSERT INTO action_subitems (actionId, ${cols.join(',')}, position) VALUES (?, ${placeholders}, ?)`)
    .run(actionId, ...vals, posRow.p);
  res.json(db.prepare('SELECT * FROM action_subitems WHERE id=?').get(info.lastInsertRowid));
});

app.put('/api/action-subitems/:id', (req, res) => {
  const cols = ACTION_FIELDS;
  const sets = cols.map(c => `${c}=?`).join(',');
  const vals = cols.map(c => req.body[c] ?? '');
  db.prepare(`UPDATE action_subitems SET ${sets}, updatedAt=datetime('now') WHERE id=?`).run(...vals, req.params.id);
  res.json(db.prepare('SELECT * FROM action_subitems WHERE id=?').get(req.params.id));
});

app.delete('/api/action-subitems/:id', (req, res) => {
  db.prepare('DELETE FROM action_subitems WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`FileView backend running at http://localhost:${PORT}`);
});
