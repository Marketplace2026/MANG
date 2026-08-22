-- ==============================================================================
-- PHASE: TRAÇABILITÉ & ITINÉRAIRES DE PRODUCTION (CARNET DE CHAMP)
-- ==============================================================================

-- 1. Table: production_cycles (Les lots / cultures)
CREATE TABLE IF NOT EXISTS public.production_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'recolte', 'annule')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: production_steps (Les étapes de l'itinéraire technique)
CREATE TABLE IF NOT EXISTS public.production_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_id UUID NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
    step_type TEXT NOT NULL CHECK (step_type IN ('semis', 'arrosage', 'desherbage', 'traitement_bio', 'recolte', 'autre')),
    description TEXT,
    media_url TEXT,
    audio_url TEXT,
    action_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_production_cycles_shop_id ON public.production_cycles(shop_id);
CREATE INDEX IF NOT EXISTS idx_production_cycles_product_id ON public.production_cycles(product_id);
CREATE INDEX IF NOT EXISTS idx_production_steps_cycle_id ON public.production_steps(cycle_id);

-- Activation RLS
ALTER TABLE public.production_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_steps ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour production_cycles
-- Tout le monde peut lire les cycles des boutiques actives
CREATE POLICY "Public profiles can view cycles" 
    ON public.production_cycles FOR SELECT 
    USING (true);

-- Seul le propriétaire de la boutique peut créer/modifier un cycle
CREATE POLICY "Shop owners can manage their cycles" 
    ON public.production_cycles FOR ALL 
    USING (
        auth.uid() IN (SELECT owner_id FROM public.shops WHERE id = shop_id)
    );

-- Politiques RLS pour production_steps
-- Tout le monde peut lire les étapes
CREATE POLICY "Public profiles can view steps" 
    ON public.production_steps FOR SELECT 
    USING (true);

-- Seul le propriétaire du cycle peut ajouter des étapes
CREATE POLICY "Cycle owners can manage steps" 
    ON public.production_steps FOR ALL 
    USING (
        auth.uid() IN (
            SELECT s.owner_id 
            FROM public.production_cycles c 
            JOIN public.shops s ON c.shop_id = s.id 
            WHERE c.id = cycle_id
        )
    );

-- Fonction générique pour mettre à jour la colonne updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour mise à jour de la date sur production_cycles
CREATE TRIGGER handle_updated_at_production_cycles
    BEFORE UPDATE ON public.production_cycles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
