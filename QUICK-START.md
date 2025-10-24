# Quick Setup Guide - Get Running Today!

## Step 1: Install Node.js (Required)

Since npm isn't found on your system, we need to install Node.js first:

### Download & Install:
1. Go to: **https://nodejs.org/**
2. Click the **"LTS"** version (recommended)
3. Download and run the installer
4. Accept all default settings
5. Restart your computer (important!)

### Verify Installation:
Open PowerShell and type:
```powershell
node --version
npm --version
```
You should see version numbers like `v18.17.0` and `9.6.7`

---

## Step 2: Install the App

Once Node.js is installed, run these commands in PowerShell:

```powershell
# Navigate to your project folder (where you cloned/downloaded the code)
cd "path/to/your/arrival-dismissal-system"

# Install dependencies
npm install

# Start the server
npm start
```

---

## Step 3: Find Your Server Address

When the server starts, you'll see something like:
```
🚀 Arrival & Dismissal System running on port 3000
📱 Open your browser to http://localhost:3000
```

### Get Your IP Address:
In PowerShell, type:
```powershell
ipconfig
```

Look for your **IPv4 Address** (something like `192.168.1.100`)

Your server will be available at: `http://192.168.1.100:3000`

---

## Step 4: Test on This Computer First

1. Open your web browser
2. Go to: `http://localhost:3000`
3. You should see the Arrival & Dismissal interface
4. Try entering a name and clicking "Record Arrival"
5. Verify it works before testing on tablets

---

## Step 5: Connect Your First iPad

1. Make sure iPad is on the same WiFi network
2. Open **Safari** on the iPad
3. Navigate to: `http://192.168.1.100:3000` (use your actual IP)
4. Test the interface - it should be touch-optimized
5. Add to home screen: Share button → "Add to Home Screen"

---

## Next Steps After Basic Setup

Once it's working:
1. **Test with multiple iPads** 
2. **Try the Android TV interface** if you have smart displays
3. **Train a few staff members**
4. **Document your server IP** for future reference
5. **Consider leaving computer on during school hours**

---

## Troubleshooting

### If npm install fails:
- Restart computer after installing Node.js
- Run PowerShell as Administrator
- Check your internet connection

### If server won't start:
- Check if port 3000 is already in use
- Try: `npm start -- --port 3001` (uses port 3001 instead)

### If iPads can't connect:
- Verify both devices are on same WiFi
- Check Windows Firewall isn't blocking connections
- Try the IP address in browser on another computer first

---

**Ready to start? Install Node.js first, then come back and run the commands!**