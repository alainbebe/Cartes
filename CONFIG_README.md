# Configuration du Jeu - config.json

Le fichier `config.json` permet de contrôler les fonctionnalités du jeu sans modification du code.

## Structure de Configuration

```json
{
  "mistral": {
    "enabled": true,
    "fallback_text": "L'aventure continue avec des événements mystérieux..."
  },
  "image_generation": {
    "enabled": true,
    "fallback_to_original": false
  }
}
```

## Paramètres Mistral AI

### `mistral.enabled` (booléen)
- **true** : Utilise l'API Mistral pour générer les textes d'histoire
- **false** : Utilise le texte de remplacement défini dans `fallback_text`

### `mistral.fallback_text` (chaîne)
- Texte utilisé à la place de Mistral quand `enabled` est false
- Peut être personnalisé selon vos besoins

## Paramètres Génération d'Images

### `image_generation.enabled` (booléen)
- **true** : Génère des images avec l'API Replicate 
- **false** : Désactive la génération d'images

### `image_generation.fallback_to_original` (booléen)
- **true** : Quand la génération est désactivée, tente d'utiliser les images originales des cartes
- **false** : Pas d'images quand la génération est désactivée

## Exemples d'Usage

### Mode Développement (sans APIs)
```json
{
  "mistral": {
    "enabled": false,
    "fallback_text": "Mode développement - événement de test"
  },
  "image_generation": {
    "enabled": false,
    "fallback_to_original": true
  }
}
```

### Mode Production Complet
```json
{
  "mistral": {
    "enabled": true,
    "fallback_text": "L'aventure continue avec des événements mystérieux..."
  },
  "image_generation": {
    "enabled": true,
    "fallback_to_original": false
  }
}
```

## API Configuration

L'endpoint `/api/config` permet de consulter la configuration actuelle :

```bash
curl http://localhost:5000/api/config
```

## Notes

- Les modifications de `config.json` nécessitent un redémarrage du serveur
- Si le fichier n'existe pas, une configuration par défaut est utilisée
- Les clés API (MISTRAL_API_KEY, REPLICATE_API_TOKEN) restent dans les variables d'environnement