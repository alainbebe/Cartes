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
    
    // Initialize story display
    initializeStoryDisplay();
    
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
    
    if (!gameState.playerName || !gameState.playerRole) {
        alert('Veuillez d\'abord renseigner vos informations');
        return;
    }
    
    if (!cardNumber) {
        alert('Veuillez sélectionner une carte');
        return;
    }
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/jouer', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                var data = JSON.parse(xhr.responseText);
                
                if (xhr.status === 200) {
                    cardNumberInput.value = '';
                    refreshGameState();
                } else {
                    alert(data.error || 'Erreur lors du jeu de la carte');
                }
            } catch (error) {
                console.error('Error parsing play response:', error);
                alert('Erreur de traitement de la réponse');
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('Error playing card');
        alert('Erreur de connexion au serveur');
    };
    
    xhr.send(JSON.stringify({
        player_name: gameState.playerName,
        player_role: gameState.playerRole,
        card_number: cardNumber
    }));
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
    
    // Restore interface state after refresh
    restoreInterfaceState();
    
    if (data.game_ended) {
        showGameEndModal(data.score);
    }
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
            console.log('Full image URL:', '/result/' + entry.image_path);
            
            imageElement = 
                '<div class="story-image">' +
                    '<a href="/result/' + entry.image_path + '" target="_blank" rel="noopener noreferrer">' +
                        '<img src="/result/' + entry.image_path + '" alt="Image générée pour ' + entry.player + '" ' +
                             'loading="lazy" onclick="window.open(\'/result/' + entry.image_path + '\', \'_blank\')" ' +
                             'onerror="console.error(\'Failed to load image:\', this.src); this.style.display=\'none\';" ' +
                             'onload="console.log(\'Image loaded successfully:\', this.src);">' +
                    '</a>' +
                '</div>';
        }

        storyEntry.innerHTML = 
            '<div class="story-content">' +
                '<div class="story-text">' +
                    '<p ' + textStyle + '><strong>' + entry.player + '</strong>' + roleBadge + ': ' + entry.text + '</p>' +
                    (cardInfo ? '<div class="story-meta">Carte: ' + cardInfo + '</div>' : '') +
                '</div>' +
                imageElement +
            '</div>';
        
        storyContainer.appendChild(storyEntry);
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
    if (!activePlayersDiv) return;
    
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
        hideCardSelectionInterface();
        document.getElementById('player-form').submit();
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
    var container = document.getElementById('card-selection-container');
    if (container) container.style.display = 'none';
}

function showCardSelectionInterface() {
    var container = document.getElementById('card-selection-container');
    if (container) container.style.display = 'block';
    
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
    
    storyContainer.innerHTML = '<div class="story-entry intro">' +
        '<div class="story-content">' +
            '<div class="story-text">' +
                '<p style="color: white;"><strong>Narrateur</strong><span class="role-badge narrateur">📜 Narrateur</span>: Dans un royaume lointain, une mystérieuse énigme trouble la paix. Les héros doivent unir leurs forces pour résoudre ce mystère et restaurer l\'harmonie.</p>' +
            '</div>' +
        '</div>' +
    '</div>';
}

function showGameEndModal(score) {
    // Placeholder for game end modal
    var message = score > 0 ? 'Félicitations ! Vous avez réussi !' : 'Dommage, vous avez échoué...';
    alert(message);
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