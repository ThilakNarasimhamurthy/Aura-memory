# Troubleshooting Guide

## Error: "Could not import module 'main'"

### Problem
When running uvicorn, you get:
```
ERROR: Error loading ASGI app. Could not import module "main".
```

### Root Cause
The application structure has changed. The main module is now at `app/main.py`, not `main.py` in the root directory.

### Solution

**❌ WRONG:**
```bash
uvicorn main:app --reload
```

**✅ CORRECT:**
```bash
cd backend
uvicorn app.main:app --reload
```

### Multiple Ways to Start the Server

#### Option 1: Use the run_server.py script (Recommended)
```bash
cd backend
.venv/bin/python3 run_server.py
```

#### Option 2: Use start.sh script
```bash
cd backend
./start.sh
```

#### Option 3: Use the start_server.sh script
```bash
cd backend
./scripts/start_server.sh
```

#### Option 4: Manual uvicorn command
```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Option 5: Python module
```bash
cd backend
PYTHONPATH=. .venv/bin/python3 -m uvicorn app.main:app --reload
```

### Important Notes

1. **Always run from the `backend/` directory**
   - The `app` package must be importable
   - Running from parent directory won't work

2. **Use `app.main:app` not `main:app`**
   - The module is now `app.main`, not `main`
   - Uvicorn needs the full module path

3. **Check for old processes**
   ```bash
   # Kill any old uvicorn processes
   pkill -f "uvicorn main:app"
   lsof -ti :8000 | xargs kill -9
   ```

4. **Verify imports work**
   ```bash
   cd backend
   .venv/bin/python3 -c "from app.main import app; print('✓ OK')"
   ```

### Common Mistakes

1. **Running from wrong directory**
   ```bash
   # Wrong - from parent directory
   cd /Users/thilaknarasimhamurthy/Desktop/ELL
   uvicorn app.main:app  # Won't work!
   
   # Correct - from backend directory
   cd /Users/thilaknarasimhamurthy/Desktop/ELL/backend
   uvicorn app.main:app  # Works!
   ```

2. **Using old module path**
   ```bash
   # Wrong
   uvicorn main:app
   
   # Correct
   uvicorn app.main:app
   ```

3. **Not activating virtual environment**
   ```bash
   # Wrong
   uvicorn app.main:app  # Uses system Python
   
   # Correct
   source .venv/bin/activate
   uvicorn app.main:app  # Uses venv Python
   ```

### Verification

After starting the server, verify it's working:

```bash
# Check health endpoint
curl http://localhost:8000/health

# Or open in browser
open http://localhost:8000/docs
```

### Still Having Issues?

1. **Check Python path:**
   ```bash
   cd backend
   python3 -c "import sys; sys.path.insert(0, '.'); from app.main import app; print('✓ OK')"
   ```

2. **Verify file structure:**
   ```bash
   ls -la app/main.py  # Should exist
   ls -la app/__init__.py  # Should exist
   ```

3. **Check for syntax errors:**
   ```bash
   python3 -m py_compile app/main.py
   ```

4. **Reinstall dependencies:**
   ```bash
   cd backend
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

