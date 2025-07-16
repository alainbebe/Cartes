import os
import json
import logging
import time
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, send_from_directory
from dotenv import load_dotenv
import requests
from game_logic import GameState, evaluate_card_effect, get_story_prompt

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET",
                                "default-secret-key-for-development")

# Global game state
game_state = GameState()
# Log initial action - Game start
logger.info("Début de la partie")
game_state.log_action("Début")

# Load card deck
try:
    with open('deck.json', 'r', encoding='utf-8') as f:
        CARD_DECK = json.load(f)
    logger.info(f"Loaded {len(CARD_DECK)} cards from deck.json")
except FileNotFoundError:
    logger.error("deck.json file not found")
    CARD_DECK = []

# Load evaluations
try:
    with open('evaluations.json', 'r', encoding='utf-8') as f:
        EVALUATIONS = json.load(f)
    logger.info("Loaded card evaluations")
except FileNotFoundError:
    logger.error("evaluations.json file not found")
    EVALUATIONS = {}

# Mistral AI configuration
MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"


def call_mistral_ai(prompt, max_tokens=50):
    """Call Mistral AI API to generate story text"""
    if not MISTRAL_API_KEY:
        logger.warning("No Mistral API key found, returning placeholder text")
        return "L'histoire continue avec des événements mystérieux..."

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {MISTRAL_API_KEY}"
    }

    data = {
        "model": "mistral-large-latest",
        "messages": [{
            "role": "user",
            "content": prompt
        }],
        #"max_tokens": max_tokens,
        #"temperature": 0.7
    }

    try:
        response = requests.post(MISTRAL_API_URL,
                                 headers=headers,
                                 json=data,
                                 timeout=10)
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


@app.route('/')
def index():
    """Main game page"""
    return render_template('index.html')


@app.route('/envoyer', methods=['POST'])
def envoyer():
    """Handle card play or message from player"""
    try:
        data = request.get_json()
        player_name = data.get('player_name', '').strip()
        player_role = data.get('player_role', '').strip()
        prompt = data.get('prompt', '').strip()

        if not player_name or not player_role:
            return jsonify({'error': 'Nom et rôle requis'}), 400

        # Update player activity
        game_state.update_player_activity(player_name, player_role)

        # Handle conclusion request
        if prompt == '0':
            if len(game_state.story) > 0:
                conclusion_prompt = get_story_prompt(
                    game_state.story,
                    game_state.score,
                    is_conclusion=True,
                    story_history=game_state.story_history)
                conclusion = call_mistral_ai(conclusion_prompt, max_tokens=100)
                game_state.story.append({
                    'player': 'Narrateur',
                    'role': 'Narrateur',
                    'text': conclusion,
                    'timestamp': datetime.now().isoformat()
                })
                game_state.game_ended = True
                game_state.log_action(f"Conclusion demandée par {player_name}")
            return jsonify({'success': True, 'message': 'Conclusion générée'})

        # Handle card play
        try:
            card_number = int(prompt)
        except ValueError:
            return jsonify({'error': 'Numéro de carte invalide'}), 400

        # Find card in deck
        card = next((c for c in CARD_DECK if int(c['numero']) == card_number),
                    None)
        if not card:
            return jsonify({'error': 'Carte non trouvée'}), 404

        # Check if card already played
        if card_number in game_state.played_cards:
            return jsonify({'error': 'Carte déjà jouée'}), 400

        # Evaluate card effect
        effect = evaluate_card_effect(card_number, player_role, EVALUATIONS)

        # Generate story text
        story_prompt = get_story_prompt(game_state.story,
                                        game_state.score,
                                        card,
                                        player_role,
                                        effect,
                                        story_history=game_state.story_history)
        story_text = call_mistral_ai(story_prompt, max_tokens=30)

        # Update game state
        game_state.played_cards.add(card_number)

        # Mark game as started on first card
        if not game_state.jeu_commence:
            game_state.jeu_commence = True
            game_state.log_action("Jeu commencé - Première carte jouée")

        game_state.story.append({
            'player': player_name,
            'role': player_role,
            'text': story_text,
            'card': card,
            'effect': effect,
            'timestamp': datetime.now().isoformat()
        })

        # Add to story history
        game_state.add_to_story_history(story_text)

        # Update score
        if effect == '+':
            game_state.score += 1
        elif effect == '-':
            game_state.score -= 1

        # Check game end conditions
        if game_state.score <= 0:
            game_state.game_ended = True
            game_state.log_action(f"Jeu terminé - Score atteint 0")
        elif len(game_state.played_cards) >= len(CARD_DECK):
            game_state.game_ended = True
            game_state.log_action(f"Jeu terminé - Toutes les cartes jouées")

        game_state.log_action(
            f"{player_name} ({player_role}) a joué la carte {card_number} - {card['mot']}"
        )

        return jsonify({
            'success': True,
            'message': 'Carte jouée avec succès',
            'story_text': story_text,
            'effect': effect
        })

    except Exception as e:
        logger.error(f"Error in envoyer: {e}")
        return jsonify({'error': 'Erreur interne du serveur'}), 500


@app.route('/refresh', methods=['POST'])
def refresh():
    """Get current game state and update player activity"""
    try:
        data = request.get_json() or {}
        player_name = data.get('player_name', '').strip()
        player_role = data.get('player_role', '').strip()

        if player_name and player_role:
            game_state.update_player_activity(player_name, player_role)

        # Update score based on active players if game hasn't started
        if not game_state.jeu_commence:
            active_players = game_state.get_active_players()
            new_score = max(2,
                            len(active_players) *
                            2)  # 2 points per active player, minimum 2
            if new_score != game_state.score:
                game_state.score = new_score
                game_state.log_action(
                    f"Score ajusté à {new_score} pour {len(active_players)} joueurs actifs"
                )

        # Check for auto-reset
        if game_state.should_auto_reset():
            game_state.reset_game()
            game_state.log_action(
                "Jeu réinitialisé automatiquement après inactivité")

        return jsonify({
            'story': game_state.story,
            'score': game_state.score,
            'played_cards': list(game_state.played_cards),
            'active_players': game_state.get_active_players(),
            'game_ended': game_state.game_ended,
            'total_cards': len(CARD_DECK)
        })

    except Exception as e:
        logger.error(f"Error in refresh: {e}")
        return jsonify({'error': 'Erreur lors du rafraîchissement'}), 500


@app.route('/reset', methods=['POST'])
def reset():
    """Reset the game"""
    try:
        game_state.reset_game()
        game_state.log_action("Jeu réinitialisé manuellement")
        return jsonify({'success': True, 'message': 'Jeu réinitialisé'})
    except Exception as e:
        logger.error(f"Error in reset: {e}")
        return jsonify({'error': 'Erreur lors de la réinitialisation'}), 500


@app.route('/sauver', methods=['POST'])
def sauver():
    """Save the current game state"""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"histoire_{timestamp}.json"

        save_data = {
            'timestamp': timestamp,
            'story': game_state.story,
            'score': game_state.score,
            'played_cards': list(game_state.played_cards),
            'game_ended': game_state.game_ended
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)

        game_state.log_action(f"Jeu sauvegardé dans {filename}")
        return jsonify({'success': True, 'filename': filename})

    except Exception as e:
        logger.error(f"Error in sauver: {e}")
        return jsonify({'error': 'Erreur lors de la sauvegarde'}), 500


@app.route('/download/<filename>')
def download(filename):
    """Download a saved game file"""
    try:
        return send_from_directory('.', filename, as_attachment=True)
    except Exception as e:
        logger.error(f"Error downloading file {filename}: {e}")
        return jsonify({'error': 'Fichier non trouvé'}), 404


@app.route('/download-game')
def download_game():
    """Download the complete game archive"""
    try:
        return send_from_directory('.',
                                   'chroniques_medievales_complete.tar.gz',
                                   as_attachment=True)
    except Exception as e:
        logger.error(f"Error downloading game archive: {e}")
        return jsonify({'error': 'Archive non trouvée'}), 404


@app.route('/cards')
def cards():
    """Get available cards"""
    try:
        available_cards = [
            card for card in CARD_DECK
            if int(card['numero']) not in game_state.played_cards
        ]
        return jsonify(available_cards)
    except Exception as e:
        logger.error(f"Error getting cards: {e}")
        return jsonify({'error':
                        'Erreur lors de la récupération des cartes'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
