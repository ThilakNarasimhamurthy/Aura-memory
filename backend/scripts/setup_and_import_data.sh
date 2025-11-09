#!/bin/bash
# Setup and import synthetic data to MongoDB

set -e

echo "=========================================="
echo "MongoDB Data Setup and Import"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if MongoDB is running
echo "1. Checking MongoDB connection..."
if ! mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${RED}❌ MongoDB is not running!${NC}"
    echo ""
    echo "Please start MongoDB:"
    echo "  - macOS: brew services start mongodb-community"
    echo "  - Linux: sudo systemctl start mongod"
    echo "  - Docker: docker run -d -p 27017:27017 mongo"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ MongoDB is running${NC}"
echo ""

# Check if backend server is running
echo "2. Checking backend server..."
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend server is not running${NC}"
    echo ""
    echo "Please start the backend server:"
    echo "  cd backend"
    echo "  python scripts/start_server.sh"
    echo ""
    echo "Or run it in a separate terminal and press Enter to continue..."
    read -p "Press Enter when backend is running..."
fi

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend server is running${NC}"
else
    echo -e "${RED}❌ Backend server is still not running${NC}"
    echo "   Please start it and run this script again"
    exit 1
fi
echo ""

# Check if data already exists
echo "3. Checking existing data..."
cd "$(dirname "$0")/.."
python3 << EOF
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
mongodb_database = os.getenv("MONGODB_DATABASE", "ell_db")

try:
    client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
    db = client[mongodb_database]
    
    customers_count = db.customers.count_documents({})
    products_count = db.products.count_documents({})
    chunks_count = db.chunks.count_documents({})
    
    print(f"   Customers: {customers_count}")
    print(f"   Products: {products_count}")
    print(f"   Chunks: {chunks_count}")
    
    if customers_count > 0 or chunks_count > 0:
        print("")
        print("⚠️  Data already exists in MongoDB")
        response = input("   Do you want to import new data? (y/N): ")
        if response.lower() != 'y':
            print("   Skipping data import")
            exit(0)
    
    client.close()
except Exception as e:
    print(f"   Error checking data: {e}")
    exit(1)
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error checking existing data${NC}"
    exit 1
fi

# Run the data import script
echo ""
echo "4. Running data import script..."
echo "   This may take a few minutes..."
echo ""

python3 scripts/generate_and_import_synthetic_data.py

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Data import complete!${NC}"
    echo ""
    echo "Summary:"
    echo "  - Structured data imported to MongoDB collections"
    echo "  - RAG chunks imported for vector search"
    echo ""
    echo "Next steps:"
    echo "  1. Refresh your frontend application"
    echo "  2. Data should now be visible in the dashboard"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Data import failed${NC}"
    echo "   Please check the error messages above"
    exit 1
fi

