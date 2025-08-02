// Global game state
var gameState = {
    playerName: '',
    playerRole: '',
    deckData: null,
    rolesData: null,
    availableCards: null,
    playedCards: [],
    refreshInterval: null,
    // Interface state persistence
    interfaceState: {
        currentView: 'range-selection', // 'range-selection', 'number-selection', 'special-cards-selection', 'suppression-target-selection'
        currentRange: null // {start: X, end: Y}
    }
};

// Google Cloud Text-to-Speech configuration
var speechConfig = {
    enabled: localStorage.getItem('speechEnabled') === 'true' || false,
    rate: parseFloat(localStorage.getItem('speechRate')) || 1.0,
    pitch: parseFloat(localStorage.getItem('speechPitch')) || 0.0,
    voice_type: localStorage.getItem('speechVoiceType') || 'female',
    autoRead: localStorage.getItem('speechAutoRead') === 'true' || false
};

var currentAudio = null;
var availableVoices = [];

// Configuration
var CONFIG = {
    REFRESH_INTERVAL: 500
};

// DOM elements
var playerNameInput;
var playerRoleSelect;
var cardNumberInput;
var playButton;
var currentScoreSpan;
var cardsProgressBar;
var cardsPlayedSpan;
var totalCardsSpan;
var storyContainer;
var activePlayersDiv;
var availableCardsDiv;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    playerNameInput = document.getElementById('player-name');
    playerRoleSelect = document.getElementById('player-role');
    cardNumberInput = document.getElementById('card-number');
    playButton = document.getElementById('play-button');
    currentScoreSpan = document.getElementById('current-score');
    cardsProgressBar = document.getElementById('cards-progress-bar');
    cardsPlayedSpan = document.getElementById('cards-played');
    totalCardsSpan = document.getElementById('total-cards');
    storyContainer = document.getElementById('story-container');
    activePlayersDiv = document.getElementById('active-players');
    availableCardsDiv = document.getElementById('available-cards');

    // Load stored player data
    loadStoredPlayerData();
    
    // Load initial data
    loadRolesData();
    loadDeckData();
    loadAvailableCards();
    
    // Set up form submission
    var playerForm = document.getElementById('player-form');
    if (playerForm) {
        playerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleCardPlay();
        });
    }
    
    // Set up player info form submission
    var playerInfoForm = document.getElementById('player-info-form');
    if (playerInfoForm) {
        playerInfoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            savePlayerInfo();
        });
    }
    
    // Add live update listeners for name and role changes
    if (playerNameInput) {
        playerNameInput.addEventListener('input', function(e) {
            var name = e.target.value.trim();
            gameState.playerName = name;
            if (typeof Storage !== 'undefined') {
                localStorage.setItem('playerName', name);
            }
            console.log('Player name updated to:', name);
        });
    }
    
    if (playerRoleSelect) {
        playerRoleSelect.addEventListener('change', function(e) {
            var role = e.target.value;
            gameState.playerRole = role;
            if (typeof Storage !== 'undefined') {
                localStorage.setItem('playerRole', role);
            }
            console.log('Player role updated to:', role);
        });
    }
    
    // Initialize story display
    initializeStoryDisplay();
    
    // Initialize speech synthesis
    initializeSpeechSynthesis();
    
    // Start refresh cycle
    refreshGameState();
    startRefreshInterval();
});

function loadStoredPlayerData() {
    if (typeof Storage !== 'undefined') {
        var storedName = localStorage.getItem('playerName');
        var storedRole = localStorage.getItem('playerRole');
        
        if (storedName && playerNameInput) {
            playerNameInput.value = storedName;
            gameState.playerName = storedName;
        }
        
        if (storedRole && playerRoleSelect) {
            playerRoleSelect.value = storedRole;
            gameState.playerRole = storedRole;
        }
        
        // Load interface state
        var storedInterfaceState = localStorage.getItem('interfaceState');
        if (storedInterfaceState) {
            try {
                gameState.interfaceState = JSON.parse(storedInterfaceState);
            } catch (e) {
                console.log('Could not parse stored interface state');
            }
        }
    }
}

function savePlayerInfo() {
    var name = playerNameInput.value.trim();
    var role = playerRoleSelect.value;
    
    if (!name || !role) {
        alert('Veuillez remplir votre nom et choisir un rôle');
        return;
    }
    
    gameState.playerName = name;
    gameState.playerRole = role;
    
    if (typeof Storage !== 'undefined') {
        localStorage.setItem('playerName', name);
        localStorage.setItem('playerRole', role);
    }
    
    startRefreshInterval();
    refreshGameState();
}

function saveInterfaceState() {
    if (typeof Storage !== 'undefined') {
        localStorage.setItem('interfaceState', JSON.stringify(gameState.interfaceState));
    }
}

function handleCardPlay() {
    var cardNumber = cardNumberInput.value.trim();
    
    console.log('handleCardPlay called with card:', cardNumber);
    console.log('Player name:', gameState.playerName);
    console.log('Player role:', gameState.playerRole);
    
    if (!gameState.playerName || !gameState.playerRole) {
        alert('Veuillez d\'abord renseigner vos informations');
        return;
    }
    
    if (!cardNumber) {
        alert('Veuillez sélectionner une carte');
        return;
    }
    
    console.log('Sending card play request...');
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/envoyer', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            console.log('Response received. Status:', xhr.status);
            console.log('Response text:', xhr.responseText);
            
            try {
                var data = JSON.parse(xhr.responseText);
                
                if (xhr.status === 200) {
                    console.log('Card played successfully!');
                    cardNumberInput.value = '';
                    hideWaitingMessage();
                    showCardSelectionInterface();
                    // refreshGameState(); // Remove this to prevent loop
                } else {
                    console.error('Error playing card:', data);
                    hideWaitingMessage();
                    alert(data.error || 'Erreur lors du jeu de la carte');
                    showCardSelectionInterface();
                }
            } catch (error) {
                console.error('Error parsing play response:', error, xhr.responseText);
                hideWaitingMessage();
                alert('Erreur de traitement de la réponse');
                showCardSelectionInterface();
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('Error playing card - network error');
        hideWaitingMessage();
        alert('Erreur de connexion au serveur');
        showCardSelectionInterface();
    };
    
    var payload = {
        player_name: gameState.playerName,
        player_role: gameState.playerRole,
        prompt: cardNumber
    };
    
    console.log('Sending payload:', payload);
    xhr.send(JSON.stringify(payload));
}

function loadDeckData() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/deck', true);
    
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

function loadRolesData() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/roles', true);
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                if (xhr.status === 200) {
                    gameState.rolesData = JSON.parse(xhr.responseText);
                    console.log('Roles data loaded:', gameState.rolesData.length, 'roles');
                    populateRoleSelect();
                } else {
                    console.error('Error loading roles data:', xhr.status);
                }
            } catch (error) {
                console.error('Error parsing roles data:', error);
            }
        }
    };
    
    xhr.send();
}

function populateRoleSelect() {
    if (!playerRoleSelect || !gameState.rolesData) return;
    
    while (playerRoleSelect.children.length > 1) {
        playerRoleSelect.removeChild(playerRoleSelect.lastChild);
    }
    
    for (var i = 0; i < gameState.rolesData.length; i++) {
        var role = gameState.rolesData[i];
        var option = document.createElement('option');
        option.value = role.id;
        option.textContent = role.badge + ' ' + role.name;
        option.setAttribute('data-description', role.description);
        playerRoleSelect.appendChild(option);
    }
    
    playerRoleSelect.addEventListener('change', showRoleDescription);
}

function showRoleDescription() {
    var roleDescription = document.getElementById('role-description');
    if (!playerRoleSelect || !roleDescription) return;
    
    var selectedOption = playerRoleSelect.options[playerRoleSelect.selectedIndex];
    
    if (selectedOption && selectedOption.getAttribute('data-description')) {
        roleDescription.textContent = selectedOption.getAttribute('data-description');
        roleDescription.style.display = 'block';
    } else {
        roleDescription.style.display = 'none';
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
    if (currentScoreSpan) currentScoreSpan.textContent = data.score;
    
    var playedCount = data.played_cards.length;
    var totalCount = data.total_cards;
    var progressPercent = (playedCount / totalCount) * 100;
    
    if (cardsProgressBar) cardsProgressBar.style.width = progressPercent + '%';
    if (cardsPlayedSpan) cardsPlayedSpan.textContent = playedCount;
    if (totalCardsSpan) totalCardsSpan.textContent = totalCount;
    
    gameState.playedCards = data.played_cards;
    
    updateStoryDisplay(data.story);
    updateActivePlayersDisplay(data.active_players);
    
    var playersCountSpan = document.getElementById('players-count');
    if (playersCountSpan) {
        playersCountSpan.textContent = data.active_players.length;
    }
    
    updateAvailableCardsDisplay(data.played_cards);
    updateProcessingState(data.processing_player, data.processing_card);
    updateButtonForScore(data.score, data.game_ended);
    
    // Only restore interface state if not processing
    if (!data.processing_player) {
        restoreInterfaceState();
    }
    
    // No modal needed when game ends - conclusion is shown in story display
}

function updateStoryDisplay(story) {
    if (!storyContainer) return;
    
    var entries = storyContainer.querySelectorAll('.story-entry:not(.intro)');
    for (var i = 0; i < entries.length; i++) {
        entries[i].remove();
    }
    
    for (var j = 0; j < story.length; j++) {
        var entry = story[j];
        var storyEntry = document.createElement('div');
        storyEntry.className = 'story-entry';
        
        if (entry.effect === '+') {
            storyEntry.classList.add('positive');
        } else if (entry.effect === '-') {
            storyEntry.classList.add('negative');
        }
        
        var roleBadge = getRoleBadge(entry.role);
        var cardInfo = entry.card ? ' - ' + entry.card.mot : '';
        var textStyle = entry.player === 'Narrateur' ? 'style="color: white;"' : '';
        
        var imageElement = '';
        if (entry.image_path) {
            console.log('Image path found:', entry.image_path);
            
            var imageUrl, linkUrl;
            if (entry.is_original_image) {
                // Original image from barbason.be
                imageUrl = entry.image_path;
                linkUrl = entry.image_path;
                console.log('Using original image URL:', imageUrl);
            } else {
                // Generated image from result directory
                imageUrl = '/result/' + entry.image_path;
                linkUrl = '/result/' + entry.image_path;
                console.log('Using generated image URL:', imageUrl);
            }
            
            var imgStyle = 'display: block; width: 100%; height: 120px; object-fit: cover;';
            var onErrorHandler = 'console.error(\'Failed to load image:\', this.src); this.style.backgroundColor=\'var(--secondary-color)\'; this.style.border=\'2px dashed var(--border-color)\'; this.title=\'Image non disponible - cliquez pour ouvrir dans un nouvel onglet\';';
            var onLoadHandler = 'console.log(\'Image loaded successfully:\', this.src);';
            
            imageElement = 
                '<div class="story-image">' +
                    '<a href="' + linkUrl + '" target="_blank" rel="noopener noreferrer" title="Cliquer pour agrandir">' +
                        '<img src="' + imageUrl + '" alt="Image pour ' + entry.player + '" ' +
                             'style="' + imgStyle + '" ' +
                             'loading="lazy" ' +
                             'onerror="' + onErrorHandler + '" ' +
                             'onload="' + onLoadHandler + '" ' +
                             'onclick="window.open(\'' + linkUrl + '\', \'_blank\')">' +
                    '</a>' +
                '</div>';
        }

        // Clean text for speech function call (escape quotes)
        var cleanTextForSpeech = entry.text.replace(/'/g, "\\'").replace(/"/g, '\\"');
        
        storyEntry.innerHTML = 
            '<div class="story-content">' +
                '<div class="story-text">' +
                    '<button class="btn btn-sm btn-outline-secondary speech-btn" onclick="speakText(\'' + cleanTextForSpeech + '\')" title="Écouter ce texte">' +
                        '<i class="fas fa-volume-up"></i>' +
                    '</button>' +
                    '<p ' + textStyle + '><strong>' + entry.player + '</strong>' + roleBadge + ': ' + entry.text + '</p>' +
                    (cardInfo ? '<div class="story-meta">Carte: ' + cardInfo + '</div>' : '') +
                '</div>' +
                imageElement +
            '</div>';
        
        storyContainer.appendChild(storyEntry);
        
        // Auto-read new story entries if enabled (only for the last entry)
        if (speechConfig.enabled && speechConfig.autoRead && i === story.length - 1 && story.length > previousStoryLength) {
            setTimeout(function() {
                speakText(entry.text);
            }, 1000);
        }
    }
    
    storyContainer.scrollTop = storyContainer.scrollHeight;
}

function getRoleBadge(role) {
    if (role === 'Narrateur') {
        return '<span class="role-badge narrateur">📜 Narrateur</span>';
    }
    
    if (gameState.rolesData && gameState.rolesData.length > 0) {
        for (var i = 0; i < gameState.rolesData.length; i++) {
            var roleData = gameState.rolesData[i];
            if (roleData.id === role || roleData.name === role) {
                var style = '';
                if (roleData.colors) {
                    style = 'style="background-color: ' + roleData.colors.background + '; color: ' + roleData.colors.color + '; border-color: ' + roleData.colors.border + ';"';
                }
                return '<span class="role-badge dynamic-role" ' + style + '>' + roleData.badge + ' ' + roleData.name + '</span>';
            }
        }
    }
    
    return '';
}

function updateActivePlayersDisplay(players) {
    if (!activePlayersDiv) {
        // Try to find it again
        activePlayersDiv = document.getElementById('active-players');
        if (!activePlayersDiv) {
            return;
        }
    }
    
    if (!players || players.length === 0) {
        activePlayersDiv.innerHTML = '<p class="text-muted">Aucun joueur actif</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < players.length; i++) {
        var player = players[i];
        html += '<div class="player-item">' +
            '<div>' +
                '<div class="player-name">' + player.name + '</div>' +
                '<div class="player-role">' + player.role + '</div>' +
            '</div>' +
        '</div>';
    }
    
    activePlayersDiv.innerHTML = html;
}

function updateAvailableCardsDisplay(playedCards) {
    if (!availableCardsDiv || !gameState.availableCards || gameState.availableCards.length === 0) {
        return;
    }
    
    var html = '';
    for (var i = 0; i < gameState.availableCards.length; i++) {
        var card = gameState.availableCards[i];
        var isPlayed = playedCards.indexOf(parseInt(card.numero)) !== -1;
        html += '<div class="card-item ' + (isPlayed ? 'played' : '') + '" ' +
                 'onclick="' + (isPlayed ? '' : 'selectCard(' + card.numero + ')') + '">' +
                '<div class="card-number">' + card.numero + '</div>' +
                '<div class="card-word">' + card.mot + '</div>' +
            '</div>';
    }
    availableCardsDiv.innerHTML = html;
}

// Card Selection Functions
function selectCard(cardNumber) {
    cardNumberInput.value = cardNumber;
    
    var cardName = getCardName(cardNumber);
    var confirmMessage;
    
    if (cardNumber === 0) {
        confirmMessage = "Voulez-vous terminer la partie et générer la conclusion ?";
    } else if (cardNumber === 100) {
        confirmMessage = "Voulez-vous jouer la carte spéciale 100 : « Inversion » ?";
    } else if (cardNumber >= 101) {
        confirmMessage = "Voulez-vous jouer la carte spéciale 101 : « Suppression » ?";
    } else {
        confirmMessage = "Voulez-vous jouer " + cardNumber + " : « " + cardName + " » ?";
    }
    
    if (confirm(confirmMessage)) {
        console.log('Card confirmed, sending:', cardNumber);
        
        // Show waiting message immediately
        showWaitingMessage(gameState.playerName, cardNumber);
        hideCardSelectionInterface();
        
        // Use our AJAX function instead of form submit
        handleCardPlay();
        
        // Reset interface state after successful play
        gameState.interfaceState.currentView = 'range-selection';
        gameState.interfaceState.currentRange = null;
        saveInterfaceState();
    } else {
        cardNumberInput.value = '';
        showCardSelectionInterface();
    }
}

function selectRange(start, end) {
    // Update interface state
    gameState.interfaceState.currentView = 'number-selection';
    gameState.interfaceState.currentRange = {start: start, end: end};
    saveInterfaceState();
    
    document.getElementById('range-selection').style.display = 'none';
    document.getElementById('number-selection').style.display = 'block';
    
    document.getElementById('current-range').textContent = start + '-' + end;
    
    var numberButtons = document.getElementById('number-buttons');
    numberButtons.innerHTML = '';
    
    for (var i = start; i <= end; i++) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-primary';
        button.textContent = i;
        button.onclick = (function(num) {
            return function() { selectCard(num); };
        })(i);
        numberButtons.appendChild(button);
    }
}

function goBackToRanges() {
    // Update interface state
    gameState.interfaceState.currentView = 'range-selection';
    gameState.interfaceState.currentRange = null;
    saveInterfaceState();
    
    document.getElementById('range-selection').style.display = 'block';
    document.getElementById('number-selection').style.display = 'none';
}

function showSpecialCards() {
    // Update interface state
    gameState.interfaceState.currentView = 'special-cards-selection';
    saveInterfaceState();
    
    document.getElementById('range-selection').style.display = 'none';
    document.getElementById('special-cards-selection').style.display = 'block';
}

function hideSpecialCards() {
    // Update interface state
    gameState.interfaceState.currentView = 'range-selection';
    saveInterfaceState();
    
    document.getElementById('range-selection').style.display = 'block';
    document.getElementById('special-cards-selection').style.display = 'none';
}

function showSuppressionTarget() {
    var playedCards = getCurrentPlayedCards();
    
    if (playedCards.length === 0) {
        alert("Aucune carte n'a encore été jouée pour pouvoir être supprimée.");
        return;
    }
    
    // Update interface state
    gameState.interfaceState.currentView = 'suppression-target-selection';
    saveInterfaceState();
    
    document.getElementById('special-cards-selection').style.display = 'none';
    document.getElementById('suppression-target-selection').style.display = 'block';
    
    var suppressionTargets = document.getElementById('suppression-targets');
    suppressionTargets.innerHTML = '';
    
    for (var i = 0; i < playedCards.length; i++) {
        var cardNumber = playedCards[i];
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-danger';
        button.textContent = cardNumber;
        button.onclick = (function(num) {
            return function() { selectCard('101 ' + num); };
        })(cardNumber);
        suppressionTargets.appendChild(button);
    }
}

function backToSpecialCards() {
    // Update interface state
    gameState.interfaceState.currentView = 'special-cards-selection';
    saveInterfaceState();
    
    document.getElementById('special-cards-selection').style.display = 'block';
    document.getElementById('suppression-target-selection').style.display = 'none';
}

function hideCardSelectionInterface() {
    // Ne pas masquer le container, juste masquer les éléments de sélection
    var rangeSelection = document.getElementById('range-selection');
    var numberSelection = document.getElementById('number-selection');
    var specialCardsSelection = document.getElementById('special-cards-selection');
    var suppressionTargetSelection = document.getElementById('suppression-target-selection');
    var specialCards = document.querySelector('.special-cards');
    
    if (rangeSelection) rangeSelection.style.display = 'none';
    if (numberSelection) numberSelection.style.display = 'none';
    if (specialCardsSelection) specialCardsSelection.style.display = 'none';
    if (suppressionTargetSelection) suppressionTargetSelection.style.display = 'none';
    if (specialCards) specialCards.style.display = 'none';
    
    // Le container reste visible pour afficher le message d'attente
    var container = document.getElementById('card-selection-container');
    if (container) {
        container.style.display = 'block';
    }
}

function showCardSelectionInterface() {
    var container = document.getElementById('card-selection-container');
    if (container) container.style.display = 'block';
    
    // Masquer le message d'attente quand on remet l'interface
    var waitingDiv = document.getElementById('waiting-status');
    if (waitingDiv) {
        waitingDiv.style.display = 'none';
    }
    
    // Remettre les boutons spéciaux visibles
    var specialCards = document.querySelector('.special-cards');
    if (specialCards) {
        specialCards.style.display = 'block';
    }
    
    // Reset to default view if no stored state
    if (!gameState.interfaceState.currentView || gameState.interfaceState.currentView === 'range-selection') {
        document.getElementById('range-selection').style.display = 'block';
        document.getElementById('number-selection').style.display = 'none';
        document.getElementById('special-cards-selection').style.display = 'none';
        document.getElementById('suppression-target-selection').style.display = 'none';
    } else {
        // Will be restored by restoreInterfaceState()
    }
}

function restoreInterfaceState() {
    if (!gameState.interfaceState || !gameState.interfaceState.currentView) {
        return;
    }
    
    // Hide all views first
    document.getElementById('range-selection').style.display = 'none';
    document.getElementById('number-selection').style.display = 'none';
    document.getElementById('special-cards-selection').style.display = 'none';
    document.getElementById('suppression-target-selection').style.display = 'none';
    
    // Show the current view
    var currentView = gameState.interfaceState.currentView;
    document.getElementById(currentView).style.display = 'block';
    
    // Restore specific state for number selection
    if (currentView === 'number-selection' && gameState.interfaceState.currentRange) {
        var range = gameState.interfaceState.currentRange;
        document.getElementById('current-range').textContent = range.start + '-' + range.end;
        
        var numberButtons = document.getElementById('number-buttons');
        numberButtons.innerHTML = '';
        
        for (var i = range.start; i <= range.end; i++) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline-primary';
            button.textContent = i;
            button.onclick = (function(num) {
                return function() { selectCard(num); };
            })(i);
            numberButtons.appendChild(button);
        }
    }
    
    // Restore suppression targets if needed
    if (currentView === 'suppression-target-selection') {
        var playedCards = getCurrentPlayedCards();
        var suppressionTargets = document.getElementById('suppression-targets');
        suppressionTargets.innerHTML = '';
        
        for (var i = 0; i < playedCards.length; i++) {
            var cardNumber = playedCards[i];
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline-danger';
            button.textContent = cardNumber;
            button.onclick = (function(num) {
                return function() { selectCard('101 ' + num); };
            })(cardNumber);
            suppressionTargets.appendChild(button);
        }
    }
}

function getCardName(cardNumber) {
    if (gameState.deckData) {
        for (var i = 0; i < gameState.deckData.length; i++) {
            if (parseInt(gameState.deckData[i].numero) === cardNumber) {
                return gameState.deckData[i].mot;
            }
        }
    }
    return 'Carte inconnue';
}

function getCurrentPlayedCards() {
    return gameState.playedCards || [];
}

// Other Functions
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
    
    xhr.send();
}

function startRefreshInterval() {
    if (gameState.playerName && gameState.playerRole) {
        var randomOffset = Math.random() * 100;
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
        processingDiv = document.createElement('div');
        processingDiv.id = 'processing-status';
        processingDiv.className = 'alert alert-info';
        processingDiv.style.display = 'none';
        
        var playerForm = document.getElementById('player-form');
        if (playerForm && playerForm.parentNode) {
            playerForm.parentNode.insertBefore(processingDiv, playerForm.nextSibling);
        }
    }
    
    if (processingPlayer && processingCard) {
        processingDiv.innerHTML = 
            '<div class="d-flex align-items-center">' +
                '<div class="spinner-border spinner-border-sm me-2" role="status">' +
                    '<span class="visually-hidden">Loading...</span>' +
                '</div>' +
                '<span><strong>' + processingPlayer + '</strong> joue la carte <strong>' + processingCard + '</strong>... Traitement en cours</span>' +
            '</div>';
        processingDiv.style.display = 'block';
        hideCardSelectionInterface();
    } else {
        processingDiv.style.display = 'none';
        showCardSelectionInterface();
    }
}

function updateButtonForScore(score, gameEnded) {
    var cardLabel = document.querySelector('label[for="card-number"]');
    
    if (gameEnded) {
        if (playButton) {
            playButton.disabled = true;
            playButton.innerHTML = '<i class="fas fa-flag-checkered"></i> Jeu terminé';
            playButton.className = 'btn btn-secondary w-100';
        }
        if (cardNumberInput) cardNumberInput.disabled = true;
        if (cardLabel) cardLabel.textContent = 'Jeu terminé';
        if (cardNumberInput) cardNumberInput.placeholder = 'Jeu terminé';
    } else if (score <= 0) {
        if (playButton) {
            playButton.innerHTML = '<i class="fas fa-flag"></i> Conclusion';
            playButton.className = 'btn btn-warning w-100';
            playButton.disabled = false;
        }
        if (cardNumberInput) cardNumberInput.disabled = false;
        if (cardLabel) cardLabel.textContent = 'Cliquez sur "Conclusion" pour terminer l\'histoire';
        if (cardNumberInput) cardNumberInput.placeholder = 'Cliquez sur "Conclusion"';
    } else {
        if (playButton) {
            playButton.innerHTML = '<i class="fas fa-play"></i> Jouer la carte';
            playButton.className = 'btn btn-primary w-100';
            playButton.disabled = false;
        }
        if (cardNumberInput) cardNumberInput.disabled = false;
        if (cardLabel) cardLabel.textContent = 'Numéro de carte (ou 0 pour conclusion)';
        if (cardNumberInput) cardNumberInput.placeholder = 'Ex: 12';
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
                    if (cardNumberInput) cardNumberInput.value = '';
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
    var alert = document.createElement('div');
    alert.className = 'alert alert-' + type + ' alert-dismissible fade show';
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    
    alert.innerHTML = message + '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
    
    document.body.appendChild(alert);
    
    setTimeout(function() {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

function initializeStoryDisplay() {
    if (!storyContainer) return;
    
    // Initialize with empty story container
    storyContainer.innerHTML = '';
}

function showGameEndModal(score) {
    // Game end modal removed as requested by user
    // The game conclusion is already shown in the story display
}

function showWaitingMessage(playerName, cardNumber) {
    console.log('showWaitingMessage called with:', playerName, cardNumber);
    
    var waitingDiv = document.getElementById('waiting-status');
    if (!waitingDiv) {
        waitingDiv = document.createElement('div');
        waitingDiv.id = 'waiting-status';
        waitingDiv.className = 'alert alert-info';
        waitingDiv.style.margin = '20px 0';
        
        // Insert dans le container de sélection de cartes
        var cardSelectionContainer = document.getElementById('card-selection-container');
        if (cardSelectionContainer) {
            cardSelectionContainer.appendChild(waitingDiv);
            console.log('Waiting message added to card selection container');
        } else {
            console.error('Card selection container not found!');
            return;
        }
    }
    
    waitingDiv.innerHTML = 
        '<div class="d-flex align-items-center justify-content-center">' +
            '<div class="spinner-border spinner-border-sm me-2" role="status">' +
                '<span class="visually-hidden">Loading...</span>' +
            '</div>' +
            '<span><strong>' + playerName + '</strong> joue la carte <strong>' + cardNumber + '</strong>...</span>' +
        '</div>' +
        '<div class="text-center small mt-2">Traitement en cours, veuillez patienter</div>';
    
    waitingDiv.style.display = 'block';
    waitingDiv.style.visibility = 'visible';
    waitingDiv.style.opacity = '1';
    
    console.log('Waiting message should now be visible');
}

function hideWaitingMessage() {
    var waitingDiv = document.getElementById('waiting-status');
    if (waitingDiv) {
        waitingDiv.style.display = 'none';
    }
}

// Event listeners
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        if (!gameState.refreshInterval) {
            startRefreshInterval();
        }
        refreshGameState();
    }
});

window.addEventListener('beforeunload', function() {
    stopRefreshInterval();
});

// Web Speech API Functions
function initializeSpeechSynthesis() {
    console.log('Initializing Google Cloud Text-to-Speech...');
    
    // Load available voices from server
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/speech_voices', true);
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        availableVoices = response.voices;
                        console.log('Available Google TTS voices loaded:', availableVoices.length);
                        
                        // Set default voice if not set
                        if (!speechConfig.voice_type && availableVoices.length > 0) {
                            speechConfig.voice_type = 'female';
                            saveSpeechConfig();
                        }
                    } else {
                        console.error('Failed to load voices:', response.error);
                    }
                } catch (error) {
                    console.error('Error parsing voices response:', error);
                }
            } else {
                console.warn('Could not load Google TTS voices (status:', xhr.status, ')');
            }
            
            // Update controls regardless of voice loading success
            updateSpeechControls();
        }
    };
    
    xhr.send();
    
    // Initialize speech controls immediately
    setTimeout(function() {
        updateSpeechControls();
        console.log('Google Cloud TTS initialized');
    }, 100);
}

function speakText(text) {
    console.log('speakText called with enabled:', speechConfig.enabled, 'text length:', text ? text.length : 0);
    
    if (!speechConfig.enabled || !text) {
        console.log('Speech disabled or no text');
        return;
    }
    
    // Stop any current speech
    stopSpeech();
    
    // Clean text for speech
    var cleanText = text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
    if (!cleanText) {
        console.log('No clean text to speak');
        return;
    }
    
    console.log('Using Google TTS for text:', cleanText.substring(0, 100) + '...');
    
    // Show loading state
    updateSpeechButtons(true);
    
    // Call Google Cloud Text-to-Speech API
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/synthesize_speech', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.success && response.audio_content) {
                        console.log('✓ Google TTS synthesis successful');
                        playAudioFromBase64(response.audio_content, response.audio_format);
                    } else {
                        console.error('✗ TTS API error:', response.error || 'Unknown error');
                        alert('Erreur de synthèse vocale: ' + (response.error || 'Erreur inconnue'));
                        updateSpeechButtons(false);
                    }
                } catch (error) {
                    console.error('✗ Error parsing TTS response:', error);
                    alert('Erreur lors du traitement de la réponse vocale');
                    updateSpeechButtons(false);
                }
            } else {
                console.error('✗ TTS API HTTP error:', xhr.status);
                alert('Erreur de connexion à l\'API vocale (HTTP ' + xhr.status + ')');
                updateSpeechButtons(false);
            }
        }
    };
    
    // Send request with speech parameters
    var requestData = {
        text: cleanText,
        voice_type: speechConfig.voice_type,
        rate: speechConfig.rate,
        pitch: speechConfig.pitch
    };
    
    xhr.send(JSON.stringify(requestData));
}

function playAudioFromBase64(audioBase64, format) {
    try {
        // Create audio blob from base64
        var binaryString = atob(audioBase64);
        var bytes = new Uint8Array(binaryString.length);
        for (var i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        var blob = new Blob([bytes], { type: 'audio/' + format });
        var audioUrl = URL.createObjectURL(blob);
        
        // Create and play audio element
        currentAudio = new Audio(audioUrl);
        
        currentAudio.onloadstart = function() {
            console.log('✓ Audio loading started');
        };
        
        currentAudio.oncanplay = function() {
            console.log('✓ Audio ready to play');
        };
        
        currentAudio.onplay = function() {
            console.log('✓ Audio playback started');
        };
        
        currentAudio.onended = function() {
            console.log('✓ Audio playback ended');
            updateSpeechButtons(false);
            URL.revokeObjectURL(audioUrl);
            currentAudio = null;
        };
        
        currentAudio.onerror = function(e) {
            console.error('✗ Audio playback error:', e);
            alert('Erreur lors de la lecture audio');
            updateSpeechButtons(false);
            URL.revokeObjectURL(audioUrl);
            currentAudio = null;
        };
        
        // Start playing
        currentAudio.play().catch(function(error) {
            console.error('✗ Audio play failed:', error);
            alert('Impossible de lire l\'audio. Veuillez interagir avec la page d\'abord.');
            updateSpeechButtons(false);
        });
        
    } catch (error) {
        console.error('✗ Error creating audio from base64:', error);
        alert('Erreur lors de la création de l\'audio');
        updateSpeechButtons(false);
    }
}

function stopSpeech() {
    try {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
            console.log('Audio stopped');
        }
        updateSpeechButtons(false);
    } catch (error) {
        console.error('Error stopping audio:', error);
    }
}

function toggleSpeech() {
    speechConfig.enabled = !speechConfig.enabled;
    console.log('Speech toggled:', speechConfig.enabled);
    saveSpeechConfig();
    updateSpeechControls();
    
    if (!speechConfig.enabled) {
        stopSpeech();
    } else {
        // Test speech when enabled
        setTimeout(function() {
            testSpeech();
        }, 500);
    }
}

function toggleAutoRead() {
    speechConfig.autoRead = !speechConfig.autoRead;
    console.log('Auto-read toggled:', speechConfig.autoRead);
    saveSpeechConfig();
    updateSpeechControls();
}

function updateSpeechRate(rate) {
    speechConfig.rate = parseFloat(rate);
    saveSpeechConfig();
    
    // Update display value
    var valueSpan = document.getElementById('speech-rate-value');
    if (valueSpan) {
        valueSpan.textContent = rate + 'x';
    }
}

function updateSpeechButtons(speaking) {
    var speechButtons = document.querySelectorAll('.speech-btn i');
    speechButtons.forEach(function(icon) {
        if (speaking) {
            icon.className = 'fas fa-stop';
            icon.parentElement.title = 'Arrêter la lecture';
        } else {
            icon.className = 'fas fa-volume-up';
            icon.parentElement.title = 'Écouter ce texte';
        }
    });
}

function updateSpeechControls() {
    // Check if current player is admin
    var playerName = localStorage.getItem('playerName');
    var isAdmin = (playerName === 'Alain');
    
    // Show/hide admin voice panel
    var adminPanel = document.getElementById('admin-voice-panel');
    if (adminPanel) {
        adminPanel.style.display = isAdmin ? 'block' : 'none';
    }
    
    var enableBtn = document.getElementById('speech-enable-btn');
    var autoReadBtn = document.getElementById('speech-autoread-btn');
    var rateSlider = document.getElementById('speech-rate-slider');
    var pitchSlider = document.getElementById('speech-pitch-slider');
    var speechControlsDiv = document.querySelector('.speech-controls');
    var rateValueSpan = document.getElementById('speech-rate-value');
    var pitchValueSpan = document.getElementById('speech-pitch-value');
    var femaleRadio = document.getElementById('voice-female');
    var maleRadio = document.getElementById('voice-male');
    
    // Update enable button
    if (enableBtn) {
        enableBtn.innerHTML = speechConfig.enabled ? 
            '<i class="fas fa-volume-up"></i> Activé' : 
            '<i class="fas fa-volume-mute"></i> Désactivé';
        enableBtn.className = speechConfig.enabled ? 
            'btn btn-success btn-sm' : 
            'btn btn-outline-secondary btn-sm';
    }
    
    // Update auto-read button
    if (autoReadBtn) {
        autoReadBtn.innerHTML = speechConfig.autoRead ? 
            '<i class="fas fa-play"></i> Auto' : 
            '<i class="fas fa-pause"></i> Manuel';
        autoReadBtn.className = speechConfig.autoRead ? 
            'btn btn-info btn-sm' : 
            'btn btn-outline-secondary btn-sm';
        autoReadBtn.style.display = speechConfig.enabled ? 'inline-block' : 'none';
    }
    
    // Show/hide speech controls
    if (speechControlsDiv) {
        speechControlsDiv.style.display = speechConfig.enabled ? 'block' : 'none';
    }
    
    // Update rate slider and value
    if (rateSlider) {
        rateSlider.value = speechConfig.rate;
    }
    if (rateValueSpan) {
        rateValueSpan.textContent = speechConfig.rate + 'x';
    }
    
    // Update pitch slider and value
    if (pitchSlider) {
        pitchSlider.value = speechConfig.pitch;
    }
    if (pitchValueSpan) {
        pitchValueSpan.textContent = speechConfig.pitch;
    }
    
    // Update voice type radio buttons
    if (femaleRadio && maleRadio) {
        femaleRadio.checked = (speechConfig.voice_type === 'female');
        maleRadio.checked = (speechConfig.voice_type === 'male');
    }
}

// Firefox Android specific fixes - Apply on load
function applyFirefoxAndroidFixes() {
    console.log('Applying Firefox Android compatibility fixes...');
    
    // Force story container to be visible
    var storyContainer = document.getElementById('story-container');
    if (storyContainer) {
        storyContainer.style.display = 'block';
        storyContainer.style.visibility = 'visible';
        storyContainer.style.opacity = '1';
        
        // Force reflow
        storyContainer.offsetHeight;
        console.log('Story container visibility forced');
    }
    
    // Add specific CSS class for Firefox Android
    document.body.classList.add('firefox-android');
    
    // Force text rendering with dynamic styles
    var style = document.createElement('style');
    style.id = 'firefox-android-fixes';
    style.textContent = `
        .firefox-android .story-text {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            font-weight: normal !important;
            text-rendering: optimizeLegibility !important;
            line-height: 1.6 !important;
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
        }
        .firefox-android .story-entry {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin-bottom: 15px !important;
            padding: 10px !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 5px !important;
            background: var(--card-background) !important;
        }
        .firefox-android #story-container {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            min-height: 200px !important;
        }
        .firefox-android .story-header {
            display: block !important;
            font-weight: bold !important;
            margin-bottom: 8px !important;
            color: var(--accent-color) !important;
        }
        .firefox-android .story-image {
            width: 200px !important;
            height: 280px !important;
            overflow: hidden !important;
            border-radius: 8px !important;
            border: 2px solid var(--border-color) !important;
            background-color: var(--secondary-color) !important;
            display: block !important;
        }
        .firefox-android .story-image img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            object-position: center !important;
            display: block !important;
            aspect-ratio: 5/7 !important;
        }
    `;
    document.head.appendChild(style);
    
    // Force re-render of story entries after a short delay
    setTimeout(function() {
        var storyEntries = document.querySelectorAll('.story-entry');
        storyEntries.forEach(function(entry) {
            entry.style.display = 'none';
            entry.offsetHeight; // Force reflow
            entry.style.display = 'block';
        });
        console.log('Firefox Android fixes applied to', storyEntries.length, 'story entries');
    }, 100);
}

// Check for Firefox Android and apply fixes
if (navigator.userAgent.toLowerCase().includes('firefox') && 
    navigator.userAgent.toLowerCase().includes('mobile')) {
    console.log('Firefox Android detected');
    
    // Apply fixes when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFirefoxAndroidFixes);
    } else {
        applyFirefoxAndroidFixes();
    }
    
    // Also apply fixes when story is updated
    var originalUpdateStoryDisplay = updateStoryDisplay;
    updateStoryDisplay = function(storyData) {
        var result = originalUpdateStoryDisplay.call(this, storyData);
        setTimeout(applyFirefoxAndroidFixes, 50);
        return result;
    };
    
    // Additional periodic fix application for Firefox Android
    setInterval(function() {
        var images = document.querySelectorAll('.story-image img');
        images.forEach(function(img) {
            if (img.style.width !== '100%' || img.style.height !== '100%') {
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.style.display = 'block';
                console.log('Re-applied Firefox Android image fixes');
            }
        });
    }, 2000);
}

function saveSpeechConfig() {
    if (typeof Storage !== 'undefined') {
        localStorage.setItem('speechEnabled', speechConfig.enabled.toString());
        localStorage.setItem('speechRate', speechConfig.rate.toString());
        localStorage.setItem('speechPitch', speechConfig.pitch.toString());
        localStorage.setItem('speechVoiceType', speechConfig.voice_type || 'female');
        localStorage.setItem('speechAutoRead', speechConfig.autoRead.toString());
        console.log('Speech config saved:', speechConfig);
    }
}

// Test function for speech synthesis
function testSpeech() {
    speakText('Bonjour ! Ceci est un test de la synthèse vocale française avec Google Cloud.');
}

// Voice control functions
function updateSpeechRate(value) {
    speechConfig.rate = parseFloat(value);
    var valueElement = document.getElementById('speech-rate-value');
    if (valueElement) {
        valueElement.textContent = speechConfig.rate + 'x';
    }
    saveSpeechConfig();
}

function updateSpeechPitch(value) {
    speechConfig.pitch = parseFloat(value);
    var valueElement = document.getElementById('speech-pitch-value');
    if (valueElement) {
        valueElement.textContent = value;
    }
    saveSpeechConfig();
}

function updateVoiceType(type) {
    speechConfig.voice_type = type;
    console.log('Voice type changed to:', type);
    saveSpeechConfig();
    
    // Update UI to reflect selection
    var femaleRadio = document.getElementById('voice-female');
    var maleRadio = document.getElementById('voice-male');
    
    if (femaleRadio && maleRadio) {
        femaleRadio.checked = (type === 'female');
        maleRadio.checked = (type === 'male');
    }
}

// Test speech functionality
function testSpeech() {
    var testText = "Bonjour ! Ceci est un test de la synthèse vocale. Les réglages actuels sont appliqués.";
    speakText(testText);
}