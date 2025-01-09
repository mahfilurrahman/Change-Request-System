const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

const db = new sqlite3.Database('./db.sqlite', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to SQLite database.');
    
    db.run(`CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        change_name TEXT NOT NULL,
        date TEXT NOT NULL,
        change_no TEXT NOT NULL,
        location TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        job_title TEXT NOT NULL,
        request_category TEXT NOT NULL,
        priority TEXT NOT NULL,
        description TEXT NOT NULL,
        reason TEXT NOT NULL,
        impact TEXT NOT NULL,
        risks TEXT NOT NULL,
        tools TEXT NOT NULL,
        attachment BLOB,
        status TEXT DEFAULT 'Pending'
    )`);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

app.post('/submit', upload.single('myfile'), (req, res) => {
    try {
        console.log('Received form data:', req.body);
        
        const attachment = req.file ? req.file.path : null;

        const query = `INSERT INTO requests (
            project_name, change_name, date, change_no, location,
            first_name, last_name, email, phone, job_title,
            request_category, priority, description, reason, impact, 
            risks, tools, attachment, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`;

        db.run(query, [
            req.body.project_name,
            req.body.change_name,
            req.body.date,
            req.body.change_no,
            req.body.location,
            req.body.first_name,
            req.body.last_name,
            req.body.email,
            req.body.phone,
            req.body.job_title,
            req.body.request_category,
            req.body.priority,
            req.body.description,
            req.body.reason,
            req.body.impact,
            req.body.risks,
            req.body.tools,
            attachment
        ], function(err) {
            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({error: 'Error saving request: ' + err.message});
            }
            res.status(200).json({message: 'Request submitted successfully!'});
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({error: 'Server error: ' + error.message});
    }
});

app.get('/reports', (req, res) => {
    const sql = `SELECT * FROM requests ORDER BY id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({error: 'Error fetching reports'});
        }
        res.json(rows);
    });
});

app.post('/update-status', (req, res) => {
    console.log('Received update request:', req.body);
    
    if (!req.body.id || !req.body.status) {
        return res.status(400).json({error: 'Missing id or status'});
    }

    const { id, status } = req.body;
    const validStatuses = ['Pending', 'Approved', 'Rejected'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({error: 'Invalid status value'});
    }

    const sql = `UPDATE requests SET status = ? WHERE id = ?`;
    db.run(sql, [status, id], function(err) {
        if (err) {
            console.error("Database error:", err.message);
            return res.status(500).json({error: 'Database error while updating status'});
        }
        if (this.changes === 0) {
            return res.status(404).json({error: 'Request not found'});
        }
        res.status(200).json({message: "Status updated successfully"});
    });
});

app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);
    res.status(500).json({error: 'Something broke!'});
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
