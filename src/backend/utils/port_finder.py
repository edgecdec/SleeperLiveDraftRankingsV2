"""
Port finder utility for finding available ports.

This module helps find available ports for the Flask server to avoid conflicts.
"""

import socket


def is_port_available(port: int, host: str = 'localhost') -> bool:
    """
    Check if a port is available for binding.
    
    Args:
        port: Port number to check
        host: Host to check on (default: localhost)
    
    Returns:
        True if port is available, False otherwise
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            result = sock.connect_ex((host, port))
            return result != 0  # 0 means connection successful (port in use)
    except Exception:
        return False


def find_available_port(start_port: int = 5000, max_attempts: int = 100) -> int:
    """
    Find an available port starting from start_port.
    
    Args:
        start_port: Port to start checking from
        max_attempts: Maximum number of ports to try
    
    Returns:
        Available port number
    
    Raises:
        RuntimeError: If no available port found within max_attempts
    """
    for port in range(start_port, start_port + max_attempts):
        if is_port_available(port):
            return port
    
    raise RuntimeError(
        f"Could not find available port in range {start_port}-{start_port + max_attempts}"
    )
