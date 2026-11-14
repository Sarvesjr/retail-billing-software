# Retail Billing & Inventory Management System (Retail POS)

A small-scale Point of Sale (POS) and inventory desktop software designed for Indian retail stores, kirana shops, departmental stores, and pharmacies.

Transform any smartphone camera into a wireless barcode scanner—no external hardware barcode gun required.

---

## Key Features

- **Mobile Phone as Barcode Scanner:**
  - Turn any Android / iPhone into a wireless barcode scanner over local Wi-Fi.
  - Live HD camera scanning, 1.5x–2.5x hardware optical zoom for cylindrical bottles, torch toggle for dim lighting, and Google ML Kit + Modulo-10 checksum validation.
  - Real-time sub-10ms scan dispatch to the desktop cashier screen via WebSocket and Server-Sent Events (SSE).
- **Billing & GST POS Screen:**
  - Omni-search: scan barcodes, type product names, or enter SKU codes with instant auto-suggestions.
  - Multi-mode payment: Cash, UPI (GPay/PhonePe), Credit Card, and Customer Credit (**Udhar / கடன்**).
  - Printable 80mm & 58mm thermal receipts with GST tax breakdown, change calculation, and shop branding.
- **Previous Bills & 100% Lossless Digital Archive:**
  - Automatically archives every completed invoice as an infinite-resolution vector SVG and high-definition PNG.
  - Search past invoices by invoice number, customer name, phone number, payment mode, or date range.
  - Interactive full-resolution receipt viewer with zoom controls, lossless PNG download, and instant thermal slip re-printing.
- **Master-Detail Category Management:**
  - Two-pane layout: select any category on the left to immediately inspect all products, barcodes, prices, and stock units on the right.
- **Barcode Management & Label Printing:**
  - Automatically generate 13-digit retail EAN-13 barcodes with checksum calculation.
  - Assign custom manufacturer barcodes using your phone camera.
  - Print sticker sheets: A4 24-label sheets (3x8), A4 40-label sheets (4x10), or continuous 50mmx25mm thermal roll stickers.
- **Inward Purchase & Supplier Management:**
  - Log inward stock bills from vendors; automatically increments stock in MySQL with audit logging.
  - Track supplier payables and credit purchase history.
- **Customer Khata (Credit / Udhar):**
  - Track customer outstanding balances and credit limits.
  - Settle partial or full payments with receipt generation.
- **Inventory Valuation & Adjustments:**
  - Live stock ledger with low-stock warnings.
  - Manual stock adjustments for damaged, expired, or misplaced goods.
- **Financial Reports & Day-End Z-Report:**
  - Real-time gross profit, net profit, cost of goods sold (COGS), daily expenses, and GST tax liability.
- **Bilingual Support:**
  - Seamless English and Tamil (தமிழ்) interface with one-click toggle.

---

## System Architecture

- **Desktop Shell:** Electron 34 (Context Isolation enabled, Node integration secured)
- **Frontend:** React 19, Vite 6, Tailwind CSS v4, Lucide React
- **Backend Server:** Node.js Express, ES Modules, WebSocket (`ws`), Server-Sent Events
- **Database:** Local MySQL 8.x / 9.x (InnoDB transactional engine, `DECIMAL` currency precision, strictly `VARCHAR` for barcodes preserving leading zeros)

---

## Prerequisites

1. **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
2. **MySQL Server**: v8.0 or v9.x running locally on port 3306 ([Download MySQL](https://dev.mysql.com/downloads/installer/))
3. **Git**: ([Download Git](https://git-scm.com/))

---

## Quick Start & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Sarvesjr/retail-billing-software.git
cd retail-billing-software
```

### 2. Install Dependencies
Install dependencies for both the backend server and the React client:
```bash
# Install root dependencies (Express, Electron, concurrently)
npm install

# Install client dependencies (React 19, Vite, Tailwind CSS)
npm --prefix client install
```

### 3. Configure MySQL Database
Open MySQL Command Line Client or MySQL Workbench and create the database:
```sql
CREATE DATABASE retailbilling;
```

Copy the example environment configuration:
```bash
# On Windows PowerShell:
Copy-Item .env.example .env

# On Linux / macOS:
cp .env.example .env
```

Open `.env` and configure your local MySQL credentials:
```env
PORT=5000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=retailbilling
```

### 4. Run Migrations & Seed Sample Retail Data
Initialize all tables and populate realistic Indian retail products, suppliers, categories, and test customer ledgers:
```bash
# Run schema migrations
node server/scripts/run-migrations.js

# Seed sample data (Parle-G, Tata Salt, Benadryl, Aachi Masala, etc.)
node server/scripts/seed-complete-test-data.js
```

### 5. Launch the Desktop Application
```bash
npm run dev
```
This single command automatically starts:
- The Express API and WebSocket server on `http://localhost:5000`
- The HTTPS mobile scanner server on `https://<YOUR_LOCAL_IP>:5001`
- The Vite frontend dev server on `http://localhost:5173`
- The Electron desktop application window

---

## Connecting Your Mobile Phone as a Barcode Scanner

1. Connect your mobile phone to the **same Wi-Fi network** as your computer.
2. In the desktop application, look at the top navigation bar or console for the mobile scanner URL:
   ```
   https://<YOUR_COMPUTER_IP>:5001/phone-scanner
   ```
3. Open this URL in Chrome or Safari on your phone.
4. **Accept SSL Notice**: Because the server uses a self-signed local certificate for secure camera access, tap **Advanced** -> **Proceed to site (unsafe)** once.
5. Tap **Start Camera**. Point your phone at any barcode—it will vibrate, beep, and automatically add the item to your active desktop billing cart in real-time.

---

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| **F1** | Navigate to Dashboard / Overview |
| **F2** | Open Product Catalog Lookup |
| **F3** | Navigate to Products Management |
| **F4** | Open Previous Bills / Digital Receipts Archive |
| **F5** | Save & Print Bill (Checkout) |
| **Esc** | Close active modals / Clear search |

---

## Running Automated Tests

To run the complete end-to-end integration test suite verifying Categories, Barcodes, Inward Purchases, Stock Deductions, Udhar Sales, and P&L Reports:
```bash
node server/scripts/test-all-modules.js
```

---

## License

This project is licensed under the [MIT License](LICENSE).
