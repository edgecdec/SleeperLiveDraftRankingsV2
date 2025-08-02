# GitHub Actions CI/CD Pipeline

This directory contains the GitHub Actions workflows for automated building and deployment of the Fantasy Football Draft Assistant V2.

## 🚀 Automated Build Pipeline

### Workflow: `build-executables.yml`

**Triggers:**
- ✅ Push to `main` branch
- ✅ Pull requests to `main` branch  
- ✅ Manual release creation

**Platforms Built:**
- 🪟 **Windows** (x64) - `.exe` executable
- 🍎 **macOS** (x64) - Unix executable
- 🐧 **Linux** (x64) - Unix executable

### 🔄 Build Process

1. **Setup Environment**
   - Checkout code
   - Setup Python 3.9
   - Cache pip dependencies
   - Install requirements

2. **Build Executable**
   - Run platform-specific build script
   - Create versioned executable
   - Generate build info file
   - Basic smoke test

3. **Upload Artifacts**
   - Store executables as GitHub artifacts
   - 30-day retention period
   - Available for download from Actions tab

4. **Create Release** (main branch only)
   - Auto-generate release with timestamp
   - Upload all platform executables
   - Include comprehensive release notes
   - Tag with build date

### 📦 Output Files

Each build produces:
- **Executable**: `FantasyFootballDraftAssistant-v2.0.0-{platform}`
- **Build Info**: `release_info_{platform}.txt`
- **Artifacts**: Available in GitHub Actions

### 🎯 Release Strategy

**Automated Releases:**
- Created on every push to `main`
- Tagged as `build-YYYY-MM-DD-HHMM`
- Include all three platform executables
- Pre-release flag: `false`

**Manual Releases:**
- Can be created through GitHub UI
- Trigger the same build process
- Allow custom release notes

### 🔧 Build Scripts

Located in `scripts/platform/`:
- `build_windows.bat` - Windows build script
- `build_macos.sh` - macOS build script  
- `build_linux.sh` - Linux build script

### 📊 Build Matrix

| Platform | OS Runner | Executable Name | Build Script |
|----------|-----------|----------------|--------------|
| Windows | `windows-latest` | `.exe` | `build_windows.bat` |
| macOS | `macos-latest` | Unix binary | `build_macos.sh` |
| Linux | `ubuntu-latest` | Unix binary | `build_linux.sh` |

### 🛠️ Customization

**To modify the build process:**

1. **Change Python version**: Update `python-version` in workflow
2. **Add new platform**: Add to build matrix
3. **Modify build steps**: Edit platform-specific scripts
4. **Change release strategy**: Modify `create-release` job

**Environment Variables:**
- `GITHUB_TOKEN`: Automatically provided by GitHub
- No additional secrets required

### 🔍 Monitoring

**Build Status:**
- Check the Actions tab in GitHub repository
- Green checkmark = successful build
- Red X = failed build with logs

**Artifacts:**
- Available for 30 days after build
- Download from Actions run page
- Includes all platform executables

**Releases:**
- Automatically created on main branch pushes
- Available in Releases section
- Include download links for all platforms

### 🚨 Troubleshooting

**Common Issues:**

1. **Build Failure**: Check Python dependencies in `requirements.txt`
2. **Missing Executable**: Verify build script paths and permissions
3. **Upload Failure**: Check artifact paths in workflow
4. **Release Creation**: Ensure `GITHUB_TOKEN` has proper permissions

**Debug Steps:**
1. Check workflow logs in Actions tab
2. Verify build scripts work locally
3. Test with pull request first
4. Check file paths and permissions

### 📈 Benefits

- ✅ **Automated**: No manual building required
- ✅ **Multi-platform**: Windows, macOS, Linux support
- ✅ **Consistent**: Same build environment every time
- ✅ **Fast**: Parallel builds across platforms
- ✅ **Reliable**: Cached dependencies and error handling
- ✅ **Accessible**: Direct download links for users

This setup ensures that every commit to main automatically produces ready-to-distribute executables for all major platforms!
