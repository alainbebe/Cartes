# Chroniques Médiévales - Jeu de Cartes Collaboratif

Un jeu de narration collaborative basé sur Flask où plusieurs joueurs créent ensemble une histoire médiévale-fantastique en utilisant des cartes et l'intelligence artificielle.

## 🎮 Fonctionnalités

- **Jeu multijoueur en temps réel** : Plusieurs joueurs peuvent participer simultanément
- **4 rôles différents** : Soldat, Moine, Sorcière, Forgeron (chacun avec des effets de carte uniques)
- **55 cartes thématiques** : Cartes médiévales-fantastiques avec mots-clés et descriptions
- **Narration IA** : Utilise l'API Mistral AI pour générer des segments d'histoire cohérents
- **Système de score dynamique** : Score basé sur les effets des cartes et les rôles
- **Sauvegarde** : Possibilité de sauvegarder et télécharger l'histoire complète

## 🚀 Installation

### Prérequis
- Python 3.8+
- Clé API Mistral AI

### Installation
```bash
# Cloner le repository
git clone https://github.com/votre-nom/chroniques-medievales.git
cd chroniques-medievales

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec votre clé API Mistral AI
```

### Configuration
Créer un fichier `.env` avec :
```
MISTRAL_API_KEY=votre_clé_api_mistral
SESSION_SECRET=votre_secret_session
```

## 🎯 Comment jouer

1. **Rejoindre la partie** : Entrez votre nom et choisissez un rôle
2. **Jouer des cartes** : Saisissez un numéro de carte (1-55)
3. **Suivre l'histoire** : L'IA génère automatiquement la suite de l'histoire
4. **Objectif** : Maintenir ou améliorer le score initial pour une fin positive

### Rôles disponibles
- **⚔️ Soldat** : Orienté action et combat
- **🙏 Moine** : Orienté spiritualité et guérison
- **🔮 Sorcière** : Orienté magie et mystère
- **🔨 Forgeron** : Orienté artisanat et création

## 📁 Structure du projet

```
chroniques-medievales/
├── app.py              # Application Flask principale
├── game_logic.py       # Logique de jeu
├── main.py            # Point d'entrée
├── deck.json          # Cartes de jeu
├── evaluations.json   # Effets des cartes par rôle
├── templates/         # Templates HTML
│   └── index.html
├── static/           # Fichiers statiques
│   ├── css/
│   └── js/
└── requirements.txt  # Dépendances Python
```

## 🔧 Développement

### Lancer le serveur de développement
```bash
python main.py
```

### Architecture technique
- **Backend** : Flask (Python)
- **Frontend** : HTML/CSS/JavaScript vanilla
- **IA** : API Mistral AI
- **Stockage** : En mémoire (session-based)

## 🎨 Personnalisation

### Ajouter de nouvelles cartes
Éditez `deck.json` et `evaluations.json` pour ajouter de nouvelles cartes avec leurs effets.

### Modifier les rôles
Modifiez les évaluations dans `evaluations.json` pour changer les effets des cartes selon les rôles.

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité
3. Commitez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

## 📜 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🔮 Fonctionnalités futures

- [ ] Persistance des parties en base de données
- [ ] Système de salles privées
- [ ] Éditeur de cartes personnalisées
- [ ] Thèmes visuels supplémentaires
- [ ] Support multilingue

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur GitHub.

---

*Créé avec ❤️ pour les amateurs de fantasy médiévale et de narration collaborative*