#!/usr/bin/env python3
"""
Test script to verify configuration functionality
"""

import json
from game_logic import GAME_CONFIG

def test_config():
    print("=== Configuration Test ===")
    print(f"Configuration loaded: {GAME_CONFIG}")
    
    print(f"\nMistral enabled: {GAME_CONFIG.get('mistral', {}).get('enabled', True)}")
    print(f"Mistral fallback text: {GAME_CONFIG.get('mistral', {}).get('fallback_text', 'Default text')}")
    
    print(f"\nImage generation enabled: {GAME_CONFIG.get('image_generation', {}).get('enabled', True)}")
    print(f"Fallback to original: {GAME_CONFIG.get('image_generation', {}).get('fallback_to_original', False)}")

if __name__ == "__main__":
    test_config()