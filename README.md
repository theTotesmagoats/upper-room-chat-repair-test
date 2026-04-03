# The Upper Room Chat — Fixed Version

**Status**: ✅ Fully operational, no more loading hangs!

## What Was Fixed

This version fixes the critical bug where the app would load only the shell and remain stuck on:
- "Loading participants..."
- "Loading the Upper Room experience..."
- Speed controls never appearing
- Chat playback never starting

### Root Cause
The original `script.js` contained massive fallback data blobs but **no executable application logic** — no `initApp()`, no message rendering, no event wiring.

### What Changed
1. ✅ Removed all fallback data from `script.js`
2. ✅ Implemented dynamic JSON loading (messages.json, bios.json, typing-beats.json, config.json)
3. ✅ Added robust error handling with visible UI instead of hanging
4. ✅ Replaced inline onclick handlers with `addEventListener`
5. ✅ Implemented complete message rendering for all types (day markers, context, notes, verses, normal messages)
6. ✅ Built speed controls dynamically from config
7. ✅ Added bio popover logic and scripture banner timing

## How to Run

**Important**: This app requires a web server — it will NOT work if you open `index.html` directly in the browser due to CORS restrictions on fetch().

### Option 1: VS Code Live Server (Recommended)
1. Open the folder in VS Code
2. Right-click `index.html`
3. Choose "Open with Live Server"

### Option 2: Using npx serve
```bash
npx serve .
```

### Option 3: Python HTTP server
```bash
# Python 3.x
python -m http.server

# Then visit http://localhost:8000
```

## Files Structure

- `index.html` — App shell (no inline handlers)
- `script.js` — Complete application logic (no fallback data)
- `messages.json` — Chat messages, day markers, notes, context blocks, verses
- `bios.json` — Character bios for popovers
- `typing-beats.json` — Typing animation delays
- `config.json` — Speed settings and timing config
- `style.css` — Styling (unchanged)

## Message Types

The app supports 5 message types in `messages.json`:

1. **Day markers**: `{ "day": "Day 1 – Good Friday" }`
2. **Context blocks**: `{ "context": true, "content": "..." }`
3. **Notes**: `{ "note": "*Time passes*" }`
4. **Verses**: 
   ```json
   {
     "type": "verse",
     "side": "right",
     "tag": "Scripture",
     "verseText": "...",
     "citation": "John 3:16"
   }
   ```
5. **Normal messages**:
   ```json
   {
     "from": "Peter",
     "text": "I'm here.",
     "side": "left",
     "emotional": true,
     "charClass": "char-peter"
   }
   ```

## Character Bios

Click on any character name to see their bio. The bio appears in a popover with:
- Role
- Summary
- Relationship to Jesus
- Why they're included in the story

## Speed Controls

Three speed settings (from config.json):
- **Fast** (4 min): ~1800ms per message
- **Normal** (10 min): ~4500ms per message  
- **Slow** (20 min): ~9000ms per message

## Scripture Banners

Verse messages automatically display in a banner with:
- Dynamic timing based on verse length
- Tone-based styling (rumor, promise, fire)
- Auto-hide after display time

## Error Handling

If JSON files fail to load (network issue, wrong path), the app now shows a visible error UI instead of hanging forever.

## Testing

1. Open `index.html` in your browser via a web server
2. Verify loading state disappears within ~2 seconds
3. Check participant count updates (should show 14)
4. Confirm speed control buttons appear and work
5. Watch messages stream in correctly
6. Test bio popovers by clicking character names
7. Test scrolling behavior and "New messages below" indicator

## Deployment

To deploy to GitHub Pages:
1. Push all files to your GitHub repository
2. Go to Repository Settings > Pages
3. Select "main" branch as source
4. Save — your site will be live at `https://username.github.io/repo-name/`

## Credits

- Original concept and story: The Upper Room narrative from the Gospels
- Fix implementation: AI-assisted refactor for maintainability and correctness

---

**Version**: 2.0 (Fixed)  
**Last Updated**: April 3, 2026