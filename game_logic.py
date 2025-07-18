import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional

logger = logging.getLogger(__name__)

# Configuration des délais
CONFIG = {
    'REFRESH_INTERVAL': 0.5,          # 0.5 seconde pour les rafraîchissements
    'PLAYER_TIMEOUT': 2.0,            # 2 secondes pour les joueurs connectés
    'AUTO_RESET_TIMEOUT': 600.0       # 10 minutes pour la réinitialisation automatique
}


class GameState:
    """Manages the global game state"""

    def __init__(self):
        self.story: List[Dict] = []
        self.score: int = 0
        self.played_cards: Set[int] = set()
        self.active_players: Dict[str, Dict] = {}
        self.game_ended: bool = False
        self.jeu_commence: bool = False
        self.score_initial: int = 0
        self.last_activity: datetime = datetime.now()
        self.last_card_played: datetime = datetime.now()
        self.game_start_time: datetime = datetime.now()
        self.story_history: str = "Vous habitez un village dans les temps médiévaux, vous entendez depuis plusieurs nuits des bruits étranges comme des bêtes fouillant la terre. Une nuit, un enfant disparaît, vous trouvez un grand trou dans la cave de sa maison"
        self.total_cards_fixed: Optional[int] = None
        self.processing_player: Optional[str] = None
        self.processing_card: Optional[int] = None

    def add_to_story_history(self, story_text: str):
        """Add a story segment to the history"""
        self.story_history += " " + story_text

    def update_card_played_timestamp(self):
        """Update the timestamp when a card is played"""
        self.last_card_played = datetime.now()

    def update_player_activity(self, player_name: str, player_role: str):
        """Update player activity timestamp"""
        self.active_players[player_name] = {
            'role': player_role,
            'last_seen': datetime.now()
        }
        self.last_activity = datetime.now()

    def get_active_players(self) -> List[Dict]:
        """Get list of active players (seen within configured timeout)"""
        cutoff_time = datetime.now() - timedelta(seconds=CONFIG['PLAYER_TIMEOUT'])
        active = []

        # Create a copy of the keys to avoid modifying dict during iteration
        player_names = list(self.active_players.keys())
        
        for player_name in player_names:
            player_info = self.active_players[player_name]
            if player_info['last_seen'] > cutoff_time:
                active.append({
                    'name': player_name,
                    'role': player_info['role'],
                    'last_seen': player_info['last_seen'].isoformat()
                })
            else:
                # Remove inactive players from the stored list
                del self.active_players[player_name]

        return active

    def should_auto_reset(self) -> bool:
        """Check if game should be auto-reset due to inactivity (no cards played for 10 minutes)"""
        # Ne pas reset si aucune histoire n'a été commencée
        if len(self.story) == 0:
            return False

        # Auto-reset after configured timeout since last card played
        inactive_time = datetime.now() - self.last_card_played
        should_reset = inactive_time > timedelta(seconds=CONFIG['AUTO_RESET_TIMEOUT'])
        
        if should_reset:
            logger.info(f"Auto-reset triggered: no cards played for {inactive_time.total_seconds():.1f}s (limit: {CONFIG['AUTO_RESET_TIMEOUT']}s)")
        
        return should_reset

    def reset_game(self):
        """Reset the game to initial state"""
        self.story = []
        self.score = max(2,
                         len(self.get_active_players()) *
                         2)  # 2 points per active player, minimum 2
        self.played_cards = set()
        self.game_ended = False
        self.jeu_commence = False
        self.score_initial = 0
        self.last_activity = datetime.now()
        self.last_card_played = datetime.now()
        self.game_start_time = datetime.now()
        self.story_history = "Vous habitez un village dans les temps médiévaux, vous entendez depuis plusieurs nuits des bruits étranges comme des bêtes fouillant la terre. Une nuit, un enfant disparaît, vous trouvez un grand trou dans la cave de sa maison"
        self.total_cards_fixed = None
        self.processing_player = None
        self.processing_card = None

    def get_total_cards(self, base_cards: int) -> int:
        """Get total cards to play - fixed once game starts"""
        if self.total_cards_fixed is None and len(self.played_cards) == 0:
            # Recalculate while no cards have been played
            return base_cards + len(self.get_active_players())
        elif self.total_cards_fixed is None:
            # Fix the total cards when first card is played
            self.total_cards_fixed = base_cards + len(self.get_active_players())
        return self.total_cards_fixed

    def log_action(self, action: str):
        """Log game action to file"""
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_entry = f"[{timestamp}] {action}\n"

            with open('game_log.txt', 'a', encoding='utf-8') as f:
                f.write(log_entry)
        except Exception as e:
            logger.error(f"Error logging action: {e}")


def evaluate_card_effect(card_number: int, player_role: str,
                         evaluations: Dict) -> str:
    """Evaluate the effect of a card for a given player role"""
    try:
        card_str = str(card_number)
        if player_role in evaluations and card_str in evaluations[player_role]:
            return evaluations[player_role][card_str]
        return "="  # Neutral effect if not found
    except Exception as e:
        logger.error(f"Error evaluating card effect: {e}")
        return "="


def get_story_prompt(story: List[Dict],
                     score: int,
                     card: Optional[Dict] = None,
                     player_role: Optional[str] = None,
                     effect: Optional[str] = None,
                     is_conclusion: bool = False,
                     story_history: str = "") -> str:
    """Generate a prompt for the AI story generation"""

    if is_conclusion:
        histoire_str = story_history if story_history else " ".join(
            [entry['text'] for entry in story[-3:]])
        if score > 5:
            return f"Histoire: {histoire_str}. Écris une conclusion positive et épique en 30 mots maximum dans un style médiéval-fantastique."
        else:
            return f"Histoire: {histoire_str}. Écris une conclusion tragique et dramatique en 30 mots maximum dans un style médiéval-fantastique."

    if not card:
        return "Raconte une histoire médiéval-fantastique en 20 mots maximum."

    # Use the complete story history
    histoire_str = story_history if story_history else " ".join(
        [entry['text'] for entry in story])

    # Convert effect to note format
    if effect == "+":
        note = "positif"
    elif effect == "-":
        note = "négatif"
    else:
        note = "neutre"

    # Build the new prompt format
    prompt = f"""Tu es un narrateur qui raconte une histoire dans un univers médiéval-fantastique.

Contexte actuel :
[HISTOIRE]
{histoire_str}
[/HISTOIRE]

Nouveau rôle :
[ROLE]
{player_role}
[/ROLE]

Carte jouée :
[CLEF]
{card['descriptif']} (effet {note})
[/CLEF]

Consigne :
Fais avancer l'histoire de manière subtile en incorporant la carte comme un élément narratif. Ne cite jamais le mot "carte" ni le nom de la carte directement. Garde le mystère. Marque bien l'effet. La sortie doit faire 20-25 mots."""

    return prompt
