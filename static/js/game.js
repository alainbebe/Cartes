// Configuration des délais
var CONFIG = {
    REFRESH_INTERVAL: 500,      // 0.5 seconde pour les rafraîchissements
    PLAYER_TIMEOUT: 2000,       // 2 secondes pour les joueurs connectés
    AUTO_RESET_TIMEOUT: 600000  // 10 minutes pour la réinitialisation automatique
};

// Global game state
var gameState = {
    playerName: '',
    playerRole: '',
    isActive: false,
    availableCards: [],
    refreshInterval: null,
    isWaitingForResponse: false,
    deckData: []  // Pour stocker les données du deck.json
};

// DOM elements
var playerForm = document.getElementById('player-form');
var playerNameInput = document.getElementById('player-name');
var playerRoleSelect = document.getElementById('player-role');
var cardNumberInput = document.getElementById('card-number');
var playButton = document.getElementById('play-button');
var storyContainer = document.getElementById('story-container');
var currentScoreSpan = document.getElementById('current-score');
var cardsProgressBar = document.getElementById('cards-progress');
var cardsPlayedSpan = document.getElementById('cards-played');
var totalCardsSpan = document.getElementById('total-cards');
var activePlayersDiv = document.getElementById('active-players');
var availableCardsDiv = document.getElementById('available-cards');

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    // Check if all elements are loaded
    if (!playerForm || !playerNameInput || !playerRoleSelect || !cardNumberInput || 
        !playButton || !storyContainer || !currentScoreSpan || !cardsProgressBar || 
        !cardsPlayedSpan || !totalCardsSpan || !activePlayersDiv || !availableCardsDiv) {
        console.error('Some DOM elements are missing');
        return;
    }
    
    setupEventListeners();
    loadDeckData();  // Charger les données du deck
    loadAvailableCards();
    // Start refresh only after player info is loaded
    setTimeout(function() {
        if (gameState.playerName && gameState.playerRole) {
            startRefreshInterval();
        }
    }, 1000);
});

function setupEventListeners() {
    playerForm.addEventListener('submit', handleCardPlay);
    
    // Auto-save player info on change
    playerNameInput.addEventListener('change', savePlayerInfo);
    playerRoleSelect.addEventListener('change', savePlayerInfo);
    
    // Add Enter key event to card number input
    cardNumberInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleCardPlay(event);
        }
    });
    
    // Load saved player info
    loadPlayerInfo();
}

function savePlayerInfo() {
    gameState.playerName = playerNameInput.value.trim();
    gameState.playerRole = playerRoleSelect.value;
    
    localStorage.setItem('playerName', gameState.playerName);
    localStorage.setItem('playerRole', gameState.playerRole);
    
    // Restart refresh interval when player info is saved
    if (gameState.playerName && gameState.playerRole) {
        stopRefreshInterval();
        startRefreshInterval();
    }
}

function loadPlayerInfo() {
    const savedName = localStorage.getItem('playerName');
    const savedRole = localStorage.getItem('playerRole');
    
    if (savedName) {
        playerNameInput.value = savedName;
        gameState.playerName = savedName;
    }
    
    if (savedRole) {
        playerRoleSelect.value = savedRole;
        gameState.playerRole = savedRole;
    }
    
    // Immediately register player activity if we have player info
    if (gameState.playerName && gameState.playerRole) {
        refreshGameState();
    }
}

function handleCardPlay(event) {
    event.preventDefault();
    
    // Prevent multiple submissions
    if (gameState.isWaitingForResponse) {
        return;
    }
    
    var playerName = playerNameInput.value.trim();
    var playerRole = playerRoleSelect.value;
    var cardNumber = cardNumberInput.value.trim();
    
    if (!playerName || !playerRole) {
        showAlert('Veuillez entrer votre nom et choisir un rôle.', 'warning');
        return;
    }
    
    // Check if we're in conclusion mode (button shows "Conclusion")
    var isConclusion = playButton.innerHTML.includes('Conclusion');
    
    if (isConclusion) {
        // In conclusion mode, always send 0 regardless of input
        cardNumber = '0';
    } else {
        // In normal mode, validate input
        if (!cardNumber) {
            showAlert('Veuillez entrer un numéro de carte.', 'warning');
            return;
        }
        
        // Demander confirmation avec le nom de la carte
        if (!confirmCardPlay(cardNumber)) {
            return;
        }
    }
    
    // Update player info in game state
    gameState.playerName = playerName;
    gameState.playerRole = playerRole;
    
    // Save to localStorage
    savePlayerInfo();
    
    // Immediately set processing state for all players
    setInputStateForProcessing(playerName, cardNumber);
    
    // Show processing message immediately
    showProcessingMessage(playerName, cardNumber);
    
    sendCardToServer(playerName, playerRole, cardNumber);
}

function setInputState(enabled, cardNumber) {
    gameState.isWaitingForResponse = !enabled;
    
    if (enabled) {
        // Re-enable input
        cardNumberInput.disabled = false;
        cardNumberInput.style.backgroundColor = '';
        cardNumberInput.style.color = '';
        cardNumberInput.placeholder = 'Carte (1-55, 100, 101 [carte]) ou 0 pour terminer';
        cardNumberInput.value = '';
        cardNumberInput.focus();
    } else {
        // Disable input and show waiting state
        cardNumberInput.disabled = true;
        cardNumberInput.style.backgroundColor = '#f8f9fa';
        cardNumberInput.style.color = '#6c757d';
        cardNumberInput.placeholder = 'Traitement en cours...';
        cardNumberInput.value = cardNumber; // Keep the number visible
    }
}

function setInputStateForProcessing(processingPlayer, processingCard) {
    if (processingPlayer && processingCard) {
        // Someone is processing - disable input for ALL players
        cardNumberInput.disabled = true;
        cardNumberInput.style.backgroundColor = '#f8f9fa';
        cardNumberInput.style.color = '#6c757d';
        
        if (processingPlayer === gameState.playerName) {
            // Current player is processing - show their card number
            cardNumberInput.placeholder = 'Traitement en cours...';
            cardNumberInput.value = processingCard;
        } else {
            // Another player is processing - show waiting message in placeholder only
            cardNumberInput.placeholder = `${processingPlayer} joue la carte ${processingCard}...`;
            // Don't clear the value, let the user keep typing
        }
    } else {
        // No one is processing - re-enable input
        cardNumberInput.disabled = false;
        cardNumberInput.style.backgroundColor = '';
        cardNumberInput.style.color = '';
        cardNumberInput.placeholder = 'Carte (1-55, 100, 101 [carte]) ou 0 pour terminer';
        // Only clear the value if it was set by processing, not user input
        if (cardNumberInput.value === String(processingCard) && processingPlayer === gameState.playerName) {
            cardNumberInput.value = '';
        }
        // Only focus if user is not actively typing in another field
        if (cardNumberInput.focus && document.activeElement !== playerNameInput && document.activeElement !== playerRoleSelect) {
            cardNumberInput.focus();
        }
    }
}

function showProcessingMessage(playerName, cardNumber) {
    var processingDiv = document.getElementById('processing-status');
    if (!processingDiv) {
        // Create processing status div if it doesn't exist
        processingDiv = document.createElement('div');
        processingDiv.id = 'processing-status';
        processingDiv.className = 'alert alert-info';
        processingDiv.style.display = 'none';
        
        // Insert after the player form
        var playerForm = document.getElementById('player-form');
        if (playerForm && playerForm.parentNode) {
            playerForm.parentNode.insertBefore(processingDiv, playerForm.nextSibling);
        }
    }
    
    // Show processing message immediately
    processingDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span><strong>${playerName}</strong> joue la carte <strong>${cardNumber}</strong>... Traitement en cours</span>
        </div>
    `;
    processingDiv.style.display = 'block';
}

function sendCardToServer(playerName, playerRole, cardNumber) {
    // Use XMLHttpRequest for better Firefox compatibility
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/envoyer', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                var data = JSON.parse(xhr.responseText);
                
                if (xhr.status === 200) {
                    showAlert(data.message, 'success');
                    
                    // Clear the input only after successful submission
                    cardNumberInput.value = '';
                    
                    // Refresh immediately after playing to update processing state
                    refreshGameState();
                } else {
                    showAlert(data.error || 'Erreur lors du jeu de la carte', 'danger');
                    // Re-enable input on error and clear processing state
                    setInputStateForProcessing(null, null);
                    // Also refresh to clear server-side processing state
                    refreshGameState();
                }
            } catch (error) {
                console.error('Error parsing response:', error);
                showAlert('Erreur de traitement de la réponse', 'danger');
                // Re-enable input on error and clear processing state
                setInputStateForProcessing(null, null);
                // Also refresh to clear server-side processing state
                refreshGameState();
            }
        }
    };
    
    xhr.onerror = function() {
        // Re-enable input on error and clear processing state
        setInputStateForProcessing(null, null);
        console.error('Error playing card');
        showAlert('Erreur de connexion au serveur', 'danger');
        // Also refresh to clear server-side processing state
        refreshGameState();
    };
    
    xhr.send(JSON.stringify({
        player_name: playerName,
        player_role: playerRole,
        prompt: cardNumber
    }));
}

function loadDeckData() {
    // Charger les données du deck.json
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/static/js/deck.json', true);
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                if (xhr.status === 200) {
                    gameState.deckData = JSON.parse(xhr.responseText);
                    console.log('Deck data loaded:', gameState.deckData.length, 'cards');
                } else {
                    console.error('Error loading deck data:', xhr.status);
                }
            } catch (error) {
                console.error('Error parsing deck data:', error);
            }
        }
    };
    
    xhr.send();
}

function findCardByNumber(cardNumber) {
    // Chercher une carte par son numéro dans le deck
    for (var i = 0; i < gameState.deckData.length; i++) {
        if (gameState.deckData[i].numero === String(cardNumber)) {
            return gameState.deckData[i];
        }
    }
    return null;
}

function confirmCardPlay(prompt) {
    // Gérer les cartes spéciales avec format "101 5" (carte suppression avec cible)
    var parts = prompt.trim().split(' ');
    var mainCard = parts[0];
    
    // Traitement pour cartes spéciales
    if (mainCard === '100' || mainCard === '101') {
        // Confirmation pour carte spéciale
        var specialCardName = mainCard === '100' ? 'Inversion' : 'Suppression';
        var confirmSpecial = confirm('Voulez-vous jouer la carte spéciale ' + mainCard + ' : « ' + specialCardName + ' » ?');
        if (!confirmSpecial) return false;
        
        // Si carte 101 avec cible, confirmer aussi la cible
        if (mainCard === '101' && parts.length > 1) {
            var targetCard = parts[1];
            var targetCardData = findCardByNumber(targetCard);
            var targetName = targetCardData ? targetCardData.mot : 'Carte ' + targetCard;
            var confirmTarget = confirm('Voulez-vous supprimer la carte ' + targetCard + ' : « ' + targetName + ' » ?');
            if (!confirmTarget) return false;
        }
        
        return true;
    }
    
    // Cartes normales (1-55)
    var cardData = findCardByNumber(mainCard);
    if (cardData) {
        var cardName = cardData.mot;
        var confirmation = confirm('Voulez-vous jouer ' + mainCard + ' : « ' + cardName + ' » ?');
        return confirmation;
    } else if (mainCard === '0') {
        // Conclusion
        return confirm('Voulez-vous terminer la partie et générer la conclusion ?');
    } else {
        // Carte non trouvée
        return confirm('Voulez-vous jouer la carte ' + mainCard + ' ?');
    }
}

function refreshGameState() {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/refresh', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                if (xhr.status === 200 && xhr.responseText) {
                    var data = JSON.parse(xhr.responseText);
                    updateGameDisplay(data);
                } else if (xhr.status !== 200) {
                    console.error('Error refreshing game state:', xhr.status);
                }
            } catch (error) {
                console.error('Error parsing refresh response:', error, xhr.responseText);
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('Error refreshing game state');
    };
    
    // Only send refresh request if we have player info
    if (gameState.playerName && gameState.playerRole) {
        xhr.send(JSON.stringify({
            player_name: gameState.playerName,
            player_role: gameState.playerRole
        }));
    } else {
        xhr.send(JSON.stringify({}));
    }
}

function updateGameDisplay(data) {
    // Update score
    currentScoreSpan.textContent = data.score;
    
    // Update progress
    const playedCount = data.played_cards.length;
    const totalCount = data.total_cards;
    const progressPercent = (playedCount / totalCount) * 100;
    
    cardsProgressBar.style.width = `${progressPercent}%`;
    cardsPlayedSpan.textContent = playedCount;
    totalCardsSpan.textContent = totalCount;
    
    // Update story
    updateStoryDisplay(data.story);
    
    // Update active players
    updateActivePlayersDisplay(data.active_players);
    
    // Update players count in status bar
    var playersCountSpan = document.getElementById('players-count');
    if (playersCountSpan) {
        playersCountSpan.textContent = data.active_players.length;
    }
    
    // Update available cards
    updateAvailableCardsDisplay(data.played_cards);
    
    // Show processing state for all players
    updateProcessingState(data.processing_player, data.processing_card);
    
    // Update button and input based on score
    updateButtonForScore(data.score, data.game_ended);
    
    // Check if game ended
    if (data.game_ended) {
        showGameEndModal(data.score);
    }
}

function updateStoryDisplay(story) {
    // Clear existing story except intro
    const entries = storyContainer.querySelectorAll('.story-entry:not(.intro)');
    entries.forEach(entry => entry.remove());
    
    story.forEach(entry => {
        const storyEntry = document.createElement('div');
        storyEntry.className = 'story-entry';
        
        // Add effect class
        if (entry.effect === '+') {
            storyEntry.classList.add('positive');
        } else if (entry.effect === '-') {
            storyEntry.classList.add('negative');
        }
        
        const roleBadge = getRoleBadge(entry.role);
        const cardInfo = entry.card ? ` - ${entry.card.mot}` : '';
        
        // Apply white color for Narrateur entries (conclusions)
        const textStyle = entry.player === 'Narrateur' ? 'style="color: white;"' : '';
        
        // Create image element if image path exists
        var imageElement = '';
        if (entry.image_path) {
            // Debug logging for image path
            console.log('Image path found:', entry.image_path);
            console.log('Full image URL:', '/result/' + entry.image_path);
            
            imageElement = `
                <div class="story-image">
                    <a href="/result/${entry.image_path}" target="_blank" rel="noopener noreferrer">
                        <img src="/result/${entry.image_path}" alt="Image générée pour ${entry.player}" 
                             loading="lazy" onclick="window.open('/result/${entry.image_path}', '_blank')"
                             onerror="console.error('Failed to load image:', this.src); this.style.display='none';"
                             onload="console.log('Image loaded successfully:', this.src);">
                    </a>
                </div>
            `;
        }

        storyEntry.innerHTML = `
            <div class="story-content">
                <div class="story-text">
                    <p ${textStyle}><strong>${entry.player}</strong>${roleBadge}: ${entry.text}</p>
                    ${cardInfo ? `<div class="story-meta">Carte: ${cardInfo}</div>` : ''}
                </div>
                ${imageElement}
            </div>
        `;
        
        storyContainer.appendChild(storyEntry);
    });
    
    // Scroll to bottom
    storyContainer.scrollTop = storyContainer.scrollHeight;
}

function getRoleBadge(role) {
    const badges = {
        'Soldat': '<span class="role-badge soldat">⚔️ Soldat</span>',
        'Moine': '<span class="role-badge moine">🙏 Moine</span>',
        'Sorcière': '<span class="role-badge sorciere">🔮 Sorcière</span>',
        'Forgeron': '<span class="role-badge forgeron">🔨 Forgeron</span>',
        'Narrateur': '<span class="role-badge narrateur">📜 Narrateur</span>'
    };
    
    return badges[role] || '';
}

function updateActivePlayersDisplay(players) {
    if (!players || players.length === 0) {
        activePlayersDiv.innerHTML = '<p class="text-muted">Aucun joueur actif</p>';
        return;
    }
    
    activePlayersDiv.innerHTML = players.map(player => `
        <div class="player-item">
            <div>
                <div class="player-name">${player.name}</div>
                <div class="player-role">${player.role}</div>
            </div>
        </div>
    `).join('');
}

function updateAvailableCardsDisplay(playedCards) {
    if (!gameState.availableCards || gameState.availableCards.length === 0) {
        return;
    }
    
    availableCardsDiv.innerHTML = gameState.availableCards.map(card => {
        const isPlayed = playedCards.includes(parseInt(card.numero));
        return `
            <div class="card-item ${isPlayed ? 'played' : ''}" 
                 onclick="${isPlayed ? '' : `selectCard(${card.numero})`}">
                <div class="card-number">${card.numero}</div>
                <div class="card-word">${card.mot}</div>
            </div>
        `;
    }).join('');
}

function selectCard(cardNumber) {
    cardNumberInput.value = cardNumber;
    // Only focus if user is not actively typing in another field
    if (document.activeElement !== playerNameInput && document.activeElement !== playerRoleSelect) {
        cardNumberInput.focus();
    }
}

function loadAvailableCards() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/cards', true);
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                if (xhr.status === 200) {
                    var cards = JSON.parse(xhr.responseText);
                    gameState.availableCards = cards;
                    updateAvailableCardsDisplay([]);
                } else {
                    console.error('Error loading cards:', xhr.status);
                }
            } catch (error) {
                console.error('Error parsing cards response:', error);
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('Error loading cards');
    };
    
    xhr.send();
}

function startRefreshInterval() {
    // Only start refresh if we have player info
    if (gameState.playerName && gameState.playerRole) {
        // Add small random variation to prevent all clients from syncing at exact same time
        var randomOffset = Math.random() * 100; // 0-100ms variation
        var interval = CONFIG.REFRESH_INTERVAL + randomOffset;
        gameState.refreshInterval = setInterval(refreshGameState, interval);
    }
}

function stopRefreshInterval() {
    if (gameState.refreshInterval) {
        clearInterval(gameState.refreshInterval);
        gameState.refreshInterval = null;
    }
}

function updateProcessingState(processingPlayer, processingCard) {
    var processingDiv = document.getElementById('processing-status');
    if (!processingDiv) {
        // Create processing status div if it doesn't exist
        processingDiv = document.createElement('div');
        processingDiv.id = 'processing-status';
        processingDiv.className = 'alert alert-info';
        processingDiv.style.display = 'none';
        
        // Insert after the player form
        var playerForm = document.getElementById('player-form');
        if (playerForm && playerForm.parentNode) {
            playerForm.parentNode.insertBefore(processingDiv, playerForm.nextSibling);
        }
    }
    
    if (processingPlayer && processingCard) {
        // Show processing state
        processingDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span><strong>${processingPlayer}</strong> joue la carte <strong>${processingCard}</strong>... Traitement en cours</span>
            </div>
        `;
        processingDiv.style.display = 'block';
        
        // Disable input for ALL players during processing
        setInputStateForProcessing(processingPlayer, processingCard);
    } else {
        // Hide processing state
        processingDiv.style.display = 'none';
        
        // Re-enable input for all players
        setInputStateForProcessing(null, null);
    }
}

function updateButtonForScore(score, gameEnded) {
    var cardLabel = document.querySelector('label[for="card-number"]');
    
    if (gameEnded) {
        // Game is over - disable everything
        playButton.disabled = true;
        cardNumberInput.disabled = true;
        playButton.innerHTML = '<i class="fas fa-flag-checkered"></i> Jeu terminé';
        playButton.className = 'btn btn-secondary w-100';
        if (cardLabel) {
            cardLabel.textContent = 'Jeu terminé';
        }
        cardNumberInput.placeholder = 'Jeu terminé';
    } else if (score <= 0) {
        // Score is zero or negative - show conclusion button
        playButton.innerHTML = '<i class="fas fa-flag"></i> Conclusion';
        playButton.className = 'btn btn-warning w-100';
        playButton.disabled = false;
        cardNumberInput.disabled = false;
        if (cardLabel) {
            cardLabel.textContent = 'Cliquez sur "Conclusion" pour terminer l\'histoire';
        }
        cardNumberInput.placeholder = 'Cliquez sur "Conclusion"';
        cardNumberInput.removeAttribute('min');
        cardNumberInput.removeAttribute('max');
    } else {
        // Normal game state - show play card button
        playButton.innerHTML = '<i class="fas fa-play"></i> Jouer la carte';
        playButton.className = 'btn btn-primary w-100';
        playButton.disabled = false;
        cardNumberInput.disabled = false;
        if (cardLabel) {
            cardLabel.textContent = 'Numéro de carte (ou 0 pour conclusion)';
        }
        cardNumberInput.placeholder = 'Ex: 12';
        // Supprimer tous les contrôles de validation côté client
        cardNumberInput.removeAttribute('min');
        cardNumberInput.removeAttribute('max');
        cardNumberInput.removeAttribute('step');
    }
}

function resetGame() {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/reset', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                var data = JSON.parse(xhr.responseText);
                
                if (xhr.status === 200) {
                    showAlert(data.message, 'success');
                    
                    // Clear form
                    cardNumberInput.value = '';
                    
                    // Refresh immediately
                    refreshGameState();
                } else {
                    showAlert(data.error || 'Erreur lors de la réinitialisation', 'danger');
                }
            } catch (error) {
                console.error('Error parsing reset response:', error);
                showAlert('Erreur de traitement de la réponse', 'danger');
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('Error resetting game');
        showAlert('Erreur de connexion au serveur', 'danger');
    };
    
    xhr.send('{}');
}

function saveGame() {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/sauver', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                var data = JSON.parse(xhr.responseText);
                
                if (xhr.status === 200) {
                    showAlert('Jeu sauvegardé avec succès!', 'success');
                    
                    // Create download link
                    var link = document.createElement('a');
                    link.href = '/download/' + data.filename;
                    link.download = data.filename;
                    link.click();
                } else {
                    showAlert(data.error || 'Erreur lors de la sauvegarde', 'danger');
                }
            } catch (error) {
                console.error('Error parsing save response:', error);
                showAlert('Erreur de traitement de la réponse', 'danger');
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('Error saving game');
        showAlert('Erreur de connexion au serveur', 'danger');
    };
    
    xhr.send('{}');
}



function showRules() {
    var rulesModal = new bootstrap.Modal(document.getElementById('rulesModal'));
    rulesModal.show();
}

function toggleAvailableCards() {
    var container = document.getElementById('available-cards-container');
    var button = document.getElementById('toggle-cards-btn');
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        button.innerHTML = '<i class="fas fa-eye-slash"></i> Cartes disponibles';
        button.classList.remove('btn-outline-primary');
        button.classList.add('btn-primary');
    } else {
        container.style.display = 'none';
        button.innerHTML = '<i class="fas fa-th-large"></i> Cartes disponibles';
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline-primary');
    }
}

function showAlert(message, type) {
    // Create alert element
    var alert = document.createElement('div');
    alert.className = 'alert alert-' + type + ' alert-dismissible fade show';
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    
    alert.innerHTML = message + '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
    
    document.body.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(function() {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

// Handle page visibility for refresh optimization
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        if (!gameState.refreshInterval) {
            startRefreshInterval();
        }
        refreshGameState();
    } else {
        // Optional: slow down refresh when tab is not visible
        // stopRefreshInterval();
    }
});

// Handle beforeunload for cleanup
window.addEventListener('beforeunload', function() {
    stopRefreshInterval();
});
