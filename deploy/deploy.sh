#!/bin/bash

# Deploy script for Loop ERP - Linux/macOS
# FE + BE deployment without Docker

set -e  # Exit on error

echo ""
echo "========================================"
echo "   LOOP ERP - Deploy to Linux/macOS"
echo "========================================"
echo ""

# Get directories
DEPLOY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$DEPLOY_DIR")"
FE_DIR="$ROOT_DIR/apps/web"
BE_DIR="$ROOT_DIR/apps/backend"
OUTPUT_DIR="$DEPLOY_DIR/output"

# Check prerequisites
echo "[1/6] Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install Node.js 20+ first."
    echo "Download: https://nodejs.org"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "ERROR: Git not found. Please install Git first."
    exit 1
fi

echo "[OK] Node.js found:"
node --version
echo "[OK] Git found:"
git --version
echo ""

# Create output directories
mkdir -p "$OUTPUT_DIR/fe"
mkdir -p "$OUTPUT_DIR/be"

# Build Frontend
echo "[2/6] Building Frontend..."
cd "$FE_DIR"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "Frontend dependencies already installed"
fi

echo "Building frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo "ERROR: Frontend build failed"
    exit 1
fi

echo "[OK] Frontend built successfully"
echo "Copying frontend dist to output..."
cp -r dist/* "$OUTPUT_DIR/fe/"
echo ""

# Build Backend
echo "[3/6] Building Backend..."
cd "$BE_DIR"

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
else
    echo "Backend dependencies already installed"
fi

echo "Building backend..."
npm run build

if [ ! -d "dist" ]; then
    echo "ERROR: Backend build failed"
    exit 1
fi

echo "[OK] Backend built successfully"
echo "Copying backend to output..."
cp -r dist "$OUTPUT_DIR/be/"
cp -r node_modules "$OUTPUT_DIR/be/" 2>/dev/null || true

# Copy .env
if [ -f "$BE_DIR/.env" ]; then
    cp "$BE_DIR/.env" "$OUTPUT_DIR/be/.env"
fi

echo ""

# Create helper scripts
echo "[4/6] Creating helper scripts..."

# Create start-fe.sh
cat > "$OUTPUT_DIR/start-fe.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/fe"
echo "Starting Frontend server on http://localhost:5173"
npx http-server . -p 5173 -c-1
EOF
chmod +x "$OUTPUT_DIR/start-fe.sh"

# Create start-be.sh
cat > "$OUTPUT_DIR/start-be.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/be"
echo "Starting Backend server on http://localhost:3000"
node dist/main.js
EOF
chmod +x "$OUTPUT_DIR/start-be.sh"

# Create start-all.sh
cat > "$OUTPUT_DIR/start-all.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo ""
echo "Starting Loop ERP..."
echo ""

# Start frontend in background
$SCRIPT_DIR/start-fe.sh &
FE_PID=$!
sleep 2

# Start backend in foreground (to see logs)
echo "Frontend PID: $FE_PID"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:3000"
echo ""

$SCRIPT_DIR/start-be.sh
EOF
chmod +x "$OUTPUT_DIR/start-all.sh"

echo "[OK] Helper scripts created"
echo ""

# Create deployment info
echo "[5/6] Preparing deployment package..."

cat > "$OUTPUT_DIR/DEPLOY_INFO.txt" << EOF
Loop ERP Deployment Info
========================

Deployed: $(date)

### Frontend
- Location: $OUTPUT_DIR/fe
- Type: Static files (Vite build output)
- Port: 5173
- Start: ./start-fe.sh

### Backend
- Location: $OUTPUT_DIR/be
- Type: Node.js NestJS app
- Port: 3000
- Start: ./start-be.sh

### Quick Start
1. Open terminal in this directory
2. Run: ./start-all.sh
3. Open browser: http://localhost:5173

### Production Setup (Long-running)
See HUONG_DAN_DEPLOY.md section "Production Setup"

Recommend using PM2:
  npm install -g pm2
  pm2 start "node dist/main.js" --name loop-backend --cwd /path/to/be
  pm2 start "npx http-server . -p 5173" --name loop-frontend --cwd /path/to/fe
  pm2 save
  pm2 startup
EOF

echo "[OK] Deployment package ready"
echo ""

# Create .env template
echo "[6/6] Creating .env template for server..."

if [ ! -f "$OUTPUT_DIR/be/.env" ] && [ -f "$BE_DIR/.env.example" ]; then
    cp "$BE_DIR/.env.example" "$OUTPUT_DIR/be/.env"
    echo "[OK] .env template created"
    echo "Please update $OUTPUT_DIR/be/.env with server values"
fi

echo ""
echo "========================================"
echo "   DEPLOYMENT COMPLETE"
echo "========================================"
echo ""
echo "Deploy folder: $OUTPUT_DIR"
echo ""
echo "To start servers:"
echo "  cd $OUTPUT_DIR"
echo "  ./start-all.sh"
echo ""
echo "Or start individually:"
echo "  ./start-fe.sh   # Frontend"
echo "  ./start-be.sh   # Backend"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:3000"
echo ""
