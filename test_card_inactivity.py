#!/usr/bin/env python3
"""
Test du reset automatique basé sur l'inactivité des cartes
"""

import time
from datetime import datetime, timedelta
from game_logic import GameState, CONFIG

def test_card_inactivity_reset():
    """Test avec la nouvelle définition d'inactivité (pas de cartes jouées)"""
    print("Test du reset automatique basé sur l'inactivité des cartes...")
    print(f"Délai configuré: {CONFIG['AUTO_RESET_TIMEOUT']} secondes ({CONFIG['AUTO_RESET_TIMEOUT']/60:.1f} minutes)")
    
    # Créer une nouvelle instance de jeu
    game_state = GameState()
    
    # Simuler une partie commencée avec des cartes jouées
    game_state.story = [{"text": "Première carte", "player": "Joueur1"}]
    game_state.update_player_activity("Joueur1", "Soldat")
    game_state.update_player_activity("Joueur2", "Moine")
    
    print(f"État initial: {len(game_state.story)} entrées, {len(game_state.get_active_players())} joueurs actifs")
    
    # Vérifier que le reset ne se déclenche pas immédiatement
    should_reset = game_state.should_auto_reset()
    print(f"Reset immédiat: {should_reset} (devrait être False)")
    
    # Simuler que les joueurs sont toujours connectés mais n'ont pas joué de carte
    # depuis 11 minutes
    test_inactive_time = timedelta(minutes=11)
    game_state.last_card_played = datetime.now() - test_inactive_time
    
    # Les joueurs sont toujours actifs (connectés)
    print(f"Joueurs toujours connectés: {len(game_state.get_active_players())}")
    print(f"Pas de carte jouée depuis: {test_inactive_time}")
    
    # Vérifier que le reset se déclenche maintenant
    should_reset = game_state.should_auto_reset()
    print(f"Reset après inactivité de cartes: {should_reset} (devrait être True)")
    
    if should_reset:
        print("✓ Le système de reset automatique fonctionne correctement")
        print("  - Les joueurs peuvent rester connectés")
        print("  - Le reset se base uniquement sur l'absence de cartes jouées")
        game_state.reset_game()
        print(f"État après reset: {len(game_state.story)} entrées dans l'histoire")
    else:
        print("✗ Le système de reset automatique ne fonctionne pas")
        print("  - Problème avec la détection d'inactivité des cartes")
    
    return should_reset

if __name__ == "__main__":
    test_card_inactivity_reset()