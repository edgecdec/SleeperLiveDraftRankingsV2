# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=['/Users/edeclan/FantasyFootballTest/SleeperLiveDraftRankingsV2'],
    binaries=[],
    datas=[
        ('src/frontend', 'frontend'),
        ('data', 'data'),
    ],
    hiddenimports=[
        'flask',
        'flask_cors',
        'requests',
        'urllib3',
        'certifi',
        'pandas',
        'numpy',
        'src.backend.app',
        'src.backend.config',
        'src.backend.services.sleeper_api',
        'src.backend.api.user',
        'src.backend.api.draft',
        'src.backend.utils.port_finder',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'scipy',
        'PIL',
        'IPython',
        'jupyter',
        'pytest',
        'black',
        'flake8',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='FantasyFootballDraftAssistant',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,  # Compress with UPX if available
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Show console in debug mode
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None
)
