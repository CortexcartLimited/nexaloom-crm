const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

module.exports = (pool) => {
    // GET /api/documents
    router.get('/', async (req, res) => {
        const { tenantId, leadId } = req.query;
        if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

        // Map DB columns to frontend Document interface
        // fileName -> name, fileSize -> size
        let query = `
            SELECT d.id, d.tenantId, d.leadId, d.fileName as name, d.fileUrl, d.fileUrl as file_path, d.fileSize as size, 
            d.visibility, d.type, d.uploaderId, d.createdAt,
            u.name as uploaderName
            FROM documents d
            LEFT JOIN users u ON d.uploaderId = u.id
            WHERE d.tenantId = ?`;

        const params = [tenantId];

        if (leadId) {
            query += ' AND d.leadId = ?';
            params.push(leadId);
        }

        query += ' ORDER BY d.createdAt DESC';

        try {
            const [rows] = await pool.query(query, params);
            // Transform rows to match Document interface (add empty versions array if missing)
            const documents = rows.map(row => ({
                ...row,
                isPublic: row.visibility === 'PUBLIC',
                versions: [] // TODO: Implement versions table if needed
            }));
            res.json(documents);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/documents/upload
    router.post('/upload', upload.single('file'), async (req, res) => {
        // req.file contains file info
        // req.body contains text fields
        const { tenantId, leadId, visibility, type, uploaderId } = req.body;

        if (!req.file || !tenantId) {
            return res.status(400).json({ error: "Missing file or required fields" });
        }

        const id = uuidv4();
        const fileUrl = `/uploads/${req.file.filename}`;

        try {
            await pool.query(
                `INSERT INTO documents (id, tenantId, leadId, fileName, fileUrl, fileSize, visibility, type, uploaderId, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [id, tenantId, leadId || null, req.file.originalname, fileUrl, req.file.size, visibility || 'PRIVATE', type || 'OTHER', uploaderId]
            );

            // Fetch uploader name to return complete object
            const [userRows] = await pool.query('SELECT name FROM users WHERE id = ?', [uploaderId]);
            const uploaderName = userRows.length > 0 ? userRows[0].name : 'Unknown';

            res.status(201).json({
                success: true,
                document: {
                    id,
                    tenantId,
                    leadId,
                    name: req.file.originalname, // Frontend expects 'name'
                    fileUrl,
                    size: req.file.size, // Frontend expects 'size'
                    visibility: visibility || 'PRIVATE',
                    isPublic: (visibility || 'PRIVATE') === 'PUBLIC',
                    type: type || 'OTHER',
                    uploaderId,
                    uploaderName, // Return the fetched name
                    createdAt: new Date(),
                    versions: []
                }
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/documents/:id
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            // First get file path to delete from disk
            const [rows] = await pool.query('SELECT fileUrl FROM documents WHERE id = ?', [id]);
            if (rows.length > 0) {
                const fileUrl = rows[0].fileUrl;
                const filename = path.basename(fileUrl);
                const filePath = path.join(uploadDir, filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            await pool.query('DELETE FROM documents WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
