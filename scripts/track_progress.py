#!/usr/bin/env python3
"""
Progress Tracking Script for Fantasy Football Draft Assistant V2

This script helps track feature implementation progress and update documentation.
"""

import re
from pathlib import Path
from datetime import datetime

def get_project_root():
    """Get the project root directory"""
    return Path(__file__).parent.parent

def count_features_in_markdown(file_path):
    """Count completed and missing features in a markdown file"""
    if not file_path.exists():
        return 0, 0, []
    
    content = file_path.read_text()
    
    # Count completed features (lines starting with - [x])
    completed_pattern = r'^- \[x\].*$'
    completed_matches = re.findall(completed_pattern, content, re.MULTILINE)
    completed_count = len(completed_matches)
    
    # Count missing features (lines starting with - [ ])
    missing_pattern = r'^- \[ \].*$'
    missing_matches = re.findall(missing_pattern, content, re.MULTILINE)
    missing_count = len(missing_matches)
    
    return completed_count, missing_count, missing_matches

def update_progress_percentages(file_path, completed, total):
    """Update progress percentages in the markdown file"""
    if not file_path.exists():
        return
    
    content = file_path.read_text()
    
    # Calculate percentage
    percentage = (completed / total * 100) if total > 0 else 0
    
    # Update overall progress
    overall_pattern = r'\*\*Overall Progress\*\*: \d+/\d+ features completed \(\d+\.\d+%\)'
    overall_replacement = f'**Overall Progress**: {completed}/{total} features completed ({percentage:.1f}%)'
    content = re.sub(overall_pattern, overall_replacement, content)
    
    # Update last updated date
    date_pattern = r'\*\*Last Updated\*\*: .*'
    date_replacement = f'**Last Updated**: {datetime.now().strftime("%B %d, %Y")}'
    content = re.sub(date_pattern, date_replacement, content)
    
    file_path.write_text(content)
    print(f"Updated progress in {file_path.name}: {completed}/{total} ({percentage:.1f}%)")

def mark_feature_completed(feature_name):
    """Mark a specific feature as completed in the missing features document"""
    missing_features_path = get_project_root() / 'MISSING_FEATURES.md'
    
    if not missing_features_path.exists():
        print("MISSING_FEATURES.md not found!")
        return False
    
    content = missing_features_path.read_text()
    
    # Find the feature and mark it as completed
    pattern = f'- \\[ \\] \\*\\*{re.escape(feature_name)}\\*\\*'
    replacement = f'- [x] **{feature_name}**'
    
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
        missing_features_path.write_text(content)
        print(f"✅ Marked '{feature_name}' as completed!")
        return True
    else:
        print(f"❌ Feature '{feature_name}' not found in missing features list")
        return False

def add_new_feature(feature_name, category="🚧 Missing Core Features"):
    """Add a new feature to the missing features list"""
    missing_features_path = get_project_root() / 'MISSING_FEATURES.md'
    
    if not missing_features_path.exists():
        print("MISSING_FEATURES.md not found!")
        return False
    
    content = missing_features_path.read_text()
    
    # Find the category section
    category_pattern = f'### {re.escape(category)}'
    if not re.search(category_pattern, content):
        print(f"❌ Category '{category}' not found")
        return False
    
    # Add the new feature
    new_feature = f'- [ ] **{feature_name}** - [Description needed]'
    
    # Insert after the category header
    insertion_point = content.find(f'### {category}') + len(f'### {category}') + 1
    content = content[:insertion_point] + f'\n{new_feature}' + content[insertion_point:]
    
    missing_features_path.write_text(content)
    print(f"➕ Added new feature '{feature_name}' to {category}")
    return True

def generate_progress_report():
    """Generate a progress report"""
    project_root = get_project_root()
    missing_features_path = project_root / 'MISSING_FEATURES.md'
    
    print("📊 Fantasy Football Draft Assistant V2 - Progress Report")
    print("=" * 60)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    if missing_features_path.exists():
        completed, missing, missing_list = count_features_in_markdown(missing_features_path)
        total = completed + missing
        percentage = (completed / total * 100) if total > 0 else 0
        
        print(f"📈 Overall Progress:")
        print(f"   ✅ Completed: {completed} features")
        print(f"   🚧 Missing: {missing} features")
        print(f"   📊 Total: {total} features")
        print(f"   🎯 Progress: {percentage:.1f}%")
        print()
        
        # Show next 5 features to implement
        if missing_list:
            print("🔥 Next Features to Implement:")
            for i, feature in enumerate(missing_list[:5], 1):
                # Extract feature name from markdown
                feature_name = re.search(r'\*\*(.*?)\*\*', feature)
                if feature_name:
                    print(f"   {i}. {feature_name.group(1)}")
            print()
        
        # Update progress in the file
        update_progress_percentages(missing_features_path, completed, total)
    else:
        print("❌ MISSING_FEATURES.md not found!")

def main():
    """Main function with command-line interface"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python scripts/track_progress.py report")
        print("  python scripts/track_progress.py complete 'Feature Name'")
        print("  python scripts/track_progress.py add 'New Feature Name' 'Category'")
        return
    
    command = sys.argv[1].lower()
    
    if command == 'report':
        generate_progress_report()
    
    elif command == 'complete' and len(sys.argv) >= 3:
        feature_name = sys.argv[2]
        if mark_feature_completed(feature_name):
            print("Regenerating progress report...")
            generate_progress_report()
    
    elif command == 'add' and len(sys.argv) >= 3:
        feature_name = sys.argv[2]
        category = sys.argv[3] if len(sys.argv) >= 4 else "🚧 Missing Core Features"
        if add_new_feature(feature_name, category):
            print("Regenerating progress report...")
            generate_progress_report()
    
    else:
        print("Invalid command or missing arguments!")
        print("Use 'report', 'complete <feature>', or 'add <feature> [category]'")

if __name__ == '__main__':
    main()
