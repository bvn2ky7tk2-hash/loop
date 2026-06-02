# Loop ERP - Deploy Package

Deploy Loop ERP lên Windows Server (No Docker)

---

## 📁 Folder Structure

```
deploy/
├── deploy.bat                    # Main deploy script
├── HUONG_DAN_DEPLOY.md          # Detailed guide (Tiếng Việt)
├── README.md                    # This file
├── package.json
├── output/                      # Generated after deploy.bat
│   ├── fe/                      # Frontend (Vite static files)
│   ├── be/                      # Backend (NestJS Node.js app)
│   ├── start-fe.bat             # Start frontend
│   ├── start-be.bat             # Start backend
│   ├── start-all.bat            # Start both
│   └── DEPLOY_INFO.txt
└── .env.example                 # (copy from apps/backend/.env.example)
```

---

## 🚀 Quick Start

### On Dev Machine

```bash
# 1. Navigate to deploy folder
cd deploy

# 2. Run deploy script
deploy.bat

# 3. Wait for build to complete
# Output will be in: deploy/output/
```

### Copy to Server

```bash
# Use SCP / WinSCP / RDP to copy deploy/output/ to server
# Example with SCP:
scp -r deploy/output/* user@192.168.1.100:/C/app/loop/
```

### On Server Windows

```bash
# 1. Navigate to app folder
cd C:\app\loop

# 2. Configure .env
# Edit be\.env with your database, secrets, etc.

# 3. Start servers
start-all.bat

# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

---

## 📝 Prerequisites

### Dev Machine
- [Node.js 20+](https://nodejs.org)
- Git
- npm or pnpm

### Server
- [Node.js 20+](https://nodejs.org)
- Optional: [PostgreSQL](https://www.postgresql.org/download/windows/)
- Optional: [PM2](https://pm2.keymetrics.io/) for production

---

## 📖 Full Guide

See: **[HUONG_DAN_DEPLOY.md](./HUONG_DAN_DEPLOY.md)** (Tiếng Việt)

Topics:
- Yêu cầu & chuẩn bị
- Cách deploy chi tiết
- Cấu hình .env
- Start servers
- Production setup (PM2, IIS, Nginx)
- Troubleshooting
- Backup & update
- Monitoring

---

## 🔧 What's in deploy.bat?

```bash
✅ Check Node.js & Git installed
✅ Build Frontend (npm run build)
✅ Build Backend (npm run build)
✅ Copy dist files to output/fe & output/be
✅ Create start scripts (bat files)
✅ Copy node_modules for backend
✅ Create .env template
```

Time: ~3-5 minutes (depending on machine)

---

## 🎯 Folder Contents After Deploy

### Frontend (`output/fe/`)
- Static files from Vite build
- Ready to serve with any HTTP server
- Or use included `start-fe.bat`

### Backend (`output/be/`)
- Compiled Node.js app (dist/)
- All dependencies (node_modules/)
- .env file (configure before start)
- Run with: `node dist/main.js`

---

## 💻 Windows vs Bash/Linux

This deploy is **Windows-only** (uses .bat scripts).

For Linux/macOS, use bash equivalent:
```bash
# Instead of deploy.bat, create deploy.sh:
#!/bin/bash
cd apps/web && npm install && npm run build
cd ../backend && npm install && npm run build
# ... copy files ...
```

---

## 🔄 Update to New Version

1. On dev machine: `git pull origin main`
2. Run: `deploy.bat` again
3. Copy updated `output/` to server
4. Restart servers: `pm2 restart all` or close/reopen windows

---

## 📊 Tech Stack

| Layer | Tech | Port |
|-------|------|------|
| Frontend | React 18 + Vite | 5173 |
| Backend | NestJS + Node.js | 3000 |
| Database | PostgreSQL | 5432 |
| Server | Windows + Node.js | - |

---

## ⚠️ Important

- Configure `.env` BEFORE starting backend
- Database must exist and be accessible
- Use PM2 for production (auto-restart, logs)
- Monitor memory & disk usage
- Regular backups

---

## 📞 Troubleshooting

**Port in use?**
```bash
netstat -ano | findstr :3000
```

**Can't connect to DB?**
Check `.env` DATABASE_URL

**Frontend blank screen?**
Check browser console for API errors

**Backend crashes?**
Check `pm2 logs loop-backend`

See **HUONG_DAN_DEPLOY.md** for more troubleshooting.

---

**Deploy Package Version:** 1.0.0  
**Last Updated:** June 2024  
**Supported:** Windows Server 2016+, Windows 10/11
