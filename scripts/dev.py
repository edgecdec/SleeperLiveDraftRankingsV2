#!/usr/bin/env python3
"""
Development script for Fantasy Football Draft Assistant V2

This script provides development utilities like:
- Running the development server
- Installing dependencies
- Running tests
- Checking code quality

Usage:
    python scripts/dev.py [command] [options]
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path


def get_project_root():
    """Get the project root directory"""
    return Path(__file__).parent.parent


def run_dev_server(port=None, debug=True, no_browser=False):
    """Run the development server"""
    project_root = get_project_root()
    
    # Change to project root
    original_cwd = os.getcwd()
    os.chdir(project_root)
    
    try:
        cmd = [sys.executable, 'main.py']
        
        if port:
            cmd.extend(['--port', str(port)])
        if debug:
            cmd.append('--debug')
        if no_browser:
            cmd.append('--no-browser')
        
        print(f"🚀 Starting development server...")
        print(f"   Command: {' '.join(cmd)}")
        print(f"   Working directory: {project_root}")
        print("   Press Ctrl+C to stop")
        print("-" * 50)
        
        subprocess.run(cmd)
        
    except KeyboardInterrupt:
        print("\n👋 Development server stopped")
    finally:
        os.chdir(original_cwd)


def install_dependencies(dev=False):
    """Install project dependencies"""
    project_root = get_project_root()
    requirements_file = project_root / 'requirements.txt'
    
    if not requirements_file.exists():
        print("❌ requirements.txt not found")
        return False
    
    cmd = [sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)]
    
    if dev:
        # Add development dependencies
        dev_packages = ['pytest', 'pytest-flask', 'black', 'flake8']
        cmd.extend(dev_packages)
    
    print(f"📦 Installing dependencies...")
    print(f"   Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, check=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False


def run_tests():
    """Run the test suite"""
    project_root = get_project_root()
    
    # Change to project root
    original_cwd = os.getcwd()
    os.chdir(project_root)
    
    try:
        # Check if pytest is available
        try:
            subprocess.run([sys.executable, '-m', 'pytest', '--version'], 
                         capture_output=True, check=True)
        except subprocess.CalledProcessError:
            print("❌ pytest not found. Installing...")
            subprocess.run([sys.executable, '-m', 'pip', 'install', 'pytest'], check=True)
        
        # Run tests
        cmd = [sys.executable, '-m', 'pytest', '-v']
        
        print("🧪 Running tests...")
        result = subprocess.run(cmd)
        
        if result.returncode == 0:
            print("✅ All tests passed")
            return True
        else:
            print("❌ Some tests failed")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to run tests: {e}")
        return False
    finally:
        os.chdir(original_cwd)


def check_code_quality():
    """Check code quality with flake8"""
    project_root = get_project_root()
    
    # Change to project root
    original_cwd = os.getcwd()
    os.chdir(project_root)
    
    try:
        # Check if flake8 is available
        try:
            subprocess.run([sys.executable, '-m', 'flake8', '--version'], 
                         capture_output=True, check=True)
        except subprocess.CalledProcessError:
            print("❌ flake8 not found. Installing...")
            subprocess.run([sys.executable, '-m', 'pip', 'install', 'flake8'], check=True)
        
        # Run flake8
        cmd = [sys.executable, '-m', 'flake8', 'src/', 'main.py', 'scripts/']
        
        print("🔍 Checking code quality...")
        result = subprocess.run(cmd)
        
        if result.returncode == 0:
            print("✅ Code quality check passed")
            return True
        else:
            print("⚠️  Code quality issues found")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to check code quality: {e}")
        return False
    finally:
        os.chdir(original_cwd)


def format_code():
    """Format code with black"""
    project_root = get_project_root()
    
    # Change to project root
    original_cwd = os.getcwd()
    os.chdir(project_root)
    
    try:
        # Check if black is available
        try:
            subprocess.run([sys.executable, '-m', 'black', '--version'], 
                         capture_output=True, check=True)
        except subprocess.CalledProcessError:
            print("❌ black not found. Installing...")
            subprocess.run([sys.executable, '-m', 'pip', 'install', 'black'], check=True)
        
        # Run black
        cmd = [sys.executable, '-m', 'black', 'src/', 'main.py', 'scripts/']
        
        print("🎨 Formatting code...")
        result = subprocess.run(cmd)
        
        if result.returncode == 0:
            print("✅ Code formatted successfully")
            return True
        else:
            print("❌ Code formatting failed")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to format code: {e}")
        return False
    finally:
        os.chdir(original_cwd)


def check_dependencies():
    """Check if all dependencies are installed"""
    project_root = get_project_root()
    requirements_file = project_root / 'requirements.txt'
    
    if not requirements_file.exists():
        print("❌ requirements.txt not found")
        return False
    
    print("📋 Checking dependencies...")
    
    # Read requirements
    with open(requirements_file) as f:
        requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
    
    missing = []
    
    for req in requirements:
        # Simple check - just try to import the package name
        package_name = req.split('>=')[0].split('==')[0].replace('-', '_')
        
        try:
            __import__(package_name)
            print(f"  ✅ {req}")
        except ImportError:
            print(f"  ❌ {req}")
            missing.append(req)
    
    if missing:
        print(f"\n⚠️  Missing {len(missing)} dependencies")
        print("   Run: python scripts/dev.py install")
        return False
    else:
        print("\n✅ All dependencies are installed")
        return True


def show_project_info():
    """Show project information"""
    project_root = get_project_root()
    
    print("🏈 Fantasy Football Draft Assistant V2 - Project Information")
    print("=" * 60)
    print(f"Project Root: {project_root}")
    print(f"Python Version: {sys.version}")
    print(f"Platform: {sys.platform}")
    
    # Check if virtual environment is active
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("Virtual Environment: Active ✅")
    else:
        print("Virtual Environment: Not active ⚠️")
    
    # Check dependencies
    print("\nDependency Status:")
    check_dependencies()


def main():
    """Main development function"""
    parser = argparse.ArgumentParser(description='Fantasy Football Draft Assistant V2 - Development Tools')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Run command
    run_parser = subparsers.add_parser('run', help='Run development server')
    run_parser.add_argument('--port', type=int, help='Port to run on')
    run_parser.add_argument('--no-debug', action='store_true', help='Disable debug mode')
    run_parser.add_argument('--no-browser', action='store_true', help='Don\'t open browser')
    
    # Install command
    install_parser = subparsers.add_parser('install', help='Install dependencies')
    install_parser.add_argument('--dev', action='store_true', help='Install development dependencies')
    
    # Test command
    subparsers.add_parser('test', help='Run tests')
    
    # Quality command
    subparsers.add_parser('lint', help='Check code quality')
    
    # Format command
    subparsers.add_parser('format', help='Format code')
    
    # Check command
    subparsers.add_parser('check', help='Check dependencies')
    
    # Info command
    subparsers.add_parser('info', help='Show project information')
    
    args = parser.parse_args()
    
    if not args.command:
        # Default to run
        run_dev_server()
        return
    
    if args.command == 'run':
        run_dev_server(
            port=args.port,
            debug=not args.no_debug,
            no_browser=args.no_browser
        )
    elif args.command == 'install':
        install_dependencies(dev=args.dev)
    elif args.command == 'test':
        run_tests()
    elif args.command == 'lint':
        check_code_quality()
    elif args.command == 'format':
        format_code()
    elif args.command == 'check':
        check_dependencies()
    elif args.command == 'info':
        show_project_info()
    else:
        print(f"Unknown command: {args.command}")
        parser.print_help()


if __name__ == '__main__':
    main()
