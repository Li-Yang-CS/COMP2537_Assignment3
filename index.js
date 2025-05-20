// Game state
const gameState = {
    firstCard: null,
    secondCard: null,
    lockBoard: false,
    gameActive: false,
    gameStarted: false,
    clicks: 0,
    matches: 0,
    totalPairs: 3,
    timeLeft: 60,
    timer: null,
    difficulty: 'easy',
    powerupUsed: false,
    pokemonData: []
};

// Difficulty settings
const difficulties = {
    easy: { pairs: 3, time: 60 },
    medium: { pairs: 6, time: 90 },
    hard: { pairs: 8, time: 120 }
};

// Initialize when page loads
$(document).ready(function() {
    initializeGame();
});

function initializeGame() {
    // Event listeners
    $('#start-btn').click(startGame);
    $('#reset-btn').click(resetGame);
    $('#theme-btn').click(toggleTheme);
    $('#powerup-btn').click(usePowerup);
    $('#play-again').click(startGame);
    
    $('#difficulty').change(function() {
        gameState.difficulty = $(this).val();
        updateDifficultySettings();
    });
    
    updateDisplay();
}

async function startGame() {
    // Hide message
    $('#message').addClass('hidden');
    
    // Reset game state
    resetGameState();
    
    // Get difficulty settings
    const settings = difficulties[gameState.difficulty];
    gameState.totalPairs = settings.pairs;
    gameState.timeLeft = settings.time;
    
    // Enable powerup
    gameState.powerupUsed = false;
    $('#powerup-btn').prop('disabled', false);
    
    try {
        // Fetch Pokemon and create cards
        await fetchPokemonAndCreateCards();
        
        // Start the game
        gameState.gameActive = true;
        gameState.gameStarted = true;
        startTimer();
        updateDisplay();
        
    } catch (error) {
        console.error('Error starting game:', error);
        showMessage('Error', 'Failed to load Pokemon. Please try again.');
    }
}

function resetGame() {
    clearTimer();
    resetGameState();
    $('#game-grid').empty();
    $('#message').addClass('hidden');
    updateDisplay();
}

function resetGameState() {
    gameState.firstCard = null;
    gameState.secondCard = null;
    gameState.lockBoard = false;
    gameState.gameActive = false;
    gameState.gameStarted = false;
    gameState.clicks = 0;
    gameState.matches = 0;
    gameState.powerupUsed = false;
}

async function fetchPokemonAndCreateCards() {
    const settings = difficulties[gameState.difficulty];
    const numPairs = settings.pairs;
    
    // Fetch unique Pokemon
    gameState.pokemonData = await fetchRandomPokemon(numPairs);
    
    // Create card pairs
    const cards = [...gameState.pokemonData, ...gameState.pokemonData];
    
    // Shuffle cards
    shuffleArray(cards);
    
    // Create HTML
    createCardElements(cards);
}

async function fetchRandomPokemon(count) {
    const pokemon = [];
    const usedIds = new Set();
    
    while (pokemon.length < count) {
        const id = Math.floor(Math.random() * 1000) + 1;
        
        if (!usedIds.has(id)) {
            try {
                const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    const imageUrl = data.sprites?.other?.['official-artwork']?.front_default;
                    
                    if (imageUrl) {
                        pokemon.push({
                            id: data.id,
                            name: data.name,
                            image: imageUrl
                        });
                        usedIds.add(id);
                    }
                }
            } catch (error) {
                console.error(`Failed to fetch Pokemon ${id}:`, error);
            }
        }
    }
    
    return pokemon;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function createCardElements(cards) {
    const grid = $('#game-grid');
    grid.empty();
    
    cards.forEach((pokemon, index) => {
        const cardHTML = `
            <div class="card" data-pokemon-id="${pokemon.id}">
                <div class="card-inner">
                    <div class="card-face card-back">
                        <img src="back.webp" alt="Card back">
                    </div>
                    <div class="card-face card-front">
                        <img src="${pokemon.image}" alt="${pokemon.name}">
                    </div>
                </div>
            </div>
        `;
        grid.append(cardHTML);
    });
    
    // Add click handlers
    $('.card').click(handleCardClick);
}

function handleCardClick() {
    const $card = $(this);
    
    // Check if click is valid
    if (gameState.lockBoard) return;
    if (!gameState.gameActive) return;
    if ($card.hasClass('flipped')) return;
    if ($card.hasClass('matched')) return;
    if ($card === gameState.firstCard) return;
    
    // Flip the card
    flipCard($card);
    
    // Handle game logic
    if (!gameState.firstCard) {
        // First card clicked
        gameState.firstCard = $card;
    } else {
        // Second card clicked
        gameState.secondCard = $card;
        gameState.lockBoard = true;
        
        // Check for match after a short delay
        setTimeout(checkForMatch, 500);
    }
    
    // Update click counter
    gameState.clicks++;
    updateDisplay();
}

function flipCard($card) {
    $card.addClass('flipped');
}

function unflipCard($card) {
    $card.removeClass('flipped');
}

function checkForMatch() {
    const firstId = gameState.firstCard.data('pokemon-id');
    const secondId = gameState.secondCard.data('pokemon-id');
    
    if (firstId === secondId) {
        // Match found
        handleMatch();
    } else {
        // No match
        handleNoMatch();
    }
}

function handleMatch() {
    gameState.firstCard.addClass('matched');
    gameState.secondCard.addClass('matched');
    gameState.matches++;
    
    resetBoard();
    
    // Check for win
    if (gameState.matches === gameState.totalPairs) {
        setTimeout(() => endGame(true), 250);
    }
    
    updateDisplay();
}

function handleNoMatch() {
    // Store references before clearing
    const firstCard = gameState.firstCard;
    const secondCard = gameState.secondCard;
    
    setTimeout(() => {
        unflipCard(firstCard);
        unflipCard(secondCard);
        resetBoard();
    }, 250);
}

function resetBoard() {
    gameState.firstCard = null;
    gameState.secondCard = null;
    gameState.lockBoard = false;
}

function startTimer() {
    clearTimer();
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        updateDisplay();
        
        if (gameState.timeLeft <= 0) {
            endGame(false);
        }
    }, 1000);
}

function clearTimer() {
    if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
    }
}

function endGame(won) {
    gameState.gameActive = false;
    clearTimer();
    
    // Remove click handlers
    $('.card').off('click');
    
    const title = won ? 'Congratulations!' : 'Game Over!';
    const message = won 
        ? `You won with ${gameState.clicks} clicks and ${gameState.timeLeft} seconds remaining!`
        : `Time's up! You matched ${gameState.matches} out of ${gameState.totalPairs} pairs.`;
    
    setTimeout(() => showMessage(title, message), 500);
}

function showMessage(title, text) {
    $('#message-title').text(title);
    $('#message-text').text(text);
    $('#message').removeClass('hidden');
}

function usePowerup() {
    if (!gameState.gameActive || gameState.powerupUsed) return;
    
    gameState.powerupUsed = true;
    $('#powerup-btn').prop('disabled', true);
    
    // Show all unmatched cards
    const unmatched = $('.card:not(.matched)');
    unmatched.addClass('flipped powerup-glow');
    
    // Hide after 3 seconds
    setTimeout(() => {
        unmatched.removeClass('flipped powerup-glow');
    }, 3000);
}

function toggleTheme() {
    $('body').toggleClass('dark');
}

function updateDifficultySettings() {
    if (!gameState.gameStarted) {
        const settings = difficulties[gameState.difficulty];
        gameState.totalPairs = settings.pairs;
        gameState.timeLeft = settings.time;
        updateDisplay();
    }
}

function updateDisplay() {
    $('#timer').text(gameState.timeLeft);
    $('#clicks').text(gameState.clicks);
    $('#matches').text(`${gameState.matches}/${gameState.totalPairs}`);
    $('#pairs-left').text(gameState.totalPairs - gameState.matches);
}