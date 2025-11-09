#!/bin/bash
# MemMachine setup script for Aura Memory Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to configure MemMachine keys
configure_memmachine_keys() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  MemMachine Configuration${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Enter your API keys and passwords (press Enter to skip optional fields)${NC}"
    echo ""
    
    # OpenAI API Key
    read -p "OpenAI API Key (required for OpenAI models): " OPENAI_API_KEY
    if [ ! -z "$OPENAI_API_KEY" ]; then
        # Replace OpenAI API keys in configuration.yml
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/YOUR_OPENAI_API_KEY_HERE/$OPENAI_API_KEY/g" configuration.yml
        else
            # Linux
            sed -i "s/YOUR_OPENAI_API_KEY_HERE/$OPENAI_API_KEY/g" configuration.yml
        fi
        echo -e "${GREEN}✓ OpenAI API key configured${NC}"
    fi
    
    # Neo4j Password
    echo ""
    read -p "Neo4j Password (required): " NEO4J_PASSWORD
    if [ ! -z "$NEO4J_PASSWORD" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/YOUR_NEO4J_PASSWORD_HERE/$NEO4J_PASSWORD/g" configuration.yml
        else
            sed -i "s/YOUR_NEO4J_PASSWORD_HERE/$NEO4J_PASSWORD/g" configuration.yml
        fi
        echo -e "${GREEN}✓ Neo4j password configured${NC}"
    fi
    
    # PostgreSQL Password
    echo ""
    read -p "PostgreSQL Password (required): " POSTGRES_PASSWORD
    if [ ! -z "$POSTGRES_PASSWORD" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/YOUR_POSTGRES_PASSWORD_HERE/$POSTGRES_PASSWORD/g" configuration.yml
        else
            sed -i "s/YOUR_POSTGRES_PASSWORD_HERE/$POSTGRES_PASSWORD/g" configuration.yml
        fi
        echo -e "${GREEN}✓ PostgreSQL password configured${NC}"
    fi
    
    # Database Hosts (Docker vs Local)
    echo ""
    read -p "Are you using Docker Compose? (Y/n): " USE_DOCKER
    if [[ ! $USE_DOCKER =~ ^[Nn]$ ]]; then
        # Template defaults to Docker hostnames, so no change needed
        echo -e "${GREEN}✓ Using Docker Compose (service names: neo4j, postgres)${NC}"
    else
        # Replace Docker service names with localhost for local setup
        # Use sed with more specific patterns
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS sed - replace host in my_storage_id section
            sed -i '' '/my_storage_id:/,/^[[:space:]]*[^[:space:]]/ {
                /host: neo4j/ s/host: neo4j/host: localhost/
            }' configuration.yml
            # Replace host in profile_storage section
            sed -i '' '/profile_storage:/,/^[[:space:]]*[^[:space:]]/ {
                /host: postgres/ s/host: postgres/host: localhost/
            }' configuration.yml
        else
            # Linux sed - replace host in my_storage_id section
            sed -i '/my_storage_id:/,/^[[:space:]]*[^[:space:]]/ {
                /host: neo4j/ s/host: neo4j/host: localhost/
            }' configuration.yml
            # Replace host in profile_storage section
            sed -i '/profile_storage:/,/^[[:space:]]*[^[:space:]]/ {
                /host: postgres/ s/host: postgres/host: localhost/
            }' configuration.yml
        fi
        echo -e "${GREEN}✓ Configured for localhost (non-Docker setup)${NC}"
        echo -e "${YELLOW}   Note: If hosts weren't updated, manually edit configuration.yml${NC}"
        echo -e "${YELLOW}   Set 'host: localhost' for both my_storage_id and profile_storage${NC}"
    fi
    
    # AWS Credentials (optional)
    echo ""
    read -p "Do you want to configure AWS credentials? (y/N): " CONFIGURE_AWS
    if [[ $CONFIGURE_AWS =~ ^[Yy]$ ]]; then
        read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
        read -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
        
        if [ ! -z "$AWS_ACCESS_KEY_ID" ] && [ ! -z "$AWS_SECRET_ACCESS_KEY" ]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/YOUR_AWS_ACCESS_KEY_ID_HERE/$AWS_ACCESS_KEY_ID/g" configuration.yml
                sed -i '' "s/YOUR_AWS_SECRET_ACCESS_KEY_HERE/$AWS_SECRET_ACCESS_KEY/g" configuration.yml
            else
                sed -i "s/YOUR_AWS_ACCESS_KEY_ID_HERE/$AWS_ACCESS_KEY_ID/g" configuration.yml
                sed -i "s/YOUR_AWS_SECRET_ACCESS_KEY_HERE/$AWS_SECRET_ACCESS_KEY/g" configuration.yml
            fi
            echo -e "${GREEN}✓ AWS credentials configured${NC}"
        fi
    fi
    
    echo ""
    echo -e "${GREEN}✅ Configuration complete!${NC}"
    echo -e "${YELLOW}⚠️  You can edit configuration.yml manually if you need to change anything${NC}"
    echo ""
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MemMachine Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Python version
echo -e "${YELLOW}Checking Python version...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.12+${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓ $PYTHON_VERSION${NC}"

# Check if uv is installed
echo ""
echo -e "${YELLOW}Checking uv package manager...${NC}"
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}⚠ uv is not installed. Installing uv...${NC}"
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
    echo -e "${GREEN}✓ uv installed${NC}"
else
    echo -e "${GREEN}✓ uv is installed${NC}"
fi

# Check if configuration.yml exists, create from example if not
echo ""
echo -e "${YELLOW}Checking configuration file...${NC}"
if [ ! -f "configuration.yml" ]; then
    if [ -f "configuration.yml.example" ]; then
        echo -e "${YELLOW}Creating configuration.yml from configuration.yml.example...${NC}"
        cp configuration.yml.example configuration.yml
        echo -e "${GREEN}✓ configuration.yml created from template${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: Please edit configuration.yml and add your API keys and passwords${NC}"
        echo -e "${YELLOW}   Required:${NC}"
        echo -e "${YELLOW}   - OpenAI API key (if using OpenAI models)${NC}"
        echo -e "${YELLOW}   - Neo4j password${NC}"
        echo -e "${YELLOW}   - PostgreSQL password${NC}"
        echo -e "${YELLOW}   - AWS credentials (optional, if using AWS models)${NC}"
        echo ""
        read -p "Do you want to configure it now? (Y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            configure_memmachine_keys
        fi
    else
        echo -e "${RED}❌ configuration.yml.example not found${NC}"
        echo -e "${YELLOW}Please create configuration.yml with your database settings${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ configuration.yml already exists${NC}"
    echo -e "${YELLOW}⚠️  Make sure your API keys and passwords are configured${NC}"
fi

# Check Docker (optional)
echo ""
echo -e "${YELLOW}Checking Docker...${NC}"
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ Docker and Docker Compose found${NC}"
    
    # Check if docker-compose.yml exists
    if [ -f "docker-compose.yml" ]; then
        echo -e "${GREEN}✓ docker-compose.yml found${NC}"
        read -p "Do you want to start databases using Docker Compose? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${YELLOW}Starting databases with Docker Compose...${NC}"
            docker-compose up -d
            echo -e "${GREEN}✓ Databases started${NC}"
            echo -e "${YELLOW}Waiting for databases to be ready (30 seconds)...${NC}"
            sleep 30
            echo -e "${GREEN}✓ Databases are ready${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ Docker not found. You'll need to set up Neo4j and PostgreSQL manually${NC}"
fi

# Install/sync dependencies using uv
echo ""
echo -e "${YELLOW}Installing dependencies with uv...${NC}"
if [ -f "pyproject.toml" ]; then
    uv sync
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}❌ pyproject.toml not found${NC}"
    exit 1
fi

# Check port 8090
echo ""
echo -e "${YELLOW}Checking port 8090...${NC}"
if lsof -ti:8090 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 8090 is already in use${NC}"
    read -p "Do you want to kill the existing process? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:8090 | xargs kill -9 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}✓ Port 8090 cleared${NC}"
    else
        echo -e "${YELLOW}⚠ Please stop the process on port 8090 manually${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Port 8090 is available${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ MemMachine setup complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}To start MemMachine MCP server:${NC}"
echo "  ./start_memmachine.sh"
echo ""
echo -e "${YELLOW}Note: Make sure Neo4j and PostgreSQL are running before starting MemMachine${NC}"
echo ""

