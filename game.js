// Configuration Supabase - REMPLACE PAR TES VRAIES CLÉS
const SUPABASE_URL = 'https://rntiiwtohwzsyzxnicxt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_71Mmkhcc8rouQ2j4-tOZ1A_PunfjBTb';

// Initialisation Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let currentPlayer = '';
let currentScore = 0;
let wordsToFind = [];
let foundWords = [];
let gridData = [];
let selectedCells = [];
let isSelecting = false;

// Éléments DOM
const homepage = document.getElementById('homepage');
const gamepage = document.getElementById('gamepage');
const pseudoInput = document.getElementById('pseudo');
const startBtn = document.getElementById('startBtn');
const playerNameDisplay = document.getElementById('playerName');
const scoreValueDisplay = document.getElementById('scoreValue');
const wordGrid = document.getElementById('wordGrid');
const wordList = document.getElementById('wordList');
const newGameBtn = document.getElementById('newGameBtn');

// Event Listeners
startBtn.addEventListener('click', startGame);
newGameBtn.addEventListener('click', resetGame);
pseudoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startGame();
});

// Démarrer le jeu
async function startGame() {
    const pseudo = pseudoInput.value.trim();
    
    if (!pseudo) {
        alert('Entre un pseudo pour commencer !');
        return;
    }
    
    currentPlayer = pseudo;
    currentScore = 0;
    foundWords = [];
    
    // Charger les mots depuis Supabase
    await loadWords();
    
    // Afficher la page de jeu
    homepage.classList.remove('active');
    gamepage.classList.add('active');
    playerNameDisplay.textContent = currentPlayer;
    scoreValueDisplay.textContent = currentScore;
    
    // Générer la grille
    generateGrid();
    displayWordList();
}

// Charger les mots depuis Supabase
async function loadWords() {
    try {
        const { data, error } = await supabaseClient
            .from('mots')
            .select('mots');
        
        if (error) throw error;
        
        // Prendre 8 mots aléatoires
        const allWords = data.map(item => item.mots.toUpperCase());
        wordsToFind = shuffleArray(allWords).slice(0, 8);
        
    } catch (error) {
        console.error('Erreur lors du chargement des mots:', error);
        // Mots de secours si la connexion échoue
        wordsToFind = ['CHAT', 'CHIEN', 'SOLEIL', 'LUNE', 'OISEAU', 'FLEUR', 'ARBRE', 'MAISON'];
    }
}

// Mélanger un tableau
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Générer la grille 10x15
function generateGrid() {
    gridData = Array(15).fill(null).map(() => Array(10).fill(''));
    
    // Placer les mots dans la grille
    wordsToFind.forEach(word => {
        placeWord(word);
    });
    
    // Remplir les cases vides avec des lettres aléatoires
    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 10; col++) {
            if (!gridData[row][col]) {
                gridData[row][col] = getRandomLetter();
            }
        }
    }
    
    // Afficher la grille
    renderGrid();
}

// Placer un mot dans la grille
function placeWord(word) {
    const directions = [
        { dr: 0, dc: 1 },   // Horizontal droite
        { dr: 1, dc: 0 },   // Vertical bas
        { dr: 1, dc: 1 },   // Diagonal bas-droite
        { dr: -1, dc: 1 },  // Diagonal haut-droite
    ];
    
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!placed && attempts < maxAttempts) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * 15);
        const col = Math.floor(Math.random() * 10);
        
        if (canPlaceWord(word, row, col, direction.dr, direction.dc)) {
            // Placer le mot
            for (let i = 0; i < word.length; i++) {
                gridData[row + i * direction.dr][col + i * direction.dc] = word[i];
            }
            placed = true;
        }
        
        attempts++;
    }
}

// Vérifier si on peut placer un mot
function canPlaceWord(word, row, col, dr, dc) {
    for (let i = 0; i < word.length; i++) {
        const r = row + i * dr;
        const c = col + i * dc;
        
        // Vérifier les limites
        if (r < 0 || r >= 15 || c < 0 || c >= 10) {
            return false;
        }
        
        // Vérifier si la case est vide ou contient la même lettre
        if (gridData[r][c] && gridData[r][c] !== word[i]) {
            return false;
        }
    }
    
    return true;
}

// Lettre aléatoire
function getRandomLetter() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[Math.floor(Math.random() * letters.length)];
}

// Afficher la grille
function renderGrid() {
    wordGrid.innerHTML = '';
    
    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.textContent = gridData[row][col];
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // Events souris
            cell.addEventListener('mousedown', startSelection);
            cell.addEventListener('mouseenter', continueSelection);
            cell.addEventListener('mouseup', endSelection);
            
            // Events tactiles pour mobile
            cell.addEventListener('touchstart', handleTouchStart);
            cell.addEventListener('touchmove', handleTouchMove);
            cell.addEventListener('touchend', handleTouchEnd);
            
            wordGrid.appendChild(cell);
        }
    }
    
    document.addEventListener('mouseup', endSelection);
    document.addEventListener('touchend', handleTouchEnd);
}

// Gestion tactile pour mobile
function handleTouchStart(e) {
    e.preventDefault();
    isSelecting = true;
    selectedCells = [];
    clearSelection();
    
    const cell = e.target;
    cell.classList.add('selected');
    selectedCells.push({
        row: parseInt(cell.dataset.row),
        col: parseInt(cell.dataset.col),
        letter: cell.textContent
    });
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isSelecting) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (!element || !element.classList.contains('grid-cell')) return;
    
    const currentRow = parseInt(element.dataset.row);
    const currentCol = parseInt(element.dataset.col);
    
    // Vérifier si déjà sélectionné
    const alreadySelected = selectedCells.some(
        cell => cell.row === currentRow && cell.col === currentCol
    );
    
    if (alreadySelected) return;
    
    if (selectedCells.length > 0) {
        const lastCell = selectedCells[selectedCells.length - 1];
        
        if (isAligned(lastCell.row, lastCell.col, currentRow, currentCol)) {
            element.classList.add('selected');
            selectedCells.push({
                row: currentRow,
                col: currentCol,
                letter: element.textContent
            });
        }
    }
}

function handleTouchEnd(e) {
    if (!isSelecting) return;
    e.preventDefault();
    isSelecting = false;
    checkWord();
}

// Sélection des cellules
function startSelection(e) {
    isSelecting = true;
    selectedCells = [];
    clearSelection();
    
    const cell = e.target;
    cell.classList.add('selected');
    selectedCells.push({
        row: parseInt(cell.dataset.row),
        col: parseInt(cell.dataset.col),
        letter: cell.textContent
    });
}

function continueSelection(e) {
    if (!isSelecting) return;
    
    const cell = e.target;
    if (!cell.classList.contains('grid-cell')) return;
    
    // Vérifier si la cellule est alignée avec les précédentes
    if (selectedCells.length > 0) {
        const lastCell = selectedCells[selectedCells.length - 1];
        const currentRow = parseInt(cell.dataset.row);
        const currentCol = parseInt(cell.dataset.col);
        
        if (isAligned(lastCell.row, lastCell.col, currentRow, currentCol)) {
            cell.classList.add('selected');
            selectedCells.push({
                row: currentRow,
                col: currentCol,
                letter: cell.textContent
            });
        }
    }
}

function endSelection() {
    if (!isSelecting) return;
    isSelecting = false;
    
    checkWord();
}

function isAligned(row1, col1, row2, col2) {
    const dr = Math.abs(row2 - row1);
    const dc = Math.abs(col2 - col1);
    
    // Horizontal, vertical ou diagonal
    return (dr === 0 && dc === 1) || 
           (dr === 1 && dc === 0) || 
           (dr === 1 && dc === 1);
}

function clearSelection() {
    document.querySelectorAll('.grid-cell.selected').forEach(cell => {
        if (!cell.classList.contains('found')) {
            cell.classList.remove('selected');
        }
    });
}

// Vérifier si le mot sélectionné est valide
function checkWord() {
    const selectedWord = selectedCells.map(cell => cell.letter).join('');
    const reversedWord = selectedWord.split('').reverse().join('');
    
    let foundWord = null;
    if (wordsToFind.includes(selectedWord) && !foundWords.includes(selectedWord)) {
        foundWord = selectedWord;
    } else if (wordsToFind.includes(reversedWord) && !foundWords.includes(reversedWord)) {
        foundWord = reversedWord;
    }
    
    if (foundWord) {
        // Mot trouvé !
        foundWords.push(foundWord);
        currentScore += foundWord.length * 10;
        scoreValueDisplay.textContent = currentScore;
        
        // Marquer les cellules comme trouvées
        selectedCells.forEach(cell => {
            const cellElement = document.querySelector(
                `.grid-cell[data-row="${cell.row}"][data-col="${cell.col}"]`
            );
            cellElement.classList.add('found');
            cellElement.classList.remove('selected');
        });
        
        // Mettre à jour la liste des mots
        updateWordList(foundWord);
        
        // Vérifier si tous les mots sont trouvés
        if (foundWords.length === wordsToFind.length) {
            setTimeout(() => {
                endGame();
            }, 1000);
        }
    } else {
        // Pas le bon mot, effacer la sélection
        clearSelection();
    }
    
    selectedCells = [];
}

// Afficher la liste des mots
function displayWordList() {
    wordList.innerHTML = '';
    wordsToFind.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        li.dataset.word = word;
        wordList.appendChild(li);
    });
}

// Mettre à jour la liste des mots
function updateWordList(word) {
    const li = document.querySelector(`#wordList li[data-word="${word}"]`);
    if (li) {
        li.classList.add('found');
    }
}

// Fin de partie
async function endGame() {
    alert(`🎉 Bravo ${currentPlayer} ! Tu as trouvé tous les mots !\nScore final: ${currentScore}`);
    
    // Sauvegarder le score dans Supabase
    await saveScore();
}

// Sauvegarder le score
async function saveScore() {
    try {
        const { data, error } = await supabaseClient
            .from('scores')
            .insert([
                { pseudo: currentPlayer, score: currentScore }
            ]);
        
        if (error) throw error;
        
        console.log('Score sauvegardé avec succès !');
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du score:', error);
    }
}

// Nouvelle partie
function resetGame() {
    foundWords = [];
    currentScore = 0;
    scoreValueDisplay.textContent = currentScore;
    loadWords().then(() => {
        generateGrid();
        displayWordList();
    });
}
