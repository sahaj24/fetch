#!/bin/bash

# Production Setup Script for YouTube Transcript Extraction
# Run this script on your production server to install all dependencies

set -e  # Exit on any error

echo "🚀 Setting up production environment for YouTube Transcript Extraction..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  Running as root. Consider using a non-root user for security."
fi

# Update system packages
echo "📦 Updating system packages..."
if command -v apt-get &> /dev/null; then
    # Ubuntu/Debian
    sudo apt-get update
    sudo apt-get install -y curl wget git build-essential
elif command -v yum &> /dev/null; then
    # CentOS/RHEL
    sudo yum update
    sudo yum install -y curl wget git gcc gcc-c++ make
elif command -v dnf &> /dev/null; then
    # Fedora
    sudo dnf update
    sudo dnf install -y curl wget git gcc gcc-c++ make
fi

# Install Node.js if not present
echo "📱 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install Python3 if not present
echo "🐍 Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "Installing Python3..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y python3 python3-pip
    elif command -v yum &> /dev/null; then
        sudo yum install -y python3 python3-pip
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y python3 python3-pip
    fi
else
    echo "✅ Python3 already installed: $(python3 --version)"
fi

# Install pip if not present
if ! command -v pip3 &> /dev/null; then
    echo "Installing pip3..."
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    python3 get-pip.py
    rm get-pip.py
fi

# Install yt-dlp (CRITICAL for your application)
echo "📺 Installing yt-dlp..."
pip3 install --upgrade yt-dlp

# Install FFmpeg (optional but recommended)
echo "🎬 Installing FFmpeg..."
if command -v apt-get &> /dev/null; then
    sudo apt-get install -y ffmpeg
elif command -v yum &> /dev/null; then
    sudo yum install -y ffmpeg
elif command -v dnf &> /dev/null; then
    sudo dnf install -y ffmpeg
fi

# Navigate to project directory (adjust path as needed)
echo "📁 Setting up project directory..."
PROJECT_DIR="${1:-/var/www/fetchsub}"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "Creating project directory: $PROJECT_DIR"
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown $(whoami):$(whoami) "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# Install project dependencies
if [ -f "package.json" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
else
    echo "⚠️  package.json not found in $PROJECT_DIR"
    echo "Make sure to upload your project files to this directory"
fi

# Set up environment variables
echo "🔧 Setting up environment..."
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local template..."
    cat > .env.local << EOL
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
# Add other environment variables as needed
EOL
    echo "⚠️  Please edit .env.local with your actual values"
fi

# Set up proper permissions
echo "🔒 Setting up file permissions..."
chmod +x node_modules/.bin/* 2>/dev/null || true
mkdir -p /tmp/fetchsub-temp
chmod 755 /tmp/fetchsub-temp

# Test installations
echo "🧪 Testing installations..."

echo "Testing Node.js..."
node --version

echo "Testing Python..."
python3 --version

echo "Testing yt-dlp..."
yt-dlp --version

echo "Testing yt-dlp with YouTube..."
yt-dlp --no-warnings --skip-download --print title "https://www.youtube.com/watch?v=dQw4w9WgXcQ" || echo "⚠️  yt-dlp test failed - check network connectivity"

# Build the project
if [ -f "package.json" ]; then
    echo "🏗️  Building the project..."
    npm run build || echo "⚠️  Build failed - check for missing dependencies"
fi

echo "✅ Production setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your actual environment variables"
echo "2. Upload your project files to $PROJECT_DIR"
echo "3. Run 'npm run build' to build the project"
echo "4. Run 'npm start' to start the production server"
echo "5. Set up a process manager like PM2 for production"
echo ""
echo "To install PM2:"
echo "npm install -g pm2"
echo "pm2 start npm --name 'fetchsub' -- start"
echo "pm2 startup"
echo "pm2 save"
