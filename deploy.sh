#!/bin/bash
# deploy.sh — Script deploy Loop lên server production
# Chạy lệnh này trên SERVER (không phải máy local)
set -e

echo "=== Loop Deploy Script ==="
echo "Target: http://loop.smartwork.com.vn"
echo ""

# ─── 1. Cài Docker ────────────────────────────────────────────────────────────
install_docker() {
  echo "[1/5] Cài Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  # Cài Docker Compose plugin
  apt-get install -y docker-compose-plugin 2>/dev/null || \
    yum install -y docker-compose-plugin 2>/dev/null || true
  echo "Docker version: $(docker --version)"
  echo "Compose version: $(docker compose version)"
}

# ─── 2. Clone hoặc pull code ──────────────────────────────────────────────────
setup_code() {
  echo "[2/5] Lấy source code..."
  if [ -d "/opt/loop/.git" ]; then
    cd /opt/loop
    git pull origin main
  else
    mkdir -p /opt/loop
    # Thay bằng URL repo thực tế của bạn
    git clone <YOUR_REPO_URL> /opt/loop
    cd /opt/loop
  fi
}

# ─── 3. Tạo file .env ────────────────────────────────────────────────────────
setup_env() {
  echo "[3/5] Kiểm tra .env..."
  if [ ! -f "/opt/loop/.env" ]; then
    echo "Chưa có .env — tạo mới với giá trị mặc định"
    cat > /opt/loop/.env << 'ENVEOF'
# === PRODUCTION ENV — Loop ERP ===

# JWT (BẮT BUỘC đổi trước khi chạy)
JWT_SECRET=CHANGE_THIS_TO_RANDOM_64_CHARS_STRING
JWT_REFRESH_SECRET=CHANGE_THIS_REFRESH_TO_RANDOM_64_CHARS

# CORS
CORS_ORIGIN=http://loop.smartwork.com.vn

# MinIO
MINIO_ACCESS_KEY=loop_minio_prod
MINIO_SECRET_KEY=loop_minio_secret_prod
MINIO_PUBLIC_URL=http://loop.smartwork.com.vn/storage

# SMTP (tuỳ chọn)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@email.com
# SMTP_PASS=your_app_password
# SMTP_FROM=noreply@loop.smartwork.com.vn
ENVEOF
    echo ""
    echo "⚠️  QUAN TRỌNG: Hãy sửa JWT_SECRET và JWT_REFRESH_SECRET trong /opt/loop/.env"
    echo "   Dùng lệnh: nano /opt/loop/.env"
    echo ""
    read -p "Nhấn Enter sau khi đã sửa .env để tiếp tục..."
  else
    echo ".env đã tồn tại — giữ nguyên"
  fi
}

# ─── 4. Build và chạy Docker Compose ─────────────────────────────────────────
start_services() {
  echo "[4/5] Build và khởi động services..."
  cd /opt/loop
  docker compose pull postgres redis minio 2>/dev/null || true
  docker compose build --no-cache backend web
  docker compose up -d
  echo "Chờ services khởi động..."
  sleep 10
  docker compose ps
}

# ─── 5. Kiểm tra health ───────────────────────────────────────────────────────
health_check() {
  echo "[5/5] Kiểm tra health..."
  sleep 5
  if curl -sf http://localhost/api/v1/health > /dev/null 2>&1; then
    echo "✅ Backend API: OK"
  else
    echo "⚠️  Backend chưa sẵn sàng — xem log: docker compose logs backend"
  fi

  if curl -sf http://localhost/ > /dev/null 2>&1; then
    echo "✅ Web App: OK"
  else
    echo "⚠️  Web App chưa sẵn sàng — xem log: docker compose logs web"
  fi

  echo ""
  echo "=== Deploy hoàn tất ==="
  echo "Web: http://loop.smartwork.com.vn"
  echo "API: http://loop-api.smartwork.com.vn"
  echo ""
  echo "Lệnh hữu ích:"
  echo "  docker compose logs -f          # xem log realtime"
  echo "  docker compose logs backend     # log backend"
  echo "  docker compose restart backend  # restart backend"
  echo "  docker compose down             # tắt tất cả"
}

# ─── Main ─────────────────────────────────────────────────────────────────────
install_docker
setup_code
setup_env
start_services
health_check
