import os
import json
import logging
import time
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, send_from_directory
from dotenv import load_dotenv
import requests
from game_logic import GameState, evaluate_card_effect, get_story_prompt, call_mistral_ai, generate_game_conclusion, generate_image_prompt, generate_card_image_with_replicate, CARD_DECK, EVALUATIONS, ROLES

# Load environment variables
load_dotenv()

# Game configuration
BASE_CARDS_TO_PLAY = 4  # Base number of cards + number of players

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

        # Set processing state
        game_state.processing_player = player_name
        # For processing card, use the original prompt for display purposes
        if prompt == '0':
            game_state.processing_card = 0
        elif prompt == '100':
            game_state.processing_card = 100
        elif prompt.startswith('101 '):
            game_state.processing_card = prompt  # Store full string for special card 101
        else:
            try:
                game_state.processing_card = int(prompt)
            except ValueError:
                game_state.processing_card = prompt  # Fallback to string

        # Handle conclusion request
        if prompt == '0':
            if len(game_state.story) > 0:
                # Generate conclusion based on score comparison
                conclusion_text = generate_game_conclusion(
                    game_state.score, game_state.score_initial,
                    game_state.get_story_history())
                game_state.story.append({
                    'player': 'Narrateur',
                    'role': 'Narrateur',
                    'text': conclusion_text,
                    'card': None,
                    'effect': None,
                    'timestamp': datetime.now().isoformat()
                })
                game_state.game_ended = True
                game_state.update_card_played_timestamp(
                )  # Update timestamp for conclusion
                game_state.log_action(f"Conclusion demandée par {player_name}")

            # Clear processing state
            game_state.processing_player = None
            game_state.processing_card = None
            return jsonify({'success': True, 'message': 'Conclusion générée'})

        # Validate card input using new validation system
        validation_result = game_state.validate_card_input(prompt)
        card_type = validation_result[0]

        if card_type == 'invalid':
            # Clear processing state on error
            game_state.processing_player = None
            game_state.processing_card = None
            error_msg = validation_result[3] if len(
                validation_result) > 3 else 'Entrée invalide'
            return jsonify({'error': error_msg}), 400

        card_number = validation_result[1]
        target_card = validation_result[2] if len(
            validation_result) > 2 else None

        # Handle special cards
        if card_type == 'special_100':
            # Vérifier si la carte spéciale a déjà été jouée par ce joueur
            already_played = any(
                sc['player'] == player_name and sc['card_number'] == 100
                for sc in game_state.special_cards_played)
            if already_played:
                # Clear processing state on error
                game_state.processing_player = None
                game_state.processing_card = None
                return jsonify(
                    {'error': 'Vous avez déjà joué la carte Inversion'}), 400

            # Execute inversion logic
            inversion_result = game_state.handle_inversion_card(
                player_name, player_role)
            game_state.update_card_played_timestamp()

            # Clear processing state
            game_state.processing_player = None
            game_state.processing_card = None

            return jsonify({
                'success': True,
                'message': inversion_result,
                'special_card': True,
                'inversion': True
            })

        elif card_type == 'special_101':
            # Vérifier si la carte spéciale a déjà été jouée par ce joueur
            already_played = any(
                sc['player'] == player_name and sc['card_number'] == 101
                for sc in game_state.special_cards_played)
            if already_played:
                # Clear processing state on error
                game_state.processing_player = None
                game_state.processing_card = None
                return jsonify(
                    {'error': 'Vous avez déjà joué la carte Suppression'}), 400

            # Execute suppression logic
            if target_card is not None:
                suppression_result = game_state.handle_suppression_card(
                    player_name, player_role, target_card)
            else:
                return jsonify({'error':
                                'Numéro de carte cible manquant'}), 400
            game_state.update_card_played_timestamp()

            # Clear processing state
            game_state.processing_player = None
            game_state.processing_card = None

            return jsonify({
                'success': True,
                'message': suppression_result,
                'special_card': True,
                'suppression': True
            })

        # Find card in deck
        card = next((c for c in CARD_DECK if int(c['numero']) == card_number),
                    None)
        if not card:
            # Clear processing state on error
            game_state.processing_player = None
            game_state.processing_card = None
            return jsonify({'error': 'Carte non trouvée'}), 404

        # Check if card already played
        if card_number in game_state.played_cards:
            # Clear processing state on error
            game_state.processing_player = None
            game_state.processing_card = None
            return jsonify({'error': 'Carte déjà jouée'}), 400

        # Evaluate card effect
        effect = evaluate_card_effect(card_number, player_role, EVALUATIONS)

        # Generate story text
        story_prompt = get_story_prompt(
            game_state.story,
            game_state.score,
            card,
            player_role,
            effect,
            story_history=game_state.get_story_history())
        story_text = call_mistral_ai(story_prompt)

        # Initialize image_result
        image_result = None
        
        # TEMPORARILY DISABLED: Generate image prompt using Mistral AI and log it, then generate actual image
        # Disabled due to Replicate API causing server crashes
        logger.info(f"Image generation temporarily disabled for card {card_number}")
        
        # Generate image prompt using Mistral AI and log it (keep prompt generation working)
        try:
            story_history = game_state.get_story_history()
            image_prompt = generate_image_prompt(story_history, story_text)

            # Log the image prompt to a separate file for later use
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with open('image_prompts.txt', 'a', encoding='utf-8') as f:
                f.write(
                    f"[{timestamp}] {player_name} - Carte {card_number}: {image_prompt}\n\n"
                )

            logger.info(
                f"Image prompt generated and logged for card {card_number}")

            # DISABLED: Generate actual image using Replicate API
            # try:
            #     card_name = card.get('mot', '') if card else ''
            #     image_result = generate_card_image_with_replicate(
            #         image_prompt, player_name, card_number, card_name)
            #     if image_result.get("success"):
            #         logger.info(
            #             f"Actual image generated successfully for card {card_number}"
            #         )
            #     else:
            #         logger.warning(
            #             f"Image generation failed for card {card_number}: {image_result.get('error')}"
            #         )
            # except Exception as img_error:
            #     logger.error(
            #         f"Error generating actual image for card {card_number}: {img_error}"
            #     )

        except Exception as e:
            logger.error(f"Error generating image prompt: {e}")

        # Update game state
        game_state.played_cards.add(card_number)
        game_state.update_card_played_timestamp()

        # Logger la carte normale dans déroulement.txt
        game_state.log_card_play(player_name, card_number, "normale")

        # Mark game as started on first card
        if not game_state.jeu_commence:
            game_state.jeu_commence = True
            game_state.score_initial = game_state.score
            game_state.log_action(
                f"Jeu commencé - Première carte jouée - Score initial: {game_state.score_initial}"
            )

        # Create story entry with image information
        story_entry = {
            'player': player_name,
            'role': player_role,
            'text': story_text,
            'card': card,
            'effect': effect,
            'timestamp': datetime.now().isoformat(),
            'image_path': None  # Will be updated if image generation succeeds
        }

        # If image generation was successful, add image information
        if image_result and 'success' in image_result and image_result['success']:
            images = image_result.get('images', [])
            if images:
                # Extract just the filename from the full path
                full_filename = images[0].get('filename', '')
                if full_filename.startswith('result/'):
                    story_entry['image_path'] = full_filename[7:]  # Remove 'result/' prefix
                else:
                    story_entry['image_path'] = full_filename

        game_state.story.append(story_entry)

        # Story history is now automatically built from game_state.story

        # Update score
        if effect == '+':
            game_state.score += 1
        elif effect == '-':
            game_state.score -= 1

        # Check game end conditions
        if len(game_state.played_cards) >= game_state.get_total_cards(
                BASE_CARDS_TO_PLAY):
            game_state.game_ended = True
            game_state.log_action(f"Jeu terminé - Toutes les cartes jouées")
            # Generate conclusion
            conclusion_text = generate_game_conclusion(
                game_state.score, game_state.score_initial,
                game_state.get_story_history())
            game_state.story.append({
                'player': 'Narrateur',
                'role': 'Narrateur',
                'text': conclusion_text,
                'card': None,
                'effect': None,
                'timestamp': datetime.now().isoformat()
            })
        # Note: Score reaching 0 no longer auto-ends the game

        game_state.log_action(
            f"{player_name} ({player_role}) a joué la carte {card_number} - {card['mot']}"
        )

        # Clear processing state
        game_state.processing_player = None
        game_state.processing_card = None

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
            # Only update score if there are active players
            if active_players:
                new_score = max(2,
                                len(active_players) *
                                2)  # 2 points per active player, minimum 2
                if new_score != game_state.score:
                    game_state.score = new_score
                    game_state.log_action(
                        f"Score ajusté à {new_score} pour {len(active_players)} joueurs actifs"
                    )

        # Check for auto-reset (only if there is content and no active players)
        if game_state.should_auto_reset():
            logger.info("Auto-reset triggered due to inactivity")
            game_state.reset_game()
            game_state.log_action(
                "Jeu réinitialisé automatiquement après inactivité")
        else:
            # Log debug info about auto-reset conditions
            from game_logic import CONFIG
            inactive_time = datetime.now() - game_state.last_card_played
            #logger.debug(f"Auto-reset check: story_count={len(game_state.story)}, "
            #           f"cards_inactive_time={inactive_time.total_seconds():.1f}s/"
            #           f"{CONFIG['AUTO_RESET_TIMEOUT']}s")

        return jsonify({
            'story':
            game_state.story,
            'score':
            game_state.score,
            'played_cards':
            list(game_state.played_cards),
            'active_players':
            game_state.get_active_players(),
            'game_ended':
            game_state.game_ended,
            'total_cards':
            game_state.get_total_cards(BASE_CARDS_TO_PLAY),
            'processing_player':
            game_state.processing_player,
            'processing_card':
            game_state.processing_card,
            'special_cards_played':
            game_state.special_cards_played
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


@app.route('/api/deck')
def api_deck():
    """API endpoint pour récupérer les données du deck"""
    try:
        return jsonify(CARD_DECK)
    except Exception as e:
        logger.error(f"Erreur lors du chargement du deck: {e}")
        return jsonify({"error": "Impossible de charger les données du deck"}), 500

@app.route('/api/roles')
def api_roles():
    """API endpoint pour récupérer les données des rôles"""
    try:
        return jsonify(ROLES)
    except Exception as e:
        logger.error(f"Erreur lors du chargement des rôles: {e}")
        return jsonify({"error": "Impossible de charger les données des rôles"}), 500

@app.route('/debug/env')
def debug_env():
    """Debug endpoint for environment variables"""
    try:
        mistral_key = os.environ.get('MISTRAL_API_KEY')
        replicate_key = os.environ.get('REPLICATE_API_TOKEN')
        
        return jsonify({
            'mistral_api_key': 'Present (' + str(len(mistral_key)) + ' chars)' if mistral_key else 'MISSING',
            'replicate_api_token': 'Present (' + str(len(replicate_key)) + ' chars)' if replicate_key else 'MISSING',
            'game_players': len(game_state.active_players),
            'cards_played': len(game_state.played_cards),
            'current_score': game_state.score
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/debug')
def debug_page():
    """Debug page for testing image display"""
    return send_from_directory('.', 'debug_images.html')


@app.route('/debug/images')
def debug_images():
    """Debug endpoint to check available images and story data"""
    import os
    try:
        debug_info = {
            'available_images': [],
            'story_entries_with_images': [],
            'result_directory_exists': os.path.exists('result'),
            'total_story_entries': len(game_state.story)
        }
        
        # List available images
        if os.path.exists('result'):
            images = [f for f in os.listdir('result') if f.endswith(('.jpg', '.jpeg', '.png'))]
            debug_info['available_images'] = images[-5:]  # Last 5 images
        
        # Check story entries with images
        for i, entry in enumerate(game_state.story):
            if entry.get('image_path'):
                debug_info['story_entries_with_images'].append({
                    'index': i,
                    'player': entry.get('player'),
                    'image_path': entry.get('image_path'),
                    'text_preview': entry.get('text', '')[:50] + '...'
                })
        
        return jsonify(debug_info)
    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/result/<filename>')
def serve_result_file(filename):
    """Serve generated images from the result directory"""
    try:
        import os
        from flask import Response
        
        # Security check: only allow image files
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
            return jsonify({'error': 'Type de fichier non autorisé'}), 400
            
        # Check if file exists
        file_path = os.path.join('result', filename)
        if not os.path.exists(file_path):
            logger.error(f"Image file not found: {file_path}")
            return jsonify({'error': 'Image non trouvée'}), 404
            
        # Send file with proper headers for Chrome compatibility
        response = send_from_directory('result', filename)
        response.headers['Cache-Control'] = 'public, max-age=3600'  # Cache for 1 hour
        response.headers['Access-Control-Allow-Origin'] = '*'  # Allow CORS
        response.headers['Cross-Origin-Resource-Policy'] = 'cross-origin'  # Chrome fix
        response.headers['X-Content-Type-Options'] = 'nosniff'  # Chrome security
        return response
        
    except Exception as e:
        logger.error(f"Error serving image {filename}: {e}")
        return jsonify({'error': 'Erreur lors du chargement de l\'image'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
