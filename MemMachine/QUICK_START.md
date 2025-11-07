# Quick Start: Running MemMachine MCP Server

## Prerequisites Checklist

- [x] Python 3.12+ installed (you have Python 3.13.2 ✓)
- [x] `uv` package manager installed ✓
- [x] Configuration file (`configuration.yml`) exists ✓
- [ ] Neo4j database running (for episodic memory)
- [ ] PostgreSQL database running (for profile memory)
- [ ] Environment variables set (API keys, database credentials)

**Note:** The script automatically sets `MEMORY_CONFIG=configuration.yml`. If you have a different config file name, set it before running:
```bash
export MEMORY_CONFIG=my_config.yml
./run_mcp_server.sh
```

## Quick Run

### Step 1: Run the Server

```bash
cd MemMachine
./run_mcp_server.sh
```

This will:
1. Check for Python 3.12+
2. Install/sync dependencies using `uv`
3. Start the MCP server on port 8080

### Step 2: Verify Server is Running

The server should start and show:
```
Starting MemMachine MCP HTTP server at http://localhost:8080
```

### Step 3: Test the Server

In another terminal:
```bash
cd MemMachine
python test_mcp_server.py
```

## Database Requirements

Your `configuration.yml` is configured to use:
- **Neo4j** at `neo4j:7687` (for episodic memory)
- **PostgreSQL** at `postgres:5432` (for profile memory)

### Option 1: Use Docker Compose (Recommended)

If you have `docker-compose.yml` in the MemMachine directory:
```bash
cd MemMachine
docker-compose up -d
```

This will start Neo4j and PostgreSQL containers.

### Option 2: Update Configuration for Local Databases

Edit `configuration.yml` to point to local databases:
```yaml
storage:
  my_storage_id:
    vendor_name: neo4j
    host: localhost  # Changed from 'neo4j'
    port: 7687
    user: neo4j
    password: your_password

  profile_storage:
    vendor_name: postgres
    host: localhost  # Changed from 'postgres'
    port: 5432
    user: memmachine
    db_name: memmachine
    password: your_password
```

### Option 3: Run Without Databases (Limited Functionality)

The server may start but memory operations will fail until databases are configured.

## Common Issues

### Port 8080 Already in Use

```bash
./run_mcp_server.sh 9000  # Use port 9000 instead
```

Then update your backend `.env`:
```env
MEMMACHINE_MCP_URL=http://localhost:9000
```

### Database Connection Errors

1. Make sure Neo4j and PostgreSQL are running
2. Check connection credentials in `configuration.yml`
3. Verify network connectivity (if using Docker, use `host.docker.internal` or `localhost`)

### Python Version Issues

The script automatically detects Python 3.12+. If you have issues:
```bash
# Install Python 3.12 via uv
uv python install 3.12

# Or specify Python explicitly
./run_mcp_server.sh
# The script will use python3.13 or python3.12
```

## Integration with Your Backend

Your backend is configured to connect to the MCP server. Make sure:

1. **MCP Server is running** on the port specified in your backend config
2. **Backend `.env` has correct URL**:
   ```env
   MEMMACHINE_MCP_URL=http://localhost:8080
   ```
3. **Server is accessible** from your backend application

## Next Steps

- Check server logs for any errors
- Test with `test_mcp_server.py`
- Review `configuration.yml` for customization
- See `RUN_MCP_SERVER.md` for detailed documentation

## Getting Help

- Check the [MemMachine Documentation](https://docs.memmachine.ai)
- Review logs in the terminal where the server is running
- Verify database connections are working
- Test the MCP endpoint directly: `curl http://localhost:8080/mcp/`

