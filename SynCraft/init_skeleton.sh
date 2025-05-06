#!/usr/bin/env bash
set -e

echo "📝 生成目录…"
mkdir -p frontend/src/components backend/app infra

cat > frontend/package.json <<'EOF'
{
  "name": "syncraft-frontend",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": { "react": "^18.2.0", "react-dom": "^18.2.0" },
  "devDependencies": { "vite": "^4.4.0", "typescript": "^5.0.4", "@types/react": "^18.2.21", "@types/react-dom": "^18.2.7" }
}
EOF

cat > frontend/index.html <<'EOF'
<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Syncraft</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
EOF

cat > frontend/vite.config.ts <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { host: true, port: 5173 } })
EOF

mkdir -p frontend/src
cat > frontend/src/main.tsx <<'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
EOF

cat > frontend/src/App.tsx <<'EOF'
export default function App() { return (<div style={{padding:24,textAlign:'center'}}><h1>Hello Syncraft 👋</h1></div>) }
EOF

# backend
cat > backend/requirements.txt <<'EOF'
fastapi==0.110.0
uvicorn[standard]==0.29.0
EOF

mkdir -p backend/app
cat > backend/app/main.py <<'EOF'
from fastapi import FastAPI
app = FastAPI()
@app.get("/")
def hello(): return {"msg":"Hello Syncraft API"}
EOF

# compose
cat > infra/docker-compose.yml <<'EOF'
version: "3.9"
services:
  frontend:
    image: node:18-alpine
    working_dir: /app
    volumes: [ "./frontend:/app" ]
    command: sh -c "npm install && npm run dev -- --host"
    ports: [ "3000:5173" ]
    depends_on: [ backend ]
  backend:
    image: python:3.11-slim
    working_dir: /app
    volumes: [ "./backend:/app" ]
    command: sh -c "pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    ports: [ "8000:8000" ]
EOF

echo "✅ 骨架生成完成"


