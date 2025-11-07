#!/bin/bash
# Helper script to set MongoDB URI in .env file

cd "$(dirname "$0")"

if [ -z "$1" ]; then
    echo "Usage: ./set_mongodb_uri.sh 'mongodb://your-connection-string'"
    echo ""
    echo "Example:"
    echo "  ./set_mongodb_uri.sh 'mongodb://localhost:27017'"
    echo "  ./set_mongodb_uri.sh 'mongodb+srv://user:pass@cluster.mongodb.net/'"
    echo ""
    echo "To get your connection string from MongoDB Compass:"
    echo "  1. Open MongoDB Compass"
    echo "  2. Click 'Connect' or copy the connection string from the connection you're using"
    echo "  3. Use that string as the argument to this script"
    exit 1
fi

MONGODB_URI="$1"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    cat > .env << EOF
APP_NAME=ELL Backend
MONGODB_URI=$MONGODB_URI
MONGODB_DATABASE=ell_db
EOF
    echo "✓ Created .env file with MongoDB URI"
else
    # Update existing .env file
    if grep -q "^MONGODB_URI=" .env; then
        # Replace existing MONGODB_URI
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|" .env
        else
            # Linux
            sed -i "s|^MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|" .env
        fi
        echo "✓ Updated MONGODB_URI in .env"
    else
        # Add MONGODB_URI if it doesn't exist
        echo "MONGODB_URI=$MONGODB_URI" >> .env
        echo "✓ Added MONGODB_URI to .env"
    fi
fi

echo ""
echo "Current .env file:"
cat .env
echo ""

