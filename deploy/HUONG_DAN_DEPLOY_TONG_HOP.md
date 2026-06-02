# 📘 Hướng Dẫn Deploy Loop ERP - Tổng Hợp

> **Bản hướng dẫn cho toàn bộ quá trình deploy Loop ERP từ dev lên Windows Server**

---

## 📋 Mục Lục

1. [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
2. [Chuẩn Bị](#chuẩn-bị)
3. [Build & Deploy](#build--deploy)
4. [Cấu Hình Server](#cấu-hình-server)
5. [Start Servers](#start-servers)
6. [Kiểm Tra & Test](#kiểm-tra--test)
7. [Production Setup](#production-setup)
8. [Troubleshooting](#troubleshooting)
9. [Backup & Update](#backup--update)

---

## 🖥️ Yêu Cầu Hệ Thống

### Dev Machine (Máy build)
| Yêu cầu | Phiên bản | Tải về |
|---------|-----------|--------|
| **Node.js** | 20+ (LTS) | https://nodejs.org |
| **npm** | 10+ | Đi kèm Node.js |
| **Git** | Latest | https://git-scm.com |
| **Windows/macOS/Linux** | - | - |

### Server Windows
| Yêu cầu | Phiên bản | Lưu ý |
|---------|-----------|-------|
| **Windows Server** | 2016+ | Hoặc Windows 10/11 |
| **Node.js** | 20+ (LTS) | Cài từ https://nodejs.org |
| **PostgreSQL** | 12+ | Nếu dùng DB local |
| **PM2 (optional)** | Latest | Cho production: `npm install -g pm2` |

---

## ⚙️ Chuẩn Bị

### 1. Clone Repository
```bash
git clone https://github.com/your-repo/loop.git
cd loop
git pull origin main
```

### 2. Kiểm tra Node.js & Git
```bash
node --version    # Phải ≥ 20
npm --version     # Phải ≥ 10
git --version
```

### 3. Tạo .env Backend (Dev)
```bash
cd apps/backend
cp .env.example .env

# Chỉnh sửa .env nếu cần (database, secret keys)
```

---

## 🏗️ Build & Deploy

### **STEP 1: Build trên Dev Machine**

**Mục tiêu:** Tạo 2 folder đã build sẵn (FE + BE)

#### Cách 1: Dùng Deploy Script (Recommended)
```bash
cd deploy
deploy.bat              # Windows
# hoặc
./deploy.sh           # Linux/macOS
```

**Script sẽ:**
1. Check Node.js & Git ✓
2. Install dependencies ✓
3. Build Frontend (Vite) ✓
4. Build Backend (NestJS) ✓
5. Copy tất cả vào `deploy/output/` ✓
6. Tạo helper scripts ✓
7. Tạo .env template ✓

**Thời gian:** 3-5 phút

**Output:** Folder `deploy/output/` chứa:
```
deploy/output/
├── fe/                  (static files - Vite)
├── be/                  (Node.js app - NestJS)
├── start-fe.bat         (start frontend)
├── start-be.bat         (start backend)
├── start-all.bat        (start cả 2)
└── DEPLOY_INFO.txt
```

#### Cách 2: Manual Build (Nếu script lỗi)
```bash
# Build Frontend
cd apps/web
npm install
npm run build
# Output: dist/

# Build Backend
cd apps/backend
npm install
npm run build
# Output: dist/

# Sau đó copy thủ công vào deploy/output/
```

---

### **STEP 2: Copy lên Server Windows**

**Mục tiêu:** Copy folder `deploy/output/` từ dev lên server

#### Cách A: SCP (Nếu có SSH)
```bash
# Từ dev machine
scp -r deploy/output/* user@192.168.1.100:/C/app/loop/
```

#### Cách B: WinSCP (GUI)
1. Download: https://winscp.net
2. Connect tới server Windows
3. Drag & drop `deploy/output/` lên server

#### Cách C: RDP (Nếu có Remote Desktop)
1. RDP vào server
2. Copy-paste `deploy/output/` folder

#### Cách D: USB / Network Drive
1. Copy `deploy/output/` vào USB
2. Plug USB vào server
3. Copy vào `C:\app\loop\`

**Folder trên server:**
```
C:\app\loop\           (hoặc path tùy chọn)
├── fe\                (frontend)
├── be\                (backend)
├── start-fe.bat
├── start-be.bat
└── start-all.bat
```

---

## 🔧 Cấu Hình Server

### **STEP 3: Cấu Hình Environment Variables**

**File:** `C:\app\loop\be\.env`

#### Mở & Chỉnh Sửa
```bash
# Từ cmd
cd C:\app\loop\be
notepad .env
```

#### Các giá trị quan trọng:

| Biến | Ví dụ | Ghi chú |
|------|-------|--------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/loop` | Database connection |
| `JWT_SECRET` | `abc123xyz...` | Thay bằng key ngẫu nhiên |
| `FRONTEND_URL` | `http://192.168.1.100:5173` | IP/domain server |
| `PORT` | `3000` | Backend port |
| `NODE_ENV` | `production` | Environment |

#### Ví dụ .env đầy đủ:
```env
# Database
DATABASE_URL="postgresql://loop_user:loop_pass@localhost:5432/loop_db"

# JWT
JWT_SECRET="your-random-secret-key-min-32-chars"
JWT_EXPIRY="24h"

# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL="http://192.168.1.100:5173"

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your@gmail.com"
SMTP_PASS="app-password"

# Timezone
TZ="Asia/Ho_Chi_Minh"
```

### **STEP 4: Setup Backend Dependencies (nếu cần)**

Nếu folder `C:\app\loop\be\node_modules` không có:

```bash
cd C:\app\loop\be
npm install --production
```

**Lưu ý:** 
- Thường script deploy.bat đã copy node_modules
- Chỉ cần chạy lệnh này nếu node_modules bị lỗi hoặc không đầy đủ

### **STEP 5: Kiểm Tra Database**

```bash
# Kiểm tra PostgreSQL có chạy không
# Mở Services.msc → PostgreSQL → Running?

# Test connection
psql -U postgres -h localhost -d loop_db
# Nhập password, nếu connect được là OK
```

---

## ▶️ Start Servers

### **STEP 6: Khởi Động Services**

#### **Option 1: Simple (Dùng .bat files)**

```bash
cd C:\app\loop
start-all.bat
```

**Kết quả:**
- Mở 2 cửa sổ Command Prompt
- Cửa sổ 1: Frontend (port 5173)
- Cửa sổ 2: Backend (port 3000)

#### **Option 2: Separate Terminals**

**Terminal 1 - Frontend:**
```bash
cd C:\app\loop
start-fe.bat
```
Output:
```
Starting Frontend server on http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
cd C:\app\loop
start-be.bat
```
Output:
```
Starting Backend server on http://localhost:3000
```

#### **Option 3: Production (PM2) - Recommended**

```bash
# Cài PM2 (một lần)
npm install -g pm2

# Start Frontend & Backend
cd C:\app\loop

pm2 start "npx http-server fe -p 5173 -c-1" --name loop-frontend
pm2 start "node be/dist/main.js" --name loop-backend

# Auto-restart on reboot
pm2 save
pm2 startup

# Monitor
pm2 list
pm2 logs
```

**Lợi ích PM2:**
- ✅ Auto-restart nếu crash
- ✅ Log lưu trữ
- ✅ Monitor memory/CPU
- ✅ Dễ start/stop

---

## 🧪 Kiểm Tra & Test

### **STEP 7: Verify Services Running**

#### 1. Kiểm tra Ports
```bash
# Mở cmd mới, chạy:
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Phải có output, không lỗi
```

#### 2. Test Frontend
```
Mở browser: http://localhost:5173
- Phải load trang (không blank/error)
- Check browser console (F12) - không có red errors
```

#### 3. Test Backend API
```bash
# Mở browser hoặc curl:
curl http://localhost:3000/api/health

# Expected response:
{"status":"ok"}
```

#### 4. Test Login
```
1. Truy cập http://localhost:5173
2. Nhập credentials
3. Phải login thành công (không CORS error)
4. Dashboard hiển thị (không "Unable to fetch")
```

#### 5. Check Database Connection
```bash
# Backend log phải có:
Connected to database ✓
```

---

## 🚀 Production Setup

### **Option A: PM2 (Recommended cho Windows)**

**Ưu điểm:**
- Auto-restart trên crash
- Log monitoring
- Easy to manage

**Setup:**
```bash
# 1. Install PM2 global
npm install -g pm2

# 2. Create ecosystem.config.js
# Tạo file C:\app\loop\ecosystem.config.js:

module.exports = {
  apps: [
    {
      name: 'loop-frontend',
      script: 'npx http-server fe -p 5173 -c-1',
      cwd: 'C:\\app\\loop',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'loop-backend',
      script: 'node',
      args: 'be/dist/main.js',
      cwd: 'C:\\app\\loop',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

# 3. Start
cd C:\app\loop
pm2 start ecosystem.config.js

# 4. Auto-start on reboot
pm2 save
pm2 startup

# 5. Monitor
pm2 list
pm2 logs
```

### **Option B: Windows Task Scheduler**

Tạo 2 scheduled tasks:
- Task 1: Start Frontend (batch file)
- Task 2: Start Backend (batch file)
- Trigger: On startup

### **Option C: Nginx Reverse Proxy**

Serve FE + BE từ cùng domain/port:

```bash
# 1. Download nginx portable
# https://nginx.org/en/download.html

# 2. Extract vào C:\app\nginx\

# 3. Edit C:\app\nginx\conf\nginx.conf:

http {
    upstream backend {
        server localhost:3000;
    }
    upstream frontend {
        server localhost:5173;
    }
    
    server {
        listen 80;
        server_name _;
        
        # Frontend
        location / {
            proxy_pass http://frontend;
        }
        
        # Backend API
        location /api {
            proxy_pass http://backend;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}

# 4. Start Nginx
C:\app\nginx\nginx.exe

# 5. Access
http://server-ip
```

---

## 🐛 Troubleshooting

### **Lỗi 1: Port 3000 / 5173 đã bị dùng**

**Triệu chứng:**
```
Error: listen EADDRINUSE: address already in use 127.0.0.1:3000
```

**Giải pháp:**
```bash
# Tìm process chiếm port
netstat -ano | findstr :3000

# Kill process (thay PID)
taskkill /PID 1234 /F

# Hoặc dùng PM2 để quản lý tự động
```

### **Lỗi 2: Cannot connect to database**

**Triệu chứng:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Giải pháp:**
```bash
# 1. Check PostgreSQL running
# Services.msc → PostgreSQL → Running?

# 2. Verify connection string
# .env: DATABASE_URL đúng không?

# 3. Test connection
psql -U postgres -h localhost -d loop_db

# 4. Check firewall
# Windows Defender Firewall → Allow PostgreSQL
```

### **Lỗi 3: CORS Error trong browser**

**Triệu chứng:**
```
Access to XMLHttpRequest blocked by CORS
```

**Giải pháp:**
```bash
# 1. Update FRONTEND_URL trong .env
FRONTEND_URL="http://192.168.1.100:5173"
# Thay bằng IP/domain server đúng

# 2. Restart backend
pm2 restart loop-backend
# hoặc close & reopen start-be.bat
```

### **Lỗi 4: Frontend blank / 404**

**Triệu chứng:**
```
Trang trắng, hoặc 404 not found
```

**Giải pháp:**
```bash
# 1. Check folder fe/
C:\app\loop\fe\ có files không?

# 2. Check http-server running
# Phải có "localhost:5173"

# 3. Check browser cache
# Ctrl+Shift+Delete → Clear cache → Reload
```

### **Lỗi 5: Backend crash / restart liên tục**

**Triệu chứng:**
```
Backend process restart lặp lại
pm2 logs: Error, exit code 1
```

**Giải pháp:**
```bash
# 1. Check logs
pm2 logs loop-backend

# 2. Check .env
# Đủ biến nào chưa?
# DATABASE_URL? JWT_SECRET?

# 3. Verify build
# C:\app\loop\be\dist\main.js tồn tại không?

# 4. Test thủ công
cd C:\app\loop\be
node dist/main.js
# Xem lỗi cụ thể nào
```

---

## 💾 Backup & Update

### **Backup (Trước update)**

```bash
# Backup database
pg_dump loop_db > backup_2024-06-02.sql

# Backup app
xcopy C:\app\loop\ C:\backup\loop_backup\ /E /I /Y

# Backup lưu trữ
# Lưu vào external drive hoặc cloud
```

### **Update Code**

```bash
# 1. On dev machine
git pull origin main
cd deploy
deploy.bat

# 2. Copy lên server
scp -r deploy/output/* user@server:/C/app/loop/

# 3. On server
cd C:\app\loop

# 4. Restart
pm2 restart all
# hoặc close/reopen start-all.bat

# 5. Verify
# Test http://localhost:5173
```

---

## 📊 Monitoring & Maintenance

### **Check Status**
```bash
# PM2
pm2 list
pm2 monit

# Ports
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Logs
pm2 logs loop-backend
pm2 logs loop-frontend
```

### **Performance Monitoring**
```bash
# Memory usage
pm2 list    # Xem RES column

# CPU usage
pm2 monit   # Real-time monitoring

# Logs
pm2 logs --lines 100
```

### **Regular Maintenance**
- ✅ Daily: Check logs cho errors
- ✅ Weekly: Backup database
- ✅ Monthly: Update Node.js packages
- ✅ Quarterly: Backup configs

---

## 📞 Quick Reference

| Tác vụ | Lệnh |
|--------|------|
| **Start FE+BE** | `start-all.bat` |
| **Start FE** | `start-fe.bat` |
| **Start BE** | `start-be.bat` |
| **Check port** | `netstat -ano \| findstr :3000` |
| **Kill process** | `taskkill /PID 1234 /F` |
| **Edit .env** | `notepad C:\app\loop\be\.env` |
| **View logs (PM2)** | `pm2 logs` |
| **Restart (PM2)** | `pm2 restart all` |
| **Stop (PM2)** | `pm2 stop all` |

---

## ✅ Checklist Deploy

- [ ] Git pull code mới
- [ ] Check Node.js version (20+)
- [ ] Run deploy.bat
- [ ] Copy output/ lên server
- [ ] Chỉnh .env trên server
- [ ] Verify database connection
- [ ] Start servers (start-all.bat hoặc PM2)
- [ ] Test Frontend (http://localhost:5173)
- [ ] Test API (http://localhost:3000/api/health)
- [ ] Test Login
- [ ] Monitor logs (pm2 logs)
- [ ] Backup database
- [ ] Document changes

---

## 📚 Tài Liệu Liên Quan

- `QUICK_START.txt` - 5 bước nhanh
- `HUONG_DAN_DEPLOY.md` - Chi tiết từng phần
- `.env.example` - Mẫu cấu hình
- `README.md` - Overview

---

**Last Updated:** June 2024  
**Version:** 7.0.0  
**Support:** Windows Server 2016+, Windows 10/11

---

## 🎓 Học thêm

| Topic | Link |
|-------|------|
| Node.js | https://nodejs.org/docs |
| NestJS | https://docs.nestjs.com |
| Vite | https://vitejs.dev |
| PM2 | https://pm2.keymetrics.io/docs |
| PostgreSQL | https://www.postgresql.org/docs |
| Nginx | https://nginx.org/en/docs |

---

**Chúc bạn deploy thành công! 🚀**
