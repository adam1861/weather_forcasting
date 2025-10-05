#!/usr/bin/env python3
"""
Comprehensive startup script for Weaza Nasa Weather Prediction System
This script handles all dependencies, model loading, and server startup
"""

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True

def install_dependencies():
    """Install required dependencies"""
    print("📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def check_model_files():
    """Check if all model files exist"""
    model_files = [
        'models/model_info.pkl',
        'models/xgb_model.json',
        'models/scaler_X.pkl',
        'models/scaler_y.pkl'
    ]
    
    missing_files = []
    for file_path in model_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ Missing model files:")
        for file_path in missing_files:
            print(f"   - {file_path}")
        print("\n💡 Please ensure you have trained the model first")
        return False
    
    print("✅ All model files found")
    return True

def check_website_files():
    """Check if website files exist"""
    website_files = [
        'weaza nasa/index.html',
        'weaza nasa/app.js',
        'weaza nasa/styles.css'
    ]
    
    missing_files = []
    for file_path in website_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ Missing website files:")
        for file_path in missing_files:
            print(f"   - {file_path}")
        return False
    
    print("✅ All website files found")
    return True

def start_servers():
    """Start both model and website servers"""
    print("🚀 Starting servers...")
    
    # Start model server
    print("🤖 Starting XGBoost model server...")
    model_process = subprocess.Popen([
        sys.executable, 'weather_model_server.py'
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Wait for model server to start
    print("⏳ Waiting for model server to start...")
    for i in range(30):
        try:
            import requests
            response = requests.get('http://localhost:5000/health', timeout=2)
            if response.status_code == 200:
                data = response.json()
                if data.get('model_loaded', False):
                    print("✅ Model server is running!")
                    break
        except:
            pass
        time.sleep(1)
    else:
        print("❌ Model server failed to start")
        return False
    
    # Start website server
    print("🌐 Starting website server...")
    website_process = subprocess.Popen([
        sys.executable, '-m', 'http.server', '8080'
    ], cwd='weaza nasa', stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    time.sleep(2)  # Give website server time to start
    
    print("\n" + "=" * 60)
    print("🎉 Weaza Nasa Weather Prediction System is running!")
    print("=" * 60)
    print("📍 Website: http://localhost:8080")
    print("🤖 Model API: http://localhost:5000")
    print("🛑 Press Ctrl+C to stop both servers")
    print("=" * 60)
    
    # Open browser
    try:
        webbrowser.open('http://localhost:8080')
        print("🌐 Opening website in browser...")
    except:
        print("⚠️  Could not open browser automatically")
    
    try:
        # Keep servers running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n👋 Shutting down servers...")
        model_process.terminate()
        website_process.terminate()
        print("✅ Servers stopped")

def main():
    """Main function"""
    print("🌤️ Weaza Nasa Weather Prediction System")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        return
    
    # Install dependencies
    if not install_dependencies():
        return
    
    # Check model files
    if not check_model_files():
        return
    
    # Check website files
    if not check_website_files():
        return
    
    # Start servers
    start_servers()

if __name__ == "__main__":
    main()
