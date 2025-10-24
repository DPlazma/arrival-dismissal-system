# Installation Guide for Tablets and Smart Displays

## 📱 **Installing on iPad (iOS Safari)**

### Method 1: Add to Home Screen
1. Open **Safari** on your iPad
2. Navigate to your server: `http://[your-server-ip]:3000`
3. Tap the **Share button** (square with arrow up) in the toolbar
4. Scroll down and tap **"Add to Home Screen"**
5. Customize the name if desired (default: "Arrival App")
6. Tap **"Add"**
7. The app icon will appear on your home screen

### Method 2: From Control Center
1. With the web app open in Safari
2. Swipe down from top-right corner to open Control Center  
3. Long press the Safari tile
4. Select **"Add to Home Screen"**

### iPad Features:
- ✅ Works in landscape and portrait mode
- ✅ Full-screen app experience (no Safari UI)
- ✅ Offline functionality
- ✅ Large touch targets optimized for finger use
- ✅ Automatic updates when connected to internet

---

## 🤖 **Installing on Android Tablets**

### Method 1: Chrome Browser
1. Open **Chrome** on your Android tablet
2. Navigate to: `http://[your-server-ip]:3000`
3. Tap the **menu (three dots)** in the top-right
4. Select **"Add to Home screen"** or **"Install app"**
5. Confirm the installation
6. The app will appear in your app drawer and home screen

### Method 2: PWA Install Banner
1. Visit the web app in Chrome
2. Look for the **"Install App"** banner at the bottom
3. Tap **"Install"** 
4. Confirm in the dialog

### Android Features:
- ✅ Native app-like experience
- ✅ Appears in app drawer
- ✅ Works offline
- ✅ Android TV remote control support
- ✅ Automatic background updates

---

## 📺 **Setting Up on Android TV/Smart Displays**

### For Android TV:
1. Open the **TV Browser** app (or install Chrome for Android TV)
2. Navigate to: `http://[your-server-ip]:3000`
3. Use the **D-pad remote** to navigate:
   - **Arrow keys**: Move between buttons
   - **OK/Enter**: Select/click
   - **Back**: Return to previous screen

### TV Remote Controls:
- **⬆️⬇️⬅️➡️ Arrow Keys**: Navigate between elements
- **OK/Enter**: Activate buttons
- **Alt + A**: Quick arrival recording
- **Alt + D**: Quick dismissal recording
- **Alt + R**: Refresh records

### TV Optimizations:
- ✅ Large fonts readable from distance
- ✅ High contrast colors
- ✅ Yellow focus indicators
- ✅ D-pad navigation support
- ✅ No cursor required

---

## 🌐 **Setting Up Your Server**

### Option 1: Run on School Computer
1. Install **Node.js** from https://nodejs.org/
2. Download the app files to a folder
3. Open **Command Prompt** in that folder
4. Run: `npm install` then `npm start`
5. Note the IP address shown (e.g., `192.168.1.100:3000`)
6. Use this IP on all tablets/TVs

### Option 2: Run on Dedicated Server
- Use the same IP for all devices on your network
- Consider a Raspberry Pi for a dedicated solution
- Ensure the server computer stays on during school hours

### Finding Your Server IP:
**Windows**: Open Command Prompt, type `ipconfig`
**Mac**: Open Terminal, type `ifconfig`
**Look for**: `192.168.x.x` or `10.x.x.x` address

---

## 🔧 **Troubleshooting**

### iPad Issues:
**App won't install**: Make sure you're using Safari, not another browser
**App doesn't work offline**: Check if service worker registered (look in browser console)
**Small text**: App will auto-adjust for your iPad model

### Android Issues:
**No install option**: Update Chrome to latest version
**Remote not working**: Make sure you're in the web app, not the browser
**App slow**: Clear browser cache and reinstall

### TV Issues:
**Can't navigate**: Use arrow keys, not touch
**Text too small**: App auto-detects TV displays and increases font size
**Connection lost**: Check server is still running

### Network Issues:
**Can't connect**: Ensure all devices are on same WiFi network
**Slow loading**: Check server computer has good internet connection
**Server offline**: Restart the server application

---

## 💡 **Pro Tips**

### For School Deployment:
1. **Pin the app** to tablet home screens
2. **Create bookmarks** with the server IP for easy access
3. **Use guided access** on iPads to lock to the app
4. **Set up TV displays** at main entrances
5. **Train staff** on keyboard shortcuts

### Best Practices:
- Keep server computer plugged in and awake
- Test on all devices before school starts
- Have a backup device ready
- Document your server IP address
- Consider setting up multiple servers for redundancy

### Security Notes:
- App works on local network only (more secure)
- No personal data is stored permanently
- Records reset daily automatically
- No internet required once installed

---

**Need Help?** Check the main README.md file for detailed technical information and troubleshooting guides.