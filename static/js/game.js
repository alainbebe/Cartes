// Global game state
let gameState = {
    playerName: '',
    playerRole: '',
    isActive: false,
    availableCards: [],
    refreshInterval: null
};

// DOM elements
const playerForm = document.getElementById('player-form');
const playerNameInput = document.getElementById('player-name');
const playerRoleSelect = document.getElementById('player-role');
const cardNumberInput = document.getElementById('card-number');
const storyContainer = document.getElementById('story-container');
const currentScoreSpan = document.getElementById('current-score');
const cardsProgressBar = document.getElementById('cards-progress');
const cardsPlayedSpan = document.getElementById('cards-played');
const totalCardsSpan = document.getElementById('total-cards');
const activePlayersDiv = document.getElementById('active-players');
const availableCardsDiv = document.getElementById('available-cards');

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    startRefreshInterval();
    loadAvailableCards();
});

function setupEventListeners() {
    playerForm.addEventListener('submit', handleCardPlay);
    
    // Auto-save player info on change
    playerNameInput.addEventListener('change', savePlayerInfo);
    playerRoleSelect.addEventListener('change', savePlayerInfo);
    
    // Load saved player info
    loadPlayerInfo();
}

function savePlayerInfo() {
    gameState.playerName = playerNameInput.value.trim();
    gameState.playerRole = playerRoleSelect.value;
    
    localStorage.setItem('playerName', gameState.playerName);
    localStorage.setItem('playerRole', gameState.playerRole);
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
}

async function handleCardPlay(event) {
    event.preventDefault();
    
    const playerName = playerNameInput.value.trim();
    const playerRole = playerRoleSelect.value;
    const cardNumber = cardNumberInput.value.trim();
    
    if (!playerName || !playerRole) {
        showAlert('Veuillez entrer votre nom et choisir un rôle.', 'warning');
        return;
    }
    
    if (!cardNumber) {
        showAlert('Veuillez entrer un numéro de carte.', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/envoyer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                player_name: playerName,
                player_role: playerRole,
                prompt: cardNumber
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message, 'success');
            cardNumberInput.value = '';
            
            // Refresh immediately after playing
            await refreshGameState();
        } else {
            showAlert(data.error || 'Erreur lors du jeu de la carte', 'danger');
        }
    } catch (error) {
        console.error('Error playing card:', error);
        showAlert('Erreur de connexion au serveur', 'danger');
    }
}

async function refreshGameState() {
    try {
        const response = await fetch('/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                player_name: gameState.playerName,
                player_role: gameState.playerRole
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            updateGameDisplay(data);
        } else {
            console.error('Error refreshing game state:', data.error);
        }
    } catch (error) {
        console.error('Error refreshing game state:', error);
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
    
    // Update available cards
    updateAvailableCardsDisplay(data.played_cards);
    
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
        storyEntry.className = 'story-entry fade-in';
        
        // Add effect class
        if (entry.effect === '+') {
            storyEntry.classList.add('positive');
        } else if (entry.effect === '-') {
            storyEntry.classList.add('negative');
        }
        
        const roleBadge = getRoleBadge(entry.role);
        const cardInfo = entry.card ? ` - ${entry.card.mot}` : '';
        
        storyEntry.innerHTML = `
            <div class="story-content">
                <p><strong>${entry.player}</strong>${roleBadge}: ${entry.text}</p>
                ${cardInfo ? `<div class="story-meta">Carte: ${cardInfo}</div>` : ''}
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
    cardNumberInput.focus();
}

async function loadAvailableCards() {
    try {
        const response = await fetch('/cards');
        const cards = await response.json();
        
        if (response.ok) {
            gameState.availableCards = cards;
            updateAvailableCardsDisplay([]);
        }
    } catch (error) {
        console.error('Error loading cards:', error);
    }
}

function startRefreshInterval() {
    // Refresh every 2 seconds
    gameState.refreshInterval = setInterval(refreshGameState, 2000);
}

function stopRefreshInterval() {
    if (gameState.refreshInterval) {
        clearInterval(gameState.refreshInterval);
        gameState.refreshInterval = null;
    }
}

async function resetGame() {
    try {
        const response = await fetch('/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message, 'success');
            
            // Clear form
            cardNumberInput.value = '';
            
            // Refresh immediately
            await refreshGameState();
            
            // Close modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('gameEndModal'));
            if (modal) {
                modal.hide();
            }
        } else {
            showAlert(data.error || 'Erreur lors de la réinitialisation', 'danger');
        }
    } catch (error) {
        console.error('Error resetting game:', error);
        showAlert('Erreur de connexion au serveur', 'danger');
    }
}

async function saveGame() {
    try {
        const response = await fetch('/sauver', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Jeu sauvegardé avec succès!', 'success');
            
            // Create download link
            const link = document.createElement('a');
            link.href = `/download/${data.filename}`;
            link.download = data.filename;
            link.click();
        } else {
            showAlert(data.error || 'Erreur lors de la sauvegarde', 'danger');
        }
    } catch (error) {
        console.error('Error saving game:', error);
        showAlert('Erreur de connexion au serveur', 'danger');
    }
}

function showGameEndModal(score) {
    const modal = new bootstrap.Modal(document.getElementById('gameEndModal'));
    const message = document.getElementById('game-end-message');
    
    if (score > 5) {
        message.innerHTML = `
            <div class="text-center">
                <i class="fas fa-trophy text-warning" style="font-size: 3em;"></i>
                <h4 class="mt-3">Victoire Épique!</h4>
                <p>Votre histoire s'est terminée de manière glorieuse avec un score de ${score} points!</p>
            </div>
        `;
    } else {
        message.innerHTML = `
            <div class="text-center">
                <i class="fas fa-skull text-danger" style="font-size: 3em;"></i>
                <h4 class="mt-3">Fin Tragique</h4>
                <p>Votre aventure s'est terminée dans les ténèbres avec un score de ${score} points.</p>
            </div>
        `;
    }
    
    modal.show();
}

function showAlert(message, type) {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
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
