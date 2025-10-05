#!/usr/bin/env python3
"""
Simple HTTP server to serve the weather app
"""
import http.server
import socketserver
import os
import webbrowser
import time

def main():
    # Change to the weaza nasa directory
    os.chdir('weaza nasa')
    
    # Set up the server
    PORT = 8080
    Handler = http.server.SimpleHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Website server running at: http://localhost:{PORT}")
        print(f"Serving directory: {os.getcwd()}")
        print("Press Ctrl+C to stop the server")
        
        # Open browser
        webbrowser.open(f'http://localhost:{PORT}')
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == "__main__":
    main()
