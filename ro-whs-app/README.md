# RO WHS - Replenishment Order Warehouse Management

A modern, real-time web application for managing Replenishment Orders (RO) connected directly to Google Sheets.

## 🚀 Features

- **Live Google Sheets Integration**: Real-time sync with your RO database
- **Status Management**: Drag orders through workflow stages (Queue → Picking → Delivery → Arrived)
- **Quantity Updates**: Track RO quantities for DDD and LJBB warehouses
- **Grouped View**: Orders grouped by RO ID with expandable article details
- **Beautiful UI**: Smooth animations, Zuma brand colors (#002A3A, #00E273)
- **Optimistic Updates**: Instant UI feedback while syncing in background

## 📋 Prerequisites

- Node.js 16+ and npm
- Google Account with access to Google Sheets
- Google Apps Script deployment (included in `/src/scripts`)

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Sheets Integration

#### A. Publish Your Sheet as CSV (Read)

1. Open your Google Sheet
2. **File** → **Share** → **Publish to web**
3. Select "Entire Document" and "Comma-separated values (.csv)"
4. Click **Publish**
5. Copy the URL and update `SHEET_CSV_URL` in `src/services/gsheetService.ts`

#### B. Deploy Apps Script (Write)

1. Copy code from `src/scripts/AppsScriptCode.gs`
2. Open your Google Sheet → **Extensions** → **Apps Script**
3. Paste the code
4. **Deploy** → **New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (or "Anyone with a Google Account")
5. Copy the deployment URL
6. Update `APPS_SCRIPT_URL` in `src/services/gsheetService.ts`

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

## 📊 Google Sheet Schema

Your sheet must have these columns:

- `SESSION ID` - RO identifier
- `STORE NAME` - Store name
- `KODE ARTIKEL` - Article code
- `ARTIKEL` - Article name
- `RO BOX DDD` - DDD quantity
- `RO BOX LJBB` - LJBB quantity
- `TIMESTAMP` - Timestamp
- `STATUS` - Status (QUEUE, PICKING LIST, etc.)
- `WHS DDD` - Warehouse DDD stock
- `WHS LJBB` - Warehouse LJBB stock

## 🏗️ Architecture

### Hybrid Strategy

- **Read**: Public CSV (fast, no auth required)
- **Write**: Google Apps Script (secure, requires deployment)

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: CSS Modules, Framer Motion
- **State**: React Context
- **Data**: Google Sheets via Apps Script + Public CSV
- **CSV Parsing**: PapaParse

## 📁 Project Structure

```
ro-whs-app/
├── src/
│   ├── components/      # UI components
│   ├── store/          # State management (ROContext)
│   ├── services/       # API services (gsheetService)
│   ├── scripts/        # Apps Script code
│   ├── types.ts        # TypeScript types
│   └── App.tsx         # Main app
├── public/             # Static assets
└── package.json
```

## 🎨 Customization

Update brand colors in CSS files:

- Primary: `#002A3A` (Dark Teal)
- Accent: `#00E273` (Bright Green)

## 🐛 Troubleshooting

### "Access denied" errors

- Verify Apps Script deployment has correct permissions
- Check "Who has access" is set to "Anyone" or "Anyone with Google Account"

### Data not updating

- Check browser console for errors
- Verify Apps Script execution logs (clock icon in Script Editor)
- Ensure CSV URL is published and accessible

### CORS errors

- CORS is expected for POST requests in corporate environments
- Requests still succeed (check execution logs to confirm)

## 📝 License

MIT

## 👤 Author

Zuma Indonesia
