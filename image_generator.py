import replicate
import requests
import json
from PIL import Image
from io import BytesIO
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

# === CONFIGURATION ===
MODELE_KONTEXT = "black-forest-labs/flux-kontext-pro"
MODELE_SCHNELL = "black-forest-labs/flux-schnell"
DEFAULT_MODEL = MODELE_KONTEXT

# Image de référence par défaut pour le style médiéval-fantastique
DEFAULT_IMAGE_REF = "http://www.barbason.be/public/mariee.jpg"

def ensure_result_directory():
    """Crée le dossier result s'il n'existe pas."""
    os.makedirs("result", exist_ok=True)

def construire_input(modele, prompt, image_ref=None):
    """Construit le dictionnaire d'entrée en fonction du modèle."""
    if modele == MODELE_KONTEXT:
        return {
            "prompt": prompt,
            "input_image": image_ref or DEFAULT_IMAGE_REF,
            "aspect_ratio": "match_input_image",
            "output_format": "jpg",
            "safety_tolerance": 2,
            "prompt_upsampling": False
        }
    else:
        return {
            "prompt": prompt,
            "output_quality": 90,
            "num_outputs": 1,  # Réduire à 1 pour économiser les ressources
            "output_format": "webp",
            "disable_safety_checker": True
        }

def generer_image(modele, input_data):
    """Appelle Replicate avec les paramètres donnés."""
    try:
        return replicate.run(modele, input=input_data)
    except Exception as e:
        logger.error(f"Error calling Replicate API: {e}")
        raise

def enregistrer_image(url, filename):
    """Télécharge et sauvegarde une image depuis une URL."""
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            img.save(filename)
            logger.info(f"Image saved: {filename}")
            return True
        else:
            logger.error(f"Failed to download image ({response.status_code}): {url}")
            return False
    except Exception as e:
        logger.error(f"Error saving image: {e}")
        return False

def enregistrer_donnees_json(modele, input_data, timestamp, player_name, card_number):
    """Sauvegarde les paramètres dans un fichier JSON."""
    try:
        data = {
            "timestamp": timestamp,
            "player_name": player_name,
            "card_number": card_number,
            "modele": modele,
            "input": input_data
        }
        
        filename = f"result/donnees_{timestamp}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        
        logger.info(f"JSON data saved: {filename}")
        return True
    except Exception as e:
        logger.error(f"Error saving JSON data: {e}")
        return False

def generate_card_image(prompt, player_name, card_number, model=None, image_ref=None):
    """
    Génère une image basée sur le prompt fourni par Mistral AI.
    
    Args:
        prompt (str): Le prompt généré par Mistral AI
        player_name (str): Nom du joueur
        card_number (int): Numéro de la carte
        model (str, optional): Modèle à utiliser (par défaut MODELE_KONTEXT)
        image_ref (str, optional): Image de référence (par défaut DEFAULT_IMAGE_REF)
    
    Returns:
        dict: Résultat contenant les informations sur l'image générée
    """
    try:
        # Configuration
        modele = model or DEFAULT_MODEL
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Créer le dossier de résultats
        ensure_result_directory()
        
        # Construire les paramètres d'entrée
        input_data = construire_input(modele, prompt, image_ref)
        
        # Générer l'image
        logger.info(f"Generating image for card {card_number} by {player_name}")
        output = generer_image(modele, input_data)
        
        # Sauvegarder les données JSON
        enregistrer_donnees_json(modele, input_data, timestamp, player_name, card_number)
        
        # Sauvegarder l'image
        result = {
            "success": True,
            "timestamp": timestamp,
            "player_name": player_name,
            "card_number": card_number,
            "model": modele,
            "images": []
        }
        
        if modele == MODELE_KONTEXT:
            # Un seul résultat pour KONTEXT
            filename = f"result/image_{player_name}_card{card_number}_{timestamp}.jpg"
            if enregistrer_image(output, filename):
                result["images"].append({
                    "filename": filename,
                    "url": output
                })
        else:
            # Plusieurs résultats pour SCHNELL
            if isinstance(output, list):
                for i, url in enumerate(output):
                    filename = f"result/image_{player_name}_card{card_number}_{timestamp}_{i}.jpg"
                    if enregistrer_image(url, filename):
                        result["images"].append({
                            "filename": filename,
                            "url": url
                        })
            else:
                # Un seul résultat
                filename = f"result/image_{player_name}_card{card_number}_{timestamp}.jpg"
                if enregistrer_image(output, filename):
                    result["images"].append({
                        "filename": filename,
                        "url": output
                    })
        
        logger.info(f"Image generation completed: {len(result['images'])} images saved")
        return result
        
    except Exception as e:
        logger.error(f"Error in generate_card_image: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
            "player_name": player_name,
            "card_number": card_number
        }

def test_replicate_connection():
    """Test si Replicate API est accessible avec une clé API valide."""
    try:
        # Test simple avec un prompt minimal
        test_input = construire_input(DEFAULT_MODEL, "medieval fantasy castle")
        result = replicate.run(DEFAULT_MODEL, input=test_input)
        return True
    except Exception as e:
        logger.error(f"Replicate connection test failed: {e}")
        return False