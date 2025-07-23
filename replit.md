# Chroniques Médiévales - Collaborative Card Game

## Overview

This is a Flask-based web application that implements a collaborative narrative card game set in a medieval fantasy universe. Players take turns playing cards to create a collective story, with each card having different effects based on the player's role. The game uses Mistral AI to generate narrative text and maintains real-time game state across multiple players.

## User Preferences

Preferred communication style: Simple, everyday language.

## Game Documentation

Created comprehensive game rules document (`RÈGLES_DU_JEU.md`) covering:
- Complete gameplay mechanics including special cards system
- Detailed explanation of Card 100 "Inversion" mechanics
- Role-based effects and strategy guides  
- Technical features (logging, auto-reset, save/download)
- Troubleshooting and advanced tactics

## Recent Changes

### July 23, 2025 - AI Image Prompt Generation System
- **New Feature**: Added automated AI image prompt generation for card effects
- **Integration**: Each played card now generates a detailed image prompt via Mistral AI
- **Changes**:
  - **Image Prompt Generation**:
    - Added `generate_image_prompt()` function in `game_logic.py` that calls Mistral AI
    - Integrated image prompt generation into card playing workflow in `app.py`
    - Each card play now generates two AI calls: one for story text, one for image prompt
    - Image prompts are contextual, using full story history and current card effect
  - **Logging System**:
    - Created `image_prompts.txt` file to store all generated image prompts
    - Each entry includes timestamp, player name, card number, and detailed visual prompt
    - Prompts formatted for AI image generators with medieval-fantasy styling
    - Added error handling for image prompt generation failures
  - **Prompt Structure**:
    - Uses story context: "Dans le contexte de cette histoire: [histoire]"
    - References Mistral's story response: "Peux-tu me générer un prompt pour créer une image pour IA de ce qui suit: [réponse de mistral]"
    - Results in detailed, artistic descriptions suitable for image generation
- **Impact**: Players can now use generated prompts with external AI image generators to create visual representations of their card effects
- **Status**: ✅ Completed - Automatic image prompt generation working for all normal cards (1-55)

### July 21, 2025 - Complete Special Cards System Implementation
- **Special Cards Implementation**: Added both carte 100 "Inversion" and carte 101 "Suppression" with unique game-changing mechanics
- **Story System Refactoring**: Unified story management by initializing `story` array with narrator's opening text
- **Architecture Improvements**: Moved AI-related functions and data loading from Flask app to game logic module
- **Changes**:
  - **Special Cards System**:
    - Added carte 100 "Inversion" to `deck.json` with mystical temporal magic description
    - Added carte 101 "Suppression" to `deck.json` with reality-altering abilities
    - Implemented `handle_inversion_card()` method that reverses story order and replays all cards with new AI interpretations
    - Implemented `handle_suppression_card()` method that removes target cards and reinterprets subsequent events
    - Special cards don't count in normal played cards but are tracked separately in `special_cards_played` list
    - Created `log_card_play()` method for comprehensive logging in `déroulement.txt` file
    - Special cards can be played multiple times by different players but not twice by same player
  - **Advanced Input Validation**:
    - Implemented `validate_card_input()` method supporting complex formats like "101 5" for targeting cards
    - Removed all client-side validation controls to allow flexible input formats
    - Changed input type from "number" to "text" to accept special card syntax
    - Added intelligent validation that checks if target cards were actually played before allowing suppression
  - **Story System**:
    - Initialized `story` with narrator's opening text, eliminating separate `story_history` variable
    - Replaced `add_to_story_history()` with `get_story_history()` method using `join()` on story texts
  - **Architecture**:
    - Moved `generate_game_conclusion()` and `call_mistral_ai()` functions from `app.py` to `game_logic.py`
    - Moved JSON data loading (`load_card_deck()`, `load_evaluations()`) to `game_logic.py`
    - Updated all references to use new unified story management system
    - Adjusted auto-reset condition to account for initial narrator entry (`len(story) <= 1`)
  - **Bug Fixes**:
    - Fixed integer parsing error for special card format "101 2" in Flask route handler
    - Fixed UI focus issues preventing typing in player name field during refresh
    - Corrected non-existent Font Awesome icon `fa-cards-blank` to `fa-th-large`
    - Created `_initialize_state()` method to centralize state initialization
- **Impact**: Complete special cards system allowing temporal manipulation and story alteration, intelligent input validation, comprehensive logging, maintainable architecture
- **Status**: ✅ Completed - Both special cards (100 Inversion, 101 Suppression) fully implemented and tested

### July 18, 2025 - Fixed Auto-Reset System and Score-based Conclusion Mode
- **Bug Fix**: Fixed auto-reset system that wasn't functioning after 10 minutes of inactivity
- **Clarification**: Inactivity is now correctly defined as "no cards played for 10 minutes" (not player disconnection)
- **Changes**:
  - Corrected logic in `should_auto_reset()` method to track `last_card_played` timestamp
  - Added `update_card_played_timestamp()` method called when cards are played or conclusion is generated
  - Removed automatic conclusion generation when score reaches 0
  - Added dynamic button behavior: "Play Card" becomes "Conclusion" when score ≤ 0
  - Conclusion button automatically sends "0" regardless of input field content
  - Added comprehensive logging and testing for auto-reset functionality
- **Impact**: Games now properly reset after 10 minutes without card activity, players can stay connected but game resets if no cards are played
- **Status**: ✅ Completed - Auto-reset system and score-based conclusion mode working correctly

### July 17, 2025 - Interface Improvements and Configuration Variables
- **Enhancement**: Added processing state display for all players during card play
- **Changes**:
  - Interface grays out for ALL players when someone plays a card
  - Added spinner and message showing "Player X joue la carte Y... Traitement en cours"
  - Player submitting sees their card number with "Traitement en cours..."
  - Other players see "Player joue la carte X..." in their input field
  - Added configuration variables for timing controls:
    - `REFRESH_INTERVAL`: 0.5 seconds for UI updates
    - `PLAYER_TIMEOUT`: 2 seconds for active player detection
    - `AUTO_RESET_TIMEOUT`: 10 minutes for automatic game reset
- **Impact**: Better multiplayer experience with clear visual feedback
- **Status**: ✅ Completed - Enhanced real-time multiplayer interface

### July 16, 2025 - Enhanced AI Prompt System with Story History
- **Enhancement**: Implemented comprehensive story history system for Mistral AI prompts
- **Changes**:
  - Added `story_history` attribute to GameState class with initial medieval scenario
  - Modified `get_story_prompt()` to use new structured prompt format with [HISTOIRE], [ROLE], [CLEF] sections
  - Implemented `add_to_story_history()` method to maintain continuous narrative context
  - Updated prompt generation to include complete story context instead of just recent entries
- **Impact**: Mistral AI now receives full story context for better narrative coherence
- **Status**: ✅ Completed - Enhanced narrative generation system

### July 15, 2025 - Firefox Compatibility Fix
- **Issue**: Game displayed empty page on Firefox while working correctly on Chrome
- **Solution**: Replaced modern JavaScript features with Firefox-compatible alternatives
  - Changed `let`/`const` declarations to `var` for better compatibility
  - Replaced `fetch()` API with `XMLHttpRequest` for HTTP requests
  - Added DOM element validation before initialization
  - Improved error handling with more robust JSON parsing
- **Impact**: Game now works consistently across Chrome and Firefox browsers
- **Status**: ✅ Completed - User confirmed functionality restored

## System Architecture

### Backend Architecture
- **Framework**: Flask web application with Python
- **Structure**: Single-file main application (`app.py`) with separated game logic (`game_logic.py`)
- **Session Management**: Uses Flask sessions with configurable secret key
- **Logging**: Comprehensive logging system for debugging and monitoring
- **Configuration**: Environment variables loaded via python-dotenv

### Frontend Architecture
- **Template Engine**: Jinja2 templates with Bootstrap 5 for responsive UI
- **JavaScript**: Vanilla JavaScript for real-time updates and user interactions
- **CSS**: Custom medieval fantasy theme with CSS variables
- **Real-time Updates**: Client-side polling for game state synchronization

### Data Storage
- **Card Deck**: JSON file (`deck.json`) containing card data with numbers, keywords, phrases, and descriptions
- **Card Evaluations**: JSON file (`evaluations.json`) mapping cards to positive/negative/neutral effects per player role
- **Game State**: In-memory storage using Python classes (no persistent database)
- **Player Sessions**: Browser localStorage for player information persistence

## Key Components

### Game Logic (`game_logic.py`)
- **GameState Class**: Manages story progression, scoring, played cards, and player activity
- **Player Management**: Tracks active players with role-based permissions
- **Auto-reset**: Automatic game reset after 10 minutes of inactivity
- **Activity Tracking**: 30-second window for active player detection

### Card System
- **Deck Management**: 55 cards total with medieval fantasy themes
- **Role-based Effects**: Different card effects for Soldat, Moine, Sorcière, Forgeron roles
- **Evaluation System**: Predefined positive/negative outcomes per role-card combination

### API Integration
- **Mistral AI**: External API for generating narrative text (20-25 words per card play)
- **Story Generation**: Context-aware story progression based on player actions
- **Conclusion Generation**: End-game narrative based on final score

### Web Interface
- **Player Registration**: Name and role selection with localStorage persistence
- **Card Playing**: Input validation and real-time feedback
- **Story Display**: Chronological story progression with player attribution
- **Game Controls**: Reset, save, and download functionality

## Data Flow

1. **Player Joins**: Sets name and role, stored in localStorage and server memory
2. **Card Play**: Player submits card number → validation → effect calculation → Mistral AI call → story update
3. **State Synchronization**: Client polls server every few seconds for updates
4. **Scoring**: Card effects modify score based on role-specific evaluations
5. **Game End**: Automatic conclusion generation when all cards played or manually triggered

## External Dependencies

### Required APIs
- **Mistral AI**: For narrative text generation (requires API key)
- **Bootstrap 5**: CDN for responsive UI components
- **Font Awesome**: CDN for icons

### Python Packages
- **Flask**: Web framework
- **python-dotenv**: Environment variable management
- **requests**: HTTP client for API calls

### Browser Dependencies
- **localStorage**: Client-side data persistence
- **Fetch API**: AJAX requests for real-time updates
- **ES6 Features**: Modern JavaScript functionality

## Deployment Strategy

### Environment Configuration
- **Development**: Debug mode enabled with detailed logging
- **Production**: Requires proper secret key and Mistral API key configuration
- **Host Configuration**: Defaults to 0.0.0.0:5000 for container deployment

### File Structure
- **Static Assets**: CSS and JavaScript served from `/static/` directory
- **Templates**: HTML templates in `/templates/` directory
- **Data Files**: JSON files in root directory (deck.json, evaluations.json)

### Scaling Considerations
- **Single Instance**: Current architecture uses global state (not horizontally scalable)
- **Memory Usage**: Game state stored in memory, resets on application restart
- **Session Handling**: Client-side storage reduces server session overhead

### Security Notes
- **API Key**: Mistral AI key must be properly secured in environment variables
- **Session Secret**: Should be randomized in production
- **Input Validation**: Card numbers validated against available deck
- **Rate Limiting**: No built-in rate limiting (consider adding for production)