# Starting MemMachine MCP Server

## Port Conflict Issue

**Problem:** The Vite dev server (frontend) uses port 8080, which conflicts with MemMachine's default port.

**Solution:** Start MemMachine on port 8081 instead.

## Quick Start

### Option 1: Use the Quick Start Script (Recommended)

```bash
cd MemMachine
./start_memmachine.sh
```

This will start MemMachine on port 8081 automatically.

### Option 2: Manual Start

```bash
cd MemMachine
./run_mcp_server.sh 8081 localhost
```

### Option 3: Change Vite Port (Alternative)

If you prefer to keep MemMachine on 8080, change Vite to use a different port:

Edit `frontent/vite.config.ts`:
```typescript
server: {
  host: "::",
  port: 3000,  // Changed from 8080
},
```

## Verify Server is Running

Once started, verify the server is running:

```bash
curl http://localhost:8081/mcp/
```

You should see a response (not HTML from Vite).

## Backend Configuration

The backend is already configured to use port 8081:

```env
MEMMACHINE_MCP_URL=http://localhost:8081
```

## Troubleshooting

### Server Won't Start

1. Check if port 8081 is available:
   ```bash
   lsof -i :8081
   ```

2. Check if databases are running (Neo4j, PostgreSQL):
   ```bash
   # If using Docker Compose
   cd MemMachine
   docker-compose up -d
   ```

3. Check configuration file:
   ```bash
   cd MemMachine
   cat configuration.yml
   ```

### Backend Still Shows Error

1. Restart the backend server after starting MemMachine
2. Verify MemMachine is running: `curl http://localhost:8081/mcp/`
3. Check backend logs for connection errors

## Next Steps

1. Start MemMachine: `cd MemMachine && ./start_memmachine.sh`
2. Restart backend server (if it's running)
3. Test the connection: The backend should now connect successfully

