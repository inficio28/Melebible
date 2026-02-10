-- Script SQL pour configurer la base de données motscroises sur Supabase
-- À exécuter dans l'éditeur SQL de Supabase

-- ==============================================
-- TABLE: mots
-- ==============================================
-- Créer la table mots si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.mots (
    id BIGSERIAL PRIMARY KEY,
    "Mots" VARCHAR(255) NOT NULL
);

-- Ajouter des mots d'exemple (à personnaliser selon vos besoins)
INSERT INTO public.mots ("Mots") VALUES
    ('CHAT'),
    ('CHIEN'),
    ('SOLEIL'),
    ('LUNE'),
    ('OISEAU'),
    ('FLEUR'),
    ('ARBRE'),
    ('MAISON'),
    ('VOITURE'),
    ('AVION'),
    ('BATEAU'),
    ('TRAIN'),
    ('MONTAGNE'),
    ('OCEAN'),
    ('PLAGE'),
    ('FORET'),
    ('VILLE'),
    ('CAMPAGNE'),
    ('RIVIERE'),
    ('LAC'),
    ('ETOILE'),
    ('NUAGE'),
    ('PLUIE'),
    ('NEIGE')
ON CONFLICT DO NOTHING;

-- Activer RLS (Row Level Security)
ALTER TABLE public.mots ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous
CREATE POLICY "Allow public read access on mots"
    ON public.mots
    FOR SELECT
    TO public
    USING (true);

-- ==============================================
-- TABLE: scores
-- ==============================================
-- Créer la table scores si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.scores (
    id BIGSERIAL PRIMARY KEY,
    pseudo VARCHAR(100) NOT NULL UNIQUE,
    score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances de recherche par pseudo
CREATE INDEX IF NOT EXISTS idx_scores_pseudo ON public.scores(pseudo);

-- Index pour trier par score (classement)
CREATE INDEX IF NOT EXISTS idx_scores_score ON public.scores(score DESC);

-- Activer RLS (Row Level Security)
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous
CREATE POLICY "Allow public read access on scores"
    ON public.scores
    FOR SELECT
    TO public
    USING (true);

-- Politique pour permettre l'insertion à tous (nouveau joueur)
CREATE POLICY "Allow public insert on scores"
    ON public.scores
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Politique pour permettre la mise à jour à tous (mise à jour du score)
CREATE POLICY "Allow public update on scores"
    ON public.scores
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- ==============================================
-- FONCTION: Mise à jour automatique du timestamp
-- ==============================================
-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS update_scores_updated_at ON public.scores;
CREATE TRIGGER update_scores_updated_at
    BEFORE UPDATE ON public.scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- VÉRIFICATION
-- ==============================================
-- Vérifier que tout est bien créé
SELECT 'Tables créées avec succès!' AS message;
SELECT COUNT(*) AS nombre_de_mots FROM public.mots;
SELECT COUNT(*) AS nombre_de_joueurs FROM public.scores;
