# Chroniques Médiévales - Règles du Jeu

## Vue d'ensemble

**Chroniques Médiévales** est un jeu collaboratif de narration par cartes où les joueurs créent ensemble une histoire médiévale-fantastique. Chaque joueur incarne un rôle spécifique et utilise des cartes pour influencer l'histoire commune.

## Objectif du Jeu

Créer ensemble une histoire captivante en utilisant les cartes à votre disposition. Le jeu se termine soit quand toutes les cartes sont jouées, soit quand les joueurs décident de conclure l'histoire.

## Configuration Initiale

### Inscription
1. **Nom** : Choisissez votre nom de joueur
2. **Rôle** : Sélectionnez un des quatre rôles disponibles :
   - **⚔️ Soldat** : Guerrier courageux, spécialiste du combat
   - **🙏 Moine** : Sage spirituel, maître de la guérison et de la sagesse
   - **🔮 Sorcière** : Pratiquante de magie, manipulatrice des forces occultes
   - **🔨 Forgeron** : Artisan habile, créateur d'objets et d'armes

### Démarrage
- L'histoire commence avec une introduction du **Narrateur**
- Le score initial varie selon le nombre de joueurs
- Chaque joueur peut rejoindre ou quitter la partie à tout moment

## Mécaniques de Jeu

### Cartes Normales (1-55)
- **55 cartes principales** avec des mots-clés médiévaux-fantastiques
- Chaque carte contient :
  - Un **numéro** (1 à 55)
  - Un **mot-clé** (ex: "Épée", "Sortilège", "Trésor")
  - Une **phrase d'inspiration** 
  - Une **description** détaillée

### Effets des Cartes par Rôle
Chaque carte a un effet différent selon votre rôle :
- **Effet positif (+)** : Augmente le score et influence positivement l'histoire
- **Effet neutre (=)** : N'affecte pas le score mais enrichit la narration
- **Effet négatif (-)** : Diminue le score mais peut créer du suspense

### Cartes Spéciales (100+)
Les cartes spéciales ont des effets uniques sur le jeu :

#### Carte 100 : "Inversion"
- **Effet** : Inverse l'ordre chronologique de l'histoire
- **Fonctionnement** :
  - Sauvegarde l'introduction du Narrateur
  - Inverse l'ordre des événements précédents
  - Rejoue chaque carte dans l'ordre inversé avec de nouvelles interprétations IA
  - Crée une "nouvelle réalité" narrative
- **Restrictions** : 
  - Chaque joueur ne peut jouer cette carte qu'une seule fois
  - Ne compte pas dans les cartes jouées normalement
  - N'affecte pas le score directement

## Tour de Jeu

### Jouer une Carte
1. **Saisir le numéro** : Tapez le numéro de carte (1-55 pour cartes normales, 100+ pour cartes spéciales)
2. **Traitement IA** : Le système Mistral AI génère une interprétation narrative (20-25 mots)
3. **Ajout à l'histoire** : Le texte généré s'ajoute à l'histoire collective
4. **Mise à jour du score** : Selon l'effet de la carte sur votre rôle

### Règles de Jeu
- **Une carte par tour** : Chaque joueur joue une carte à la fois
- **Pas de répétition** : Une carte normale ne peut être jouée qu'une fois
- **Ordre libre** : Pas d'ordre de tour fixe, jouez quand vous le souhaitez
- **Temps réel** : L'interface se met à jour automatiquement pour tous les joueurs

## Fin de Partie

### Conditions de Fin
1. **Score à zéro ou négatif** : Le bouton "Conclusion" devient disponible
2. **Toutes les cartes jouées** : Fin automatique
3. **Demande manuelle** : Tapez "0" pour demander une conclusion

### Conclusion
- Une conclusion narrative est générée par l'IA
- Basée sur le score final et l'histoire développée
- Compare le score final au score initial pour déterminer le type d'épilogue

## Fonctionnalités Avancées

### Système de Logging
- Toutes les cartes jouées sont enregistrées dans `déroulement.txt`
- Inclut : joueur, carte, type (normale/spéciale), horodatage
- Permet de suivre le déroulement complet de la partie

### Auto-Reset
- **Inactivité** : Réinitialisation automatique après 10 minutes sans cartes jouées
- **Préservation** : L'historique des cartes spéciales est conservé entre les parties

### Sauvegarde et Téléchargement
- **Sauvegarde** : L'histoire peut être sauvegardée à tout moment
- **Téléchargement** : Export de l'histoire complète en format texte
- **Persistance** : Les informations joueur sont sauvées localement

## Stratégies et Conseils

### Pour les Débutants
1. **Lisez les descriptions** : Consultez la liste des cartes disponibles
2. **Comprenez votre rôle** : Chaque rôle a des affinités différentes avec les cartes
3. **Collaborez** : Construisez sur les actions des autres joueurs
4. **Expérimentez** : N'hésitez pas à jouer des cartes inattendues

### Stratégies Avancées
1. **Gestion du score** : Équilibrez effets positifs et négatifs pour contrôler la durée
2. **Timing des cartes spéciales** : Utilisez l'Inversion à des moments clés
3. **Cohérence narrative** : Créez des liens entre vos actions et l'histoire existante
4. **Diversité des rôles** : Encouragez différents rôles pour une histoire riche

## Cartes Spéciales - Guide Détaillé

### Carte 100 : "Inversion"
**Quand l'utiliser :**
- Quand l'histoire a pris une tournure inattendue
- Pour créer un effet dramatique de "révélation"
- Pour donner une seconde chance aux événements passés

**Effets narratifs :**
- Transforme les événements passés en leur donnant de nouveaux sens
- Crée des connexions inattendues entre les actions
- Peut changer complètement la perception de l'histoire

**Tactiques :**
- Utilisez-la après plusieurs cartes pour maximum d'impact
- Idéale en milieu de partie quand l'histoire est bien établie
- Peut servir de "reset narratif" sans perdre le contenu

## Résolution de Problèmes

### Problèmes Courants
- **Carte non acceptée** : Vérifiez que le numéro est correct (1-55, 100+)
- **Interface bloquée** : Actualisez la page, vos données sont sauvées
- **Score négatif** : Normal ! Cela active le mode conclusion

### Support Technique
- Les informations de debug sont disponibles dans les logs serveur
- L'historique complet est dans `déroulement.txt`
- En cas de problème, utilisez le bouton "Réinitialiser"

---

*Amusez-vous bien dans vos Chroniques Médiévales !* 🏰⚔️📜