#!/usr/bin/env python3
"""
Serve the Weaza Nasa website with XGBoost model integration
"""

import os
import sys
import subprocess
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser

def check_model_server():
    """Check if the model server is running"""
    import requests
    try:
        response = requests.get('http://localhost:5000/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            return data.get('model_loaded', False)
    except requests.exceptions.RequestException:
        pass
    return False

def start_model_server():
    """Start the XGBoost model server in the background"""
    print("🚀 Starting XGBoost model server...")
    try:
        # Start the model server
        process = subprocess.Popen([
            sys.executable, 'weather_model_server.py'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for server to start
        for i in range(30):  # Wait up to 30 seconds
            if check_model_server():
                print("✅ XGBoost model server is running!")
                return process
            time.sleep(1)
        
        print("❌ Failed to start model server")
        return None
        
    except Exception as e:
        print(f"❌ Error starting model server: {e}")
        return None

def start_website_server():
    """Start the website server"""
    print("🌐 Starting website server...")
    
    # Change to the website directory
    website_dir = "weaza nasa"
    if not os.path.exists(website_dir):
        print(f"❌ Website directory '{website_dir}' not found!")
        return None
    
    os.chdir(website_dir)
    
    # Start HTTP server
    port = 8080
    server_address = ('', port)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    
    print(f"✅ Website server running at: http://localhost:{port}")
    return httpd

def main():
    """Main function to start both servers"""
    print("🌤️ Weaza Nasa Weather Prediction System")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists('weather_model_server.py'):
        print("❌ Please run this script from the XGboost directory")
        return
    
    # Start model server
    model_process = start_model_server()
    if not model_process:
        print("❌ Failed to start model server. Please check the model files.")
        return
    
    try:
        # Start website server
        website_server = start_website_server()
        if not website_server:
            return
        
        # Open browser
        print("🌐 Opening website in browser...")
        webbrowser.open('http://localhost:8080')
        
        print("\n" + "=" * 50)
        print("🎉 Both servers are running!")
        print("📍 Website: http://localhost:8080")
        print("🤖 Model API: http://localhost:5000")
        print("🛑 Press Ctrl+C to stop both servers")
        print("=" * 50)
        
        # Start serving
        website_server.serve_forever()
        
    except KeyboardInterrupt:
        print("\n👋 Shutting down servers...")
        
    finally:
        # Clean up
        if model_process:
            model_process.terminate()
        if 'website_server' in locals():
            website_server.shutdown()

if __name__ == "__main__":
    main()
