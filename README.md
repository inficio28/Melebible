# Jeu de Mots Mêlés

Un jeu de mots mêlés interactif avec connexion à Supabase pour stocker les mots et les scores.
**100% compatible mobile et tablette !** 📱

## 🎮 Fonctionnalités

- Page d'accueil avec saisie du pseudo
- Grille de 10x15 lettres
- Mots pris aléatoirement depuis Supabase
- Sélection des mots par glisser-déposer (souris + tactile)
- Système de score (10 points par lettre)
- Sauvegarde des scores dans Supabase
- Design coloré et animé
- **Support tactile complet pour smartphone et tablette**
- **Design responsive adaptatif**

## 🚀 Configuration Supabase

### 1. Créer le projet Supabase
1. Va sur https://supabase.com
2. Crée un nouveau projet nommé "motscroises"

### 2. Créer les tables

#### Table "mots"
```sql
CREATE TABLE mots (
  id BIGSERIAL PRIMARY KEY,
  mots TEXT NOT NULL
);
```

#### Table "scores"
```sql
CREATE TABLE scores (
  id BIGSERIAL PRIMARY KEY,
  pseudo TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Ajouter des mots de test
```sql
INSERT INTO mots (mots) VALUES
  ('CHAT'),
  ('CHIEN'),
  ('SOLEIL'),
  ('LUNE'),
  ('OISEAU'),
  ('FLEUR'),
  ('ARBRE'),
  ('MAISON'),
  ('VOITURE'),
  ('LIVRE'),
  ('ECOLE'),
  ('JARDIN'),
  ('PLAGE'),
  ('MONTAGNE'),
  ('RIVIERE');
```

### 4. Configurer les politiques RLS (Row Level Security)

Pour la table "mots" (lecture seule) :
```sql
ALTER TABLE mots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permettre lecture publique" 
ON mots FOR SELECT 
TO public 
USING (true);
```

Pour la table "scores" (lecture et insertion) :
```sql
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permettre lecture publique" 
ON scores FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Permettre insertion publique" 
ON scores FOR INSERT 
TO public 
WITH CHECK (true);
```

### 5. Récupérer les clés API

1. Va dans Settings > API
2. Copie l'URL du projet et la clé `anon/public`
3. Modifie le fichier `game.js` lignes 2-3 :

```javascript
const SUPABASE_URL = 'https://TON-PROJET.supabase.co';
const SUPABASE_ANON_KEY = 'TA-CLE-ANON-ICI';
```

## 📦 Déploiement sur Netlify

### Méthode 1 : Via l'interface Netlify

1. Va sur https://app.netlify.com
2. Clique sur "Add new site" > "Deploy manually"
3. Glisse-dépose les 3 fichiers :
   - `index.html`
   - `style.css`
   - `game.js`
4. Ton site est en ligne !

### Méthode 2 : Via Git

1. Crée un repo GitHub avec ces fichiers
2. Connecte le repo à Netlify
3. Déploie automatiquement

## 🎯 Comment jouer

### Sur ordinateur
1. Entre ton pseudo sur la page d'accueil
2. Clique sur "Commencer la partie"
3. Trouve les mots cachés dans la grille
4. Sélectionne les lettres en cliquant et glissant avec la souris
5. Les mots peuvent être horizontaux, verticaux ou diagonaux
6. Ton score est sauvegardé automatiquement

### Sur mobile/tablette 📱
1. Entre ton pseudo
2. Tape sur "Commencer la partie"
3. Trouve les mots cachés
4. Glisse ton doigt sur les lettres pour sélectionner un mot
5. Relâche pour valider la sélection
6. Les mots trouvés deviennent verts !

**Astuce mobile :** Le jeu s'adapte automatiquement à la taille de ton écran pour une expérience optimale.

## 🛠 Structure du projet

```
motscroises/
├── index.html      # Page principale
├── style.css       # Styles et animations
├── game.js         # Logique du jeu
└── README.md       # Ce fichier
```

## 🎨 Personnalisation

Tu peux modifier les couleurs dans `style.css` :
```css
:root {
    --primary: #FF6B35;    /* Orange principal */
    --secondary: #F7931E;  /* Orange secondaire */
    --accent: #C1121F;     /* Rouge accent */
    --success: #06D6A0;    /* Vert succès */
}
```

Bon jeu ! 🎮
