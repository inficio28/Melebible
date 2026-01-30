// CONFIG SUPABASE
const SUPABASE_URL = "https://motscroises.supabase.co"; // si différent, adapte
const SUPABASE_KEY = "TA_CLE_API"; // remplace par ta clé

const LARGEUR = 10;
const HAUTEUR = 20;

let grid = [];
let words = [];
let startCell = null;
let endCell = null;
let pseudo = "";
let foundWords = new Set();

// DOM
const screenHome = document.getElementById("screen-home");
const screenGame = document.getElementById("screen-game");
const screenScores = document.getElementById("screen-scores");

const btnStart = document.getElementById("btn-start");
const btnScores = document.getElementById("btn-scores");
const btnQuit = document.getElementById("btn-quit");
const btnBackHome = document.getElementById("btn-back-home");

const pseudoInput = document.getElementById("pseudo");
const gridContainer = document.getElementById("grid");
const wordListEl = document.getElementById("word-list");
const scoresListEl = document.getElementById("scores-list");

// NAVIGATION

function showScreen(name) {
    [screenHome, screenGame, screenScores].forEach(s => s.classList.remove("active"));
    if (name === "home") screenHome.classList.add("active");
    if (name === "game") screenGame.classList.add("active");
    if (name === "scores") screenScores.classList.add("active");
}

// CHARGEMENT DES MOTS

async function loadWords() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/Mots?select=Mots`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    });

    const data = await res.json();
    words = data.map(w => w.Mots.toUpperCase());

    generateGrid();
    renderGrid();
    renderWordList();
}

// GÉNÉRATION GRILLE

function generateGrid() {
    grid = Array.from({ length: HAUTEUR }, () =>
        Array.from({ length: LARGEUR }, () => ".")
    );

    words.forEach(word => placeWord(word));

    for (let y = 0; y < HAUTEUR; y++) {
        for (let x = 0; x < LARGEUR; x++) {
            if (grid[y][x] === ".") {
                grid[y][x] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            }
        }
    }

    foundWords.clear();
}

function placeWord(word) {
    const directions = [
        [1, 0],  // horizontal
        [0, 1],  // vertical
        [1, 1]   // diagonal
    ];

    let placed = false;
    let tries = 0;

    while (!placed && tries < 200) {
        tries++;
        const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
        const x = Math.floor(Math.random() * LARGEUR);
        const y = Math.floor(Math.random() * HAUTEUR);

        if (x + dx * (word.length - 1) >= LARGEUR) continue;
        if (y + dy * (word.length - 1) >= HAUTEUR) continue;

        let ok = true;
        for (let i = 0; i < word.length; i++) {
            const c = grid[y + dy * i][x + dx * i];
            if (c !== "." && c !== word[i]) {
                ok = false;
                break;
            }
        }

        if (!ok) continue;

        for (let i = 0; i < word.length; i++) {
            grid[y + dy * i][x + dx * i] = word[i];
        }

        placed = true;
    }
}

// RENDU GRILLE

function renderGrid() {
    gridContainer.innerHTML = "";

    for (let y = 0; y < HAUTEUR; y++) {
        for (let x = 0; x < LARGEUR; x++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.textContent = grid[y][x];
            cell.dataset.x = x;
            cell.dataset.y = y;

            cell.addEventListener("mousedown", startSelection);
            cell.addEventListener("mouseup", endSelection);
            cell.addEventListener("touchstart", startSelection, { passive: true });
            cell.addEventListener("touchend", endSelection, { passive: true });

            gridContainer.appendChild(cell);
        }
    }
}

// LISTE DES MOTS

function renderWordList() {
    wordListEl.innerHTML = words
        .map(w => `<li data-word="${w}">${w}</li>`)
        .join("");
    updateWordListFound();
}

function updateWordListFound() {
    document.querySelectorAll("#word-list li").forEach(li => {
        const w = li.dataset.word;
        if (foundWords.has(w)) {
            li.classList.add("found");
        } else {
            li.classList.remove("found");
        }
    });
}

// SÉLECTION

function startSelection(e) {
    const cell = e.target;
    startCell = {
        x: parseInt(cell.dataset.x),
        y: parseInt(cell.dataset.y)
    };
}

function endSelection(e) {
    const cell = e.target;
    endCell = {
        x: parseInt(cell.dataset.x),
        y: parseInt(cell.dataset.y)
    };

    checkSelection();
}

function checkSelection() {
    if (!startCell || !endCell) return;

    const dx = Math.sign(endCell.x - startCell.x);
    const dy = Math.sign(endCell.y - startCell.y);

    if (dx === 0 && dy === 0) return;

    // autoriser horizontale, verticale, diagonale
    if (!((dx === 0 && dy !== 0) || (dx !== 0 && dy === 0) || (Math.abs(endCell.x - startCell.x) === Math.abs(endCell.y - startCell.y)))) {
        startCell = null;
        endCell = null;
        return;
    }

    let x = startCell.x;
    let y = startCell.y;

    const selected = [];

    while (true) {
        selected.push({ x, y });
        if (x === endCell.x && y === endCell.y) break;
        x += dx;
        y += dy;
    }

    const word = selected.map(c => grid[c.y][c.x]).join("");
    const reversed = word.split("").reverse().join("");

    let found = null;
    if (words.includes(word)) found = word;
    else if (words.includes(reversed)) found = reversed;

    if (found) {
        highlight(selected);
        foundWords.add(found);
        updateWordListFound();
        checkEndOfGame();
    }

    startCell = null;
    endCell = null;
}

function highlight(cells) {
    cells.forEach(c => {
        const selector = `.cell[data-x="${c.x}"][data-y="${c.y}"]`;
        const el = document.querySelector(selector);
        if (el) el.classList.add("highlight");
    });
}

// SCORE = nombre de mots trouvés

async function checkEndOfGame() {
    if (foundWords.size === words.length && words.length > 0) {
        const score = foundWords.size;
        await saveScore(pseudo, score);
        alert(`Bravo ${pseudo} ! Score : ${score}`);
    }
}

// SAUVEGARDE SCORE

async function saveScore(pseudo, score) {
    if (!pseudo) return;

    await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
        },
        body: JSON.stringify({ pseudo, score })
    });
}

// LECTURE SCORES

async function loadScores() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?select=pseudo,score&order=score.desc`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    });

    const data = await res.json();
    scoresListEl.innerHTML = data
        .map(s => `<li><span>${s.pseudo}</span><span>${s.score}</span></li>`)
        .join("");
}

// ÉVÉNEMENTS UI

btnStart.addEventListener("click", async () => {
    const val = pseudoInput.value.trim();
    if (!val) {
        alert("Merci de saisir un pseudonyme.");
        return;
    }
    pseudo = val;
    showScreen("game");
    await loadWords();
});

btnScores.addEventListener("click", async () => {
    showScreen("scores");
    await loadScores();
});

btnQuit.addEventListener("click", () => {
    showScreen("home");
});

btnBackHome.addEventListener("click", () => {
    showScreen("home");
});

// ÉCRAN PAR DÉFAUT
showScreen("home");
