#!/usr/bin/env python3
"""
Simplified CI Build Script for Fantasy Football Draft Assistant V2

This is a streamlined version of the build script specifically designed
for CI/CD environments with better error handling and timeouts.
"""

import os
import sys
import shutil
import subprocess
import platform
import signal
from pathlib import Path

class TimeoutError(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutError("Build process timed out")

def get_project_root():
    """Get the project root directory"""
    return Path(__file__).parent.parent

def clean_build_dirs():
    """Remove previous build artifacts"""
    project_root = get_project_root()
    dirs_to_clean = ['build', 'dist']
    
    for dir_name in dirs_to_clean:
        dir_path = project_root / dir_name
        if dir_path.exists():
            shutil.rmtree(dir_path)
            print(f"Cleaned {dir_path}")

def get_executable_name():
    """Get the executable name for the current platform"""
    base_name = "FantasyFootballDraftAssistant"
    if platform.system() == "Windows":
        return f"{base_name}.exe"
    else:
        return base_name

def create_simple_spec():
    """Create a simplified PyInstaller spec file for CI"""
    project_root = get_project_root()
    
    spec_content = f'''# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['main.py'],
    pathex=['{project_root}'],
    binaries=[],
    datas=[
        ('src/frontend', 'frontend'),
        ('data', 'data'),
    ],
    hiddenimports=[
        'flask',
        'flask_cors',
        'requests',
        'src.backend.app',
        'src.backend.config',
        'src.backend.services.sleeper_api',
        'src.backend.api.user',
        'src.backend.api.draft',
        'src.backend.utils.port_finder',
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'scipy',
        'PIL',
        'IPython',
        'jupyter',
        'pytest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='{get_executable_name()}',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # Disable UPX for CI builds
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
    
    spec_path = project_root / 'ci_build.spec'
    with open(spec_path, 'w', encoding='utf-8') as f:
        f.write(spec_content)
    
    print(f"Created CI spec file: {spec_path}")
    return spec_path

def build_executable_ci():
    """Build executable with CI-specific settings"""
    project_root = get_project_root()
    
    print("Starting CI build process...")
    print(f"Platform: {platform.system()} {platform.machine()}")
    print(f"Python: {sys.version}")
    print(f"Working directory: {project_root}")
    
    # Clean previous builds
    clean_build_dirs()
    
    # Create spec file
    spec_path = create_simple_spec()
    
    # Change to project root
    original_cwd = os.getcwd()
    os.chdir(project_root)
    
    try:
        # Build command with minimal options
        cmd = [
            'pyinstaller',
            '--clean',
            '--noconfirm',
            '--log-level=INFO',
            str(spec_path)
        ]
        
        print(f"Build command: {' '.join(cmd)}")
        
        # Set up timeout (7 minutes = 420 seconds)
        if platform.system() != "Windows":
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(420)  # 7 minutes
        
        # Run PyInstaller
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True,
            timeout=420  # 7 minutes timeout
        )
        
        # Cancel alarm if set
        if platform.system() != "Windows":
            signal.alarm(0)
        
        if result.returncode != 0:
            print("Build failed!")
            print("STDOUT:", result.stdout[-2000:])  # Last 2000 chars
            print("STDERR:", result.stderr[-2000:])  # Last 2000 chars
            return False
        
        print("Build completed successfully!")
        
        # Verify executable exists
        exe_path = project_root / 'dist' / get_executable_name()
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / (1024 * 1024)
            print(f"Executable created: {exe_path}")
            print(f"Size: {size_mb:.1f} MB")
            return True
        else:
            print("Executable not found after build!")
            return False
            
    except subprocess.TimeoutExpired:
        print("Build timed out after 7 minutes!")
        return False
    except TimeoutError:
        print("Build timed out (signal handler)!")
        return False
    except Exception as e:
        print(f"Build failed with exception: {e}")
        return False
    finally:
        os.chdir(original_cwd)

def create_release_files():
    """Create release-ready files"""
    project_root = get_project_root()
    dist_path = project_root / 'dist'
    exe_path = dist_path / get_executable_name()
    
    if not exe_path.exists():
        print("Executable not found for release creation")
        return False
    
    # Create platform-specific name
    system = platform.system().lower()
    if system == "darwin":
        system = "darwin"
    
    version = "2.0.0"
    platform_suffix = f"{system}-x64"
    release_name = f"FantasyFootballDraftAssistant-v{version}-{platform_suffix}"
    
    if platform.system() == "Windows":
        release_name += ".exe"
    
    release_path = dist_path / release_name
    
    # Copy executable with platform-specific name
    shutil.copy2(exe_path, release_path)
    
    # Create release info
    info_path = dist_path / f'release_info_{platform_suffix}.txt'
    with open(info_path, 'w') as f:
        f.write(f"Fantasy Football Draft Assistant V2 - {platform.system()} Build\n")
        f.write("=" * 60 + "\n")
        f.write(f"Platform: {platform.system()} {platform.machine()}\n")
        f.write(f"Executable: {release_name}\n")
        f.write(f"Size: {exe_path.stat().st_size / (1024 * 1024):.1f} MB\n")
        f.write(f"Build Date: {subprocess.check_output(['date'], text=True).strip()}\n")
    
    print(f"Created release files:")
    print(f"  - {release_name}")
    print(f"  - release_info_{platform_suffix}.txt")
    
    return True

def main():
    """Main CI build function"""
    print("Fantasy Football Draft Assistant V2 - CI Build")
    print("=" * 50)
    
    # Check PyInstaller
    try:
        result = subprocess.run(['pyinstaller', '--version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"PyInstaller version: {result.stdout.strip()}")
        else:
            print("PyInstaller not found!")
            return False
    except FileNotFoundError:
        print("PyInstaller not installed!")
        return False
    
    # Build executable
    if not build_executable_ci():
        print("CI build failed!")
        sys.exit(1)
    
    # Create release files
    if not create_release_files():
        print("Release file creation failed!")
        sys.exit(1)
    
    print("\nCI build completed successfully!")
    return True

if __name__ == '__main__':
    main()
