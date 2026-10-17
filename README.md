# SuperMart POS — Retail Store Billing Software

> **College Full-Stack Development (FSD) Project**  
> A complete, production-ready Full-Stack Point of Sale (POS) and Retail Store Billing application designed for Indian grocery and supermarket retail stores.

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Architecture & Technology Stack](#3-architecture--technology-stack)
4. [Project Structure](#4-project-structure)
5. [Prerequisites](#5-prerequisites)
6. [Database Setup (MySQL)](#6-database-setup-mysql)
7. [How to Run on Your Local Workspace](#7-how-to-run-on-your-local-workspace)
8. [Backend Architecture & Code Design](#8-backend-architecture--code-design)
9. [GST & Accounting Calculations](#9-gst--accounting-calculations)
10. [Thermal / A4 Browser Printing](#10-thermal--a4-browser-printing)
11. [REST API Documentation](#11-rest-api-documentation)
12. [Building for Production](#12-building-for-production)
13. [Deployment Guide (Vercel + Cloud Java Host)](#13-deployment-guide)
14. [Troubleshooting Guide](#14-troubleshooting-guide)

---

## 1. Project Overview

**SuperMart POS** is a modern web-based retail billing solution built with a decoupled architecture:
- **Frontend**: A fast React SPA powered by Vite, featuring a cashier-friendly interface, instant barcode/SKU/name product search, live cart updates, and browser-driven tax invoice printing.
- **Backend**: A robust Java Spring Boot REST API using pure Spring **`JdbcTemplate`** for direct database queries without heavy ORM abstractions like Hibernate or JPA.
- **Database**: An existing MySQL database containing 50 Indian retail products across categories (Groceries, Packaged Foods, Beverages, Dairy, Personal Care, Household, and Stationery).

---

## 2. Key Features

- ⚡ **Point of Sale (POS) Counter**:
  - Live product search by Product Name, SKU, or Barcode.
  - 1-click Category filters (Groceries, Dairy, Beverages, Snacks, etc.).
  - Real-time cart with quantity increment/decrement (`+` / `-`), line-item discounts, and line totals.
  - **Stock Over-Sell Guard**: Prevents cashiers from adding or billing more than available inventory.
- 🧾 **Indian GST Engine (GST-Inclusive)**:
  - Prices stored in the catalog are treated as GST-inclusive (standard Indian retail shelf practice).
  - Accurate extraction of Taxable Value and Tax Component.
  - Dynamic Tax Mode selection: **Intra-State** (50% CGST + 50% SGST) vs. **Inter-State** (100% IGST).
  - Automatic Round-Off calculation to the nearest rupee.
  - Multiple Payment Methods: Cash, UPI / QR, Credit/Debit Card, Other.
- 🖨️ **Native Browser Printing**:
  - Automatically triggers the browser print dialog (`window.print()`).
  - Print-specific CSS (`@media print`) hides navigation, action buttons, and backdrops, formatting the invoice cleanly for thermal roll printers or standard A4 paper.
- 📊 **Store Dashboard**:
  - Real-time metrics: Active Products, Total Bills Generated, Today's Sales Amount (₹), and Low-Stock Alert Count.
  - Interactive low-stock table with 1-click restock modals.
- 📦 **Inventory & Catalogue Management**:
  - Full product list with stock availability badges (`In Stock`, `Low Stock`, `Out of Stock`, `Inactive`).
  - Add New Product modal with validation of unique SKU, barcode, and permitted GST rates (0%, 0.25%, 3%, 5%, 12%, 18%, 28%, 40%).
  - Edit product information and update prices.
  - Quick stock adjustment modal.
  - Toggle Active/Inactive status to archive discontinued products safely.
- 📜 **Bill History & Safe Cancellations**:
  - Filter historical bills by date range, bill number, or payment status.
  - Reprint historical tax invoices with original price and tax snapshots.
  - **Transaction-Safe Bill Cancellation**: Marks the bill as `CANCELLED` and automatically restores item quantities back into MySQL inventory inside a single atomic transaction.

---

## 3. Architecture & Technology Stack

```text
┌────────────────────────────────┐          REST JSON (HTTP)          ┌────────────────────────────────┐
│         React 18 + Vite        │ ◄────────────────────────────────► │     Java 21 + Spring Boot      │
│  (Tailored POS UI, Vanilla CSS)│          Port 5173 /api            │   (Spring Web, Spring JDBC)    │
└────────────────────────────────┘                                    └───────────────┬────────────────┘
                                                                                      │
                                                                                      │ JdbcTemplate
                                                                                      ▼
                                                                      ┌────────────────────────────────┐
                                                                      │          MySQL 8.x / 9.x       │
                                                                      │      (retail_billing_db)       │
                                                                      └────────────────────────────────┘
```

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Component-driven POS SPA, JavaScript (ES6+), Lucide Icons |
| **Styling** | Vanilla CSS | Custom design system (`index.css`) with print styles |
| **Backend** | Java 21+ / Spring Boot 3.3.5 | Spring Web, Spring JDBC, Spring Validation |
| **Database Access** | Spring `JdbcTemplate` | Parameterized SQL queries (No JPA/Hibernate) |
| **Database** | MySQL Server 8.x / 9.x | Database: `retail_billing_db` on port 3306 |
| **Build & Tooling** | Maven & Node.js | Included `mvnw.cmd` / `mvnw` wrapper and npm orchestration |

---

## 4. Project Structure

```text
fsdproject/
├── backend/                                  # Spring Boot Maven Project
│   ├── mvnw.cmd & mvnw                       # Maven wrappers (Zero-install Maven)
│   ├── pom.xml                               # Java dependencies (Spring Web, Spring JDBC, MySQL)
│   └── src/
│       ├── main/
│       │   ├── java/com/retailbilling/
│       │   │   ├── RetailBillingApplication.java  # Main application class
│       │   │   ├── config/
│       │   │   │   ├── CorsConfig.java            # Configurable CORS for Vite & Vercel
│       │   │   │   └── StoreConfig.java           # Store metadata & tax mode config
│       │   │   ├── controller/
│       │   │   │   ├── ProductController.java     # /api/products endpoints
│       │   │   │   ├── BillingController.java     # /api/bills endpoints
│       │   │   │   └── DashboardController.java   # /api/dashboard endpoints
│       │   │   ├── service/
│       │   │   │   ├── ProductService.java        # Inventory validation & stock management
│       │   │   │   ├── BillingService.java        # Authoritative tax math & stock transactions
│       │   │   │   └── DashboardService.java      # Dashboard metrics aggregation
│       │   │   ├── repository/
│       │   │   │   ├── ProductRepository.java     # JdbcTemplate queries for products table
│       │   │   │   └── BillRepository.java        # JdbcTemplate queries for bills & bill_items
│       │   │   ├── model/                     # Domain entities (Product, Bill, BillItem)
│       │   │   ├── dto/                       # Request/Response payloads (CreateBillRequest, etc.)
│       │   │   └── exception/                 # Custom exceptions & GlobalExceptionHandler
│       │   └── resources/
│       │       ├── application.properties     # DB credentials & application settings
│       │       └── application.properties.example # Environment variable template
│       └── test/java/com/retailbilling/
│           └── RetailBillingApplicationTests.java # DB connection & context tests
├── frontend/                                 # React + Vite Frontend
│   ├── index.html                            # Master HTML template with Plus Jakarta Sans font
│   ├── vite.config.js                        # Vite proxy config (routes /api -> :8080)
│   ├── package.json                          # React, Vite, Lucide-react
│   ├── vercel.json                           # SPA rewrite rules for Vercel deployment
│   ├── .env & .env.example                   # Local & production API URLs
│   ├── public/favicon.svg                    # Custom SVG POS receipt icon
│   └── src/
│       ├── main.jsx                          # React DOM entry point
│       ├── App.jsx                           # Layout shell & tab switcher
│       ├── index.css                         # Custom POS stylesheet & print styles
│       ├── components/
│       │   ├── Navbar.jsx                    # Header, live clock & status badges
│       │   ├── PrintableBill.jsx             # Thermal/A4 Tax Invoice for printing
│       │   ├── ProductModal.jsx              # Add/Edit Product modal form
│       │   └── StockModal.jsx                # Quick inventory restock modal
│       ├── pages/
│       │   ├── DashboardPage.jsx             # Store analytics & low-stock alerts
│       │   ├── BillingPage.jsx               # Cashier POS billing counter
│       │   ├── ProductsPage.jsx              # Product catalog & stock manager
│       │   └── BillHistoryPage.jsx           # Bill history & reprinting
│       └── services/                         # API integration (productService, billService, etc.)
├── schema.sql                                # Complete MySQL database dump & 50 products seed
├── start.bat                                 # 1-Click launcher for Windows
├── package.json                              # Root multi-package dev runner (concurrently)
├── .gitignore                                # Git ignore file
└── README.md                                 # Comprehensive documentation
```

---

## 5. Prerequisites

Before running the application on your computer, ensure the following software is installed:

1. **Java Development Kit (JDK) 21+**
   - Check with: `java -version`
   - If not installed, download from [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) or [Eclipse Adoptium Temurin](https://adoptium.net/).
2. **Node.js 18+ and npm**
   - Check with: `node -v` and `npm -v`
   - Download from [nodejs.org](https://nodejs.org/).
3. **MySQL Server (8.0 or 9.x)**
   - Check with: `mysql --version`
   - Ensure the MySQL service is running locally on port `3306`.
4. **Git**
   - Check with: `git --version`

---

## 6. Database Setup (MySQL)

A complete SQL database dump containing all tables and 50 realistic Indian grocery products is included in the file **`schema.sql`**.

### Importing the Database:

Open Command Prompt or PowerShell and run:

```bash
mysql -u root -p < schema.sql
```
*(Enter your MySQL root password when prompted)*

This automatically creates the database **`retail_billing_db`** and the three tables:
- **`products`**: 50 products with prices, GST rates, HSN codes, and stock levels.
- **`bills`**: Invoice records.
- **`bill_items`**: Line items snapshot with foreign keys.

### Verifying the Setup:
```bash
mysql -u root -p -e "USE retail_billing_db; SELECT COUNT(*) FROM products;"
```
*(Expected output: `50`)*

### Database Credentials Configuration:
If your local MySQL username or password is not `root` / `root`, adjust `backend/src/main/resources/application.properties` or set environment variables:
```bash
# Windows PowerShell
$env:DB_USERNAME="your_username"
$env:DB_PASSWORD="your_password"
```

---

## 7. How to Run on Your Local Workspace

### Method 1: The Easiest Way (Windows 1-Click)
Double-click the **`start.bat`** file located in the root folder.  
It automatically starts both the Spring Boot backend and the Vite frontend together.

### Method 2: One-Command Start (Terminal)
Open a terminal in the root `fsdproject/` directory:

```bash
npm run dev
```

This uses `concurrently` to launch:
- **Backend**: Spring Boot on `http://localhost:8080`
- **Frontend**: Vite dev server on `http://localhost:5173`

Once started, open your web browser and visit:
👉 **`http://localhost:5173`**

---

### Method 3: Running Frontend & Backend Separately

#### 1. Start the Backend:
```bash
cd backend
.\mvnw.cmd spring-boot:run
```
*(On Linux/macOS: `./mvnw spring-boot:run`)*  
Backend runs at **`http://localhost:8080`**.

#### 2. Start the Frontend:
In a new terminal window:
```bash
cd frontend
npm run dev
```
Frontend runs at **`http://localhost:5173`**.

---

## 8. Backend Architecture & Code Design

The backend is built without heavy ORM abstractions like Hibernate or JPA. Instead, it utilizes Spring's **`JdbcTemplate`** with clean, human-readable layered code:

1. **Repository Layer (`repository/`)**:
   - Uses `JdbcTemplate` with parameterized SQL (`PreparedStatement`) to prevent SQL injection.
   - Atomic queries for stock deduction:
     ```sql
     UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND stock_quantity >= ?
     ```
     *(Guarantees race-condition prevention and prevents negative stock).*
2. **Service Layer (`service/`)**:
   - Encapsulates business logic.
   - `@Transactional(rollbackFor = Exception.class)` ensures that bill generation, line-item insertion, and product stock deductions succeed or roll back together as an atomic unit.
   - Authoritative pricing: Product prices and GST rates are fetched directly from the database and never trusted blindly from the frontend.
3. **Controller Layer (`controller/`)**:
   - Clean REST endpoints returning standard `ApiResponse<T>` objects with suitable HTTP status codes (200, 201, 400, 404, 409).
4. **Exception Handling (`exception/`)**:
   - `GlobalExceptionHandler` with `@RestControllerAdvice` translates errors (e.g. duplicate SKU, insufficient stock, validation errors) into clean JSON responses.

---

## 9. GST & Accounting Calculations

In Indian retail supermarkets, shelf prices are typically **GST-inclusive**. The application implements this standard:

1. **Gross Item Total**:
   $$\text{Gross} = \text{Authoritative Selling Price} \times \text{Quantity}$$
2. **Line Total After Discount**:
   $$\text{Line Total} = \text{Gross} - \text{Line Discount}$$
3. **Taxable Amount**:
   $$\text{Taxable Amount} = \frac{\text{Line Total}}{1 + \frac{\text{GST Rate}}{100}}$$
4. **Tax Component**:
   $$\text{Tax} = \text{Line Total} - \text{Taxable Amount}$$
5. **Intra-State vs. Inter-State**:
   - **Intra-State**: Split into $\text{CGST} = \frac{\text{Tax}}{2}$ and $\text{SGST} = \frac{\text{Tax}}{2}$.
   - **Inter-State**: $\text{IGST} = \text{Tax}$ (CGST = 0, SGST = 0).
6. **Round-Off**:
   - Grand total is rounded to the nearest integer rupee using `HALF_UP` rounding:
   $$\text{Round Off} = \text{Grand Total (Rounded)} - \text{Net Total}$$

---

## 10. Thermal / A4 Browser Printing

When the cashier confirms a bill or clicks **Print Invoice**:
1. The **`PrintableBill`** modal opens with the itemized invoice.
2. The browser print dialog is triggered via `window.print()`.
3. Dedicated `@media print` rules:
   - Hide the navigation bar, sidebar, and all on-screen buttons.
   - Remove background colors, shadows, and modal backdrops.
   - Format text with high contrast for standard 80mm thermal receipt printers or standard A4 invoice printing.

---

## 11. REST API Documentation

### Products Endpoints (`/api/products`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Fetch all products with optional `search`, `category`, `activeOnly`, `sortBy`, `sortOrder` |
| `GET` | `/api/products/{id}` | Fetch a single product by ID |
| `GET` | `/api/products/search?q=rice` | Search products by name, SKU, or barcode |
| `GET` | `/api/products/categories` | Retrieve all unique product categories |
| `POST` | `/api/products` | Create a new product (validates unique SKU/barcode and allowed GST rates) |
| `PUT` | `/api/products/{id}` | Update existing product details |
| `PATCH` | `/api/products/{id}/stock` | Quick update of product stock quantity |
| `PATCH` | `/api/products/{id}/status` | Toggle product active/inactive status |

### Billing Endpoints (`/api/bills`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/bills` | Generate a new bill (deducts stock and calculates taxes authoritatively) |
| `GET` | `/api/bills` | Fetch bills history with optional `search`, `startDate`, `endDate`, `status` |
| `GET` | `/api/bills/{id}` | Fetch detailed bill with line items snapshot |
| `GET` | `/api/bills/number/{billNumber}` | Fetch bill by unique bill number |
| `PATCH` | `/api/bills/{id}/cancel` | Cancel an invoice and restore stock quantities to inventory |

### Dashboard Endpoints (`/api/dashboard`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary` | Retrieve active products, total bills, today's sales, and low stock count |
| `GET` | `/api/dashboard/low-stock?limit=10` | Retrieve items below reorder threshold |
| `GET` | `/api/dashboard/store-info` | Retrieve store name and tax mode |

---

## 12. Building for Production

### Build the React Frontend:
```bash
cd frontend
npm run build
```
Builds optimized production files to `frontend/dist/`.

### Build the Spring Boot Backend:
```bash
cd backend
.\mvnw.cmd clean package -DskipTests
```
Builds executable fat JAR: `backend/target/retail-billing-backend-1.0.0.jar`.

---

## 13. Deployment Guide

### Deploying Frontend to Vercel
1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New > Project** and import your repo.
3. Set **Root Directory** to `frontend`.
4. In **Environment Variables**, add:
   - `VITE_API_URL` = `https://your-backend-domain.com/api`
5. The included `vercel.json` automatically handles Single Page Application routing rewrites.

### Deploying Backend & Database
1. **Cloud Database**: Host MySQL on Railway, Aiven, PlanetScale, or AWS RDS, and run `schema.sql`.
2. **Cloud Backend**: Deploy the Spring Boot application on Railway, Render, Fly.io, or AWS EC2.
3. Configure the following environment variables on your host:
   - `DB_URL` = `jdbc:mysql://<host>:3306/<database>?useSSL=true`
   - `DB_USERNAME` = `<username>`
   - `DB_PASSWORD` = `<password>`
   - `CORS_ALLOWED_ORIGINS` = `https://your-frontend.vercel.app`

---

## 14. Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`Connection refused` on startup** | MySQL service is not running | Start MySQL service via Windows Services or run `net start MySQL96` in an admin prompt. |
| **`Access denied for user 'root'@'localhost'`** | Incorrect MySQL password | Update `spring.datasource.password` in `backend/src/main/resources/application.properties`. |
| **Port `8080` already in use** | An existing Java process is running | Stop any existing Java processes in Task Manager, or change `server.port=8081` in `application.properties`. |
| **Port `5173` already in use** | Another Vite instance is active | Vite will automatically switch to `5174` or kill the other Node process. |
| **`Insufficient stock` during billing** | Requested quantity exceeds inventory | Restock the item via the **Products** page or decrease quantity in cart. |

---

## 15. License

Developed for academic demonstration and college Full Stack Development (FSD) project requirements. Free for educational and personal use.
