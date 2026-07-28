import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

# Add project root to sys.path to enable backend imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.database import init_db
from backend.routes import handle_api_request

PORT = 8000
FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')

class DashboardHTTPRequestHandler(BaseHTTPRequestHandler):
    """Custom HTTP request handler serving static files and API requests."""
    
    def log_message(self, format, *args):
        # Enable standard request logging to help debug connections
        super().log_message(format, *args)

    def send_cors_headers(self):
        """Appends CORS headers for development flexibility."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        """Handles preflight requests."""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        """Handles GET requests for static pages and API endpoints."""
        if self.path.startswith('/api/'):
            status, content_type, response_body = handle_api_request('GET', self.path)
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(response_body.encode('utf-8'))
        else:
            self.serve_static_file()

    def do_POST(self):
        """Handles POST requests, reading request body and executing routing logic."""
        if self.path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else None
            
            status, content_type, response_body = handle_api_request('POST', self.path, body)
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(response_body.encode('utf-8'))
        else:
            self.send_response(405)
            self.end_headers()

    def serve_static_file(self):
        """Resolves request path inside the frontend directory and returns the file."""
        # Sanitize path to prevent directory traversal
        clean_path = self.path.split('?')[0]
        if clean_path == '/' or clean_path == '':
            filepath = os.path.join(FRONTEND_DIR, 'index.html')
        else:
            # Strip leading slash
            filepath = os.path.join(FRONTEND_DIR, clean_path.lstrip('/'))

        # Check if the file is outside frontend directory (security check)
        real_filepath = os.path.realpath(filepath)
        real_frontend_dir = os.path.realpath(FRONTEND_DIR)
        
        if not real_filepath.startswith(real_frontend_dir):
            self.send_response(403)
            self.end_headers()
            self.wfile.write(b"403 Forbidden")
            return

        if not os.path.exists(real_filepath) or os.path.isdir(real_filepath):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404 Not Found")
            return

        # Determine Content Type
        _, ext = os.path.splitext(real_filepath)
        mime_types = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        }
        content_type = mime_types.get(ext.lower(), 'application/octet-stream')

        # Read and serve the file
        try:
            with open(real_filepath, 'rb') as file:
                content = file.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"500 Internal Server Error: {str(e)}".encode('utf-8'))

def run_server():
    """Initializes SQLite DB and starts HTTP Server."""
    print("--------------------------------------------------")
    print("AeroAnalytics Dashboard Server initializing...")
    print("--------------------------------------------------")
    
    # Initialize SQLite database
    init_db()
    
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, DashboardHTTPRequestHandler)
    print(f"Server successfully started! Access the dashboard here:")
    print(f"👉 http://localhost:{PORT} 👈")
    print("Press Ctrl+C to terminate.")
    print("--------------------------------------------------")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()
        print("Server stopped.")

if __name__ == '__main__':
    run_server()
