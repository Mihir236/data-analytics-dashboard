# Predefined SQL Queries for Dashboards

PREDEFINED_QUERIES = {
    "sales_by_category": """
        SELECT 
            category,
            ROUND(SUM(amount), 2) as total_sales,
            ROUND(SUM(profit), 2) as total_profit,
            SUM(quantity) as items_sold
        FROM sales
        GROUP BY category
        ORDER BY total_sales DESC;
    """,
    "monthly_sales_trend": """
        SELECT 
            strftime('%Y-%m', transaction_date) as month,
            ROUND(SUM(amount), 2) as total_sales,
            ROUND(SUM(profit), 2) as total_profit
        FROM sales
        GROUP BY month
        ORDER BY month ASC;
    """,
    "customer_segments": """
        SELECT 
            c.segment,
            COUNT(DISTINCT c.customer_id) as customer_count,
            ROUND(SUM(s.amount), 2) as total_sales,
            ROUND(SUM(s.amount) / COUNT(DISTINCT s.transaction_id), 2) as avg_order_value
        FROM customers c
        LEFT JOIN sales s ON c.customer_id = s.customer_id
        GROUP BY c.segment
        ORDER BY total_sales DESC;
    """,
    "regional_sales": """
        SELECT 
            c.region,
            ROUND(SUM(s.amount), 2) as total_sales,
            ROUND(SUM(s.profit), 2) as total_profit,
            COUNT(DISTINCT s.customer_id) as active_customers
        FROM customers c
        JOIN sales s ON c.customer_id = s.customer_id
        GROUP BY c.region
        ORDER BY total_sales DESC;
    """,
    "top_products": """
        SELECT 
            product,
            category,
            SUM(quantity) as units_sold,
            ROUND(SUM(amount), 2) as total_revenue,
            ROUND(SUM(profit), 2) as net_profit
        FROM sales
        GROUP BY product, category
        ORDER BY total_revenue DESC
        LIMIT 10;
    """,
    "recent_transactions": """
        SELECT 
            s.transaction_id,
            s.transaction_date,
            c.first_name || ' ' || c.last_name as customer_name,
            s.product,
            s.amount,
            s.quantity
        FROM sales s
        JOIN customers c ON s.customer_id = c.customer_id
        ORDER BY s.transaction_date DESC, s.transaction_id DESC
        LIMIT 100;
    """
}

SCHEMA_DETAILS = {
    "customers": [
        {"column": "customer_id", "type": "TEXT", "key": "PK", "desc": "Unique Customer ID"},
        {"column": "first_name", "type": "TEXT", "key": "", "desc": "Customer First Name"},
        {"column": "last_name", "type": "TEXT", "key": "", "desc": "Customer Last Name"},
        {"column": "email", "type": "TEXT", "key": "", "desc": "Email Address"},
        {"column": "region", "type": "TEXT", "key": "", "desc": "Geographical Region (e.g. North America)"},
        {"column": "signup_date", "type": "TEXT", "key": "", "desc": "Signup Date (YYYY-MM-DD)"},
        {"column": "segment", "type": "TEXT", "key": "", "desc": "Customer Segment (Enterprise, Mid-Market, SMB)"}
    ],
    "sales": [
        {"column": "transaction_id", "type": "TEXT", "key": "PK", "desc": "Unique Transaction/Order ID"},
        {"column": "customer_id", "type": "TEXT", "key": "FK", "desc": "Customer ID (Foreign Key)"},
        {"column": "product", "type": "TEXT", "key": "", "desc": "Product Name"},
        {"column": "category", "type": "TEXT", "key": "", "desc": "Product Category (Software, Hardware, Services)"},
        {"column": "amount", "type": "REAL", "key": "", "desc": "Gross Sale Amount ($)"},
        {"column": "cost", "type": "REAL", "key": "", "desc": "Product Cost ($)"},
        {"column": "profit", "type": "REAL", "key": "", "desc": "Net Profit ($)"},
        {"column": "quantity", "type": "INTEGER", "key": "", "desc": "Quantity Sold"},
        {"column": "discount", "type": "REAL", "key": "", "desc": "Discount Percentage (0.0 - 1.0)"},
        {"column": "transaction_date", "type": "TEXT", "key": "", "desc": "Transaction Date (YYYY-MM-DD)"}
    ]
}
