-- ============================================================
-- MIGRATION 41 : MISE À JOUR DES 7 CATÉGORIES ET SOUS-CATÉGORIES AGRICOLES
-- ============================================================

-- 1. S'assurer que la contrainte de clé étrangère sur shops(category_id) autorise ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'shops_category_id_fkey'
  ) THEN
    ALTER TABLE shops DROP CONSTRAINT shops_category_id_fkey;
  END IF;
  
  ALTER TABLE shops 
    ADD CONSTRAINT shops_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
END $$;

-- 2. Insérer ou mettre à jour les 7 catégories officielles et leurs sous-catégories
INSERT INTO categories (name, slug, group_name, icon, sort_order) VALUES
-- 🌱 Groupe 1 : Production végétale
('Céréales & grains', 'cereales-grains', 'Production végétale', '🌾', 1),
('Légumes', 'legumes', 'Production végétale', '🥬', 2),
('Fruits', 'fruits', 'Production végétale', '🍎', 3),
('Racines & tubercules', 'racines-tubercules', 'Production végétale', '🥕', 4),
('Plantes industrielles', 'plantes-industrielles', 'Production végétale', '🌳', 5),
('Plantes aromatiques & médicinales', 'plantes-aromatiques-medicinales', 'Production végétale', '🌿', 6),

-- 🐂 Groupe 2 : Production animale
('Bovins', 'bovins', 'Production animale', '🐂', 10),
('Ovins & caprins', 'ovins-caprins', 'Production animale', '🐐', 11),
('Porcins', 'porcins', 'Production animale', '🐖', 12),
('Aviculture', 'aviculture', 'Production animale', '🐔', 13),
('Apiculture', 'apiculture', 'Production animale', '🐝', 14),
('Pisciculture & aquaculture', 'pisciculture-aquaculture', 'Production animale', '🐟', 15),

-- 🏭 Groupe 3 : Transformation agricole
('Produits céréaliers transformés', 'produits-cerealiers-transformes', 'Transformation agricole', '🍞', 20),
('Produits fruitiers transformés', 'produits-fruitiers-transformes', 'Transformation agricole', '🥫', 21),
('Produits tubercules transformés', 'produits-tubercules-transformes', 'Transformation agricole', '🍠', 22),
('Produits animaux transformés', 'produits-animaux-transformes', 'Transformation agricole', '🧀', 23),

-- 🚜 Groupe 4 : Machines & équipements agricoles
('Machines lourdes', 'machines-lourdes', 'Machines & équipements agricoles', '🚜', 30),
('Équipements motorisés', 'equipements-motorises', 'Machines & équipements agricoles', '⚙️', 31),
('Outils agricoles', 'outils-agricoles', 'Machines & équipements agricoles', '🛠️', 32),
('Irrigation & énergie', 'irrigation-energie', 'Machines & équipements agricoles', '💧', 33),
('Pièces & maintenance', 'pieces-maintenance', 'Machines & équipements agricoles', '🔧', 34),

-- 🧪 Groupe 5 : Intrants agricoles
('Semences & plants', 'semences-plants', 'Intrants agricoles', '🌱', 40),
('Engrais organiques', 'engrais-organiques', 'Intrants agricoles', '🪴', 41),
('Engrais chimiques', 'engrais-chimiques', 'Intrants agricoles', '🧪', 42),
('Amendements du sol', 'amendements-du-sol', 'Intrants agricoles', '⛰️', 43),
('Produits phytosanitaires', 'produits-phytosanitaires', 'Intrants agricoles', '🛡️', 44),

-- 🌳 Groupe 6 : Espaces verts
('Plantes ornementales', 'plantes-ornementales', 'Espaces verts', '🌸', 50),
('Arbres & arbustes', 'arbres-arbustes', 'Espaces verts', '🌲', 51),
('Gazon & pelouses', 'gazon-pelouses', 'Espaces verts', '🌾', 52),
('Fleurs & pépinières', 'fleurs-pepinieres', 'Espaces verts', '🌺', 53),
('Aménagement paysager', 'amenagement-paysager', 'Espaces verts', '🏞️', 54),
('Entretien des espaces verts', 'entretien-espaces-verts', 'Espaces verts', '🌿', 55),
('Matériel de jardinage', 'materiel-jardinage', 'Espaces verts', '✂️', 56),

-- 🔧 Groupe 7 : Services agricoles
('Labour & préparation du sol', 'labour-preparation-sol', 'Services agricoles', '🚜', 60),
('Récolte & battage', 'recolte-battage', 'Services agricoles', '🌾', 61),
('Transport & logistique', 'transport-logistique', 'Services agricoles', '🚚', 62),
('Stockage & conservation', 'stockage-conservation', 'Services agricoles', '🏬', 63),
('Formation & conseil', 'formation-conseil', 'Services agricoles', '🎓', 64),
('Commercialisation & export', 'commercialisation-export', 'Services agricoles', '🌐', 65)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  group_name = EXCLUDED.group_name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- 3. Migration transparente des boutiques existantes ayant d'anciennes catégories vers les nouvelles équivalentes
DO $$
DECLARE
  v_cereales UUID;
  v_legumes UUID;
  v_fruits UUID;
  v_racines UUID;
  v_bovins UUID;
  v_aviculture UUID;
  v_porcins UUID;
  v_poisson UUID;
  v_trans_cereales UUID;
  v_trans_tubercules UUID;
  v_trans_animaux UUID;
  v_plantes_aroma UUID;
  v_semences UUID;
  v_engrais UUID;
  v_phyto UUID;
  v_outils UUID;
BEGIN
  SELECT id INTO v_cereales FROM categories WHERE slug = 'cereales-grains';
  SELECT id INTO v_legumes FROM categories WHERE slug = 'legumes';
  SELECT id INTO v_fruits FROM categories WHERE slug = 'fruits';
  SELECT id INTO v_racines FROM categories WHERE slug = 'racines-tubercules';
  SELECT id INTO v_bovins FROM categories WHERE slug = 'bovins';
  SELECT id INTO v_aviculture FROM categories WHERE slug = 'aviculture';
  SELECT id INTO v_porcins FROM categories WHERE slug = 'porcins';
  SELECT id INTO v_poisson FROM categories WHERE slug = 'pisciculture-aquaculture';
  SELECT id INTO v_trans_cereales FROM categories WHERE slug = 'produits-cerealiers-transformes';
  SELECT id INTO v_trans_tubercules FROM categories WHERE slug = 'produits-tubercules-transformes';
  SELECT id INTO v_trans_animaux FROM categories WHERE slug = 'produits-animaux-transformes';
  SELECT id INTO v_plantes_aroma FROM categories WHERE slug = 'plantes-aromatiques-medicinales';
  SELECT id INTO v_semences FROM categories WHERE slug = 'semences-plants';
  SELECT id INTO v_engrais FROM categories WHERE slug = 'engrais-organiques';
  SELECT id INTO v_phyto FROM categories WHERE slug = 'produits-phytosanitaires';
  SELECT id INTO v_outils FROM categories WHERE slug = 'outils-agricoles';

  -- Céréales & légumineuses -> Céréales & grains
  UPDATE shops SET category_id = v_cereales 
  WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('mais','riz','sorgho','mil','niebe','soja','arachide'));

  -- Tubercules -> Racines & tubercules
  UPDATE shops SET category_id = v_racines 
  WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('manioc','igname','patate-douce','taro'));

  -- Légumes
  UPDATE shops SET category_id = v_legumes 
  WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('tomate','oignon','piment','gombo','aubergine'));

  -- Fruits
  UPDATE shops SET category_id = v_fruits 
  WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('banane-plantain','mangue','ananas','papaye'));

  -- Produits Animaux
  UPDATE shops SET category_id = v_aviculture WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('volaille','oeufs'));
  UPDATE shops SET category_id = v_bovins WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('boeuf'));
  UPDATE shops SET category_id = v_porcins WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('porc'));
  UPDATE shops SET category_id = v_poisson WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('poisson'));
  UPDATE shops SET category_id = v_trans_animaux WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('lait'));

  -- Transformés
  UPDATE shops SET category_id = v_trans_tubercules WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('gari'));
  UPDATE shops SET category_id = v_trans_cereales WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('farine-mais','akassa','huile-palme','soumbala'));

  -- Épices -> Plantes aromatiques & médicinales
  UPDATE shops SET category_id = v_plantes_aroma WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('poivre','gingembre','ail','moringa'));

  -- Intrants
  UPDATE shops SET category_id = v_semences WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('semences'));
  UPDATE shops SET category_id = v_engrais WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('engrais'));
  UPDATE shops SET category_id = v_phyto WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('pesticides'));
  UPDATE shops SET category_id = v_outils WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('materiel-agricole'));

  -- 4. Nettoyer les anciennes catégories orphelines qui ne font pas partie des 38 nouvelles
  DELETE FROM categories 
  WHERE group_name NOT IN (
    'Production végétale',
    'Production animale',
    'Transformation agricole',
    'Machines & équipements agricoles',
    'Intrants agricoles',
    'Espaces verts',
    'Services agricoles'
  );
END $$;

-- 5. Vérification
SELECT group_name, COUNT(*) AS nb_sous_categories 
FROM categories 
GROUP BY group_name 
ORDER BY MIN(sort_order);
