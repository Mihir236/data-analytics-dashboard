from backend.database import get_db_connection

def rows_to_dicts(rows):
    """Converts SQLite Row items to standard list of dictionaries."""
    return [dict(row) for row in rows]

def calculate_kpis():
    """Calculates high-level business KPIs directly from the SQLite database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    kpis = {}
    try:
        # Total Sales, Profit, and Items
        cursor.execute("SELECT SUM(amount), SUM(cost), SUM(profit), SUM(quantity), AVG(discount) FROM sales")
        total_sales, total_cost, total_profit, total_items, avg_discount = cursor.fetchone()
        
        # Total Customers
        cursor.execute("SELECT COUNT(DISTINCT customer_id) FROM customers")
        total_customers = cursor.fetchone()[0]
        
        # Total Transactions
        cursor.execute("SELECT COUNT(transaction_id) FROM sales")
        total_txns = cursor.fetchone()[0]
        
        # Calculations
        kpis['total_sales'] = round(total_sales or 0, 2)
        kpis['total_profit'] = round(total_profit or 0, 2)
        kpis['profit_margin'] = round((total_profit / total_sales * 100) if total_sales else 0, 2)
        kpis['total_customers'] = total_customers or 0
        kpis['avg_order_value'] = round((total_sales / total_txns) if total_txns else 0, 2)
        kpis['avg_discount'] = round((avg_discount or 0) * 100, 2)
        kpis['total_transactions'] = total_txns
        
    except Exception as e:
        print(f"Error calculating KPIs: {e}")
        kpis = {
            'total_sales': 0, 'total_profit': 0, 'profit_margin': 0,
            'total_customers': 0, 'avg_order_value': 0, 'avg_discount': 0,
            'total_transactions': 0
        }
    finally:
        conn.close()
        
    return kpis

def generate_insights():
    """Programmatically analyzes the database data to generate dynamic business insights."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    insights = []
    try:
        # 1. Category performance insight
        cursor.execute("""
            SELECT category, SUM(amount) as sales, SUM(profit) as profit 
            FROM sales 
            GROUP BY category 
            ORDER BY sales DESC
        """)
        categories = cursor.fetchall()
        if categories:
            top_cat = categories[0]
            insights.append({
                "type": "success",
                "title": "Category Dominance",
                "message": f"The '{top_cat['category']}' category leads the company's portfolio, contributing ${top_cat['sales']:,.2f} in sales and yielding ${top_cat['profit']:,.2f} in net profit."
            })
            
        # 2. Regional growth insight
        cursor.execute("""
            SELECT c.region, SUM(s.amount) as sales, COUNT(DISTINCT s.customer_id) as active_cust
            FROM customers c
            JOIN sales s ON c.customer_id = s.customer_id
            GROUP BY c.region
            ORDER BY sales DESC
        """)
        regions = cursor.fetchall()
        if regions:
            top_region = regions[0]
            insights.append({
                "type": "info",
                "title": "Regional Champion",
                "message": f"'{top_region['region']}' is the strongest region, supported by {top_region['active_cust']} active enterprise/commercial accounts generating ${top_region['sales']:,.2f}."
            })
            
        # 3. Discount impact analysis
        cursor.execute("""
            SELECT 
                CASE WHEN discount > 0 THEN 'Discounted' ELSE 'Full Price' END as sales_type,
                AVG(amount) as avg_value,
                SUM(profit) / SUM(amount) as profit_margin
            FROM sales
            GROUP BY sales_type
        """)
        discount_impact = cursor.fetchall()
        if len(discount_impact) >= 2:
            disc_row = [r for r in discount_impact if r[0] == 'Discounted'][0]
            full_row = [r for r in discount_impact if r[0] == 'Full Price'][0]
            margin_drop = round((full_row['profit_margin'] - disc_row['profit_margin']) * 100, 1)
            insights.append({
                "type": "warning",
                "title": "Discounting & Margins",
                "message": f"Discounted transactions show a margin drop of {margin_drop}% compared to full-price transactions, indicating a need for stricter discount governance."
            })
            
        # 4. Average customer lifetime value (CLV)
        cursor.execute("""
            WITH cust_sales AS (
                SELECT customer_id, SUM(amount) as total_sales
                FROM sales
                GROUP BY customer_id
            )
            SELECT AVG(total_sales) as avg_clv FROM cust_sales
        """)
        avg_clv = cursor.fetchone()[0]
        if avg_clv:
            insights.append({
                "type": "success",
                "title": "Customer Value",
                "message": f"Average Customer Lifetime Value (CLV) is ${avg_clv:,.2f}. Retention efforts should prioritize customers below this threshold to maximize value."
            })
            
    except Exception as e:
        print(f"Error generating insights: {e}")
        insights.append({
            "type": "danger",
            "title": "Analysis Failure",
            "message": f"Could not perform automated data analysis. Details: {str(e)}"
        })
    finally:
        conn.close()
        
    return insights
