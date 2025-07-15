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
        self.last_activity: datetime = datetime.now()
        self.game_start_time: datetime = datetime.now()
        
    def update_player_activity(self, player_name: str, player_role: str):
        """Update player activity timestamp"""
        self.active_players[player_name] = {
            'role': player_role,
            'last_seen': datetime.now()
        }
        self.last_activity = datetime.now()
        
    def get_active_players(self) -> List[Dict]:
        """Get list of active players (seen within last 30 seconds)"""
        cutoff_time = datetime.now() - timedelta(seconds=30)
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
        self.score = max(2, len(self.get_active_players()) * 2)  # 2 points per active player, minimum 2
        self.played_cards = set()
        self.game_ended = False
        self.last_activity = datetime.now()
        self.game_start_time = datetime.now()
        
    def log_action(self, action: str):
        """Log game action to file"""
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_entry = f"[{timestamp}] {action}\n"
            
            with open('game_log.txt', 'a', encoding='utf-8') as f:
                f.write(log_entry)
        except Exception as e:
            logger.error(f"Error logging action: {e}")

def evaluate_card_effect(card_number: int, player_role: str, evaluations: Dict) -> str:
    """Evaluate the effect of a card for a given player role"""
    try:
        card_str = str(card_number)
        if player_role in evaluations and card_str in evaluations[player_role]:
            return evaluations[player_role][card_str]
        return "="  # Neutral effect if not found
    except Exception as e:
        logger.error(f"Error evaluating card effect: {e}")
        return "="

def get_story_prompt(story: List[Dict], score: int, card: Optional[Dict] = None, 
                    player_role: Optional[str] = None, effect: Optional[str] = None, 
                    is_conclusion: bool = False) -> str:
    """Generate a prompt for the AI story generation"""
    
    if is_conclusion:
        story_context = " ".join([entry['text'] for entry in story[-3:]])  # Last 3 entries
        if score > 5:
            return f"Histoire: {story_context}. Écris une conclusion positive et épique en 30 mots maximum dans un style médiéval-fantastique."
        else:
            return f"Histoire: {story_context}. Écris une conclusion tragique et dramatique en 30 mots maximum dans un style médiéval-fantastique."
    
    if not card:
        return "Raconte une histoire médiéval-fantastique en 20 mots maximum."
    
    # Build context from recent story
    context = ""
    if story:
        recent_entries = story[-2:]  # Last 2 entries for context
        context = " ".join([entry['text'] for entry in recent_entries])
    
    # Create effect description
    effect_desc = ""
    if effect == "+":
        effect_desc = "de manière positive et héroïque"
    elif effect == "-":
        effect_desc = "de manière négative et dramatique"
    else:
        effect_desc = "de manière neutre"
    
    # Role-based narrative style
    role_styles = {
        "Soldat": "avec courage et bravoure",
        "Moine": "avec sagesse et spiritualité",
        "Sorcière": "avec magie et mystère",
        "Forgeron": "avec force et habileté"
    }
    
    role_style = role_styles.get(player_role, "")
    
    prompt = f"""Contexte: {context}
    
Continue cette histoire médiéval-fantastique en intégrant l'élément "{card['mot']}" ({card['phrase']}) {effect_desc} {role_style}.
Réponds en exactement 20-25 mots maximum dans un style narratif fluide."""
    
    return prompt
