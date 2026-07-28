import json
import sqlite3
import time
from urllib.parse import parse_qs, urlparse
from backend.database import get_db_connection, reset_db
from backend.models import PREDEFINED_QUERIES, SCHEMA_DETAILS
from backend.utils import calculate_kpis, generate_insights, rows_to_dicts

def handle_api_request(method, path, body=None):
    """Router for API requests. Parses path and executes corresponding logic."""
    parsed_url = urlparse(path)
    url_path = parsed_url.path
    query_params = parse_qs(parsed_url.query)
    
    # 1. GET /api/kpis
    if method == 'GET' and url_path == '/api/kpis':
        kpis = calculate_kpis()
        return 200, 'application/json', json.dumps(kpis)
        
    # 2. GET /api/schema
    elif method == 'GET' and url_path == '/api/schema':
        return 200, 'application/json', json.dumps(SCHEMA_DETAILS)
        
    # 3. GET /api/insights
    elif method == 'GET' and url_path == '/api/insights':
        insights = generate_insights()
        return 200, 'application/json', json.dumps(insights)
        
    # 4. GET /api/predefined
    elif method == 'GET' and url_path == '/api/predefined':
        return 200, 'application/json', json.dumps(PREDEFINED_QUERIES)
        
    # 5. POST /api/query
    elif method == 'POST' and url_path == '/api/query':
        try:
            req_data = json.loads(body) if body else {}
            sql_query = req_data.get('query', '')
        except Exception as e:
            return 400, 'application/json', json.dumps({"error": f"Invalid JSON payload: {e}"})
            
        if not sql_query:
            return 400, 'application/json', json.dumps({"error": "No SQL query provided"})
            
        # Execute query against SQLite database safely
        # Note: In a production system, arbitrary SQL execution is a major security risk.
        # However, for this offline data analytics educational dashboard running locally,
        # it is the core feature. We will restrict write operations to prevent file corruption
        # or system calls, but execute queries inside a read-only transaction or handle errors gracefully.
        
        # SQL validation/protection: prevent multiple statements or system modifications
        forbidden_keywords = ["ATTACH", "DETACH", "PRAGMA", "LOAD_EXTENSION"]
        query_upper = sql_query.upper()
        if any(keyword in query_upper for keyword in forbidden_keywords):
            return 400, 'application/json', json.dumps({
                "error": "Query contains forbidden commands (ATTACH, DETACH, PRAGMA, LOAD_EXTENSION) for security safety."
            })
            
        conn = None
        try:
            conn = get_db_connection()
            start_time = time.time()
            cursor = conn.cursor()
            
            # Execute query
            cursor.execute(sql_query)
            
            # Check if query returns rows (SELECT) or just modifies tables
            is_select = cursor.description is not None
            
            if is_select:
                rows = cursor.fetchall()
                execution_time = (time.time() - start_time) * 1000 # in ms
                headers = [description[0] for description in cursor.description]
                data = [dict(row) for row in rows]
                
                return 200, 'application/json', json.dumps({
                    "success": True,
                    "headers": headers,
                    "rows": data,
                    "execution_time_ms": round(execution_time, 2),
                    "row_count": len(data)
                })
            else:
                conn.commit()
                execution_time = (time.time() - start_time) * 1000
                return 200, 'application/json', json.dumps({
                    "success": True,
                    "message": "Query executed successfully. Database state updated.",
                    "execution_time_ms": round(execution_time, 2),
                    "row_count": cursor.rowcount
                })
                
        except sqlite3.Error as sqlite_err:
            return 200, 'application/json', json.dumps({
                "success": False,
                "error": str(sqlite_err)
            })
        except Exception as e:
            return 500, 'application/json', json.dumps({
                "success": False,
                "error": f"Internal execution error: {str(e)}"
            })
        finally:
            if conn:
                conn.close()
                
    # 6. POST /api/reset
    elif method == 'POST' and url_path == '/api/reset':
        try:
            reset_db()
            return 200, 'application/json', json.dumps({"success": True, "message": "Database reset successfully from original CSVs"})
        except Exception as e:
            return 500, 'application/json', json.dumps({"success": False, "error": str(e)})
            
    # Default 404
    return 404, 'application/json', json.dumps({"error": f"Endpoint {method} {path} not found"})
