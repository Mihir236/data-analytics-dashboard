# AeroAnalytics: Data Analytics SQL Dashboard

AeroAnalytics is a premium, interactive **Data Analytics SQL Dashboard** combining a high-performance SQLite database backend (running on Python standard libraries) with a stunning, glassmorphic client-side frontend. It features an interactive **SQL Playground Console** that allows users to run custom queries directly against transactional data, visualize results in real-time, inspect database schemas, and view auto-generated business insights.

The SQLite database parses and ingests raw records from CSV files, representing a common enterprise ETL workflow. Detailed connection pathways are provided for **Power BI** and **Tableau**.

---

## 📂 Project Structure

```
data_analytics
├── frontend
│   ├── index.html        # Glassmorphic layout for dashboard & playground console
│   ├── style.css         # Custom animations, glowing border card grids, responsive styles
│   └── app.js            # Frontend orchestrator, AJAX endpoints, Chart.js integrations
├── backend
│   ├── server.py         # Entrypoint web server (Python standard HTTP wrapper)
│   ├── routes.py         # Request routing, query validation, execution stats
│   ├── database.py       # SQLite connection manager & automatic CSV tables loader
│   ├── models.py         # Table schema descriptions & predefined query string lists
│   └── utils.py          # High-level KPI aggregations & programmatics business insights
├── data
│   ├── sales.csv         # Generated transactional sales ledger (1,400+ entries)
│   ├── customers.csv     # Generated customer demographic data (150 entries)
│   └── dashboard.db      # Live compiled SQLite Database (auto-generated)
├── notebooks
│   └── analysis.ipynb    # Python/Pandas exploratory data analysis and plotting notebook
├── requirements.txt      # Optional python packages list (mainly for Jupyter notebook)
├── README.md             # Project documentation (this file)
└── .gitignore            # System git exclusions
```

---

## ⚡ Quick Start & Setup

No complex framework setup or dependencies are required to run the dashboard server. The backend runs purely on Python's built-in libraries.

### 1. Launch the Server
In your terminal, navigate to the project directory and execute the server:

```bash
python3 backend/server.py
```

This will:
1. Scan for the SQLite database `data/dashboard.db` and create it if missing.
2. Ingest `data/customers.csv` and `data/sales.csv` records into corresponding SQL tables.
3. Start a lightweight HTTP web server.

### 2. Access the UI
Open your browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)** 👈

---

## 📊 Predefined SQL Templates

The dashboard comes with ready-made report templates that execute via the SQL Console. You can write custom SQLite queries or use these templates:

### Monthly Revenue Trend
Aggregates sales revenue and net profits grouped by fiscal month.
```sql
SELECT 
    strftime('%Y-%m', transaction_date) as month,
    ROUND(SUM(amount), 2) as total_sales,
    ROUND(SUM(profit), 2) as total_profit
FROM sales
GROUP BY month
ORDER BY month ASC;
```

### Product Category Share
Aggregates volume and sales for software, hardware, and service product catalog divisions.
```sql
SELECT 
    category,
    ROUND(SUM(amount), 2) as total_sales,
    ROUND(SUM(profit), 2) as total_profit,
    SUM(quantity) as items_sold
FROM sales
GROUP BY category
ORDER BY total_sales DESC;
```

### Customer Segments Performance
Compares metrics between Enterprise, Mid-Market, and SMB clients.
```sql
SELECT 
    c.segment,
    COUNT(DISTINCT c.customer_id) as customer_count,
    ROUND(SUM(s.amount), 2) as total_sales,
    ROUND(SUM(s.amount) / COUNT(DISTINCT s.transaction_id), 2) as avg_order_value
FROM customers c
LEFT JOIN sales s ON c.customer_id = s.customer_id
GROUP BY c.segment
ORDER BY total_sales DESC;
```

---

## 🔌 Connecting to Power BI / Tableau

To build reports inside dedicated BI tools using our live dataset:

### 1. Power BI Desktop
1. Select **Get Data** → **More...** → **ODBC**.
2. Set the **Connection string** argument to:
   ```odbc
   Driver={SQLite3 ODBC Driver};Database=/Absolute/Path/To/data_analytics/data/dashboard.db;
   ```
3. Import the `sales` and `customers` tables into Power Query.

### 2. Tableau Desktop
1. Click **Connect** → **Other Databases (ODBC)**.
2. Choose **SQLite3 ODBC Driver**.
3. Click Connect, select `data/dashboard.db`, and sign in.
4. Drag tables to the canvas and connect them via:
   `sales.customer_id = customers.customer_id`
