#!/usr/bin/env python3
"""Setup .env file and start the FastAPI server."""

import os
import sys
import subprocess
from pathlib import Path

def kill_port(port):
    """Kill any process using the specified port."""
    try:
        result = subprocess.run(
            ['lsof', '-ti', f':{port}'],
            capture_output=True,
            text=True
        )
        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                try:
                    subprocess.run(['kill', '-9', pid], check=False)
                    print(f"✓ Killed process {pid} on port {port}")
                except:
                    pass
    except:
        pass

def ensure_env_file():
    """Ensure .env file exists with required values."""
    env_file = Path('.env')
    
    # Default MongoDB URI - user can update this
    default_uri = 'mongodb://localhost:27017'
    
    if not env_file.exists():
        print("Creating .env file...")
        env_content = f"""APP_NAME=ELL Backend
MONGODB_URI={default_uri}
MONGODB_DATABASE=ell_db
"""
        env_file.write_text(env_content)
        print("✓ .env file created")
        print(f"\n⚠️  Using default MongoDB URI: {default_uri}")
        print("   If you need a different URI, edit .env file or set MONGODB_URI environment variable")
    else:
        print("✓ .env file exists")
        content = env_file.read_text()
        if 'MONGODB_URI=' not in content or 'MONGODB_URI=\n' in content or content.count('MONGODB_URI=') == 0:
            print("⚠️  MONGODB_URI not found in .env, adding it...")
            if 'MONGODB_URI=' not in content:
                content += f"\nMONGODB_URI={default_uri}\n"
            env_file.write_text(content)
            print(f"✓ Added MONGODB_URI={default_uri}")
    
    # Verify MONGODB_URI is set
    content = env_file.read_text()
    lines = [line for line in content.split('\n') if line.strip() and not line.strip().startswith('#')]
    mongodb_uri = None
    for line in lines:
        if line.startswith('MONGODB_URI='):
            mongodb_uri = line.split('=', 1)[1].strip()
            break
    
    if not mongodb_uri:
        print("\n❌ ERROR: MONGODB_URI is not set in .env file")
        print("\nPlease edit .env and add:")
        print("  MONGODB_URI=mongodb://localhost:27017")
        print("  or your MongoDB connection string from Compass")
        sys.exit(1)
    
    print(f"✓ MONGODB_URI is set: {mongodb_uri[:50]}..." if len(mongodb_uri) > 50 else f"✓ MONGODB_URI is set: {mongodb_uri}")
    return mongodb_uri

def test_config():
    """Test if configuration can be loaded."""
    try:
        sys.path.insert(0, '.')
        from app.config import get_settings
        settings = get_settings()
        print(f"✓ Configuration loaded successfully")
        print(f"  Database: {settings.mongodb_database}")
        return True
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        return False

def main():
    """Main function to setup and run server."""
    os.chdir(Path(__file__).parent)
    
    print("Setting up backend server...\n")
    
    # Kill any process on port 8000
    print("Checking port 8000...")
    kill_port(8000)
    
    # Ensure .env file exists
    print("\nChecking .env file...")
    mongodb_uri = ensure_env_file()
    
    # Test configuration
    print("\nTesting configuration...")
    if not test_config():
        sys.exit(1)
    
    # Start server
    print("\n" + "="*50)
    print("Starting FastAPI server...")
    print("="*50)
    print(f"Server: http://localhost:8000")
    print(f"API Docs: http://localhost:8000/docs")
    print(f"Health: http://localhost:8000/health")
    print("\nPress CTRL+C to stop the server\n")
    
    try:
        subprocess.run([
            sys.executable, '-m', 'uvicorn',
            'app.main:app',
            '--reload',
            '--host', '0.0.0.0',
            '--port', '8000'
        ])
    except KeyboardInterrupt:
        print("\n\nServer stopped.")

if __name__ == '__main__':
    main()

