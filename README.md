# 🏠 Homeroom — Your Class. One Digital Home.

A private social & productivity platform designed specifically for classmates, featuring note sharing, messaging, Q&A, ClassCoin (CC) digital currency, customizable themes, tasks, streaks, and gamified achievements.

---

## ✨ Features

- 👤 **Identity System**: Username (@handle), roll number, XP level, reputation, bio, and custom avatar borders/colors.
- 📚 **Notes Sharing**: Categorized by subject (Physics, Chemistry, Biology, Mathematics, Geography, History) with download counters, star ratings, and comments.
- 💬 **Messaging**: 1-on-1 DMs, Class Group, and Subject groups with message replies, reactions, and online indicators.
- ❓ **Stack Overflow-style Q&A**: Ask and answer class questions, upvote answers, and mark best answers.
- 💰 **ClassCoin (CC) Economy**: Earn CC by sharing notes (+15 CC), answering questions (+3 CC), daily logins (+5 CC), and completing tasks.
- 🛒 **Marketplace**: Redeem CC for 7 custom themes (Dark, Light, Cyber, Matrix, Solo Leveling, Neon, Glassmorphism), golden/rainbow username colors, and avatar borders.
- 🎲 **Daily Spin Wheel & Streaks**: Spin daily for bonus CC/XP and maintain login streaks up to Day 30+.
- 🏆 **School-Themed Levels & Achievements**: Earn XP to level up from *New Student* → *Homeroom Legend*.
- 🔑 **Admin Email Approval**: New signups require approval sent via Gmail before access is granted.
- 📱 **PWA & Mobile Ready**: Full PWA support (`manifest.json` + Service Worker) exportable as an APK.

---

## 🚀 How to Run Locally

### 1. Prerequisites
- Python 3.10+

### 2. Setup Virtual Environment & Install Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. (Optional) Email Approval Setup
Create a `config.json` file in the root directory if you want real Gmail signup approval notifications:

```json
{
  "SECRET_KEY": "your-jwt-secret-key",
  "ADMIN_EMAIL": "your-gmail@gmail.com",
  "GMAIL_USER": "your-gmail@gmail.com",
  "GMAIL_APP_PASSWORD": "your-16-digit-app-password",
  "SERVER_URL": "http://localhost:5000"
}
```

*If `config.json` is omitted, approval links are printed to the server terminal output.*

### 4. Start the Server
```bash
python3 run.py
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## ☁️ Deployment Guide (Public Server)

Homeroom can be deployed to free cloud hosts (Render, Railway, Fly.io, or VPS):

### Deploy to Render / Railway
1. Push this repository to GitHub.
2. Connect your GitHub repository to **Render** or **Railway**.
3. Set the start command to: `python run.py` (or `gunicorn server.app:app`).
4. Set Environment Variables in your hosting dashboard:
   - `SECRET_KEY`: Random long secret string
   - `ADMIN_EMAIL`: Your Gmail address where approval links will be sent
   - `GMAIL_USER`: Your Gmail address used to send emails
   - `GMAIL_APP_PASSWORD`: Gmail App Password (from Google Account Security)
   - `SERVER_URL`: Your deployed domain URL (e.g. `https://homeroom-app.onrender.com`)

---

## 📁 Project Structure

```
homeroom/
├── Procfile              # Cloud deployment process file
├── requirements.txt      # Python dependencies (Flask, PyJWT, etc.)
├── run.py                # Server entry point
├── server/
│   ├── app.py            # Flask app factory
│   ├── database.py       # SQLite schema & database helpers
│   ├── email_service.py  # Gmail SMTP notification service
│   ├── middleware.py     # JWT & Admin authorization decorators
│   ├── utils.py          # Level calculations, XP, & achievements
│   └── routes/           # REST API endpoints (auth, notes, chats, Q&A, etc.)
└── public/
    ├── index.html        # Main app shell
    ├── auth.html         # Login / Signup page
    ├── approve.html      # Admin approval page
    ├── manifest.json     # PWA manifest
    ├── sw.js             # Service Worker
    ├── css/styles.css    # Complete design system & 7 theme styles
    └── js/               # API client, store, & page views
```
