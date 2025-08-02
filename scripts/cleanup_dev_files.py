#!/usr/bin/env python3
"""
Development File Cleanup Script

Removes common temporary and backup files created during development.
Run this after completing any feature to clean up the workspace.

Usage:
    python scripts/cleanup_dev_files.py
    python scripts/cleanup_dev_files.py --dry-run    # Show what would be deleted
    python scripts/cleanup_dev_files.py --verify     # Only verify references
"""

import os
import glob
import argparse
from pathlib import Path

def get_project_root():
    """Get the project root directory"""
    return Path(__file__).parent.parent

def cleanup_frontend_files(dry_run=False):
    """Clean up frontend temporary files"""
    project_root = get_project_root()
    
    patterns = [
        'src/frontend/*_enhanced.*',
        'src/frontend/*_temp.*',
        'src/frontend/*_old.*',
        'src/frontend/*_backup.*',
        'src/frontend/*.tmp',
        'src/frontend/*~',  # Editor backup files
    ]
    
    files_found = []
    for pattern in patterns:
        full_pattern = project_root / pattern
        for file_path in glob.glob(str(full_pattern)):
            files_found.append(file_path)
    
    if files_found:
        print("🧹 Frontend files to clean up:")
        for file_path in files_found:
            print(f"  - {file_path}")
            if not dry_run:
                os.remove(file_path)
                print(f"    ✅ Removed")
    else:
        print("✅ No frontend cleanup files found")
    
    return len(files_found)

def cleanup_backend_files(dry_run=False):
    """Clean up backend temporary files"""
    project_root = get_project_root()
    
    patterns = [
        'src/backend/**/*_temp.py',
        'src/backend/**/*_old.py',
        'src/backend/**/*_backup.py',
        'src/backend/**/*.tmp',
        'src/backend/**/*~',  # Editor backup files
        'src/backend/**/*.pyc',  # Python compiled files
        'src/backend/**/__pycache__',  # Python cache directories
    ]
    
    files_found = []
    for pattern in patterns:
        full_pattern = project_root / pattern
        for file_path in glob.glob(str(full_pattern), recursive=True):
            files_found.append(file_path)
    
    if files_found:
        print("🧹 Backend files to clean up:")
        for file_path in files_found:
            print(f"  - {file_path}")
            if not dry_run:
                if os.path.isdir(file_path):
                    import shutil
                    shutil.rmtree(file_path)
                else:
                    os.remove(file_path)
                print(f"    ✅ Removed")
    else:
        print("✅ No backend cleanup files found")
    
    return len(files_found)

def cleanup_root_files(dry_run=False):
    """Clean up root-level temporary files"""
    project_root = get_project_root()
    
    patterns = [
        '*_temp.*',
        '*_old.*',
        '*_backup.*',
        '*.tmp',
        '*~',
        'files_before.txt',
        'files_after.txt',
    ]
    
    files_found = []
    for pattern in patterns:
        full_pattern = project_root / pattern
        for file_path in glob.glob(str(full_pattern)):
            # Skip important files that might match patterns
            if 'README' in file_path or 'LICENSE' in file_path:
                continue
            files_found.append(file_path)
    
    if files_found:
        print("🧹 Root files to clean up:")
        for file_path in files_found:
            print(f"  - {file_path}")
            if not dry_run:
                os.remove(file_path)
                print(f"    ✅ Removed")
    else:
        print("✅ No root cleanup files found")
    
    return len(files_found)

def verify_references():
    """Verify no broken references exist"""
    project_root = get_project_root()
    issues_found = []
    
    print("🔍 Checking for broken references...")
    
    # Check HTML references
    html_files = glob.glob(str(project_root / 'src/frontend/*.html'))
    for html_file in html_files:
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                content = f.read()
                line_num = 0
                for line in content.split('\n'):
                    line_num += 1
                    # Check for common broken reference patterns
                    if '_enhanced.' in line:
                        issues_found.append(f"{html_file}:{line_num} - Contains '_enhanced.' reference: {line.strip()}")
                    if '_temp.' in line:
                        issues_found.append(f"{html_file}:{line_num} - Contains '_temp.' reference: {line.strip()}")
                    if '_old.' in line:
                        issues_found.append(f"{html_file}:{line_num} - Contains '_old.' reference: {line.strip()}")
                    if '_backup.' in line:
                        issues_found.append(f"{html_file}:{line_num} - Contains '_backup.' reference: {line.strip()}")
        except Exception as e:
            issues_found.append(f"{html_file} - Error reading file: {e}")
    
    # Check CSS references
    css_files = glob.glob(str(project_root / 'src/frontend/*.css'))
    for css_file in css_files:
        try:
            with open(css_file, 'r', encoding='utf-8') as f:
                content = f.read()
                line_num = 0
                for line in content.split('\n'):
                    line_num += 1
                    if '@import' in line and ('_enhanced' in line or '_temp' in line or '_old' in line):
                        issues_found.append(f"{css_file}:{line_num} - Suspicious import: {line.strip()}")
        except Exception as e:
            issues_found.append(f"{css_file} - Error reading file: {e}")
    
    # Check JavaScript references
    js_files = glob.glob(str(project_root / 'src/frontend/*.js'))
    for js_file in js_files:
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
                line_num = 0
                for line in content.split('\n'):
                    line_num += 1
                    if ('import' in line or 'require' in line) and ('_enhanced' in line or '_temp' in line or '_old' in line):
                        issues_found.append(f"{js_file}:{line_num} - Suspicious import: {line.strip()}")
        except Exception as e:
            issues_found.append(f"{js_file} - Error reading file: {e}")
    
    if issues_found:
        print("⚠️  Potential reference issues found:")
        for issue in issues_found:
            print(f"  - {issue}")
        return len(issues_found)
    else:
        print("✅ No broken references found")
        return 0

def main():
    parser = argparse.ArgumentParser(description='Clean up development files')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be deleted without actually deleting')
    parser.add_argument('--verify', action='store_true',
                       help='Only verify references, do not clean files')
    
    args = parser.parse_args()
    
    print("🧹 Fantasy Football Draft Assistant V2 - Development File Cleanup")
    print("=" * 70)
    
    if args.verify:
        issues = verify_references()
        if issues > 0:
            print(f"\n❌ Found {issues} potential reference issues")
            print("Please fix these references before committing")
            return 1
        else:
            print("\n✅ All references look good!")
            return 0
    
    if args.dry_run:
        print("🔍 DRY RUN - Showing what would be cleaned up:")
        print()
    
    # Clean up files
    frontend_count = cleanup_frontend_files(args.dry_run)
    backend_count = cleanup_backend_files(args.dry_run)
    root_count = cleanup_root_files(args.dry_run)
    
    total_files = frontend_count + backend_count + root_count
    
    print()
    if args.dry_run:
        print(f"🔍 Would clean up {total_files} files")
        print("Run without --dry-run to actually delete these files")
    else:
        print(f"✅ Cleaned up {total_files} files")
    
    # Always verify references
    print()
    issues = verify_references()
    
    if issues > 0:
        print(f"\n⚠️  Found {issues} potential reference issues")
        print("Please review and fix these before committing")
        return 1
    
    print("\n🎉 Cleanup complete! Workspace is clean and ready.")
    return 0

if __name__ == '__main__':
    exit(main())
