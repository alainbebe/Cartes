# Chroniques Médiévales - Jeu de Cartes Narratif

Un jeu de cartes narratif collaboratif dans un univers médiéval-fantastique, créé avec Flask et JavaScript.

## Description

Les joueurs créent une histoire collective en jouant des cartes à tour de rôle. Chaque carte influence l'histoire selon le rôle du joueur (Soldat, Moine, Sorcière, Forgeron) et génère du texte narratif via l'IA Mistral.

## Installation

### Prérequis
- Python 3.11 ou supérieur
- Une clé API Mistral (optionnelle pour les tests)

### Installation des dépendances

```bash
pip install -r requirements.txt
```

Ou avec uv (recommandé) :
```bash
uv sync
```

### Configuration

1. Copiez le fichier d'exemple :
```bash
cp .env.example .env
```

2. Éditez le fichier `.env` et ajoutez vos clés :
```
MISTRAL_API_KEY=votre_cle_api_mistral
SESSION_SECRET=votre_secret_session
```

**Note** : Le jeu fonctionne sans clé Mistral (avec du texte de substitution) pour les tests.

## Lancement

```bash
python main.py
```

Le jeu sera accessible sur : http://localhost:5000

## Structure des fichiers

- `app.py` - Application Flask principale
- `game_logic.py` - Logique du jeu et gestion des états
- `main.py` - Point d'entrée de l'application
- `deck.json` - Cartes du jeu avec descriptions
- `evaluations.json` - Effets des cartes par rôle
- `static/` - Fichiers CSS et JavaScript
- `templates/` - Templates HTML

## Fonctionnalités

- **Multijoueur** : Jusqu'à 4 rôles différents simultanément
- **Temps réel** : Synchronisation automatique entre joueurs
- **IA narrative** : Génération de texte via Mistral AI
- **Système de score** : Basé sur les effets des cartes
- **Sauvegarde** : Export des parties au format JSON
- **Interface responsive** : Compatible mobile et desktop

## Comment jouer

1. Entrez votre nom et choisissez un rôle
2. Sélectionnez une carte (1-55) ou cliquez sur une carte disponible
3. L'histoire se développe selon votre rôle et la carte jouée
4. Le score évolue selon les effets positifs/négatifs
5. Le jeu se termine si le score atteint 0 ou si toutes les cartes sont jouées

## Développement

Le jeu utilise :
- **Backend** : Flask, Python
- **Frontend** : Vanilla JavaScript, Bootstrap 5
- **IA** : API Mistral pour la génération de texte
- **Styling** : CSS personnalisé avec thème médiéval

## Licence

Projet open source - Libre d'utilisation et de modification.