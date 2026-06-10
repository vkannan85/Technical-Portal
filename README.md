# Matalan Portal

A portable file explorer/viewer/editor with a "Matalan Tools" workspace
(Firewall Rules, Timesheet, Build Sheet) backed by a small local Node.js +
SQLite server.

## Folder contents

```
Matalan Portal/
├── file-explorer.html   ← the app (open this in a browser)
└── server/
    ├── server.js
    ├── package.json
    ├── package-lock.json
    ├── data.db           ← SQLite database (Firewall Rules, Timesheet, Favourites)
    └── node_modules/      ← installed dependencies (do NOT copy this)
```

## Moving to another laptop

1. **Copy the folder** — copy the whole `Matalan Portal` folder to the new
   laptop (USB drive, OneDrive, zip file, etc.). You can skip the
   `server/node_modules` folder — it's large and machine-specific; it will be
   recreated in step 3. Keep `server/data.db` if you want to bring your
   existing Firewall Rules / Timesheet / Favourites data with you.

2. **Install Node.js** on the new laptop (if not already installed):
   - Download the LTS installer from https://nodejs.org and run it
     (default options are fine).
   - Verify with: `node -v` (should print v18 or higher).

3. **Install server dependencies** — open a terminal in
   `Matalan Portal/server` and run:
   ```
   npm install
   ```
   This rebuilds the native `better-sqlite3` module for the new machine
   (the prebuilt binary is OS/architecture-specific, which is why
   `node_modules` shouldn't just be copied).

4. **Start the backend**:
   ```
   npm start
   ```
   You should see: `FileView backend running at http://localhost:3420`
   Leave this terminal window open while you use the app.

5. **Open the app** — double-click `file-explorer.html` (or open it via
   File → Open in your browser). Use **Chrome** or **Edge** — the file
   browsing/editing features rely on the File System Access API, which
   Firefox and Safari don't support.

6. **Re-link your folders** — the list of opened workspace folders is stored
   per-browser via IndexedDB, so on the new laptop you'll need to click
   **Open Folder** again to add the folders you want to browse. Matalan
   Tools (Firewall Rules, Timesheet, Favourites) will load automatically from
   `server/data.db` as long as the backend is running.

## Optional: auto-start the backend

To avoid manually running `npm start` every time, you can create a small
batch file `start-server.bat` inside `server/` with:
```
@echo off
cd /d %~dp0
npm start
```
Double-click it to start the backend, then open `file-explorer.html`.

## Notes

- The app and backend only talk to `http://localhost:3420` — nothing leaves
  your machine.
- If port 3420 is already in use on the new laptop, change `PORT` in
  `server/server.js` and update `API_BASE` near the top of
  `file-explorer.html` to match.
