import os
import sqlite3
import csv

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'dashboard.db')
CUSTOMERS_CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'customers.csv')
SALES_CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'sales.csv')

def get_db_connection():
    """Returns a connection to the SQLite database with Row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database, creating tables and loading CSV data if needed."""
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'")
    customers_exists = cursor.fetchone()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sales'")
    sales_exists = cursor.fetchone()
    
    if not customers_exists or not sales_exists:
        print("Initializing database from CSV files...")
        setup_tables(conn)
        load_csv_data(conn)
    else:
        print("Database already initialized.")
        
    conn.close()

def setup_tables(conn):
    """Creates the schemas for the tables."""
    cursor = conn.cursor()
    
    # Drop existing tables to ensure clean setup if called during reset
    cursor.execute("DROP TABLE IF EXISTS sales")
    cursor.execute("DROP TABLE IF EXISTS customers")
    
    # Create customers table
    cursor.execute("""
    CREATE TABLE customers (
        customer_id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        region TEXT NOT NULL,
        signup_date TEXT NOT NULL,
        segment TEXT NOT NULL
    )
    """)
    
    # Create sales table
    cursor.execute("""
    CREATE TABLE sales (
        transaction_id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        product TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        cost REAL NOT NULL,
        profit REAL NOT NULL,
        quantity INTEGER NOT NULL,
        discount REAL NOT NULL,
        transaction_date TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    )
    """)
    
    conn.commit()

def load_csv_data(conn):
    """Parses and loads CSV records into SQLite tables."""
    cursor = conn.cursor()
    
    # Load customers
    if os.path.exists(CUSTOMERS_CSV_PATH):
        with open(CUSTOMERS_CSV_PATH, 'r') as f:
            reader = csv.DictReader(f)
            customers_data = [
                (r['customer_id'], r['first_name'], r['last_name'], r['email'], r['region'], r['signup_date'], r['segment'])
                for r in reader
            ]
            cursor.executemany("""
            INSERT INTO customers (customer_id, first_name, last_name, email, region, signup_date, segment)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, customers_data)
        print(f"Loaded {len(customers_data)} customers into database.")
    else:
        print(f"Warning: customers.csv not found at {CUSTOMERS_CSV_PATH}")
        
    # Load sales
    if os.path.exists(SALES_CSV_PATH):
        with open(SALES_CSV_PATH, 'r') as f:
            reader = csv.DictReader(f)
            sales_data = [
                (
                    r['transaction_id'], r['customer_id'], r['product'], r['category'],
                    float(r['amount']), float(r['cost']), float(r['profit']),
                    int(r['quantity']), float(r['discount']), r['transaction_date']
                )
                for r in reader
            ]
            cursor.executemany("""
            INSERT INTO sales (transaction_id, customer_id, product, category, amount, cost, profit, quantity, discount, transaction_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, sales_data)
        print(f"Loaded {len(sales_data)} sales records into database.")
    else:
        print(f"Warning: sales.csv not found at {SALES_CSV_PATH}")
        
    conn.commit()

def reset_db():
    """Forces database reset by dropping tables and reloading CSVs."""
    conn = get_db_connection()
    setup_tables(conn)
    load_csv_data(conn)
    conn.close()

if __name__ == "__main__":
    init_db()
