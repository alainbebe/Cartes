
import json

def load_deck():
    """Charge les données du deck depuis deck.json"""
    try:
        with open('deck.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Erreur: fichier deck.json introuvable.")
        return []

def load_evaluations():
    """Charge les évaluations depuis evaluations.json"""
    try:
        with open('evaluations.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Erreur: fichier evaluations.json introuvable.")
        return {}

def analyze_card_evaluations(deck, evaluations):
    """Analyse les évaluations des cartes et retourne la liste triée"""
    card_analysis = []
    
    for card in deck:
        card_numero = card['numero']
        card_name = card['mot']
        
        # Compter les évaluations positives pour cette carte
        positive_count = 0
        
        # Parcourir tous les rôles dans evaluations
        for role, role_evaluations in evaluations.items():
            if card_numero in role_evaluations:
                if role_evaluations[card_numero] == '+':
                    positive_count += 1
        
        card_analysis.append({
            'numero': card_numero,
            'nom': card_name,
            'evaluations_positives': positive_count
        })
    
    # Trier par nombre d'évaluations positives (décroissant)
    sorted_analysis = sorted(card_analysis, key=lambda x: x['evaluations_positives'], reverse=True)
    
    return sorted_analysis

def main():
    """Fonction principale"""
    print("=== ANALYSE DES ÉVALUATIONS DE CARTES ===\n")
    
    # Charger les données
    deck = load_deck()
    evaluations = load_evaluations()
    
    if not deck or not evaluations:
        print("Impossible de charger les données.")
        return
    
    # Analyser les évaluations
    analyzed_cards = analyze_card_evaluations(deck, evaluations)
    
    # Afficher les résultats
    print(f"{'Numéro':<8} {'Nom':<15} {'Évaluations positives':<20}")
    print("-" * 50)
    
    for card in analyzed_cards:
        print(f"{card['numero']:<8} {card['nom']:<15} {card['evaluations_positives']:<20}")
    
    # Statistiques
    print(f"\n=== STATISTIQUES ===")
    print(f"Nombre total de cartes analysées: {len(analyzed_cards)}")
    print(f"Carte(s) avec le plus d'évaluations positives:")
    
    max_positives = max(card['evaluations_positives'] for card in analyzed_cards)
    top_cards = [card for card in analyzed_cards if card['evaluations_positives'] == max_positives]
    
    for card in top_cards:
        print(f"  - {card['nom']} (#{card['numero']}) : {card['evaluations_positives']} évaluations positives")
    
    print(f"\nCartes sans évaluations positives: {len([card for card in analyzed_cards if card['evaluations_positives'] == 0])}")

if __name__ == "__main__":
    main()
