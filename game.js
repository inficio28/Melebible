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
    1: { rows: 8,  cols: 8,  name: 'Facile',        badgeClass: 'easy',    icon: '🟢', wordCount: 8  },
    2: { rows: 10, cols: 10, name: 'Intermédiaire', badgeClass: 'medium',  icon: '🟡', wordCount: 12 },
    3: { rows: 12, cols: 12, name: 'Difficile',     badgeClass: 'hard',    icon: '🔴', wordCount: 16 },
    4: { rows: 12, cols: 12, name: 'Mode Mystère',  badgeClass: 'suicide', icon: '❓', wordCount: 16 },
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
let selectionDirection = null;
let isDatabaseConnected = false;
let isGameLoading      = false;
let currentTheme       = 'mots_bible';
let easyWordsOnly      = false;
let currentLanguage    = 'francais'; // 'francais' ou 'anglais'

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
const themeSelect    = document.getElementById('themeSelect');
const easyWordsCheck = document.getElementById('easyWordsCheck');
const levelGreeting  = document.getElementById('levelGreeting');

// Éléments du scoreboard
const scoreboardEasy   = document.getElementById('scoreboardEasy');
const scoreboardMedium = document.getElementById('scoreboardMedium');
const scoreboardHard   = document.getElementById('scoreboardHard');
const scoreboardSuicide = document.getElementById('scoreboardSuicide');

// =====================================================
// INITIALISATION
// =====================================================
window.addEventListener('DOMContentLoaded', () => {
    checkDatabaseConnection();
    loadSavedPseudo();
});

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
// GESTION DU PSEUDO LOCAL
// =====================================================
function loadSavedPseudo() {
    const savedPseudo = localStorage.getItem('wordgame_pseudo');
    if (savedPseudo) {
        pseudoInput.value = savedPseudo;
        console.log('✅ Pseudo chargé depuis localStorage:', savedPseudo);
    }
}

function savePseudoToLocal(pseudo) {
    localStorage.setItem('wordgame_pseudo', pseudo);
    console.log('✅ Pseudo sauvegardé en localStorage:', pseudo);
}

// =====================================================
// EVENT LISTENERS
// =====================================================
startBtn.addEventListener('click', goToLevelSelection);

// Thème et filtre mots faciles
themeSelect.addEventListener('change', () => {
    currentTheme = themeSelect.value;
});
easyWordsCheck.addEventListener('change', () => {
    easyWordsOnly = easyWordsCheck.checked;
});

// Sélecteur de langue
document.getElementById('langFr').addEventListener('click', () => {
    currentLanguage = 'francais';
    document.getElementById('langFr').classList.add('lang-active');
    document.getElementById('langEn').classList.remove('lang-active');
});
document.getElementById('langEn').addEventListener('click', () => {
    currentLanguage = 'anglais';
    document.getElementById('langEn').classList.add('lang-active');
    document.getElementById('langFr').classList.remove('lang-active');
});
scoresBtn.addEventListener('click', showScoreboard);
backToHomeBtn.addEventListener('click', backToHome);
backToHomeBtnScore.addEventListener('click', backToHome);

pseudoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') goToLevelSelection();
});

document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (isGameLoading) {
            console.log('⏳ Chargement en cours, veuillez patienter...');
            return;
        }
        
        const level = parseInt(btn.dataset.level);
        console.log(`🎮 Bouton niveau ${level} cliqué`);
        currentLevel = level;
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
    
    // Sauvegarder le pseudo en localStorage
    savePseudoToLocal(pseudo);
    
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
            const { error: insertError } = await supabaseClient
                .from('scores')
                .insert([{ 
                    pseudo, 
                    facile: 0, 
                    intermediaire: 0, 
                    difficile: 0,
                    mystere: 0,
                    nbconnexion: 1,
                    lastconnexion_at: new Date().toISOString()
                }]);
            if (insertError) throw insertError;
            console.log(`✅ Nouveau joueur "${pseudo}" créé.`);
        } else {
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
            .select('pseudo, facile, intermediaire, difficile, mystere')
            .order('facile', { ascending: false });

        if (error) throw error;

        displayLevelScores(scores, 'facile', scoreboardEasy);
        displayLevelScores(scores, 'intermediaire', scoreboardMedium);
        displayLevelScores(scores, 'difficile', scoreboardHard);
        displayLevelScores(scores, 'mystere', scoreboardSuicide);

        showPage(scoreboardpage);

    } catch (error) {
        console.error('❌ Erreur chargement scores :', error);
        alert('Erreur lors du chargement des scores');
    }
}

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}min ${s}s`;
    if (m > 0) return `${m}min ${s}s`;
    return `${s}s`;
}

function displayLevelScores(scores, level, container) {
    container.innerHTML = '';

    const levelScores = scores
        .filter(s => s[level] > 0)
        .sort((a, b) => a[level] - b[level]) // tri croissant : plus rapide en premier
        .slice(0, 5);

    if (levelScores.length === 0) {
        container.innerHTML = '<div class="no-scores">Aucun score enregistré</div>';
        return;
    }

    levelScores.forEach((score, index) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        
        // Toujours afficher exactement les 3 premières lettres
        const displayPseudo = score.pseudo.substring(0, 3).toUpperCase();

        scoreItem.innerHTML = `
            <span class="score-rank">#${index + 1}</span>
            <span class="score-time">${formatTime(score[level])}</span>
            <span class="score-pseudo">${displayPseudo}</span>
        `;
        
        container.appendChild(scoreItem);
    });
}

// =====================================================
// CHARGER LES MOTS DEPUIS SUPABASE - OPTIMISÉ
// =====================================================
async function loadWords() {
    try {
        // Construire la requête selon le thème et le filtre mots faciles
        const langCol = currentLanguage === 'anglais' ? 'anglais' : 'francais';
        let query = supabaseClient
            .from(currentTheme)
            .select(langCol === 'anglais' ? 'anglais, niveau' : 'francais, niveau');

        if (easyWordsOnly) {
            query = query.eq('niveau', 1);
        }

        const { data, error } = await query;

        if (error) throw error;

        console.log(`🔍 Requête BDD [${currentTheme} - ${currentLanguage}${easyWordsOnly ? ' - facile' : ''}] - Résultats: ${data ? data.length : 0}`);

        if (data && data.length > 0) {
            const allWords = data
                .map(row => (row[langCol] || '').trim().toUpperCase())
                .filter(w => w.length > 0);

            const config  = LEVEL_CONFIG[currentLevel];
            const maxFit  = Math.max(config.rows, config.cols);
            
            // OPTIMISATION : Filtrer par longueur adaptée au niveau
            // On privilégie les mots courts/moyens qui se placent plus facilement
            let minLength = 3;
            let maxLength = maxFit;
            
            // Adapter la longueur selon le niveau
            if (currentLevel === 1) {
                // Facile : mots courts (3-6 lettres)
                maxLength = Math.min(6, maxFit);
            } else if (currentLevel === 2) {
                // Intermédiaire : mots moyens (3-8 lettres)
                maxLength = Math.min(8, maxFit);
            } else if (currentLevel === 3 || currentLevel === 4) {
                // Difficile et Mystère : profiter des grilles 12×12 avec mots plus longs (4-10 lettres)
                minLength = 4;
                maxLength = Math.min(10, maxFit);
            }
            
            const eligible = allWords.filter(w => w.length >= minLength && w.length <= maxLength);

            console.log(`📏 Filtrage (${minLength}-${maxLength} lettres) : ${allWords.length} → ${eligible.length} mots éligibles`);

            if (eligible.length < config.wordCount) {
                throw new Error(`Pas assez de mots disponibles.\n\nTrouvés: ${eligible.length} mots\nRequis: ${config.wordCount} mots`);
            }

            // OPTIMISATION MAJEURE : Charger beaucoup plus de mots pour avoir un meilleur choix
            // Pour les grilles 12×12, on charge encore plus de mots (15x)
            const multiplier = (currentLevel === 3 || currentLevel === 4) ? 15 : 10;
            const poolSize = Math.min(config.wordCount * multiplier, eligible.length);
            const wordPool = shuffleArray(eligible).slice(0, poolSize);
            
            console.log(`✅ Pool de ${poolSize} mots disponibles pour sélection optimale`);
            
            wordsToFind = wordPool;
            
        } else {
            throw new Error(`Aucun mot trouvé dans la base de données`);
        }

    } catch (error) {
        console.error('❌ ERREUR chargement mots :', error.message);
        
        if (error.message.includes('Pas assez de mots')) {
            alert(`⚠️ ${error.message}\n\nVeuillez essayer un niveau plus facile.`);
            showPage(levelpage);
            isGameLoading = false;
            return;
        }
        
        if (error.message.includes('Aucun mot trouvé')) {
            alert(`⚠️ ${error.message}\n\nUtilisation des mots par défaut.`);
        }
        
        loadFallbackWords();
    }
}

function loadFallbackWords() {
    const fallbackWords = {
        1: ['CHAT', 'SOLEIL', 'FLEUR', 'MAISON', 'JARDIN', 'VOITURE', 'ARBRE', 'CHIEN', 'TABLE', 'PORTE'],
        2: ['MONTAGNE', 'VOYAGE', 'LUMIERE', 'FORET', 'OCEAN', 'RIVIERE', 'ETOILE', 'PLANETE', 'CASCADE', 'VOLCAN', 'DESERT', 'SAVANE', 'JUNGLE', 'TOUNDRA', 'PRAIRIE'],
        3: ['AVENTURE', 'HISTOIRE', 'MYSTERE', 'LEGENDE', 'COSMOS', 'NATURE', 'HORIZON', 'CASCADE', 'VOLCAN', 'DESERT', 'SAVANE', 'JUNGLE', 'TOUNDRA', 'PRAIRIE', 'COLLINE', 'VALLEE', 'MONTAGNE', 'RIVIERE', 'OCEAN', 'FORET'],
        4: ['AVENTURE', 'HISTOIRE', 'MYSTERE', 'LEGENDE', 'COSMOS', 'NATURE', 'HORIZON', 'CASCADE', 'VOLCAN', 'DESERT', 'SAVANE', 'JUNGLE', 'TOUNDRA', 'PRAIRIE', 'COLLINE', 'VALLEE', 'MONTAGNE', 'RIVIERE', 'OCEAN', 'FORET']
    };
    wordsToFind = fallbackWords[currentLevel] || fallbackWords[1];
    console.log('⚠️ Utilisation des mots par défaut:', wordsToFind);
}

// =====================================================
// DÉMARRAGE DU JEU
// =====================================================
async function startGame() {
    if (isGameLoading) {
        console.log('⏳ Un jeu est déjà en cours de chargement');
        return;
    }
    
    isGameLoading = true;
    console.log(`🚀 Démarrage du jeu - Niveau ${currentLevel}`);
    
    try {
        foundWords = [];
        currentScore = 0;
        scoreValueDisplay.textContent = '0';

        const cfg = LEVEL_CONFIG[currentLevel];
        playerNameDisplay.textContent = currentPlayer;
        
        levelBadge.textContent = `${cfg.icon} ${cfg.name}`;
        levelBadge.className = `level-badge ${cfg.badgeClass}`;

        console.log('📥 Chargement des mots...');
        await loadWords();
        
        if (!wordsToFind || wordsToFind.length === 0) {
            console.error('❌ Aucun mot chargé');
            alert('❌ Erreur : Aucun mot n\'a pu être chargé. Retour à la sélection.');
            showPage(levelpage);
            return;
        }
        
        console.log(`🏗️ Construction de la grille avec ${cfg.wordCount} mots requis...`);

        // CHANGEMENT MAJEUR : On passe le nombre de mots requis ET le pool de mots
        const success = buildGridOptimized(cfg.rows, cfg.cols, wordsToFind, cfg.wordCount);
        
        if (!success) {
            alert('❌ Impossible de générer une grille valide. Essayez de nouveau.');
            showPage(levelpage);
            return;
        }
        
        console.log(`✅ Grille créée avec exactement ${wordsToFind.length} mots`);
        console.log('🎨 Rendu de la grille...');
        renderGrid(cfg.rows, cfg.cols);
        
        console.log('📝 Affichage de la liste de mots...');
        displayWordList();
        
        console.log('⏱️ Démarrage du chronomètre...');
        startTimer();
        
        console.log('✅ Affichage de la page de jeu');
        showPage(gamepage);
        
        // Optimiser la taille de la grille après que la page soit affichée
        setTimeout(() => {
            console.log('🔧 Optimisation de la grille...');
            optimizeGridSize();
        }, 150);
        
        console.log('🎮 Jeu prêt !');
    } finally {
        isGameLoading = false;
    }
}

// =====================================================
// CONSTRUCTION OPTIMISÉE DE LA GRILLE
// =====================================================
function buildGridOptimized(rows, cols, wordPool, targetCount) {
    const maxAttempts = 100;
    
    console.log(`🎯 Objectif: placer exactement ${targetCount} mots dans grille ${rows}x${cols}`);
    console.log(`📦 Pool disponible: ${wordPool.length} mots`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Initialiser grille vide
        gridData = Array(rows).fill(null).map(() => Array(cols).fill(''));
        
        // STRATÉGIE OPTIMISÉE : Mix de longueurs pour plus de variété
        const shuffledPool = shuffleArray(wordPool);
        
        // Créer des groupes par longueur
        const shortWords = shuffledPool.filter(w => w.length <= 5);
        const mediumWords = shuffledPool.filter(w => w.length >= 6 && w.length <= 8);
        const longWords = shuffledPool.filter(w => w.length >= 9);
        
        // Mélanger chaque groupe
        const mixedShortWords = shuffleArray(shortWords);
        const mixedMediumWords = shuffleArray(mediumWords);
        const mixedLongWords = shuffleArray(longWords);
        
        // Combiner pour avoir une bonne diversité : 
        // 1/3 courts, 1/3 moyens, 1/3 longs (si disponibles)
        const sortedWords = [];
        const maxPerGroup = Math.ceil(targetCount / 3);
        
        // Alterner les longueurs pour meilleur placement
        for (let i = 0; i < maxPerGroup * 3; i++) {
            const groupIndex = i % 3;
            
            if (groupIndex === 0 && mixedShortWords.length > 0) {
                sortedWords.push(mixedShortWords.shift());
            } else if (groupIndex === 1 && mixedMediumWords.length > 0) {
                sortedWords.push(mixedMediumWords.shift());
            } else if (groupIndex === 2 && mixedLongWords.length > 0) {
                sortedWords.push(mixedLongWords.shift());
            } else {
                // Fallback : prendre n'importe quel mot restant
                if (mixedShortWords.length > 0) sortedWords.push(mixedShortWords.shift());
                else if (mixedMediumWords.length > 0) sortedWords.push(mixedMediumWords.shift());
                else if (mixedLongWords.length > 0) sortedWords.push(mixedLongWords.shift());
            }
            
            if (sortedWords.length >= shuffledPool.length) break;
        }
        
        const placedWords = [];
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 5;
        
        // Essayer de placer les mots un par un
        for (const word of sortedWords) {
            if (placedWords.length >= targetCount) {
                break; // On a atteint notre objectif !
            }
            
            const placed = tryPlaceWordOptimized(word, rows, cols);
            if (placed) {
                placedWords.push(word);
                consecutiveFailures = 0;
            } else {
                consecutiveFailures++;
                
                // Si trop d'échecs consécutifs, recommencer la grille
                if (consecutiveFailures >= maxConsecutiveFailures) {
                    break;
                }
            }
        }
        
        console.log(`🔄 Tentative ${attempt}/${maxAttempts}: ${placedWords.length}/${targetCount} mots placés`);
        
        // Si on a exactement le bon nombre de mots
        if (placedWords.length === targetCount) {
            wordsToFind = placedWords;
            
            // Vérification finale
            if (verifyAllWordsInGrid()) {
                fillEmptyCells();
                console.log('✅ SUCCÈS ! Grille complète avec le bon nombre de mots');
                console.log('📊 Répartition des longueurs:', getWordLengthDistribution(placedWords));
                return true;
            }
        }
        
        // Si on est proche du but (90% ou plus), on peut accepter
        if (placedWords.length >= Math.floor(targetCount * 0.9) && attempt > maxAttempts / 2) {
            wordsToFind = placedWords;
            if (verifyAllWordsInGrid()) {
                fillEmptyCells();
                console.log(`✅ SUCCÈS PARTIEL ! Grille avec ${placedWords.length}/${targetCount} mots`);
                console.log('📊 Répartition des longueurs:', getWordLengthDistribution(placedWords));
                return true;
            }
        }
    }
    
    console.error(`❌ Échec après ${maxAttempts} tentatives`);
    return false;
}

// Fonction utilitaire pour afficher la distribution des longueurs
function getWordLengthDistribution(words) {
    const distribution = {};
    words.forEach(word => {
        const len = word.length;
        distribution[len] = (distribution[len] || 0) + 1;
    });
    return distribution;
}

function tryPlaceWordOptimized(word, rows, cols) {
    // Calculer TOUTES les positions possibles AVANT de choisir
    const possiblePlacements = [];
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            for (const direction of DIRECTIONS) {
                if (canPlaceWord(word, r, c, direction, rows, cols)) {
                    // Calculer un score de qualité pour ce placement
                    const score = calculatePlacementScore(word, r, c, direction, rows, cols);
                    possiblePlacements.push({ row: r, col: c, direction, score });
                }
            }
        }
    }
    
    if (possiblePlacements.length === 0) {
        return false;
    }
    
    // STRATÉGIE AMÉLIORÉE : Privilégier les placements qui partagent des lettres
    // Trier par score décroissant
    possiblePlacements.sort((a, b) => b.score - a.score);
    
    // Choisir aléatoirement parmi les 20% meilleurs placements
    const topChoices = Math.max(1, Math.floor(possiblePlacements.length * 0.2));
    const randomChoice = possiblePlacements[Math.floor(Math.random() * topChoices)];
    
    placeWord(word, randomChoice.row, randomChoice.col, randomChoice.direction);
    return true;
}

function calculatePlacementScore(word, startRow, startCol, direction, rows, cols) {
    let score = 0;
    const { dr, dc } = direction;
    
    let sharedLetters = 0;
    let emptySpaces = 0;
    
    // Analyser chaque position du mot
    for (let i = 0; i < word.length; i++) {
        const r = startRow + (i * dr);
        const c = startCol + (i * dc);
        
        if (gridData[r][c] === word[i]) {
            sharedLetters++;
            score += 20; // BONUS IMPORTANT pour réutilisation de lettre
        } else if (gridData[r][c] === '') {
            emptySpaces++;
        }
    }
    
    // BONUS pour les mots qui partagent des lettres (meilleur entrelacement)
    if (sharedLetters > 0) {
        score += sharedLetters * 15;
    }
    
    // BONUS pour les placements centraux (évite les bords)
    const centerRow = rows / 2;
    const centerCol = cols / 2;
    const avgRow = startRow + (word.length * dr) / 2;
    const avgCol = startCol + (word.length * dc) / 2;
    const distanceFromCenter = Math.abs(avgRow - centerRow) + Math.abs(avgCol - centerCol);
    score += Math.max(0, 15 - distanceFromCenter);
    
    // BONUS pour la variété de direction (favorise H/V en premier)
    if (direction.name === 'HORIZONTAL_RIGHT' || direction.name === 'VERTICAL_DOWN') {
        score += 10;
    } else if (direction.name === 'HORIZONTAL_LEFT' || direction.name === 'VERTICAL_UP') {
        score += 8;
    } else {
        score += 5; // Diagonales en dernier
    }
    
    // BONUS pour les mots qui laissent de l'espace libre autour
    score += emptySpaces * 2;
    
    // Facteur aléatoire pour diversité
    score += Math.random() * 10;
    
    return score;
}

// =====================================================
// VÉRIFICATION QUE TOUS LES MOTS SONT DANS LA GRILLE
// =====================================================
function verifyAllWordsInGrid() {
    for (const word of wordsToFind) {
        let found = false;
        
        for (let r = 0; r < gridData.length && !found; r++) {
            for (let c = 0; c < gridData[0].length && !found; c++) {
                for (const direction of DIRECTIONS) {
                    if (checkWordAtPosition(word, r, c, direction)) {
                        found = true;
                        break;
                    }
                }
            }
        }
        
        if (!found) {
            console.error(`❌ Le mot "${word}" n'est PAS dans la grille !`);
            return false;
        }
    }
    
    console.log('✅ Tous les mots sont bien présents dans la grille');
    return true;
}

function checkWordAtPosition(word, startRow, startCol, direction) {
    const { dr, dc } = direction;
    
    for (let i = 0; i < word.length; i++) {
        const r = startRow + (i * dr);
        const c = startCol + (i * dc);
        
        if (r < 0 || r >= gridData.length || c < 0 || c >= gridData[0].length) {
            return false;
        }
        
        if (gridData[r][c] !== word[i]) {
            return false;
        }
    }
    
    return true;
}

function canPlaceWord(word, startRow, startCol, direction, rows, cols) {
    const { dr, dc } = direction;
    
    for (let i = 0; i < word.length; i++) {
        const r = startRow + (i * dr);
        const c = startCol + (i * dc);
        
        if (r < 0 || r >= rows || c < 0 || c >= cols) {
            return false;
        }
        
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
    wordGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    wordGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.textContent = gridData[r][c];
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            cell.addEventListener('mousedown', handleMouseDown);
            cell.addEventListener('mouseenter', handleMouseEnter);
            cell.addEventListener('mouseup', handleMouseUp);
            
            cell.addEventListener('touchstart', handleTouchStart, { passive: false });
            cell.addEventListener('touchmove', handleTouchMove, { passive: false });
            cell.addEventListener('touchend', handleTouchEnd, { passive: false });
            
            wordGrid.appendChild(cell);
        }
    }
}

// =====================================================
// SÉLECTION À LA SOURIS
// =====================================================
function handleMouseDown(e) {
    isSelecting = true;
    selectedCells = [];
    selectionDirection = null;
    clearSelection();
    
    const el = e.currentTarget;
    el.classList.add('selected');
    selectedCells.push({
        row: +el.dataset.row,
        col: +el.dataset.col,
        letter: el.textContent
    });
}

function handleMouseEnter(e) {
    if (!isSelecting) return;
    
    const el = e.currentTarget;
    const r = +el.dataset.row;
    const c = +el.dataset.col;

    if (selectedCells.length > 1) {
        const previous = selectedCells[selectedCells.length - 2];
        if (previous.row === r && previous.col === c) {
            const removed = selectedCells.pop();
            const removedCell = document.querySelector(`.grid-cell[data-row="${removed.row}"][data-col="${removed.col}"]`);
            if (removedCell && !removedCell.classList.contains('found')) {
                removedCell.classList.remove('selected');
            }
            return;
        }
    }

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
        const expectedRow = last.row + selectionDirection.dr;
        const expectedCol = last.col + selectionDirection.dc;
        
        if (r === expectedRow && c === expectedCol) {
            el.classList.add('selected');
            selectedCells.push({ row: r, col: c, letter: el.textContent });
        }
    }
}

function handleMouseUp() {
    if (!isSelecting) return;
    isSelecting = false;
    selectionDirection = null;
    checkWord();
}

// =====================================================
// SÉLECTION TACTILE
// =====================================================
function handleTouchStart(e) {
    e.preventDefault();
    isSelecting = true;
    selectedCells = [];
    selectionDirection = null;
    clearSelection();
    
    const el = e.currentTarget;
    el.classList.add('selected');
    selectedCells.push({
        row: +el.dataset.row,
        col: +el.dataset.col,
        letter: el.textContent
    });
}

function handleTouchMove(e) {
    if (!isSelecting) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (!el || !el.classList.contains('grid-cell')) return;
    
    const r = +el.dataset.row;
    const c = +el.dataset.col;

    if (selectedCells.length > 1) {
        const previous = selectedCells[selectedCells.length - 2];
        if (previous.row === r && previous.col === c) {
            const removed = selectedCells.pop();
            const removedCell = document.querySelector(`.grid-cell[data-row="${removed.row}"][data-col="${removed.col}"]`);
            if (removedCell && !removedCell.classList.contains('found')) {
                removedCell.classList.remove('selected');
            }
            return;
        }
    }

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
        const expectedRow = last.row + selectionDirection.dr;
        const expectedCol = last.col + selectionDirection.dc;
        
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

function getDirection(r1, c1, r2, c2) {
    const dr = r2 - r1;
    const dc = c2 - c1;
    
    const normDr = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
    const normDc = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
    
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
        const index = foundWords.length - 1;
        const checkbox = document.querySelector(`.suicide-checkbox[data-index="${index}"]`);
        if (checkbox) {
            checkbox.classList.add('checked');
            checkbox.textContent = word;
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
    
    await saveScore();
    
    const cfg = LEVEL_CONFIG[currentLevel];
    scoreValueDisplay.textContent = formatTime(elapsedSeconds);
    
    alert(`🎉 Bravo ${currentPlayer} !\n\nTous les mots trouvés !\nNiveau : ${cfg.name}\nTemps : ${formatTime(elapsedSeconds)}`);
}

async function saveScore() {
    if (!isDatabaseConnected) return;

    try {
        const { data: player, error: fetchError } = await supabaseClient
            .from('scores')
            .select('facile, intermediaire, difficile, mystere')
            .eq('pseudo', currentPlayer)
            .single();

        if (fetchError) throw fetchError;

        const col = currentLevel === 1 ? 'facile' 
                  : currentLevel === 2 ? 'intermediaire' 
                  : currentLevel === 3 ? 'difficile'
                  : 'mystere';
        
        const bestTime = player[col] || 0;

        if (bestTime === 0 || elapsedSeconds < bestTime) {
            const { error } = await supabaseClient
                .from('scores')
                .update({ [col]: elapsedSeconds })
                .eq('pseudo', currentPlayer);
            if (error) throw error;
            console.log(`✅ Nouveau record pour ${currentPlayer} (${col}) : ${elapsedSeconds}s`);
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



/* ============================================= */
/* 🔥 OPTIMISATION DYNAMIQUE DE LA GRILLE */
/* ============================================= */

let currentGridSize = null;

function optimizeGridSize() {
    const grid = document.getElementById("wordGrid");
    const container = document.querySelector(".grid-container");

    if (!grid || !container) {
        console.warn('⚠️ Grid ou container non trouvé');
        return;
    }

    // Récupérer les dimensions du niveau actuel
    const cfg = LEVEL_CONFIG[currentLevel];
    if (!cfg) {
        console.warn('⚠️ Configuration niveau non trouvée');
        return;
    }
    
    const rows = cfg.rows;
    const cols = cfg.cols;
    currentGridSize = { rows, cols };

    // Obtenir les éléments pour calculer l'espace disponible
    const header = document.querySelector(".game-header");
    const words = document.querySelector(".words-compact");

    // Calculer l'espace disponible
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const headerHeight = header ? header.offsetHeight : 0;
    const wordsHeight = words ? words.offsetHeight : 0;
    
    // Marges de sécurité
    const horizontalMargin = 40;
    const verticalMargin = 100;
    
    const availableWidth = viewportWidth - horizontalMargin;
    const availableHeight = viewportHeight - headerHeight - wordsHeight - verticalMargin;

    // Calculer la taille optimale des cellules
    const gap = 2; // Gap entre les cellules
    const totalGapWidth = gap * (cols - 1);
    const totalGapHeight = gap * (rows - 1);
    
    const cellSizeByWidth = Math.floor((availableWidth - totalGapWidth) / cols);
    const cellSizeByHeight = Math.floor((availableHeight - totalGapHeight) / rows);
    
    // Prendre la plus petite dimension
    let cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);
    
    // Limiter la taille des cellules
    const minCellSize = 25;
    const maxCellSize = 60;
    cellSize = Math.max(minCellSize, Math.min(maxCellSize, cellSize));

    // Appliquer les styles au grid
    grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    grid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    grid.style.gap = `${gap}px`;

    // Appliquer les styles aux cellules
    const cells = document.querySelectorAll(".grid-cell");
    cells.forEach(cell => {
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;
        
        // Taille de police proportionnelle
        const fontSize = Math.max(14, Math.min(32, cellSize * 0.55));
        cell.style.fontSize = `${fontSize}px`;
        
        // Border radius proportionnel
        const borderRadius = Math.max(3, Math.min(8, Math.floor(cellSize / 8)));
        cell.style.borderRadius = `${borderRadius}px`;
    });
    
    console.log(`📐 Grille optimisée: ${cols}×${rows}, cellules: ${cellSize}px, ${cells.length} cellules trouvées`);
}

/* Resize dynamique */
window.addEventListener("resize", () => {
    if (currentGridSize) {
        optimizeGridSize();
    }
});

window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        if (currentGridSize) {
            optimizeGridSize();
        }
    }, 300);
});


