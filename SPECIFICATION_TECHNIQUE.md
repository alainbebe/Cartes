# Chroniques Médiévales - Spécification Technique Complète

## Vue d'ensemble

Chroniques Médiévales est une application web collaborative de storytelling basée sur des cartes, permettant à plusieurs joueurs de créer ensemble des récits de fantasy médiévale. L'application utilise l'intelligence artificielle pour générer des segments narratifs basés sur les cartes jouées par les participants.

## Architecture Générale

### Type d'Application
- Application web client-serveur
- Interface utilisateur responsive accessible via navigateur web
- Pas de base de données persistante (stockage en mémoire)
- Communication via API REST et polling côté client

### Composants Principaux
1. **Serveur Web** : Gère la logique métier et les API
2. **Interface Utilisateur** : Interface web responsive avec mise à jour en temps réel
3. **Système de Cartes** : Jeu de 55 cartes prédéfinies avec effets par rôle
4. **Générateur de Récits** : Intégration avec API d'intelligence artificielle
5. **Gestionnaire d'État** : Suivi en temps réel des joueurs et progression

## Mécaniques de Jeu

### Rôles de Joueurs
Le jeu propose 4 rôles distincts :
- **Soldat** : Spécialisé dans l'action et le combat
- **Moine** : Orienté spiritualité et guérison
- **Sorcière** : Magie et mystère
- **Forgeron** : Artisanat et création

### Système de Cartes
- **55 cartes uniques** numérotées de 1 à 55
- Chaque carte contient :
  - Un numéro d'identification
  - Un mot-clé principal
  - Une phrase descriptive
  - Une description détaillée
- **Effets par rôle** : Chaque carte a un effet différent selon le rôle du joueur (positif, négatif ou neutre)

### Système de Score
- **Score initial** : 2 points par joueur actif (minimum 2)
- **Modification dynamique** : Les cartes ajoutent ou retirent des points selon le rôle
- **Objectif** : Maintenir ou améliorer le score collectif

### Progression du Jeu
1. **Limite de cartes** : 4 cartes de base + 1 par joueur connecté
2. **Limite fixe** : Calculée au début du jeu, reste constante
3. **Fin de partie** : Automatique quand toutes les cartes sont jouées ou manuellement (carte 0)

## Fonctionnalités Techniques

### Gestion des Joueurs
- **Inscription simple** : Nom et choix de rôle
- **Persistance locale** : Sauvegarde dans le navigateur
- **Détection d'activité** : Suivi en temps réel des connexions
- **Timeout configurable** : Joueurs inactifs après 2 secondes

### Système de Rafraîchissement
- **Polling côté client** : Mise à jour toutes les 0,5 secondes
- **Variation aléatoire** : Évite la synchronisation parfaite des clients
- **Activité automatique** : Les rafraîchissements comptent comme activité

### États de Traitement
- **Verrouillage global** : Interface bloquée pour tous pendant qu'un joueur joue
- **Indicateurs visuels** : Spinner et messages de progression
- **Messages différenciés** :
  - Joueur actif : "Traitement en cours..." avec numéro de carte
  - Autres joueurs : "Nom du joueur joue la carte X..."

### Gestion d'Erreurs
- **Validation côté serveur** : Cartes déjà jouées, numéros invalides
- **Réinitialisation automatique** : État de traitement effacé en cas d'erreur
- **Messages d'erreur** : Notifications utilisateur claires
- **Récupération** : Interface redevient utilisable immédiatement

## Intégration Intelligence Artificielle

### Génération de Récits
- **API externe** : Appels à un service d'IA (type Mistral AI)
- **Contexte riche** : Historique complet de l'histoire transmis
- **Prompts structurés** : Format [HISTOIRE], [ROLE], [CLEF]
- **Longueur contrôlée** : 20-25 mots par génération

### Historique Narratif
- **Contexte initial** : Scénario de base médiéval prédéfini
- **Accumulation** : Chaque nouveau segment ajouté à l'historique
- **Cohérence** : L'IA reçoit tout le contexte pour maintenir la cohérence

### Conclusion Automatique
- **Comparaison de scores** : Score final vs score initial
- **Conclusions différenciées** :
  - Victoire : Score final ≥ score initial
  - Défaite : Score final < score initial
- **Ton adaptatif** : Épique pour victoire, tragique pour défaite

## Configuration et Paramètres

### Délais Configurables
```
REFRESH_INTERVAL: 500ms     # Fréquence des rafraîchissements
PLAYER_TIMEOUT: 2000ms      # Timeout de détection des joueurs
AUTO_RESET_TIMEOUT: 600000ms # Réinitialisation automatique (10 min)
```

### Paramètres de Jeu
```
BASE_CARDS_TO_PLAY: 4       # Cartes de base
CARDS_PER_PLAYER: 1         # Cartes additionnelles par joueur
POINTS_PER_PLAYER: 2        # Points de score par joueur
MINIMUM_SCORE: 2            # Score minimum au démarrage
```

## Interface Utilisateur

### Composants Principaux
1. **Formulaire Joueur** : Saisie nom et rôle
2. **Champ de Carte** : Saisie numéro de carte
3. **Affichage Histoire** : Chronologie des événements
4. **Barre de Progression** : Cartes jouées / total
5. **Liste des Joueurs** : Joueurs actifs en temps réel
6. **Galerie de Cartes** : Aperçu des cartes disponibles

### États Visuels
- **Champ actif** : Fond blanc, texte noir
- **Champ bloqué** : Fond gris, texte grisé
- **Indicateur de traitement** : Spinner animé + message
- **Alertes** : Messages de succès/erreur colorés

### Responsive Design
- **Bootstrap 5** : Framework CSS pour la responsivité
- **Thème médiéval** : Couleurs et polices adaptées
- **Icônes** : Font Awesome pour les éléments visuels

## Stockage et Persistance

### Données en Mémoire Serveur
- **État du jeu** : Score, cartes jouées, histoire
- **Joueurs actifs** : Liste avec timestamps
- **Configuration** : Paramètres de la partie
- **Historique narratif** : Contexte pour l'IA

### Stockage Local Navigateur
- **Informations joueur** : Nom et rôle sauvegardés
- **Persistance session** : Rechargement automatique

### Sauvegarde Manuelle
- **Export JSON** : Sauvegarde complète de la partie
- **Horodatage** : Fichiers nommés avec date/heure
- **Données incluses** : Histoire, score, cartes jouées

## Sécurité et Validation

### Validation Côté Serveur
- **Numéros de cartes** : Vérification dans la plage 1-55
- **Cartes uniques** : Pas de rejeu de cartes
- **Joueurs valides** : Nom et rôle requis
- **Données JSON** : Validation des entrées

### Gestion des Erreurs
- **Messages utilisateur** : Erreurs compréhensibles
- **Logs serveur** : Traçabilité des actions
- **Récupération automatique** : État cohérent maintenu

## Déploiement et Environnement

### Variables d'Environnement
```
MISTRAL_API_KEY: Clé API pour génération de texte
SESSION_SECRET: Clé secrète pour sessions
```

### Dépendances Techniques
- **Framework web** : Serveur HTTP avec routing
- **Client HTTP** : Pour appels API d'IA
- **Moteur de templates** : Génération HTML dynamique
- **Gestion JSON** : Parsing et sérialisation

### Hébergement
- **Port par défaut** : 5000
- **Bind address** : 0.0.0.0 (toutes interfaces)
- **Mode debug** : Activé pour développement
- **Logs** : Niveau INFO minimum

## Flux de Données

### Cycle de Jeu Standard
1. **Connexion joueur** : Nom/rôle → Serveur
2. **Mise à jour état** : Serveur → Tous les clients
3. **Saisie carte** : Joueur → Serveur
4. **Verrouillage interface** : Tous les clients
5. **Validation carte** : Serveur
6. **Génération récit** : Serveur → API IA
7. **Mise à jour histoire** : Serveur → Tous les clients
8. **Déverrouillage interface** : Tous les clients

### Gestion des Erreurs
1. **Erreur détectée** : Serveur
2. **Nettoyage état** : Serveur
3. **Message d'erreur** : Serveur → Client concerné
4. **Rafraîchissement** : Tous les clients
5. **Interface réactivée** : Tous les clients

## Extensibilité et Maintenance

### Points d'Extension
- **Nouveaux rôles** : Ajout facile avec évaluations
- **Cartes supplémentaires** : Extension du deck
- **Modes de jeu** : Variantes des règles
- **Langues** : Internationalisation possible

### Maintenance
- **Configuration centralisée** : Délais et paramètres
- **Logs détaillés** : Traçabilité des actions
- **Réinitialisation automatique** : Nettoyage périodique
- **Monitoring** : Suivi des performances

## Considérations Techniques

### Performance
- **Polling efficace** : Fréquence optimisée
- **Mémoire contrôlée** : Pas de fuite mémoire
- **API IA** : Gestion des timeouts et erreurs
- **Clients multiples** : Gestion concurrentielle

### Scalabilité
- **Instance unique** : Architecture actuelle
- **État global** : Limitation horizontale
- **Amélioration possible** : Base de données pour multi-instance

Cette spécification permet la recréation complète du système dans n'importe quel langage de programmation en respectant l'architecture et les fonctionnalités décrites.