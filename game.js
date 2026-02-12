// =====================================================
// CONFIGURATION SUPABASE
// =====================================================
const SUPABASE_URL = 'https://zjiwgfwecsnamrmyvfsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqaXdnZndlY3NuYW1ybXl2ZnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjE3NzQsImV4cCI6MjA4NjM5Nzc3NH0.cLdaYSfPhJiDNJ1aPeMfNVJVZa6ouCZv4P0WKrrz6oo';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// CONFIG PAR NIVEAU
// =====================================================
const LEVEL_CONFIG = {
    1: { rows: 7,  cols: 7,  name: 'Facile',        badgeClass: 'easy',    icon: '🟢', wordCount: 7  },
    2: { rows: 10, cols: 10, name: 'Intermédiaire', badgeClass: 'medium',  icon: '🟡', wordCount: 10 },
    3: { rows: 10, cols: 10, name: 'Difficile',     badgeClass: 'hard',    icon: '🔴', wordCount: 15 },
    4: { rows: 10, cols: 10, name: 'Suicide',       badgeClass: 'suicide', icon: '💀', wordCount: 15 },
};

// =====================================================
// 8 DIRECTIONS POSSIBLES
// =====================================================
const DIRECTIONS = [
    { name: 'HORIZONTAL_RIGHT', dr: 0, dc: 1 },   // →
    { name: 'HORIZONTAL_LEFT', dr: 0, dc: -1 },   // ←
    { name: 'VERTICAL_DOWN', dr: 1, dc: 0 },      // ↓
    { name: 'VERTICAL_UP', dr: -1, dc: 0 },       // ↑
    { name: 'DIAGONAL_DOWN_RIGHT', dr: 1, dc: 1 }, // ↘
    { name: 'DIAGONAL_DOWN_LEFT', dr: 1, dc: -1 }, // ↙
    { name: 'DIAGONAL_UP_RIGHT', dr: -1, dc: 1 },  // ↗
    { name: 'DIAGONAL_UP_LEFT', dr: -1, dc: -1 },  // ↖
];

// =====================================================
// VARIABLES GLOBALES
// =====================================================
let currentPlayer      = '';
let currentScore       = 0;
let currentLevel       = 1;
let wordsToFind        = [];
let foundWords         = [];
let gridData           = [];
let selectedCells      = [];
let isSelecting        = false;
let selectionDirection = null; // Pour forcer la sélection linéaire
let isDatabaseConnected = false;

// ⏱️ VARIABLES POUR LE CHRONOMÈTRE
let timerInterval      = null;
let startTime          = null;
let elapsedSeconds     = 0;

// =====================================================
// ÉLÉMENTS DOM
// =====================================================
const homepage       = document.getElementById('homepage');
const levelpage      = document.getElementById('levelpage');
const gamepage       = document.getElementById('gamepage');
const scoreboardpage = document.getElementById('scoreboardpage');
const pseudoInput    = document.getElementById('pseudo');
const startBtn       = document.getElementById('startBtn');
const scoresBtn      = document.getElementById('scoresBtn');
const backToHomeBtn  = document.getElementById('backToHomeBtn');
const backToHomeBtnScore = document.getElementById('backToHomeBtnScore');
const playerNameDisplay = document.getElementById('playerName');
const levelBadge     = document.getElementById('levelBadge');
const scoreValueDisplay = document.getElementById('scoreValue');
const timerDisplay   = document.getElementById('timerValue');
const wordGrid       = document.getElementById('wordGrid');
const wordList       = document.getElementById('wordList');
const newGameBtn     = document.getElementById('newGameBtn');
const dbStatus       = document.getElementById('dbStatus');
const levelGreeting  = document.getElementById('levelGreeting');

// Éléments du scoreboard
const scoreboardEasy   = document.getElementById('scoreboardEasy');
const scoreboardMedium = document.getElementById('scoreboardMedium');
const scoreboardHard   = document.getElementById('scoreboardHard');
const scoreboardSuicide = document.getElementById('scoreboardSuicide');

// =====================================================
// INITIALISATION
// =====================================================
window.addEventListener('DOMContentLoaded', checkDatabaseConnection);

// =====================================================
// CONNEXION SUPABASE
// =====================================================
async function checkDatabaseConnection() {
    const statusIcon = dbStatus.querySelector('.status-icon');
    const statusText = dbStatus.querySelector('.status-text');

    dbStatus.className = 'db-status checking';
    statusIcon.textContent = '⏳';
    statusText.textContent = 'Vérification de la connexion...';

    try {
        const { data, error } = await supabaseClient
            .from('mots')
            .select('id')
            .limit(1);

        if (error) throw error;

        isDatabaseConnected = true;
        dbStatus.className = 'db-status connected';
        statusIcon.textContent = '✅';
        statusText.textContent = 'Connecté à la base de données';
        console.log('✅ Connexion Supabase réussie !');

    } catch (error) {
        isDatabaseConnected = false;
        dbStatus.className = 'db-status error';
        statusIcon.textContent = '❌';
        statusText.textContent = 'Erreur de connexion à la base de données';
        console.error('❌ Erreur Supabase :', error.message);
        setTimeout(() => {
            statusText.textContent = 'Mode hors ligne — Mots par défaut utilisés';
        }, 2000);
    }
}

// =====================================================
// EVENT LISTENERS
// =====================================================
startBtn.addEventListener('click', goToLevelSelection);
scoresBtn.addEventListener('click', showScoreboard);
backToHomeBtn.addEventListener('click', backToHome);
backToHomeBtnScore.addEventListener('click', backToHome);

pseudoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') goToLevelSelection();
});

document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentLevel = parseInt(btn.dataset.level);
        startGame();
    });
});

newGameBtn.addEventListener('click', () => {
    stopTimer();
    showPage(levelpage);
});

// =====================================================
// NAVIGATION ENTRE PAGES
// =====================================================
function showPage(page) {
    [homepage, levelpage, gamepage, scoreboardpage].forEach(p => p.classList.remove('active'));
    page.classList.add('active');
}

function backToHome() {
    showPage(homepage);
}

function goToLevelSelection() {
    const pseudo = pseudoInput.value.trim();
    if (!pseudo) {
        alert('⚠️ Entre un pseudo pour commencer !');
        return;
    }
    
    if (isDatabaseConnected) {
        createOrGetPlayer(pseudo).then(ok => {
            if (ok) {
                currentPlayer = pseudo;
                levelGreeting.textContent = `Prêt(e) ${pseudo} ?`;
                showPage(levelpage);
            }
        });
    } else {
        currentPlayer = pseudo;
        levelGreeting.textContent = `Prêt(e) ${pseudo} ?`;
        showPage(levelpage);
    }
}

// =====================================================
// CRÉER / RÉCUPÉRER LE JOUEUR + TRACKING CONNEXION
// =====================================================
async function createOrGetPlayer(pseudo) {
    try {
        const { data: existing, error: selectError } = await supabaseClient
            .from('scores')
            .select('id, nbconnexion')
            .eq('pseudo', pseudo)
            .single();

        if (selectError && selectError.code !== 'PGRST116') throw selectError;

        if (!existing) {
            // Créer nouveau joueur
            const { error: insertError } = await supabaseClient
                .from('scores')
                .insert([{ 
                    pseudo, 
                    facile: 0, 
                    intermediaire: 0, 
                    difficile: 0,
                    suicide: 0,
                    nbconnexion: 1,
                    lastconnexion_at: new Date().toISOString()
                }]);
            if (insertError) throw insertError;
            console.log(`✅ Nouveau joueur "${pseudo}" créé.`);
        } else {
            // Mettre à jour la connexion
            const { error: updateError } = await supabaseClient
                .from('scores')
                .update({ 
                    nbconnexion: (existing.nbconnexion || 0) + 1,
                    lastconnexion_at: new Date().toISOString()
                })
                .eq('pseudo', pseudo);
            
            if (updateError) throw updateError;
            console.log(`✅ Joueur "${pseudo}" retrouvé. Connexion #${(existing.nbconnexion || 0) + 1}`);
        }
        return true;

    } catch (error) {
        console.error('❌ Erreur joueur :', error);
        if (error.code === '23505') return true;
        alert('Erreur de connexion. Réessaie.');
        return false;
    }
}

// =====================================================
// ⏱️ FONCTIONS DU CHRONOMÈTRE
// =====================================================
function startTimer() {
    stopTimer();
    startTime = Date.now();
    elapsedSeconds = 0;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        updateTimerDisplay();
    }, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getTimeScore() {
    const timeScore = Math.max(0, 10000 - (elapsedSeconds * 10));
    return timeScore;
}

// =====================================================
// SCOREBOARD
// =====================================================
async function showScoreboard() {
    if (!isDatabaseConnected) {
        alert('Impossible d\'afficher les scores : pas de connexion à la base de données');
        return;
    }

    try {
        const { data: scores, error } = await supabaseClient
            .from('scores')
            .select('pseudo, facile, intermediaire, difficile, suicide')
            .order('facile', { ascending: false });

        if (error) throw error;

        displayLevelScores(scores, 'facile', scoreboardEasy);
        displayLevelScores(scores, 'intermediaire', scoreboardMedium);
        displayLevelScores(scores, 'difficile', scoreboardHard);
        displayLevelScores(scores, 'suicide', scoreboardSuicide);

        showPage(scoreboardpage);

    } catch (error) {
        console.error('❌ Erreur chargement scores :', error);
        alert('Erreur lors du chargement des scores');
    }
}

function displayLevelScores(scores, level, container) {
    container.innerHTML = '';

    const levelScores = scores
        .filter(s => s[level] > 0)
        .sort((a, b) => b[level] - a[level])
        .slice(0, 10);

    if (levelScores.length === 0) {
        container.innerHTML = '<div class="no-scores">Aucun score enregistré</div>';
        return;
    }

    levelScores.forEach((score, index) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        
        const displayPseudo = score.pseudo.length > 3 
            ? score.pseudo.substring(0, 3) + '...' 
            : score.pseudo;

        const timeInSeconds = Math.floor((10000 - score[level]) / 10);
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;

        scoreItem.innerHTML = `
            <span class="score-rank">#${index + 1}</span>
            <span class="score-pseudo">${displayPseudo}</span>
            <span class="score-time">${minutes}:${seconds.toString().padStart(2, '0')}</span>
            <span class="score-points">${score[level]} pts</span>
        `;
        
        container.appendChild(scoreItem);
    });
}

// =====================================================
// CHARGER LES MOTS DEPUIS SUPABASE
// =====================================================
async function loadWords() {
    try {
        // Pour le mode suicide, on charge le niveau 3 (difficile)
        const levelToLoad = currentLevel === 4 ? 3 : currentLevel;
        
        const { data, error } = await supabaseClient
            .from('mots')
            .select('liste')
            .eq('niveau', levelToLoad);

        if (error) throw error;

        if (data && data.length > 0) {
            const allWords = data
                .map(row => row.liste.trim().toUpperCase())
                .filter(w => w.length > 0);

            const config  = LEVEL_CONFIG[currentLevel];
            const maxFit  = Math.max(config.rows, config.cols);
            const eligible = allWords.filter(w => w.length <= maxFit);

            wordsToFind = shuffleArray(eligible).slice(0, config.wordCount);

            console.log(`✅ Mots niveau ${currentLevel} (${config.wordCount} mots) :`, wordsToFind);
        } else {
            throw new Error('Aucun mot trouvé pour ce niveau');
        }

    } catch (error) {
        console.error('❌ Erreur chargement mots :', error);
        loadFallbackWords();
    }
}

function loadFallbackWords() {
    const fallbackWords = {
        1: ['CHAT', 'SOLEIL', 'FLEUR', 'MAISON', 'JARDIN', 'VOITURE', 'ARBRE'],
        2: ['MONTAGNE', 'VOYAGE', 'LUMIERE', 'FORET', 'OCEAN', 'RIVIERE', 'ETOILE', 'PLANETE', 'CASCADE', 'VOLCAN'],
        3: ['AVENTURE', 'HISTOIRE', 'MYSTERE', 'LEGENDE', 'COSMOS', 'NATURE', 'HORIZON', 'CASCADE', 'VOLCAN', 'DESERT', 'SAVANE', 'JUNGLE', 'TOUNDRA', 'PRAIRIE', 'COLLINE'],
        4: ['AVENTURE', 'HISTOIRE', 'MYSTERE', 'LEGENDE', 'COSMOS', 'NATURE', 'HORIZON', 'CASCADE', 'VOLCAN', 'DESERT', 'SAVANE', 'JUNGLE', 'TOUNDRA', 'PRAIRIE', 'COLLINE']
    };
    wordsToFind = fallbackWords[currentLevel] || fallbackWords[1];
    console.log('⚠️ Utilisation des mots par défaut:', wordsToFind);
}

// =====================================================
// DÉMARRAGE DU JEU
// =====================================================
async function startGame() {
    foundWords = [];
    currentScore = 0;
    scoreValueDisplay.textContent = '0';

    const cfg = LEVEL_CONFIG[currentLevel];
    playerNameDisplay.textContent = currentPlayer;
    levelBadge.textContent = `${cfg.icon} ${cfg.name}`;
    levelBadge.className = `level-badge ${cfg.badgeClass}`;

    await loadWords();
    console.log('🎯 Mots à trouver :', wordsToFind);

    buildGrid(cfg.rows, cfg.cols, wordsToFind);
    renderGrid(cfg.rows, cfg.cols);
    displayWordList();
    
    startTimer();
    showPage(gamepage);
}

// =====================================================
// CONSTRUCTION DE LA GRILLE AVEC PLACEMENT MULTI-DIRECTIONNEL
// =====================================================
function buildGrid(rows, cols, words) {
    // Initialiser grille vide
    gridData = Array(rows).fill(null).map(() => Array(cols).fill(''));

    const placedWords = [];
    const maxAttempts = 100;

    // Essayer de placer chaque mot
    for (const word of words) {
        let placed = false;
        
        for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
            // Choisir une direction aléatoire
            const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            
            // Choisir une position de départ aléatoire
            const startRow = Math.floor(Math.random() * rows);
            const startCol = Math.floor(Math.random() * cols);
            
            // Vérifier si le mot peut être placé
            if (canPlaceWord(word, startRow, startCol, direction, rows, cols)) {
                placeWord(word, startRow, startCol, direction);
                placedWords.push({
                    word,
                    startRow,
                    startCol,
                    direction: direction.name
                });
                placed = true;
            }
        }
        
        if (!placed) {
            console.warn(`⚠️ Impossible de placer le mot "${word}"`);
        }
    }

    console.log('📍 Mots placés :', placedWords);

    // Remplir les cases vides avec des lettres aléatoires
    fillEmptyCells();
}

function canPlaceWord(word, startRow, startCol, direction, rows, cols) {
    const { dr, dc } = direction;
    
    for (let i = 0; i < word.length; i++) {
        const r = startRow + (i * dr);
        const c = startCol + (i * dc);
        
        // Vérifier limites
        if (r < 0 || r >= rows || c < 0 || c >= cols) {
            return false;
        }
        
        // Vérifier si la case est vide ou contient la même lettre
        const currentCell = gridData[r][c];
        if (currentCell !== '' && currentCell !== word[i]) {
            return false;
        }
    }
    
    return true;
}

function placeWord(word, startRow, startCol, direction) {
    const { dr, dc } = direction;
    
    for (let i = 0; i < word.length; i++) {
        const r = startRow + (i * dr);
        const c = startCol + (i * dc);
        gridData[r][c] = word[i];
    }
}

function fillEmptyCells() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let r = 0; r < gridData.length; r++) {
        for (let c = 0; c < gridData[r].length; c++) {
            if (gridData[r][c] === '') {
                gridData[r][c] = letters[Math.floor(Math.random() * letters.length)];
            }
        }
    }
}

// =====================================================
// RENDU DE LA GRILLE
// =====================================================
function renderGrid(rows, cols) {
    wordGrid.innerHTML = '';
    
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    
    const isMobile = vw < 768;
    const isLandscape = vw > vh;
    
    let availableWidth = vw - 40;
    let availableHeight = vh - 350;
    
    if (isMobile && isLandscape) {
        availableHeight = vh - 180;
    }
    
    const maxCellWidth = Math.floor(availableWidth / cols) - 4;
    const maxCellHeight = Math.floor(availableHeight / rows) - 4;
    const cellSize = Math.min(maxCellWidth, maxCellHeight, 70);
    
    const fontSize = Math.max(cellSize * 0.45, 14);
    
    wordGrid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    wordGrid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.textContent = gridData[r][c];
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.style.fontSize = `${fontSize}px`;
            
            // Desktop events
            cell.addEventListener('mousedown', startSelection);
            cell.addEventListener('mouseenter', continueSelection);
            cell.addEventListener('mouseup', endSelection);
            
            // Mobile events
            cell.addEventListener('touchstart', handleTouchStart, { passive: false });
            cell.addEventListener('touchmove', handleTouchMove, { passive: false });
            cell.addEventListener('touchend', handleTouchEnd, { passive: false });
            
            wordGrid.appendChild(cell);
        }
    }
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (gamepage.classList.contains('active')) {
            const { rows, cols } = LEVEL_CONFIG[currentLevel];
            renderGrid(rows, cols);
        }
    }, 250);
});

// =====================================================
// SÉLECTION DES CELLULES AVEC DIRECTION STRICTE
// =====================================================
function startSelection(e) {
    isSelecting = true;
    selectedCells = [];
    selectionDirection = null; // Réinitialiser la direction
    clearSelection();
    
    const cell = e.currentTarget;
    cell.classList.add('selected');
    selectedCells.push({ 
        row: +cell.dataset.row, 
        col: +cell.dataset.col, 
        letter: cell.textContent 
    });
}

function continueSelection(e) {
    if (!isSelecting) return;
    
    const cell = e.currentTarget;
    const r = +cell.dataset.row;
    const c = +cell.dataset.col;

    // Si on clique sur la cellule précédente, on recule (désélectionne la dernière)
    if (selectedCells.length > 1) {
        const previous = selectedCells[selectedCells.length - 2];
        if (previous.row === r && previous.col === c) {
            // Retirer la dernière cellule sélectionnée
            const removed = selectedCells.pop();
            const removedCell = document.querySelector(`.grid-cell[data-row="${removed.row}"][data-col="${removed.col}"]`);
            if (removedCell && !removedCell.classList.contains('found')) {
                removedCell.classList.remove('selected');
            }
            return;
        }
    }

    // Ne pas re-sélectionner la même cellule consécutivement
    if (selectedCells.length > 0) {
        const last = selectedCells[selectedCells.length - 1];
        if (last.row === r && last.col === c) return;
    }

    if (selectedCells.length === 1) {
        // Deuxième cellule : déterminer la direction
        const first = selectedCells[0];
        const direction = getDirection(first.row, first.col, r, c);
        
        if (direction) {
            selectionDirection = direction;
            cell.classList.add('selected');
            selectedCells.push({ row: r, col: c, letter: cell.textContent });
        }
    } else if (selectedCells.length > 1 && selectionDirection) {
        // Cellules suivantes : vérifier qu'on est dans la continuité linéaire
        const last = selectedCells[selectedCells.length - 1];
        
        // Calculer la position attendue dans la direction
        const expectedRow = last.row + selectionDirection.dr;
        const expectedCol = last.col + selectionDirection.dc;
        
        // On ne peut sélectionner QUE la cellule suivante dans la direction
        if (r === expectedRow && c === expectedCol) {
            cell.classList.add('selected');
            selectedCells.push({ row: r, col: c, letter: cell.textContent });
        }
    }
}

function endSelection() {
    if (!isSelecting) return;
    isSelecting = false;
    selectionDirection = null;
    checkWord();
}

function handleTouchStart(e) {
    e.preventDefault();
    isSelecting = true;
    selectedCells = [];
    selectionDirection = null;
    clearSelection();
    
    const cell = e.currentTarget;
    cell.classList.add('selected');
    selectedCells.push({ 
        row: +cell.dataset.row, 
        col: +cell.dataset.col, 
        letter: cell.textContent 
    });
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isSelecting) return;
    
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el || !el.classList.contains('grid-cell')) return;
    
    const r = +el.dataset.row;
    const c = +el.dataset.col;

    // Si on touche la cellule précédente, on recule (désélectionne la dernière)
    if (selectedCells.length > 1) {
        const previous = selectedCells[selectedCells.length - 2];
        if (previous.row === r && previous.col === c) {
            // Retirer la dernière cellule sélectionnée
            const removed = selectedCells.pop();
            const removedCell = document.querySelector(`.grid-cell[data-row="${removed.row}"][data-col="${removed.col}"]`);
            if (removedCell && !removedCell.classList.contains('found')) {
                removedCell.classList.remove('selected');
            }
            return;
        }
    }

    // Ne pas re-sélectionner la même cellule consécutivement
    if (selectedCells.length > 0) {
        const last = selectedCells[selectedCells.length - 1];
        if (last.row === r && last.col === c) return;
    }

    if (selectedCells.length === 1) {
        const first = selectedCells[0];
        const direction = getDirection(first.row, first.col, r, c);
        
        if (direction) {
            selectionDirection = direction;
            el.classList.add('selected');
            selectedCells.push({ row: r, col: c, letter: el.textContent });
        }
    } else if (selectedCells.length > 1 && selectionDirection) {
        const last = selectedCells[selectedCells.length - 1];
        
        // Calculer la position attendue dans la direction
        const expectedRow = last.row + selectionDirection.dr;
        const expectedCol = last.col + selectionDirection.dc;
        
        // On ne peut sélectionner QUE la cellule suivante dans la direction
        if (r === expectedRow && c === expectedCol) {
            el.classList.add('selected');
            selectedCells.push({ row: r, col: c, letter: el.textContent });
        }
    }
}

function handleTouchEnd(e) {
    if (!isSelecting) return;
    e.preventDefault();
    isSelecting = false;
    selectionDirection = null;
    checkWord();
}

// Détermine la direction entre deux cellules
function getDirection(r1, c1, r2, c2) {
    const dr = r2 - r1;
    const dc = c2 - c1;
    
    // Normaliser la direction
    const normDr = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
    const normDc = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
    
    // Trouver la direction correspondante
    for (const dir of DIRECTIONS) {
        if (dir.dr === normDr && dir.dc === normDc) {
            return dir;
        }
    }
    
    return null;
}

function clearSelection() {
    document.querySelectorAll('.grid-cell.selected').forEach(cell => {
        if (!cell.classList.contains('found')) {
            cell.classList.remove('selected');
        }
    });
}

// =====================================================
// VÉRIFICATION DU MOT
// =====================================================
function checkWord() {
    const selectedWord = selectedCells.map(c => c.letter).join('');
    const reversedWord = selectedWord.split('').reverse().join('');

    let foundWord = null;
    if (wordsToFind.includes(selectedWord) && !foundWords.includes(selectedWord)) {
        foundWord = selectedWord;
    } else if (wordsToFind.includes(reversedWord) && !foundWords.includes(reversedWord)) {
        foundWord = reversedWord;
    }

    if (foundWord) {
        foundWords.push(foundWord);
        
        // Marquer les cellules comme trouvées (SANS bloquer la réutilisation)
        selectedCells.forEach(({ row, col }) => {
            const el = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
            if (el) { 
                el.classList.add('found'); 
                el.classList.remove('selected'); 
            }
        });

        updateWordList(foundWord);

        if (foundWords.length === wordsToFind.length) {
            setTimeout(endGame, 500);
        }
    } else {
        clearSelection();
    }

    selectedCells = [];
}

// =====================================================
// LISTE DES MOTS
// =====================================================
function displayWordList() {
    wordList.innerHTML = '';
    
    if (currentLevel === 4) {
        for (let i = 0; i < wordsToFind.length; i++) {
            const checkbox = document.createElement('div');
            checkbox.className = 'suicide-checkbox';
            checkbox.dataset.index = i;
            wordList.appendChild(checkbox);
        }
    } else {
        wordsToFind.forEach(word => {
            const span = document.createElement('span');
            span.className = 'word-item';
            span.textContent  = word;
            span.dataset.word = word;
            wordList.appendChild(span);
        });
    }
}

function updateWordList(word) {
    if (currentLevel === 4) {
        // MODE SUICIDE : Afficher le mot trouvé dans la case
        const index = foundWords.length - 1;
        const checkbox = document.querySelector(`.suicide-checkbox[data-index="${index}"]`);
        if (checkbox) {
            checkbox.classList.add('checked');
            checkbox.textContent = word; // Afficher le mot
        }
    } else {
        const item = document.querySelector(`.word-item[data-word="${word}"]`);
        if (item) item.classList.add('found');
    }
}

// =====================================================
// FIN DE PARTIE
// =====================================================
async function endGame() {
    stopTimer();
    
    currentScore = getTimeScore();
    scoreValueDisplay.textContent = currentScore;
    
    await saveScore();
    
    const cfg = LEVEL_CONFIG[currentLevel];
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    alert(`🎉 Bravo ${currentPlayer} !\n\nTous les mots trouvés !\nNiveau : ${cfg.name}\nTemps : ${minutes}min ${seconds}s\nScore : ${currentScore} pts`);
}

async function saveScore() {
    if (!isDatabaseConnected) return;

    try {
        const { data: player, error: fetchError } = await supabaseClient
            .from('scores')
            .select('facile, intermediaire, difficile, suicide')
            .eq('pseudo', currentPlayer)
            .single();

        if (fetchError) throw fetchError;

        const col = currentLevel === 1 ? 'facile' 
                  : currentLevel === 2 ? 'intermediaire' 
                  : currentLevel === 3 ? 'difficile'
                  : 'suicide';
        
        const bestScore = player[col] || 0;

        if (currentScore > bestScore) {
            const { error } = await supabaseClient
                .from('scores')
                .update({ [col]: currentScore })
                .eq('pseudo', currentPlayer);
            if (error) throw error;
            console.log(`✅ Nouveau record pour ${currentPlayer} (${col}) : ${currentScore} pts (${elapsedSeconds}s)`);
        }
    } catch (error) {
        console.error('❌ Erreur sauvegarde score :', error);
    }
}

// =====================================================
// UTILITAIRE : mélanger un tableau
// =====================================================
function shuffleArray(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
