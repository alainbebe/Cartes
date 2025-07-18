#!/usr/bin/env python3
"""
Test script pour vérifier le reset automatique après 10 minutes
"""

import time
from datetime import datetime, timedelta
from game_logic import GameState, CONFIG

def test_auto_reset():
    """Test le système de reset automatique"""
    print("Test du système de reset automatique...")
    print(f"Délai configuré: {CONFIG['AUTO_RESET_TIMEOUT']} secondes ({CONFIG['AUTO_RESET_TIMEOUT']/60:.1f} minutes)")
    
    # Créer une nouvelle instance de jeu
    game_state = GameState()
    
    # Simuler une partie commencée
    game_state.story = [{"text": "Test story", "player": "TestPlayer"}]
    game_state.update_player_activity("TestPlayer", "Soldat")
    
    print(f"Histoire créée: {len(game_state.story)} entrées")
    print(f"Joueurs actifs: {len(game_state.get_active_players())}")
    print(f"Dernière activité: {game_state.last_activity}")
    
    # Vérifier que le reset ne se déclenche pas immédiatement
    should_reset = game_state.should_auto_reset()
    print(f"Reset immédiat: {should_reset} (devrait être False)")
    
    # Simuler l'inactivité en modifiant manuellement le timestamp
    # Pour le test, on utilise 11 minutes sans cartes jouées
    test_inactive_time = timedelta(minutes=11)
    game_state.last_card_played = datetime.now() - test_inactive_time
    
    print(f"Simulation d'inactivité: {test_inactive_time}")
    print(f"Joueurs actifs après inactivité: {len(game_state.get_active_players())}")
    
    # Vérifier que le reset se déclenche maintenant
    should_reset = game_state.should_auto_reset()
    print(f"Reset après inactivité: {should_reset} (devrait être True)")
    
    if should_reset:
        print("✓ Le système de reset automatique fonctionne correctement")
        game_state.reset_game()
        print(f"État après reset: {len(game_state.story)} entrées dans l'histoire")
    else:
        print("✗ Le système de reset automatique ne fonctionne pas")
    
    return should_reset

if __name__ == "__main__":
    test_auto_reset()