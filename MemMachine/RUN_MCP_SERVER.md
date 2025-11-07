# Running MemMachine MCP Server

This guide will help you run the MemMachine MCP Server in HTTP mode.

## Prerequisites

1. **Python 3.12+** - The server requires Python 3.12 or higher
2. **uv** - Package manager (install with: `curl -LsSf https://astral.sh/uv/install.sh | sh`)
3. **Configuration file** - `configuration.yml` in the MemMachine directory

## Quick Start

### Option 1: Using the Run Script (Recommended)

```bash
cd MemMachine
./run_mcp_server.sh [PORT] [HOST]
```

Examples:
```bash
# Run on default port 8080
./run_mcp_server.sh

# Run on custom port 9000
./run_mcp_server.sh 9000

# Run on custom host and port
./run_mcp_server.sh 9000 0.0.0.0
```

### Option 2: Manual Setup

1. **Install dependencies:**
   ```bash
   cd MemMachine
   uv pip install -e .
   ```

2. **Run the server:**
   ```bash
   uv run python -m memmachine.server.mcp_http --host localhost --port 8080
   ```

   Or using the entry point:
   ```bash
   uv run memmachine-mcp-http --host localhost --port 8080
   ```

## Configuration

The server uses `configuration.yml` for configuration. Make sure this file exists in the MemMachine directory.

Key configuration sections:
- **Model**: LLM model configuration (OpenAI, AWS Bedrock, or Ollama)
- **Embedder**: Embedding model configuration
- **Storage**: Database connections (Neo4j for episodic memory, PostgreSQL for profile memory)
- **Profile Memory**: Profile memory settings

## Environment Variables

You can also set environment variables. Common ones include:
- `MEMORY_CONFIG`: Path to configuration file (default: `configuration.yml`)
- AWS credentials (if using AWS Bedrock)
- OpenAI API key (if using OpenAI)

## Server Endpoints

Once running, the server provides:
- **MCP endpoint**: `http://localhost:8080/mcp/`
- **Health check**: `http://localhost:8080/health` (if available)
- **REST API**: Various REST endpoints (see documentation)

## Testing the Server

You can test the server using the provided test script:

```bash
cd MemMachine
python test_mcp_server.py
```

## Troubleshooting

### Port Already in Use
If port 8080 is already in use, specify a different port:
```bash
./run_mcp_server.sh 9000
```

### Dependencies Not Found
Make sure you've installed the package:
```bash
uv pip install -e .
```

### Configuration Errors
Check that `configuration.yml` exists and is properly formatted. You can use the sample configs in `sample_configs/` as a reference.

### Database Connection Issues
The server requires:
- Neo4j for episodic memory storage
- PostgreSQL for profile memory storage

Make sure these databases are running and accessible according to your `configuration.yml`.

## Integration with Backend

Your backend is configured to connect to the MCP server at `http://localhost:8080`. Make sure:
1. The MCP server is running
2. The `MEMMACHINE_MCP_URL` environment variable in your backend `.env` matches the server URL
3. The server is accessible from your backend application

## Next Steps

- Check the [MemMachine Documentation](https://docs.memmachine.ai) for more details
- Review the `configuration.yml` file to customize your setup
- Test the server using `test_mcp_server.py`

