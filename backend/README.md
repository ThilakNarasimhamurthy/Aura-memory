# Backend Service

Python FastAPI service configured to connect to MongoDB.

## Setup

1. Create a `.env` file in this directory:

   ```env
   APP_NAME=Aura Memory Backend
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DATABASE=aura_memory_db
   ```

2. Install dependencies:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Verify Python setup (optional):

   ```bash
   python3 test_python.py
   ```

   This will check that all dependencies are installed correctly.

4. Run the development server:

   **Easiest way (recommended - handles everything automatically):**
   ```bash
   cd backend
   python3 scripts/setup_and_run.py
   ```

   **Using shell script:**
   ```bash
   cd backend
   ./scripts/start_server.sh
   ```

   **Manual way:**
   From the `backend` directory:
   ```bash
   uvicorn app.main:app --reload
   ```
   Or:
   ```bash
   .venv/bin/uvicorn app.main:app --reload
   ```

   **Note:** If you get "MONGODB_URI required" error, make sure `.env` file exists with:
   ```
   MONGODB_URI=mongodb://localhost:27017
   ```
   (Replace with your actual MongoDB connection string from Compass)

5. Verify the server is running:

   **Check if server is up:**
   ```bash
   cd backend
   ./check_server.sh
   ```

   **Or test manually:**
   ```bash
   curl http://localhost:8000/health
   ```

6. Access the API:

   - Health check: `http://localhost:8000/health`
   - API docs: `http://localhost:8000/docs`
   - Collections: `http://localhost:8000/documents`

