-- Migration 37 : Ajout de la colonne unit (Quantité / Conditionnement unitaire : ex 1kg, 1sac, 1panier...)
-- Table : products

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '1 kg';

-- Remplissage des produits existants : récupérer le premier nom de variante ou mettre '1 unité'
UPDATE products 
SET unit = COALESCE(NULLIF(variants->0->>'name', ''), '1 unité')
WHERE unit IS NULL OR unit = '';

COMMENT ON COLUMN products.unit IS 'Quantité ou conditionnement de référence (ex: 1 kg, 1 sac, 1 panier, 1 bassine)';
