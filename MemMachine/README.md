# MemMachine MCP Server

MemMachine provides persistent memory storage for the Aura Memory Platform. This is a minimal installation containing only the essential files needed to run the MCP server.

## Required Files

- `src/memmachine/` - Core MemMachine source code
- `configuration.yml` - Server configuration
- `pyproject.toml` - Python dependencies
- `uv.lock` - Dependency lock file
- `start_memmachine.sh` - Start script
- `run_mcp_server.sh` - MCP server runner
- `setup.sh` - Setup script
- `docker-compose.yml` - Docker Compose configuration (optional)
- `Dockerfile` - Docker image definition (optional)

## Quick Start

### Setup

```bash
./setup.sh
```

### Start Server

```bash
./start_memmachine.sh
```

The server will run on `http://localhost:8090`

### Using Docker

```bash
# Start databases with Docker Compose
docker-compose up -d

# Start MemMachine server
./start_memmachine.sh
```

## Configuration

Edit `configuration.yml` to configure:
- Neo4j connection (for episodic memory)
- PostgreSQL connection (for profile memory)
- Embedding models
- Other server settings

## Integration

The backend connects to MemMachine via HTTP at `http://localhost:8090`. Configure the URL in `backend/.env`:

```env
MEMMACHINE_MCP_URL=http://localhost:8090
MEMMACHINE_USER_ID=default-user
```

## Notes

- This is a minimal installation for production use
- Documentation and examples have been removed to reduce size
- For full documentation, see the main MemMachine repository
