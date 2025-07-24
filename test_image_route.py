#!/usr/bin/env python3
"""
Script de test pour vérifier la route des images et la structure des données.
Utilisez ce script sur votre serveur local pour diagnostiquer les problèmes d'affichage d'images.
"""

import requests
import json
import os
import sys

def test_image_route_local(port=5000):
    """Test la route des images sur le serveur local"""
    base_url = f"http://localhost:{port}"
    
    print("=== TEST DE LA ROUTE DES IMAGES ===")
    
    # 1. Vérifier les images disponibles
    result_dir = "result"
    if os.path.exists(result_dir):
        images = [f for f in os.listdir(result_dir) if f.endswith('.jpg')]
        print(f"Images trouvées dans {result_dir}/: {len(images)}")
        for img in images[-3:]:  # Afficher les 3 dernières
            print(f"  - {img}")
    else:
        print(f"Dossier {result_dir}/ n'existe pas")
        return
    
    if not images:
        print("Aucune image trouvée pour tester")
        return
    
    # 2. Tester la route /result/<filename>
    test_image = images[-1]  # Prendre la dernière image
    image_url = f"{base_url}/result/{test_image}"
    
    print(f"\nTest de l'URL: {image_url}")
    try:
        response = requests.get(image_url)
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'Non défini')}")
        print(f"Content-Length: {response.headers.get('Content-Length', 'Non défini')}")
        
        if response.status_code == 200:
            print("✓ Image accessible via HTTP")
        else:
            print(f"✗ Erreur HTTP: {response.text}")
    except Exception as e:
        print(f"✗ Erreur de connexion: {e}")
    
    # 3. Tester les données de l'histoire
    print(f"\n=== TEST DES DONNÉES D'HISTOIRE ===")
    refresh_url = f"{base_url}/refresh"
    test_data = {
        "player_name": "TestPlayer",
        "player_role": "Soldat"
    }
    
    try:
        response = requests.post(refresh_url, json=test_data)
        if response.status_code == 200:
            data = response.json()
            story = data.get('story', [])
            print(f"Entrées d'histoire: {len(story)}")
            
            images_in_story = 0
            for i, entry in enumerate(story):
                image_path = entry.get('image_path')
                if image_path:
                    images_in_story += 1
                    print(f"  Entrée {i}: {entry.get('player')} -> image: {image_path}")
            
            print(f"Entrées avec images: {images_in_story}/{len(story)}")
            
            if images_in_story == 0:
                print("✗ Aucune image trouvée dans les données d'histoire")
            else:
                print("✓ Images trouvées dans les données d'histoire")
                
        else:
            print(f"✗ Erreur refresh: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Erreur refresh: {e}")

if __name__ == "__main__":
    port = 5000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Port invalide, utilisation du port 5000")
    
    test_image_route_local(port)