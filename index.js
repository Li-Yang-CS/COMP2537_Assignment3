class PokemonMemoryGame {
  constructor() {
      this.gameState = {
          cards: [],
          flippedCards: [],
          matchedPairs: 0,
          clicks: 0,
          timeLeft: 0,
          timer: null,
          gameActive: false,
          powerupActive: false,
          consecutiveMatches: 0
      };

      this.difficulties = {
          easy: { pairs: 3, time: 60 },
          medium: { pairs: 6, time: 90 },
          hard: { pairs: 10, time: 120 }
      };

      this.initializeEventListeners();
      this.loadTheme();
  }

  initializeEventListeners() {
      document.getElementById('startBtn').addEventListener('click', () => this.startGame());
      document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
      document.getElementById('theme').addEventListener('change', (e) => this.changeTheme(e.target.value));
  }

  async startGame() {
      const difficulty = document.getElementById('difficulty').value;
      const { pairs, time } = this.difficulties[difficulty];

      this.resetGameState();
      this.gameState.timeLeft = time;
      
      document.getElementById('loading').style.display = 'block';
      document.getElementById('game_grid').innerHTML = '';

      try {
          await this.createGameBoard(pairs);
          this.gameState.gameActive = true;
          this.startTimer();
          this.updateStatus();
          document.getElementById('loading').style.display = 'none';
      } catch (error) {
          console.error('Error starting game:', error);
          document.getElementById('loading').style.display = 'none';
          this.showMessage('Error', 'Failed to load Pokémon. Please try again.');
      }
  }

  async createGameBoard(pairs) {
      // Fetch random Pokemon
      const pokemon = await this.fetchRandomPokemon(pairs);
      
      // Create card pairs
      this.gameState.cards = [...pokemon, ...pokemon]
          .map((poke, index) => ({
              id: index,
              pokemon: poke,
              matched: false
          }))
          .sort(() => Math.random() - 0.5);

      // Update grid layout
      const grid = document.getElementById('game_grid');
      const cols = Math.ceil(Math.sqrt(pairs * 2));
      grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

      // Create DOM elements
      grid.innerHTML = this.gameState.cards.map(card => `
          <div class="card" data-id="${card.id}">
              <div class="card-inner">
                  <div class="card-face card-front">❓</div>
                  <div class="card-face card-back">
                      <img src="${card.pokemon.image}" alt="${card.pokemon.name}" 
                           onerror="this.src='/api/placeholder/150/150'">
                  </div>
              </div>
          </div>
      `).join('');

      // Add click listeners
      grid.addEventListener('click', (e) => this.handleCardClick(e));
      
      document.getElementById('total').textContent = pairs;
      document.getElementById('remaining').textContent = pairs;
  }

  async fetchRandomPokemon(count) {
      const pokemon = [];
      const usedIds = new Set();

      while (pokemon.length < count) {
          const id = Math.floor(Math.random() * 1025) + 1;
          if (!usedIds.has(id)) {
              usedIds.add(id);
              try {
                  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
                  if (response.ok) {
                      const data = await response.json();
                      pokemon.push({
                          id: data.id,
                          name: data.name,
                          image: data.sprites.other['official-artwork'].front_default || 
                                 data.sprites.front_default ||
                                 '/api/placeholder/150/150'
                      });
                  }
              } catch (error) {
                  console.error(`Error fetching Pokemon ${id}:`, error);
              }
          }
      }

      return pokemon;
  }

  handleCardClick(event) {
      if (!this.gameState.gameActive) return;

      const cardElement = event.target.closest('.card');
      if (!cardElement) return;

      const cardId = parseInt(cardElement.dataset.id);
      const card = this.gameState.cards[cardId];

      // Prevent invalid clicks
      if (card.matched || 
          cardElement.classList.contains('flip') || 
          this.gameState.flippedCards.length >= 2) {
          return;
      }

      // Flip card
      cardElement.classList.add('flip');
      this.gameState.flippedCards.push({ element: cardElement, card });
      this.gameState.clicks++;

      if (this.gameState.flippedCards.length === 2) {
          setTimeout(() => this.checkMatch(), 500);
      }

      this.updateStatus();
  }

  checkMatch() {
      const [first, second] = this.gameState.flippedCards;

      if (first.card.pokemon.id === second.card.pokemon.id) {
          // Match found
          first.card.matched = true;
          second.card.matched = true;
          this.gameState.matchedPairs++;
          this.gameState.consecutiveMatches++;

          // Check for power-up (3 consecutive matches)
          if (this.gameState.consecutiveMatches >= 3) {
              this.activatePowerup();
              this.gameState.consecutiveMatches = 0;
          }

          // Check win condition
          if (this.gameState.matchedPairs === parseInt(document.getElementById('total').textContent)) {
              this.endGame(true);
          }
      } else {
          // No match
          setTimeout(() => {
              first.element.classList.remove('flip');
              second.element.classList.remove('flip');
          }, 1000);
          this.gameState.consecutiveMatches = 0;
      }

      this.gameState.flippedCards = [];
      this.updateStatus();
  }

  activatePowerup() {
      if (this.gameState.powerupActive) return;

      this.gameState.powerupActive = true;
      document.getElementById('powerupIndicator').style.display = 'block';

      // Show all unmatched cards for 3 seconds
      const unmatchedCards = document.querySelectorAll('.card:not(.flip)');
      unmatchedCards.forEach(card => {
          if (!this.gameState.cards[card.dataset.id].matched) {
              card.classList.add('flip', 'powerup-flash');
          }
      });

      setTimeout(() => {
          unmatchedCards.forEach(card => {
              if (!this.gameState.cards[card.dataset.id].matched) {
                  card.classList.remove('flip', 'powerup-flash');
              }
          });
          document.getElementById('powerupIndicator').style.display = 'none';
          this.gameState.powerupActive = false;
      }, 3000);
  }

  startTimer() {
      this.gameState.timer = setInterval(() => {
          this.gameState.timeLeft--;
          this.updateStatus();

          if (this.gameState.timeLeft <= 0) {
              this.endGame(false);
          }
      }, 1000);
  }

  endGame(won) {
      this.gameState.gameActive = false;
      clearInterval(this.gameState.timer);

      const title = won ? 'Congratulations!' : 'Game Over!';
      const text = won 
          ? `You matched all pairs in ${this.gameState.clicks} clicks!`
          : 'Time\'s up! Better luck next time.';

      this.showMessage(title, text);

      // Remove click listeners from all cards
      document.getElementById('game_grid').replaceWith(document.getElementById('game_grid').cloneNode(true));
  }

  showMessage(title, text) {
      document.getElementById('messageTitle').textContent = title;
      document.getElementById('messageText').textContent = text;
      document.getElementById('gameMessage').style.display = 'block';
  }

  updateStatus() {
      const remaining = parseInt(document.getElementById('total').textContent) - this.gameState.matchedPairs;
      
      document.getElementById('timer').textContent = this.formatTime(this.gameState.timeLeft);
      document.getElementById('clicks').textContent = this.gameState.clicks;
      document.getElementById('matched').textContent = this.gameState.matchedPairs;
      document.getElementById('remaining').textContent = remaining;
  }

  formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  resetGame() {
      this.resetGameState();
      document.getElementById('game_grid').innerHTML = '';
      document.getElementById('gameMessage').style.display = 'none';
      document.getElementById('powerupIndicator').style.display = 'none';
      this.updateStatus();
  }

  resetGameState() {
      if (this.gameState.timer) {
          clearInterval(this.gameState.timer);
      }

      this.gameState = {
          cards: [],
          flippedCards: [],
          matchedPairs: 0,
          clicks: 0,
          timeLeft: 0,
          timer: null,
          gameActive: false,
          powerupActive: false,
          consecutiveMatches: 0
      };

      document.getElementById('clicks').textContent = '0';
      document.getElementById('matched').textContent = '0';
      document.getElementById('remaining').textContent = '0';
      document.getElementById('total').textContent = '0';
      document.getElementById('timer').textContent = '--:--';
  }

  changeTheme(theme) {
      if (theme === 'dark') {
          document.body.classList.add('dark-theme');
      } else {
          document.body.classList.remove('dark-theme');
      }
      localStorage.setItem('pokemonGameTheme', theme);
  }

  loadTheme() {
      const savedTheme = localStorage.getItem('pokemonGameTheme') || 'light';
      document.getElementById('theme').value = savedTheme;
      this.changeTheme(savedTheme);
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.game = new PokemonMemoryGame();
});

// Global reset function for message button
function resetGame() {
  window.game.resetGame();
}