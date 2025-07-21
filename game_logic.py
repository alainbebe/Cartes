import time
import logging
import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional

logger = logging.getLogger(__name__)

# Load game data
def load_card_deck() -> List[Dict]:
    """Load card deck from JSON file"""
    try:
        with open('deck.json', 'r', encoding='utf-8') as f:
            deck = json.load(f)
        logger.info(f"Loaded {len(deck)} cards from deck.json")
        return deck
    except FileNotFoundError:
        logger.error("deck.json file not found")
        return []

def load_evaluations() -> Dict:
    """Load card evaluations from JSON file"""
    try:
        with open('evaluations.json', 'r', encoding='utf-8') as f:
            evaluations = json.load(f)
        logger.info("Loaded card evaluations")
        return evaluations
    except FileNotFoundError:
        logger.error("evaluations.json file not found")
        return {}

# Load data at module level
CARD_DECK = load_card_deck()
EVALUATIONS = load_evaluations()

# Configuration des délais
CONFIG = {
    'REFRESH_INTERVAL': 0.5,  # 0.5 seconde pour les rafraîchissements
    'PLAYER_TIMEOUT': 2.0,  # 2 secondes pour les joueurs connectés
    'AUTO_RESET_TIMEOUT':
    600.0  # 10 minutes pour la réinitialisation automatique
}


class GameState:
    """Manages the global game state"""

    def __init__(self):
        self.active_players: Dict[str, Dict] = {}
        self.special_cards_played: List[Dict] = []  # Mémoriser toutes les cartes spéciales
        self._initialize_state()

    def _initialize_state(self):
        """Initialize or reset all game state variables"""
        initial_story_text = "Vous habitez un village dans les temps médiévaux, vous entendez depuis plusieurs nuits des bruits étranges comme des bêtes fouillant la terre. Une nuit, un enfant disparaît, vous trouvez un grand trou dans la cave de sa maison."
        
        self.story: List[Dict] = [{
            'player': 'Narrateur',
            'role': 'Narrateur',
            'text': initial_story_text,
            'card': None,
            'effect': None,
            'timestamp': datetime.now().isoformat()
        }]
        self.score: int = 0
        self.played_cards: Set[int] = set()
        self.game_ended: bool = False
        self.jeu_commence: bool = False
        self.score_initial: int = 0
        self.last_activity: datetime = datetime.now()
        self.last_card_played: datetime = datetime.now()
        self.game_start_time: datetime = datetime.now()
        self.total_cards_fixed: Optional[int] = None
        self.processing_player: Optional[str] = None
        self.processing_card: Optional[int] = None
        # Reset special cards list for new game
        self.special_cards_played: List[Dict] = []

    def get_story_history(self) -> str:
        """Get the complete story history by joining all story entries"""
        return " ".join(entry['text'] for entry in self.story)

    def update_card_played_timestamp(self):
        """Update the timestamp when a card is played"""
        self.last_card_played = datetime.now()
    
    def validate_card_input(self, input_str: str) -> tuple:
        """
        Valide l'entrée utilisateur et retourne (type, card_number, target_card)
        Types possibles: 'normal', 'special_100', 'special_101', 'conclusion', 'invalid'
        """
        input_str = input_str.strip()
        
        # Conclusion
        if input_str == '0':
            return ('conclusion', 0, None)
        
        # Carte normale (1-55)
        try:
            card_num = int(input_str)
            if 1 <= card_num <= 55:
                return ('normal', card_num, None)
        except ValueError:
            pass
        
        # Carte spéciale 100
        if input_str == '100':
            return ('special_100', 100, None)
        
        # Carte spéciale 101 + numéro de carte cible
        if input_str.startswith('101 '):
            parts = input_str.split()
            if len(parts) == 2:
                try:
                    target_card = int(parts[1])
                    # Vérifier que la carte cible a été jouée
                    target_played = any(entry.get('card', {}).get('numero') == str(target_card) 
                                      for entry in self.story[1:] if entry.get('card'))  # Skip narrator
                    if target_played:
                        return ('special_101', 101, target_card)
                    else:
                        return ('invalid', None, None, f'La carte {target_card} n\'a pas encore été jouée')
                except ValueError:
                    return ('invalid', None, None, 'Format invalide pour la carte 101. Utilisez: 101 [numéro_carte]')
            else:
                return ('invalid', None, None, 'Format invalide pour la carte 101. Utilisez: 101 [numéro_carte]')
        
        return ('invalid', None, None, 'Entrée invalide. Utilisez: 1-55, 100, 101 [numéro], ou 0')

    def handle_suppression_card(self, player_name: str, player_role: str, target_card_number: int) -> str:
        """Handle the special suppression card 101 - removes a previously played card"""
        logger.info(f"Suppression card played by {player_name} ({player_role}) targeting card {target_card_number}")
        
        # Mémoriser la carte spéciale jouée
        special_card_info = {
            'player': player_name,
            'role': player_role,
            'card_number': 101,
            'card_name': 'Suppression',
            'target_card': target_card_number,
            'timestamp': datetime.now().isoformat()
        }
        self.special_cards_played.append(special_card_info)
        
        # Logger dans déroulement.txt
        self.log_card_play(player_name, f"101 {target_card_number}", "spéciale")
        
        # Trouver la carte à supprimer dans l'histoire (skip narrator at index 0)
        target_entry = None
        target_index = -1
        
        for i, entry in enumerate(self.story[1:], 1):  # Start from index 1 to skip narrator
            if entry.get('card', {}).get('numero') == str(target_card_number):
                target_entry = entry
                target_index = i
                break
        
        if not target_entry:
            return f"Impossible de trouver la carte {target_card_number} dans l'histoire."
        
        # Récupérer les détails de la carte supprimée pour ajuster le score
        removed_card = target_entry['card']
        removed_effect = target_entry['effect']
        removed_player_role = target_entry['role']
        
        # Ajuster le score (inverse de l'effet de la carte supprimée)
        if removed_effect == '+':
            self.score -= 1
        elif removed_effect == '-':
            self.score += 1
        # '=' reste neutre, pas de changement de score
        
        # Supprimer la carte de played_cards si c'était une carte normale
        if 1 <= int(removed_card['numero']) <= 55:
            self.played_cards.discard(int(removed_card['numero']))
        
        # Supprimer l'entrée de l'histoire
        removed_story_text = target_entry['text']
        del self.story[target_index]
        
        # Réinterpréter les cartes après celle supprimée
        cards_to_reinterpret = []
        for i in range(target_index, len(self.story)):
            entry = self.story[i]
            if entry.get('card') and entry.get('card', {}).get('numero') not in ['100', '101']:
                cards_to_reinterpret.append((i, entry))
        
        # Réinterpréter chaque carte affectée
        for story_index, entry in cards_to_reinterpret:
            original_card = entry['card']
            original_player_role = entry['role']
            original_effect = entry['effect']
            
            # Générer une nouvelle interprétation
            story_history = self.get_story_history()
            new_prompt = get_story_prompt(
                self.story[:story_index],  # Histoire jusqu'à cette carte
                self.score,
                original_card,
                original_player_role,
                original_effect,
                story_history=story_history
            )
            
            new_story_text = call_mistral_ai(new_prompt + " (Réinterprétée après suppression)")
            
            # Mettre à jour l'entrée
            self.story[story_index]['text'] = new_story_text
            self.story[story_index]['timestamp'] = datetime.now().isoformat()
        
        # Log de l'action
        self.log_action(f"Suppression par {player_name} - Carte {target_card_number} supprimée, {len(cards_to_reinterpret)} cartes réinterprétées")
        
        return f"La carte {target_card_number} a été supprimée de l'histoire ! {len(cards_to_reinterpret)} événements ont été réinterprétés en conséquence."

    def handle_inversion_card(self, player_name: str, player_role: str) -> str:
        """Handle the special inversion card 100 - reverses story order and replays each card"""
        logger.info(f"Inversion card played by {player_name} ({player_role})")
        
        # Mémoriser la carte spéciale jouée
        special_card_info = {
            'player': player_name,
            'role': player_role,
            'card_number': 100,
            'card_name': 'Inversion',
            'timestamp': datetime.now().isoformat()
        }
        self.special_cards_played.append(special_card_info)
        
        # Logger dans déroulement.txt
        self.log_card_play(player_name, 100, "spéciale")
        
        if len(self.story) <= 1:
            return "Il n'y a pas encore assez d'histoire à inverser..."
        
        # Sauvegarder l'introduction (premier élément)
        introduction = self.story[0]
        
        # Récupérer les entrées d'histoire (sans l'introduction)
        story_entries = self.story[1:]
        
        if not story_entries:
            return "Il n'y a pas d'événements à inverser..."
        
        # Inverser l'ordre des entrées
        reversed_entries = list(reversed(story_entries))
        
        # Rejouer chaque carte dans l'ordre inversé
        new_story_entries = []
        for entry in reversed_entries:
            if entry.get('card') and entry.get('card', {}).get('numero') != '100':  # Ne pas rejouer la carte inversion
                # Récupérer les informations de la carte originale
                original_card = entry['card']
                original_player_role = entry['role']
                original_effect = entry['effect']
                
                # Générer une nouvelle interprétation de cette carte
                story_history = self.get_story_history()
                new_prompt = get_story_prompt(
                    self.story,
                    self.score,
                    original_card,
                    original_player_role,
                    original_effect,
                    story_history=story_history
                )
                
                new_story_text = call_mistral_ai(new_prompt + " (Rejouée dans l'ordre inversé)")
                
                new_entry = {
                    'player': entry['player'],
                    'role': entry['role'], 
                    'text': new_story_text,
                    'card': entry['card'],
                    'effect': entry['effect'],
                    'timestamp': datetime.now().isoformat()
                }
                new_story_entries.append(new_entry)
        
        # Reconstruire l'histoire : introduction + nouvelles entrées inversées (SANS ajouter la carte inversion)
        self.story = [introduction] + new_story_entries
        
        # NE PAS ajouter la carte inversion à played_cards ni à l'histoire
        
        # Log de l'action
        self.log_action(f"Inversion jouée par {player_name} - {len(reversed_entries)} cartes rejouées dans l'ordre inverse")
        
        return f"L'inversion temporelle a été déclenchée ! {len(reversed_entries)} événements ont été rejoués dans l'ordre inverse."

    def update_player_activity(self, player_name: str, player_role: str):
        """Update player activity timestamp"""
        self.active_players[player_name] = {
            'role': player_role,
            'last_seen': datetime.now()
        }
        self.last_activity = datetime.now()

    def get_active_players(self) -> List[Dict]:
        """Get list of active players (seen within configured timeout)"""
        cutoff_time = datetime.now() - timedelta(
            seconds=CONFIG['PLAYER_TIMEOUT'])
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
        # Ne pas reset si aucune histoire n'a été commencée (juste le narrateur initial)
        if len(self.story) <= 1:
            return False

        # Auto-reset after configured timeout since last card played
        inactive_time = datetime.now() - self.last_card_played
        should_reset = inactive_time > timedelta(
            seconds=CONFIG['AUTO_RESET_TIMEOUT'])

        if should_reset:
            logger.info(
                f"Auto-reset triggered: no cards played for {inactive_time.total_seconds():.1f}s (limit: {CONFIG['AUTO_RESET_TIMEOUT']}s)"
            )

        return should_reset

    def reset_game(self):
        """Reset the game to initial state"""
        # Preserve active players and reinitialize everything else
        self._initialize_state()
        # Set score based on active players after reset
        self.score = max(2, len(self.get_active_players()) * 2)  # 2 points per active player, minimum 2

    def get_total_cards(self, base_cards: int) -> int:
        """Get total cards to play - fixed once game starts"""
        if self.total_cards_fixed is None and len(self.played_cards) == 0:
            # Recalculate while no cards have been played
            return base_cards + len(self.get_active_players())
        elif self.total_cards_fixed is None:
            # Fix the total cards when first card is played
            self.total_cards_fixed = base_cards + len(
                self.get_active_players())
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
    
    def log_card_play(self, player_name: str, card_info, card_type: str = "normale"):
        """Log card play to déroulement.txt with player and card details"""
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # card_info peut être un int ou une string (pour "101 12" par exemple)
            if isinstance(card_info, int):
                card_number = card_info
                card_details = next((c for c in CARD_DECK if int(c['numero']) == card_number), None)
                card_name = card_details['mot'] if card_details else f"Carte{card_number}"
                log_entry = f"[{timestamp}] {player_name} a joué la carte {card_number} ({card_name}) - Type: {card_type}\n"
            else:
                # Pour les cartes comme "101 12"
                log_entry = f"[{timestamp}] {player_name} a joué la carte {card_info} - Type: {card_type}\n"
            
            with open('déroulement.txt', 'a', encoding='utf-8') as f:
                f.write(log_entry)
        except Exception as e:
            logger.error(f"Error logging card play: {e}")


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


def call_mistral_ai(prompt: str) -> str:
    """Call Mistral AI API to generate text"""
    import os
    
    MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')
    MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
    
    if not MISTRAL_API_KEY:
        logger.warning("MISTRAL_API_KEY not found")
        return "La clé API Mistral n'est pas configurée..."

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "mistral-large-latest",
        "messages": [{
            "role": "user",
            "content": prompt
        }],
        "temperature": 0.7
    }

    try:
        response = requests.post(
            MISTRAL_API_URL,
            headers=headers,
            json=data,
        )
        response.raise_for_status()
        result = response.json()

        if 'choices' in result and len(result['choices']) > 0:
            return result['choices'][0]['message']['content'].strip()
        else:
            logger.error("Unexpected response format from Mistral API")
            return "L'histoire continue mystérieusement..."

    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling Mistral API: {e}")
        return "L'histoire continue dans l'ombre..."


def generate_game_conclusion(score_final: int, score_initial: int, story_history: str) -> str:
    """Generate game conclusion based on score comparison"""
    if score_final >= score_initial:
        # Victory
        prompt = f"""
[HISTOIRE]: {story_history}

[RESULTAT]: VICTOIRE - Score final ({score_final}) >= Score initial ({score_initial})

Génère une conclusion positive et victorieuse pour cette aventure médiévale fantastique. 
Le groupe a réussi à surmonter les épreuves et a terminé avec un score égal ou supérieur au début.
Conclusion en 30-40 mots maximum, ton dramatique et épique.
"""
    else:
        # Defeat
        prompt = f"""
[HISTOIRE]: {story_history}

[RESULTAT]: DÉFAITE - Score final ({score_final}) < Score initial ({score_initial})

Génère une conclusion tragique et sombre pour cette aventure médiévale fantastique. 
Le groupe a échoué dans sa quête et a terminé avec un score inférieur au début.
Conclusion en 30-40 mots maximum, ton dramatique et mélancolique.
"""

    return call_mistral_ai(prompt)
