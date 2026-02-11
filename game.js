// =====================================================
// CONFIGURATION SUPABASE
// =====================================================
const SUPABASE_URL = 'https://zjiwgfwecsnamrmyvfsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqaXdnZndlY3NuYW1ybXl2ZnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjE3NzQsImV4cCI6MjA4NjM5Nzc3NH0.cLdaYSfPhJiDNJ1aPeMfNVJVZa6ouCZv4P0WKrrz6oo';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// CONFIG PAR NIVEAU
// 1 = Facile       → grille 7×7,   5 mots
// 2 = Intermédiaire → grille 10×10, 7 mots
// 3 = Difficile     → grille 10×10, 10 mots
// =====================================================
const LEVEL_CONFIG = {
    1: { rows: 7,  cols: 7,  name: 'Facile',        badgeClass: 'easy',   icon: '🟢', wordCount: 5  },
    2: { rows: 10, cols: 10, name: 'Intermédiaire', badgeClass: 'medium', icon: '🟡', wordCount: 7  },
    3: { rows: 10, cols: 10, name: 'Difficile',     badgeClass: 'hard',   icon: '🔴', wordCount: 10 },
};

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
let isDatabaseConnected = false;

// =====================================================
// ÉLÉMENTS DOM
// =====================================================
const homepage       = document.getElementById('homepage');
const levelpage      = document.getElementById('levelpage');
const gamepage       = document.getElementById('gamepage');
const pseudoInput    = document.getElementById('pseudo');
const startBtn       = document.getElementById('startBtn');
const playerNameDisplay = document.getElementById('playerName');
const levelBadge     = document.getElementById('levelBadge');
const scoreValueDisplay = document.getElementById('scoreValue');
const wordGrid       = document.getElementById('wordGrid');
const wordList       = document.getElementById('wordList');
const newGameBtn     = document.getElementById('newGameBtn');
const dbStatus       = document.getElementById('dbStatus');
const levelGreeting  = document.getElementById('levelGreeting');

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
    // Retour à la sélection du niveau
    showPage(levelpage);
});

// =====================================================
// NAVIGATION ENTRE PAGES
// =====================================================
function showPage(page) {
    [homepage, levelpage, gamepage].forEach(p => p.classList.remove('active'));
    page.classList.add('active');
}

// =====================================================
// ÉTAPE 1 : Pseudo → Sélection du niveau
// =====================================================
async function goToLevelSelection() {
    const pseudo = pseudoInput.value.trim();

    if (!pseudo) {
        alert('Entre un pseudo pour commencer !');
        return;
    }

    if (isDatabaseConnected) {
        const ok = await createOrGetPlayer(pseudo);
        if (!ok) return;
    }

    currentPlayer = pseudo;
    levelGreeting.textContent = `Prêt(e) ${pseudo} ?`;
    showPage(levelpage);
}

// =====================================================
// ÉTAPE 2 : Niveau sélectionné → Jeu
// =====================================================
async function startGame() {
    currentScore = 0;
    foundWords   = [];

    await loadWords();

    const config = LEVEL_CONFIG[currentLevel];
    playerNameDisplay.textContent = currentPlayer;
    levelBadge.textContent  = `${config.icon} ${config.name}`;
    levelBadge.className    = `level-badge ${config.badgeClass}`;
    scoreValueDisplay.textContent = 0;

    showPage(gamepage);
    generateGrid();
    displayWordList();
}

// =====================================================
// CRÉER / RÉCUPÉRER LE JOUEUR
// =====================================================
async function createOrGetPlayer(pseudo) {
    try {
        const { data: existing, error: selectError } = await supabaseClient
            .from('scores')
            .select('id')
            .eq('pseudo', pseudo)
            .single();

        if (selectError && selectError.code !== 'PGRST116') throw selectError;

        if (!existing) {
            const { error: insertError } = await supabaseClient
                .from('scores')
                .insert([{ pseudo, facile: 0, intermediaire: 0, difficile: 0 }]);
            if (insertError) throw insertError;
            console.log(`✅ Nouveau joueur "${pseudo}" créé.`);
        } else {
            console.log(`✅ Joueur "${pseudo}" retrouvé.`);
        }
        return true;

    } catch (error) {
        console.error('❌ Erreur joueur :', error);
        if (error.code === '23505') return true; // pseudo déjà pris → OK
        alert('Erreur de connexion. Réessaie.');
        return false;
    }
}

// =====================================================
// CHARGER LES MOTS DEPUIS SUPABASE
// La table "mots" a UNE ligne par mot (colonne "liste")
// et une colonne "niveau" (1, 2 ou 3)
// =====================================================
async function loadWords() {
    try {
        const { data, error } = await supabaseClient
            .from('mots')
            .select('liste')
            .eq('niveau', currentLevel);

        if (error) throw error;

        if (data && data.length > 0) {
            // Chaque ligne = 1 mot dans la colonne "liste"
            const allWords = data
                .map(row => row.liste.trim().toUpperCase())
                .filter(w => w.length > 0);

            const config  = LEVEL_CONFIG[currentLevel];
            const maxFit  = Math.max(config.rows, config.cols); // sécurité longueur
            const eligible = allWords.filter(w => w.length <= maxFit);

            // Prendre le nombre de mots spécifié par niveau
            wordsToFind = shuffleArray(eligible).slice(0, config.wordCount);

            console.log(`✅ Mots niveau ${currentLevel} (${config.wordCount} mots) :`, wordsToFind);
        } else {
            throw new Error('Aucun mot trouvé pour ce niveau');
        }

    } catch (error) {
        console.error('❌ Erreur chargement mots :', error);
        const fallback = {
            1: ['CHAT', 'CHIEN', 'LUNE', 'ARBRE', 'FLEUR'],
            2: ['CLAVIER', 'SOURIS', 'ECRAN', 'RESEAU', 'DISQUE', 'SCANNER', 'SERVEUR'],
            3: ['ALGORITHME', 'FRAMEWORK', 'DATABASE', 'INTERFACE', 'PROTOCOLE', 'VARIABLE', 'FONCTION', 'BOUCLE', 'CLASSE', 'MODULE'],
        };
        wordsToFind = fallback[currentLevel] || fallback[1];
        console.warn('⚠️ Mots de secours utilisés');
    }
}

// =====================================================
// GÉNÉRATION DE LA GRILLE (dimensions dynamiques)
// =====================================================
function generateGrid() {
    const { rows, cols } = LEVEL_CONFIG[currentLevel];
    gridData = Array(rows).fill(null).map(() => Array(cols).fill(''));

    // Placer les mots avec possibilité de croisements
    const placed = placeWordsWithCrossing(wordsToFind, rows, cols);
    
    if (placed < wordsToFind.length) {
        console.warn(`⚠️ Seulement ${placed}/${wordsToFind.length} mots placés`);
    }

    // Remplir les cases vides
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!gridData[r][c]) gridData[r][c] = getRandomLetter();
        }
    }

    renderGrid(rows, cols);
}

// =====================================================
// PLACEMENT DES MOTS AVEC CROISEMENTS
// =====================================================
function placeWordsWithCrossing(words, rows, cols) {
    let placedCount = 0;
    const maxAttempts = 500;

    for (const word of words) {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < maxAttempts) {
            const direction = getRandomDirection();
            const row = Math.floor(Math.random() * rows);
            const col = Math.floor(Math.random() * cols);

            const result = canPlaceWordWithCrossing(word, row, col, direction.dr, direction.dc, rows, cols);
            
            if (result.canPlace) {
                // Placer le mot
                for (let i = 0; i < word.length; i++) {
                    gridData[row + i * direction.dr][col + i * direction.dc] = word[i];
                }
                placed = true;
                placedCount++;
                
                if (result.crossings > 0) {
                    console.log(`✨ "${word}" placé avec ${result.crossings} croisement(s)`);
                }
            }
            attempts++;
        }

        if (!placed) {
            console.warn(`⚠️ Impossible de placer "${word}" après ${maxAttempts} tentatives`);
        }
    }

    return placedCount;
}

// =====================================================
// VÉRIFIER SI ON PEUT PLACER UN MOT (avec croisements)
// =====================================================
function canPlaceWordWithCrossing(word, row, col, dr, dc, rows, cols) {
    let crossings = 0;
    let hasSpace = true;

    for (let i = 0; i < word.length; i++) {
        const r = row + i * dr;
        const c = col + i * dc;

        // Vérifier les limites
        if (r < 0 || r >= rows || c < 0 || c >= cols) {
            return { canPlace: false, crossings: 0 };
        }

        const currentCell = gridData[r][c];

        if (currentCell) {
            // Case occupée : autoriser seulement si c'est la même lettre (croisement)
            if (currentCell !== word[i]) {
                return { canPlace: false, crossings: 0 };
            }
            crossings++;
        } else {
            // Case vide : vérifier qu'on ne touche pas d'autres lettres perpendiculairement
            if (!checkPerpendicularSpace(r, c, dr, dc, rows, cols)) {
                hasSpace = false;
            }
        }
    }

    // On accepte le placement si :
    // - On a de l'espace autour OU on a des croisements valides
    // - Au moins une case vide pour éviter les doublons complets
    const hasEmptyCell = word.split('').some((letter, i) => {
        const r = row + i * dr;
        const c = col + i * dc;
        return !gridData[r][c];
    });

    return { 
        canPlace: hasEmptyCell && (hasSpace || crossings > 0), 
        crossings 
    };
}

// =====================================================
// VÉRIFIER L'ESPACE PERPENDICULAIRE
// =====================================================
function checkPerpendicularSpace(r, c, dr, dc, rows, cols) {
    // Directions perpendiculaires selon la direction du mot
    const perpDirs = [];
    
    if (dr === 0) { // Horizontal
        perpDirs.push([1, 0], [-1, 0]);
    } else if (dc === 0) { // Vertical
        perpDirs.push([0, 1], [0, -1]);
    } else { // Diagonal
        perpDirs.push([dr, -dc], [-dr, dc]);
    }

    // Vérifier qu'il n'y a pas de lettres juste à côté perpendiculairement
    for (const [pdr, pdc] of perpDirs) {
        const nr = r + pdr;
        const nc = c + pdc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && gridData[nr][nc]) {
            return false;
        }
    }

    return true;
}

// =====================================================
// DIRECTIONS POSSIBLES
// =====================================================
function getRandomDirection() {
    const directions = [
        { dr: 0,  dc: 1  },  // → Horizontal droite
        { dr: 1,  dc: 0  },  // ↓ Vertical bas
        { dr: 1,  dc: 1  },  // ↘ Diagonal bas-droite
        { dr: -1, dc: 1  },  // ↗ Diagonal haut-droite
        { dr: 0,  dc: -1 },  // ← Horizontal gauche
        { dr: -1, dc: 0  },  // ↑ Vertical haut
        { dr: -1, dc: -1 },  // ↖ Diagonal haut-gauche
        { dr: 1,  dc: -1 },  // ↙ Diagonal bas-gauche
    ];
    return directions[Math.floor(Math.random() * directions.length)];
}

function getRandomLetter() {
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
}

// =====================================================
// AFFICHAGE DE LA GRILLE
// =====================================================
function renderGrid(rows, cols) {
    wordGrid.innerHTML = '';

    // Calcul dynamique de la taille des cellules
    const container = document.querySelector('.grid-container');
    const maxWidth = Math.min(container.clientWidth - 40, 600);
    const maxHeight = window.innerHeight - 300; // Espace pour header + mots
    
    const cellSize = Math.floor(Math.min(
        maxWidth / cols,
        maxHeight / rows,
        50 // taille max
    ));

    // Mise à jour du CSS Grid
    wordGrid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    wordGrid.style.gridTemplateRows    = `repeat(${rows}, ${cellSize}px)`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className    = 'grid-cell';
            cell.textContent  = gridData[r][c];
            cell.dataset.row  = r;
            cell.dataset.col  = c;
            
            // Appliquer la taille calculée
            cell.style.width  = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.fontSize = `${Math.max(cellSize * 0.5, 12)}px`;

            cell.addEventListener('mousedown',  startSelection);
            cell.addEventListener('mouseenter', continueSelection);
            cell.addEventListener('touchstart', handleTouchStart, { passive: false });
            cell.addEventListener('touchmove',  handleTouchMove,  { passive: false });
            cell.addEventListener('touchend',   handleTouchEnd,   { passive: false });

            wordGrid.appendChild(cell);
        }
    }

    document.addEventListener('mouseup', endSelection);
}

// Recalculer la grille lors du resize
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
// SÉLECTION DES CELLULES
// =====================================================
function startSelection(e) {
    isSelecting = true;
    selectedCells = [];
    clearSelection();
    const cell = e.currentTarget;
    cell.classList.add('selected');
    selectedCells.push({ row: +cell.dataset.row, col: +cell.dataset.col, letter: cell.textContent });
}

function continueSelection(e) {
    if (!isSelecting) return;
    const cell = e.currentTarget;
    const r = +cell.dataset.row;
    const c = +cell.dataset.col;

    if (selectedCells.some(s => s.row === r && s.col === c)) return;

    if (selectedCells.length > 0) {
        const last = selectedCells[selectedCells.length - 1];
        if (isAligned(last.row, last.col, r, c)) {
            cell.classList.add('selected');
            selectedCells.push({ row: r, col: c, letter: cell.textContent });
        }
    }
}

function endSelection() {
    if (!isSelecting) return;
    isSelecting = false;
    checkWord();
}

// Tactile
function handleTouchStart(e) {
    e.preventDefault();
    isSelecting = true;
    selectedCells = [];
    clearSelection();
    const cell = e.currentTarget;
    cell.classList.add('selected');
    selectedCells.push({ row: +cell.dataset.row, col: +cell.dataset.col, letter: cell.textContent });
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isSelecting) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el || !el.classList.contains('grid-cell')) return;
    const r = +el.dataset.row;
    const c = +el.dataset.col;
    if (selectedCells.some(s => s.row === r && s.col === c)) return;
    if (selectedCells.length > 0) {
        const last = selectedCells[selectedCells.length - 1];
        if (isAligned(last.row, last.col, r, c)) {
            el.classList.add('selected');
            selectedCells.push({ row: r, col: c, letter: el.textContent });
        }
    }
}

function handleTouchEnd(e) {
    if (!isSelecting) return;
    e.preventDefault();
    isSelecting = false;
    checkWord();
}

function isAligned(r1, c1, r2, c2) {
    const dr = Math.abs(r2 - r1);
    const dc = Math.abs(c2 - c1);
    return (dr === 0 && dc === 1) || (dr === 1 && dc === 0) || (dr === 1 && dc === 1);
}

function clearSelection() {
    document.querySelectorAll('.grid-cell.selected').forEach(cell => {
        if (!cell.classList.contains('found')) cell.classList.remove('selected');
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
        currentScore += foundWord.length * 10;
        scoreValueDisplay.textContent = currentScore;

        selectedCells.forEach(({ row, col }) => {
            const el = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
            if (el) { el.classList.add('found'); el.classList.remove('selected'); }
        });

        updateWordList(foundWord);

        if (foundWords.length === wordsToFind.length) {
            setTimeout(endGame, 1000);
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
    wordsToFind.forEach(word => {
        const span = document.createElement('span');
        span.className = 'word-item';
        span.textContent  = word;
        span.dataset.word = word;
        wordList.appendChild(span);
    });
}

function updateWordList(word) {
    const item = document.querySelector(`.word-item[data-word="${word}"]`);
    if (item) item.classList.add('found');
}

// =====================================================
// FIN DE PARTIE
// =====================================================
async function endGame() {
    await saveScore();
    const cfg = LEVEL_CONFIG[currentLevel];
    alert(`🎉 Bravo ${currentPlayer} !\nTous les mots trouvés !\nNiveau : ${cfg.name}\nScore : ${currentScore} pts`);
}

async function saveScore() {
    if (!isDatabaseConnected) return;

    try {
        const { data: player, error: fetchError } = await supabaseClient
            .from('scores')
            .select('facile, intermediaire, difficile')
            .eq('pseudo', currentPlayer)
            .single();

        if (fetchError) throw fetchError;

        const col       = currentLevel === 1 ? 'facile' : currentLevel === 2 ? 'intermediaire' : 'difficile';
        const bestScore = player[col] || 0;

        if (currentScore > bestScore) {
            const { error } = await supabaseClient
                .from('scores')
                .update({ [col]: currentScore })
                .eq('pseudo', currentPlayer);
            if (error) throw error;
            console.log(`✅ Nouveau record pour ${currentPlayer} (${col}) : ${currentScore} pts`);
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
