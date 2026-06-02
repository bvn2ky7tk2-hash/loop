# Hướng dẫn Deploy Loop ERP lên Windows Server

> Không có Docker - Deploy đơn giản trên Windows Server

---

## 📋 Yêu cầu

### Trên máy build (dev)
- Node.js 20+
- Git
- npm hoặc pnpm

### Trên server Windows
- Node.js 20+ (LTS)
- Không cần Docker
- Internet để download packages (hoặc pre-install node_modules)

---

## 🚀 Cách deploy

### **Bước 1: Clone/Pull code mới nhất**

```bash
git clone <repo-url>
cd Loop
git pull origin main
```

### **Bước 2: Chạy deploy script**

Trên máy dev, mở Command Prompt:

```bash
cd deploy
deploy.bat
```

**Script sẽ:**
1. ✅ Check Node.js, Git
2. ✅ Build Frontend (Vite) → `deploy/output/fe/`
3. ✅ Build Backend (NestJS) → `deploy/output/be/`
4. ✅ Tạo helper scripts (start-fe.bat, start-be.bat, start-all.bat)
5. ✅ Copy .env template
6. ✅ Output folder ready to deploy

### **Bước 3: Copy folder `deploy/output/` lên server Windows**

Dùng:
- **SCP**: `scp -r deploy/output/ user@server:/path/to/app/`
- **RDP + copy-paste**: Nếu server có RDP
- **SFTP**: FileZilla, WinSCP, v.v.

Structure trên server:
```
C:\app\loop\         (or any path)
├── fe\              (frontend static files)
├── be\              (backend nodejs app)
├── start-fe.bat
├── start-be.bat
├── start-all.bat
└── DEPLOY_INFO.txt
```

### **Bước 4: Cấu hình server .env**

Trên server, chỉnh sửa `C:\app\loop\be\.env`:

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/loop_db"

# JWT
JWT_SECRET="your-secret-key-here"
JWT_EXPIRY="24h"

# Frontend URL (để CORS)
FRONTEND_URL="http://server-ip:5173"

# Server port
PORT=3000
NODE_ENV=production

# Email (nếu dùng)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-password"

# Storage/MinIO (nếu dùng)
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ROOT_USER="minioadmin"
MINIO_ROOT_PASSWORD="minioadmin"
```

### **Bước 5: Cài dependency Backend (nếu needed)**

Nếu folder `be/node_modules` không có, cần cài:

```bash
cd C:\app\loop\be
npm install --production
```

Hoặc copy từ dev machine (nhanh hơn).

---

## ▶️ Start Servers

### **Option 1: Start cả FE & BE (Recommended)**

```bash
cd C:\app\loop
start-all.bat
```

Sẽ mở 2 cửa sổ Command:
- 1 cửa sổ: Frontend (port 5173)
- 1 cửa sổ: Backend (port 3000)

### **Option 2: Start riêng lẻ**

Terminal 1 - Frontend:
```bash
cd C:\app\loop
start-fe.bat
```

Terminal 2 - Backend:
```bash
cd C:\app\loop
start-be.bat
```

### **Kiểm tra:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api/health

---

## 🔧 Production Setup (Long-running)

Không dùng `start-all.bat` (dùng cmd windows tắt đi). Thay vào đó:

### **Option A: PM2 (Recommended)**

Cài PM2:
```bash
npm install -g pm2
```

Tạo `C:\app\loop\ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'loop-frontend',
      script: 'npx',
      args: 'http-server be -p 5173 -c-1',
      cwd: 'C:\\app\\loop\\fe',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'loop-backend',
      script: 'node',
      args: 'dist/main.js',
      cwd: 'C:\\app\\loop\\be',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

Start:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Kiểm tra:
```bash
pm2 list
pm2 logs
```

### **Option B: Windows Task Scheduler**

Tạo 2 scheduled tasks để auto-start khi server reboot.

### **Option C: IIS + Node (Advanced)**

Dùng IIS với iisnode extension.

---

## 🌐 Reverse Proxy Setup (Nginx)

Nếu muốn serve FE + BE từ cùng port (80):

### **Cài Nginx portable**

1. Download: https://nginx.org/en/download.html
2. Extract vào `C:\app\nginx\`
3. Tạo `C:\app\nginx\conf\nginx.conf`:

```nginx
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
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

Start Nginx:
```bash
cd C:\app\nginx
nginx.exe
```

Access: http://server-ip

---

## 🐛 Troubleshooting

### Frontend không load
```
❌ Port 5173 in use
✅ Thay đổi port trong start-fe.bat: 
   npx http-server . -p 5174 -c-1
```

### Backend connection error
```
❌ Cannot connect to database
✅ Check DATABASE_URL trong .env
✅ Ensure PostgreSQL running và accessible
```

### CORS error
```
❌ Access to XMLHttpRequest blocked
✅ Update FRONTEND_URL trong .env:
   FRONTEND_URL="http://server-ip:5173"
```

### High memory usage
```
❌ Node process using 2GB+
✅ Restart PM2: pm2 restart all
✅ Check for memory leaks trong code
```

---

## 📊 Monitoring

### Check server status:
```bash
# Check ports
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Check Node processes
tasklist | findstr node.exe

# PM2
pm2 list
pm2 monit
```

### View logs:
```bash
# PM2 logs
pm2 logs loop-backend
pm2 logs loop-frontend

# Manual logs
cd be
node dist/main.js 2>&1 | tee be.log
```

---

## 🔄 Update code

Khi có code mới:

### **On dev machine:**
```bash
git pull origin main
cd deploy
deploy.bat
```

### **Copy lên server:**
```bash
scp -r deploy/output/* user@server:/app/loop/
```

### **Restart servers:**
```bash
# Nếu dùng PM2
pm2 restart all

# Nếu dùng start-all.bat
# Close windows và chạy lại start-all.bat
```

---

## 💾 Backup

Trước update, backup:
```bash
# Backup database
pg_dump loop_db > backup_2024-06-02.sql

# Backup app
xcopy C:\app\loop\ C:\backup\loop_2024-06-02\ /E /I /Y
```

---

## 📞 Support

Nếu có lỗi:
1. Check logs: `pm2 logs` hoặc window console
2. Check ports: `netstat -ano | findstr :3000`
3. Check .env: Database URL, JWT_SECRET
4. Restart: `pm2 restart all`

---

**Last updated:** June 2, 2024
**Deploy version:** Loop v7.0
