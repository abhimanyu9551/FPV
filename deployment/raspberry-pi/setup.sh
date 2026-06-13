#!/usr/bin/env bash
# FPV Bot — Raspberry Pi Setup Script
# Run as: sudo bash setup.sh
set -euo pipefail

BOT_DIR="/opt/fpv-bot"
SERVICE_NAME="fpv-bot"
PYTHON_MIN="3.11"

echo "=== FPV Finance Bot Setup ==="

# Verify Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $PYTHON_VERSION"

# Create install directory
mkdir -p "$BOT_DIR"
mkdir -p "$BOT_DIR/logs"

# Copy bot source
echo "Copying bot source..."
cp -r ../../apps/telegram-bot/src "$BOT_DIR/"
cp ../../apps/telegram-bot/requirements.txt "$BOT_DIR/"

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv "$BOT_DIR/venv"

# Install dependencies
echo "Installing Python dependencies..."
"$BOT_DIR/venv/bin/pip" install --upgrade pip
"$BOT_DIR/venv/bin/pip" install -r "$BOT_DIR/requirements.txt"

# Set permissions
chown -R pi:pi "$BOT_DIR"
chmod 750 "$BOT_DIR"
chmod 640 "$BOT_DIR/.env" 2>/dev/null || true

# Install systemd service
echo "Installing systemd service..."
cp finance-bot.service "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "NEXT STEPS:"
echo "1. Copy .env file: sudo cp .env.production $BOT_DIR/.env"
echo "2. Edit env vars:  sudo nano $BOT_DIR/.env"
echo "3. Start service:  sudo systemctl start $SERVICE_NAME"
echo "4. Check status:   sudo systemctl status $SERVICE_NAME"
echo "5. Follow logs:    sudo journalctl -u $SERVICE_NAME -f"
echo ""
