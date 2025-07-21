# Chroniques Médiévales - Collaborative Card Game

## Overview

This is a Flask-based web application that implements a collaborative narrative card game set in a medieval fantasy universe. Players take turns playing cards to create a collective story, with each card having different effects based on the player's role. The game uses Mistral AI to generate narrative text and maintains real-time game state across multiple players.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### July 21, 2025 - Code Refactoring and UI Improvements
- **Refactoring**: Eliminated code duplication between `__init__` and `reset_game` in GameState class
- **Changes**:
  - Created `_initialize_state()` method to centralize state initialization
  - Simplified `reset_game()` method to reuse initialization logic
  - Fixed UI focus issues preventing typing in player name field during refresh
  - Corrected non-existent Font Awesome icon `fa-cards-blank` to `fa-th-large`
- **Impact**: Cleaner, more maintainable code and better user experience
- **Status**: ✅ Completed - Code quality improvements and UI fixes

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