#!/usr/bin/env python3
"""
Test rapide du reset automatique avec délai réduit
"""

import time
from datetime import datetime, timedelta
from game_logic import GameState, CONFIG

def test_quick_reset():
    """Test avec un délai réduit pour vérifier le fonctionnement"""
    print("Test rapide du reset automatique (délai réduit à 30 secondes)...")
    
    # Modifier temporairement le délai pour le test
    original_timeout = CONFIG['AUTO_RESET_TIMEOUT']
    CONFIG['AUTO_RESET_TIMEOUT'] = 30  # 30 secondes au lieu de 10 minutes
    
    try:
        # Créer une nouvelle instance de jeu
        game_state = GameState()
        
        # Simuler une partie commencée
        game_state.story = [{"text": "Test story", "player": "TestPlayer"}]
        game_state.update_player_activity("TestPlayer", "Soldat")
        
        print(f"État initial: {len(game_state.story)} entrées, {len(game_state.get_active_players())} joueurs actifs")
        
        # Attendre 35 secondes pour dépasser le délai
        print("Attente de 35 secondes...")
        time.sleep(35)
        
        # Vérifier que le reset se déclenche
        should_reset = game_state.should_auto_reset()
        print(f"Reset après 35s: {should_reset} (devrait être True)")
        
        if should_reset:
            print("✓ Le système de reset automatique fonctionne en temps réel")
            game_state.reset_game()
            print(f"État après reset: {len(game_state.story)} entrées")
        else:
            print("✗ Le système de reset automatique ne fonctionne pas en temps réel")
            
    finally:
        # Restaurer le délai original
        CONFIG['AUTO_RESET_TIMEOUT'] = original_timeout
        print(f"Délai restauré à {original_timeout} secondes")

if __name__ == "__main__":
    test_quick_reset()