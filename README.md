# Retail Store Billing Software (POS) — Full-Stack College Project

A full-stack, responsive, and robust **Retail Store Billing Software (Point of Sale)** built for modern Indian grocery and departmental retail stores. Features real-time catalog search, multi-item shopping cart, stock deduction, Indian GST calculations (Intra-state CGST+SGST / Inter-state IGST), bill history tracking, and printable tax invoices with browser printing.

---

## 1. Technology Stack

- **Frontend**: React 18, Vite, JavaScript (ES6+), Vanilla CSS (responsive, clean POS styling), Lucide React icons.
- **Backend**: Java 21+ / Spring Boot 3.3.5 (Spring Web, Spring Validation, Spring JDBC).
- **Database**: MySQL 9.x / 8.x using Spring's `JdbcTemplate` with parameterized queries (No JPA/Hibernate).
- **Build Tools**: Maven 3.9+ with included `mvnw.cmd` / `mvnw` scripts, Node.js & npm.
- **Deployment**: Vercel-ready frontend (`vercel.json` SPA rewrites), standalone Spring Boot runnable JAR.

---

## 2. Project Folder Structure

```text
fsdproject/
├── backend/
│   ├── mvnw.cmd                              # Maven wrapper for Windows
│   ├── mvnw                                  # Maven wrapper for Linux/Mac
│   ├── pom.xml                               # Spring Boot Maven dependencies
│   └── src/
│       ├── main/
│       │   ├── java/com/retailbilling/
│       │   │   ├── RetailBillingApplication.java  # Main application entry point
│       │   │   ├── config/
│       │   │   │   ├── CorsConfig.java            # CORS configuration for Vite & Vercel
│       │   │   │   └── StoreConfig.java           # Store metadata configuration
│       │   │   ├── controller/
│       │   │   │   ├── ProductController.java     # Product catalogue endpoints
│       │   │   │   ├── BillingController.java     # Bill creation & history endpoints
│       │   │   │   └── DashboardController.java   # Store metrics endpoints
│       │   │   ├── service/
│       │   │   │   ├── ProductService.java        # Inventory & validation logic
│       │   │   │   ├── BillingService.java        # Authoritative tax & stock transactions
│       │   │   │   └── DashboardService.java      # Dashboard aggregation logic
│       │   │   ├── repository/
│       │   │   │   ├── ProductRepository.java     # JdbcTemplate queries for products
│       │   │   │   └── BillRepository.java        # JdbcTemplate queries for bills & items
│       │   │   ├── model/
│       │   │   │   ├── Product.java               # Products table domain entity
│       │   │   │   ├── Bill.java                  # Bills table domain entity
│       │   │   │   ├── BillItem.java              # Bill_items table domain entity
│       │   │   │   └── DashboardSummary.java      # Dashboard metrics DTO
│       │   │   ├── dto/
│       │   │   │   ├── CreateBillRequest.java     # Checkout payload
│       │   │   │   ├── BillItemRequest.java       # Line item payload
│       │   │   │   ├── StockUpdateRequest.java    # Quick stock update payload
│       │   │   │   ├── StatusUpdateRequest.java   # Active/inactive toggle
│       │   │   │   └── ApiResponse.java           # Standard API response wrapper
│       │   │   └── exception/
│       │   │       ├── ResourceNotFoundException.java
│       │   │       ├── InsufficientStockException.java
│       │   │       ├── BadRequestException.java
│       │   │       └── GlobalExceptionHandler.java # Clean JSON error responses
│       │   └── resources/
│       │       ├── application.properties     # Spring Boot configuration
│       │       └── application.properties.example # Environment template
│       └── test/
│           └── java/com/retailbilling/
│               └── RetailBillingApplicationTests.java # DB connection & context tests
├── frontend/
│   ├── index.html                            # Master HTML template
│   ├── vite.config.js                        # Vite dev proxy & build configuration
│   ├── package.json                          # Frontend dependencies
│   ├── vercel.json                           # Vercel SPA rewrite configuration
│   ├── .env                                  # Local development API endpoint
│   ├── .env.example                          # Example environment variables
│   ├── public/
│   │   └── favicon.svg                       # POS receipt icon
│   └── src/
│       ├── main.jsx                          # React DOM root
│       ├── App.jsx                           # Main layout & tab router
│       ├── index.css                         # CSS design system & print styles
│       ├── components/
│       │   ├── Navbar.jsx                    # Top navigation & live clock
│       │   ├── PrintableBill.jsx             # Thermal/A4 Tax Invoice for printing
│       │   ├── ProductModal.jsx              # Add/Edit Product modal form
│       │   └── StockModal.jsx                # Quick inventory restock modal
│       ├── pages/
│       │   ├── DashboardPage.jsx             # Store metrics & low stock alerts
│       │   ├── BillingPage.jsx               # Point of Sale (POS) counter
│       │   ├── ProductsPage.jsx              # Inventory & catalogue management
│       │   └── BillHistoryPage.jsx           # Bill history & reprinting
│       └── services/
│           ├── api.js                        # Centralized fetch wrapper
│           ├── productService.js             # Product API service
│           ├── billService.js                # Billing API service
│           └── dashboardService.js           # Analytics API service
├── package.json                              # Root orchestration (concurrently)
├── .gitignore                                # Git ignore file
└── README.md                                 # Complete documentation
```

---

## 3. Prerequisites

Make sure the following tools are installed on your machine:

1. **Java JDK 21+** (Java 21 or Java 25 LTS).
   - Check with: `java -version`
2. **Node.js & npm** (Node.js 18+).
   - Check with: `node -v` and `npm -v`
3. **MySQL Server** (running locally on port 3306).
   - Default Database: `retail_billing_db`
   - Default User: `root`
   - Default Password: `root`
4. **Apache Maven 3.9+** (or use the included `mvnw.cmd` / `mvnw` wrapper).

---

## 4. MySQL Database Configuration

The application connects to your existing local MySQL database `retail_billing_db`.

### Database Schema Overview

The database uses three tables:

1. **`products`**:
   - `product_id` (PK), `sku` (Unique), `barcode` (Unique), `product_name`, `brand`, `category`, `description`, `unit`, `pack_size`, `hsn_code`, `gst_rate`, `purchase_price`, `mrp`, `selling_price`, `stock_quantity`, `reorder_level`, `is_active`, `created_at`, `updated_at`.
2. **`bills`**:
   - `bill_id` (PK), `bill_number` (Unique), `bill_date`, `subtotal`, `discount_amount`, `taxable_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`, `round_off`, `grand_total`, `payment_method` (ENUM: CASH, UPI, CARD, OTHER), `payment_status` (ENUM: PAID, PENDING, PARTIAL, CANCELLED), `created_at`.
3. **`bill_items`**:
   - `bill_item_id` (PK), `bill_id` (FK), `product_id` (FK), `product_name`, `sku`, `hsn_code`, `quantity`, `unit`, `unit_price`, `mrp_at_sale`, `discount_amount`, `taxable_amount`, `gst_rate`, `cgst_amount`, `sgst_amount`, `igst_amount`, `line_total`.

### Customizing Credentials (Optional)

If your local MySQL credentials differ from `root` / `root`, you can set environment variables:

```bash
# Windows PowerShell
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_NAME="retail_billing_db"
$env:DB_USERNAME="your_username"
$env:DB_PASSWORD="your_password"
```

Or edit `backend/src/main/resources/application.properties`.

---

## 5. How to Run the Application

### Option A: One-Command Start (Frontend + Backend Together)

From the root `fsdproject/` folder, run:

```bash
npm run dev
```

This starts:
- **Spring Boot Backend** on `http://localhost:8080`
- **Vite React Frontend** on `http://localhost:5173`

Open your browser at **`http://localhost:5173`**.

---

### Option B: Running Independently

#### 1. Start the Backend Only

In PowerShell / Command Prompt:

```bash
cd backend
.\mvnw.cmd spring-boot:run
```

*(On Linux / Mac: `./mvnw spring-boot:run`)*

The backend server starts at **`http://localhost:8080`**.

#### 2. Start the Frontend Only

In a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend will start at **`http://localhost:5173`**.

---

## 6. How GST and Bill Calculations Work

### Selling Price Interpretation
In Indian retail stores, customer-facing shelf prices are commonly **GST-inclusive**. The application treats `products.selling_price` as **GST-inclusive**:

1. **Item Gross Amount**:
   $$\text{gross} = \text{unit\_price} \times \text{quantity}$$
2. **Item Line Total**:
   $$\text{line\_total} = \text{gross} - \text{line\_discount}$$
3. **Taxable Value**:
   $$\text{taxable\_amount} = \frac{\text{line\_total}}{1 + \frac{\text{gst\_rate}}{100}}$$
4. **Tax Component**:
   $$\text{total\_tax} = \text{line\_total} - \text{taxable\_amount}$$
5. **Intra-State vs. Inter-State Split**:
   - **Intra-State (Default)**:
     $$\text{CGST} = \frac{\text{total\_tax}}{2}, \quad \text{SGST} = \text{total\_tax} - \text{CGST}, \quad \text{IGST} = 0$$
   - **Inter-State**:
     $$\text{CGST} = 0, \quad \text{SGST} = 0, \quad \text{IGST} = \text{total\_tax}$$
6. **Round-Off**:
   - The unrounded total is rounded to the nearest integer rupee using standard `HALF_UP` rounding.
   $$\text{round\_off} = \text{grand\_total} - \text{unrounded\_total}$$

---

## 7. How Printing Works

- Printing uses the native browser print engine via `window.print()`.
- When the cashier clicks **Print Invoice** or **Save & Print**, a modal displays the official **Tax Invoice**.
- `@media print` CSS rules automatically:
  - Hide the navigation bar, sidebar, and action buttons.
  - Remove backgrounds and borders for a crisp thermal receipt or A4 invoice format.
  - Center and format product lines, HSN codes, and GST breakdown.

---

## 8. REST API Documentation

### Products API (`/api/products`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Get products (supports `search`, `category`, `activeOnly`, `sortBy`, `sortOrder`) |
| `GET` | `/api/products/{id}` | Get product by ID |
| `GET` | `/api/products/search?q=rice` | Search products by keyword |
| `GET` | `/api/products/categories` | Get unique product categories |
| `POST` | `/api/products` | Create a new product |
| `PUT` | `/api/products/{id}` | Update existing product details |
| `PATCH` | `/api/products/{id}/stock` | Update stock quantity |
| `PATCH` | `/api/products/{id}/status` | Toggle active/inactive status |

### Billing API (`/api/bills`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/bills` | Generate a new bill (deducts stock authoritatively in transaction) |
| `GET` | `/api/bills` | Get bills list (supports `search`, `startDate`, `endDate`, `status`) |
| `GET` | `/api/bills/{id}` | Get full bill details with items snapshot |
| `GET` | `/api/bills/number/{billNumber}` | Get bill by unique invoice number |
| `PATCH` | `/api/bills/{id}/cancel` | Cancel bill and transactionally restore stock to inventory |

### Dashboard API (`/api/dashboard`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary` | Overall stats (active products, total bills, today's sales, low-stock count) |
| `GET` | `/api/dashboard/low-stock?limit=10` | List of items at or below reorder level |
| `GET` | `/api/dashboard/store-info` | Store name, address, GSTIN, phone, and tax mode |

---

## 9. Building the Project

### Building Frontend
```bash
cd frontend
npm run build
```
Generates production-ready static assets in `frontend/dist/`.

### Building Backend
```bash
cd backend
.\mvnw.cmd clean package -DskipTests
```
Generates an executable fat JAR in `backend/target/retail-billing-backend-1.0.0.jar`.

---

## 10. Deployment Guide

### Deploying Frontend to Vercel

1. Push your repository to GitHub or GitLab.
2. In [Vercel](https://vercel.com), import the repository and set the **Root Directory** to `frontend`.
3. In **Settings > Environment Variables**, add:
   - `VITE_API_URL`: The public HTTPS URL where your Spring Boot backend is hosted (e.g. `https://your-backend.railway.app/api`).
4. Vercel automatically detects Vite and deploys using `vercel.json` for SPA routing.

### Deploying Backend and MySQL

Vercel hosts serverless frontend applications; a Java Spring Boot application with MySQL requires a service like Railway, Render, Fly.io, or AWS EC2:

1. **Database**: Create a cloud MySQL instance (e.g., Railway MySQL, Aiven, or AWS RDS).
2. **Export Local Data**:
   ```bash
   mysqldump -u root -p retail_billing_db > dump.sql
   ```
   Import `dump.sql` into your cloud database.
3. **Deploy Backend**:
   - Provide the following environment variables to your host:
     - `DB_URL`: `jdbc:mysql://<cloud-host>:3306/<cloud-db>?useSSL=true`
     - `DB_USERNAME`: `<cloud-user>`
     - `DB_PASSWORD`: `<cloud-password>`
     - `CORS_ALLOWED_ORIGINS`: `https://your-app.vercel.app`
   - Run command: `java -jar target/retail-billing-backend-1.0.0.jar`

---

## 11. Troubleshooting

- **MySQL Connection Refused**:
  - Make sure the MySQL Windows service is running (`net start MySQL96` or via Windows Services).
  - Verify credentials `root` / `root` and database name `retail_billing_db`.
- **Port 8080 already in use**:
  - Stop any existing Java process or change `server.port` in `backend/src/main/resources/application.properties`.
- **CORS error in browser**:
  - Verify that `app.cors.allowed-origins` in `application.properties` includes `http://localhost:5173`.
