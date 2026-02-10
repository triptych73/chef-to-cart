#!/bin/bash
# ==============================================================================
# Ocado Automation VPS Setup Script (Debian 12)
# Installs XFCE4, TigerVNC, noVNC, and Google Chrome for remote cart automation.
# ==============================================================================

set -e

echo "🚀 Starting Ocado Automation VPS Setup..."

# 1. Update & Install Desktop Environment (XFCE4 is lightweight)
echo "📦 Installing XFCE4 and TigerVNC..."
sudo apt-get update
sudo apt-get install -y xfce4 xfce4-goodies tigervnc-standalone-server novnc websockify curl wget

# 2. Install Google Chrome
if ! command -v google-chrome &> /dev/null; then
    echo "🌐 Installing Google Chrome..."
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    sudo apt-get install -y ./google-chrome-stable_current_amd64.deb
    rm google-chrome-stable_current_amd64.deb
else
    echo "✅ Google Chrome already installed."
fi

# 3. Configure VNC xstartup
echo "⚙️ Configuring VNC session..."
mkdir -p ~/.vnc
cat <<EOF > ~/.vnc/xstartup
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
[ -x /etc/vnc/xstartup ] && exec /etc/vnc/xstartup
[ -r \$HOME/.Xresources ] && xrdb \$HOME/.Xresources
vncconfig -iconic &
startxfce4 &
EOF
chmod +x ~/.vnc/xstartup

# 4. Create Systemd Service for VNC
echo "🖥️ Creating Systemd service for VNC (Display :1)..."
USER_NAME=$(whoami)
sudo cat <<EOF | sudo tee /etc/systemd/system/vncserver@.service > /dev/null
[Unit]
Description=Start TigerVNC server at startup
After=syslog.target network.target

[Service]
Type=forking
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=/home/$USER_NAME

PIDFile=/home/$USER_NAME/.vnc/%H:%i.pid
ExecStartPre=-/usr/bin/vncserver -kill :%i > /dev/null 2>&1
ExecStart=/usr/bin/vncserver -depth 24 -geometry 1280x800 -localhost no :%i
ExecStop=/usr/bin/vncserver -kill :%i

[Install]
WantedBy=multi-user.target
EOF

# 5. Create Systemd Service for noVNC (Proxy VNC to Web)
echo "🌐 Creating Systemd service for noVNC (Port 6080)..."
sudo cat <<EOF | sudo tee /etc/systemd/system/novnc.service > /dev/null
[Unit]
Description=noVNC Web Proxy
After=vncserver@1.service

[Service]
Type=simple
User=$USER_NAME
ExecStart=/usr/bin/websockify --web /usr/share/novnc/ 6080 localhost:5901
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

echo "✨ Reloading systemd..."
sudo systemctl daemon-reload

echo "----------------------------------------------------------------"
echo "✅ SETUP COMPLETE!"
echo "----------------------------------------------------------------"
echo "👉 NEXT STEPS:"
echo "1. Set your VNC password: vncpasswd"
echo "2. Enable services:"
echo "   sudo systemctl enable vncserver@1 novnc"
echo "   sudo systemctl start vncserver@1 novnc"
echo "3. Update Firewalls (GCP Console):"
echo "   Allow TCP port 6080 (for noVNC)"
echo "----------------------------------------------------------------"
