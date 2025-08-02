# Chroniques Médiévales - Collaborative Card Game

## Overview
Chroniques Médiévales is a Flask-based web application that facilitates a collaborative narrative card game in a medieval fantasy setting. Players engage by playing cards to collectively build a story, with card effects varying based on individual player roles. The application leverages Mistral AI for dynamic narrative generation and maintains real-time game state synchronization across multiple players. The project aims to provide an immersive, interactive storytelling experience, allowing players to visually represent their narrative contributions through AI-generated images.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application features a responsive UI built with Jinja2 templates and Bootstrap 5, themed with a custom medieval fantasy aesthetic using CSS variables. Role-based styling is dynamically applied, allowing for extensible visual configurations directly from data. Card confirmations are implemented client-side with descriptive names to enhance user experience and prevent accidental plays. Generated images are seamlessly integrated into the story display, providing a rich multimedia storytelling experience with responsive layouts and interactive elements.

### Technical Implementations
The backend is a Flask web application with a clear separation of concerns between `app.py` (main application) and `game_logic.py` (core game mechanics). Session management is handled via Flask sessions. Frontend interactions and real-time updates are managed using vanilla JavaScript through client-side polling. The system includes a comprehensive configuration mechanism via `config.json` for toggling features like Mistral AI and image generation, supporting development and flexible deployment. Dynamic role and deck data are loaded via dedicated API endpoints, centralizing management and ensuring data integrity. A robust auto-reset system ensures games are reset after inactivity. Special cards (e.g., "Inversion" for story reversal, "Suppression" for card removal) are fully implemented, allowing for complex narrative manipulation.

### Feature Specifications
- **Collaborative Storytelling**: Players contribute to a shared narrative by playing cards.
- **Role-Based Mechanics**: Card effects and scoring vary based on assigned player roles (Soldat, Moine, Sorcière, Forgeron).
- **Dynamic Narrative Generation**: Mistral AI generates story text and contextual image prompts based on game progression.
- **Automated Image Generation**: Integration with Replicate API to generate visual representations of card effects from AI prompts.
- **Real-time State Synchronization**: Game state is updated and displayed in real-time across all connected clients.
- **Configurable Features**: Key functionalities like AI integration and image generation can be toggled via a `config.json` file.
- **Dynamic Content Loading**: Roles, card decks, and their associated data are loaded dynamically via API, allowing for easy expansion.
- **Special Card System**: Implementation of unique game-altering cards like "Inversion" (reverses story) and "Suppression" (removes cards) with advanced input validation.
- **Comprehensive Logging**: Detailed logs of game events, AI interactions, and image generations.

### System Design Choices
The application uses an in-memory storage for game state, prioritizing simplicity for its current scale, with player information persisted in browser localStorage. A single source of truth for configuration (`config.json`), roles (`roles.json`), and deck data (`deck.json`) is maintained to avoid inconsistencies. The architecture is designed for maintainability with modular components and clear data flow.

## External Dependencies

### APIs
- **Mistral AI**: Used for generating narrative text and contextual image prompts.
- **Replicate API**: Used for generating images from AI-generated prompts (specifically the FLUX-Kontext-Pro model).

### Libraries and Frameworks
- **Flask**: Python web framework.
- **python-dotenv**: For managing environment variables.
- **requests**: Python library for making HTTP requests.
- **Bootstrap 5 (CDN)**: Frontend framework for responsive UI components.
- **Font Awesome (CDN)**: For icons.
- **unidecode**: Python library for handling accented characters.

### Browser Dependencies
- **localStorage**: For client-side player data persistence.
- **Fetch API (or XMLHttpRequest for compatibility)**: For asynchronous communication with the server.
- **ES6 Features**: Modern JavaScript features for frontend logic.