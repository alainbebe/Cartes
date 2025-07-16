import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional

logger = logging.getLogger(__name__)


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
        self.game_start_time: datetime = datetime.now()
        self.story_history: str = "Vous habitez un village dans les temps médiévaux, vous entendez depuis plusieurs nuits des bruits étranges comme des bêtes fouillant la terre. Une nuit, un enfant disparaît, vous trouvez un grand trou dans la cave de sa maison"

    def add_to_story_history(self, story_text: str):
        """Add a story segment to the history"""
        self.story_history += " " + story_text

    def update_player_activity(self, player_name: str, player_role: str):
        """Update player activity timestamp"""
        self.active_players[player_name] = {
            'role': player_role,
            'last_seen': datetime.now()
        }
        self.last_activity = datetime.now()

    def get_active_players(self) -> List[Dict]:
        """Get list of active players (seen within last 7 seconds)"""
        cutoff_time = datetime.now() - timedelta(seconds=5)
        active = []

        for player_name, player_info in self.active_players.items():
            if player_info['last_seen'] > cutoff_time:
                active.append({
                    'name': player_name,
                    'role': player_info['role'],
                    'last_seen': player_info['last_seen'].isoformat()
                })

        return active

    def should_auto_reset(self) -> bool:
        """Check if game should be auto-reset due to inactivity"""
        if not self.active_players:
            return False

        # Auto-reset after 10 minutes of inactivity
        inactive_time = datetime.now() - self.last_activity
        return inactive_time > timedelta(minutes=10)

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
        self.game_start_time = datetime.now()
        self.story_history = "Vous habitez un village dans les temps médiévaux, vous entendez depuis plusieurs nuits des bruits étranges comme des bêtes fouillant la terre. Une nuit, un enfant disparaît, vous trouvez un grand trou dans la cave de sa maison"

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
