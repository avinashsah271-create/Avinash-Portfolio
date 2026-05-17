const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — allows local dev + any Vercel-deployed frontend
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    /\.vercel\.app$/,         // any *.vercel.app subdomain
    process.env.FRONTEND_URL  // optional: set your custom domain in .env
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow server-to-server / curl
        const allowed = allowedOrigins.some(o =>
            typeof o === 'string' ? o === origin : o.test(origin)
        );
        allowed ? callback(null, true) : callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}
if (!fs.existsSync('uploads/certificates')) {
    fs.mkdirSync('uploads/certificates', { recursive: true });
}
if (!fs.existsSync('uploads/documents')) {
    fs.mkdirSync('uploads/documents', { recursive: true });
}
if (!fs.existsSync('uploads/projects')) {
    fs.mkdirSync('uploads/projects', { recursive: true });
}
if (!fs.existsSync('uploads/profile')) {
    fs.mkdirSync('uploads/profile', { recursive: true });
}

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/portfolio';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.log('⚠️ MongoDB connection error:', err.message));

// Define Message Schema
const messageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// JWT Middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized - No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Unauthorized - Invalid token' });
    }
};

// Auth Routes
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    // Check against .env or default values
    const validUsername = process.env.ADMIN_USERNAME || 'admin';
    const validPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (username === validUsername && password === validPassword) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ success: true, token, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/api/auth/check', verifyToken, (req, res) => {
    res.status(200).json({ success: true, message: 'Token is valid' });
});


// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.body.type || 'documents';
        const dir = path.join('uploads', type);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['application/pdf', 'application/msword', 
                              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                              'application/vnd.ms-excel',
                              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                              'application/zip',
                              'application/x-zip-compressed',
                              'text/plain',
                              'text/markdown',
                              'image/png', 'image/jpeg', 'image/jpg'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, ZIP, PNG, JPG, TXT, MD allowed.'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes
app.get('/', (req, res) => {
    res.send('Avinash Sah Portfolio Backend is running...');
});

const nodemailer = require('nodemailer');

// Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Check if email is properly configured
const isEmailConfigured = process.env.EMAIL_PASS && 
                         process.env.EMAIL_PASS !== 'your_app_password_here';

// Test email configuration (only if properly configured)
if (isEmailConfigured) {
    transporter.verify((error, success) => {
        if (error) {
            console.log('⚠️  Email Configuration Error:', error.message);
        } else {
            console.log('✅ Email Configuration Valid - Ready to send messages');
        }
    });
} else {
    console.log('⚠️  Email not configured (using placeholder password)');
    console.log('📧 To enable email: Set EMAIL_PASS in .env with your Gmail App Password');
}

app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    console.log('Contact Message Received:', { name, email, message });
    
    // Check if email is configured
    if (!isEmailConfigured) {
        return res.status(503).json({ 
            success: false, 
            message: 'Email service not configured yet. Please contact admin to set up Gmail App Password.' 
        });
    }
    
    const mailOptions = {
        from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
        to: 'avinashsah271@gmail.com',
        replyTo: `"${name}" <${email}>`,
        subject: `📬 New Message from ${name} — Portfolio`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { margin: 0; padding: 0; background: #0a0a0f; font-family: 'Segoe UI', Arial, sans-serif; }
            .wrapper { max-width: 600px; margin: 40px auto; background: #13131a; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #00e5ff22, #00ff8811); padding: 40px 40px 30px; border-bottom: 1px solid rgba(255,255,255,0.07); }
            .logo { font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -1px; }
            .logo span { color: #00e5ff; }
            .badge { display: inline-block; margin-top: 12px; padding: 4px 14px; background: rgba(0,229,255,0.15); color: #00e5ff; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(0,229,255,0.3); }
            .body { padding: 36px 40px; }
            .label { font-size: 11px; font-weight: 700; color: #8b8b99; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
            .value { font-size: 15px; color: #ffffff; margin-bottom: 24px; line-height: 1.6; }
            .value a { color: #00e5ff; text-decoration: none; }
            .divider { height: 1px; background: rgba(255,255,255,0.07); margin: 8px 0 24px; }
            .message-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 20px 24px; color: #cccccc; font-size: 15px; line-height: 1.8; white-space: pre-wrap; }
            .footer { padding: 24px 40px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.07); text-align: center; font-size: 12px; color: #8b8b99; }
            .reply-btn { display: inline-block; margin-top: 16px; padding: 12px 28px; background: #00e5ff; color: #000000; font-weight: 700; font-size: 14px; border-radius: 50px; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="header">
              <div class="logo">AVINASH<span>.</span></div>
              <div class="badge">📬 New Portfolio Message</div>
            </div>
            <div class="body">
              <div class="label">From</div>
              <div class="value">${name}</div>
              <div class="divider"></div>
              
              <div class="label">Email</div>
              <div class="value"><a href="mailto:${email}">${email}</a></div>
              <div class="divider"></div>
              
              <div class="label">Message</div>
              <div class="message-box">${message.replace(/\n/g, '<br>')}</div>

              <div style="text-align:center; margin-top: 30px;">
                <a href="mailto:${email}" class="reply-btn">↩ Reply to ${name}</a>
              </div>
            </div>
            <div class="footer">
              This message was sent from your portfolio contact form at <strong>avinashsah271@gmail.com</strong><br/>
              © 2026 Avinash Sah — Engineered with precision.
            </div>
          </div>
        </body>
        </html>
        `
    };

    try {
        // Save to Database (if connected)
        if (mongoose.connection.readyState === 1) {
            const newMessage = new Message({ name, email, message });
            await newMessage.save();
        }

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ success: false, message: 'Error processing request.' });
    }
});

// File Upload Endpoint (Protected)
app.post('/api/upload', verifyToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const fileUrl = `/uploads/${req.body.type || 'documents'}/${req.file.filename}`;
    res.status(200).json({
        success: true,
        message: 'File uploaded successfully!',
        file: {
            name: req.file.originalname,
            path: fileUrl,
            size: req.file.size,
            type: req.body.type || 'documents'
        }
    });
});

// Get all files by type
app.get('/api/files/:type', (req, res) => {
    const type = req.params.type;
    const dirPath = path.join('uploads', type);

    if (!fs.existsSync(dirPath)) {
        return res.status(200).json({ success: true, files: [] });
    }

    fs.readdir(dirPath, (err, files) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error reading files.' });
        }

        const fileList = files.map(file => ({
            name: file,
            path: `/uploads/${type}/${file}`,
            url: `/uploads/${type}/${file}`
        }));

        res.status(200).json({ success: true, files: fileList });
    });
});

// Delete file endpoint (Protected)
app.delete('/api/files/:type/:filename', verifyToken, (req, res) => {
    const { type, filename } = req.params;
    const filePath = path.join('uploads', type, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found.' });
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error deleting file.' });
        }
        res.status(200).json({ success: true, message: 'File deleted successfully!' });
    });
});

// Admin Route to fetch all messages (Protected)
app.get('/api/messages', verifyToken, async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database not connected' });
        }
        const messages = await Message.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching messages' });
    }
});

app.get('/api/analytics', (req, res) => {
    // Dummy analytics data
    res.status(200).json({
        visitors: Math.floor(Math.random() * 1000) + 500,
        projectsViewed: Math.floor(Math.random() * 500) + 200,
        uptime: '99.9%'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
            return res.status(400).json({ success: false, message: 'File too large. Max 10MB.' });
        }
    }
    if (err.message) {
        return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error.' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
