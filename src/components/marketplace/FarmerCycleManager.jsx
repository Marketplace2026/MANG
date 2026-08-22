import React, { useState, useEffect } from 'react';
import { Camera, Mic, Plus, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const STEP_TYPES = [
  { value: 'semis', label: '🌱 Semis' },
  { value: 'arrosage', label: '💧 Arrosage' },
  { value: 'desherbage', label: '🌿 Désherbage' },
  { value: 'traitement_bio', label: '🛡️ Traitement Bio' },
  { value: 'recolte', label: '🍅 Récolte' }
];

export default function FarmerCycleManager({ productId, shopId, productName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cycleId, setCycleId] = useState(null);
  const [formData, setFormData] = useState({
    step_type: 'semis',
    description: '',
    action_date: new Date().toISOString().split('T')[0]
  });
  const [mediaFile, setMediaFile] = useState(null);

  // Vérifier s'il y a déjà un cycle pour ce produit à l'ouverture
  useEffect(() => {
    if (isOpen && productId && !cycleId) {
      loadOrCreateCycle();
    }
  }, [isOpen, productId, cycleId]);

  const loadOrCreateCycle = async () => {
    try {
      // Chercher un cycle existant
      const { data: existingCycle, error: fetchError } = await supabase
        .from('production_cycles')
        .select('id')
        .eq('product_id', productId)
        .limit(1)
        .single();
      
      if (existingCycle) {
        setCycleId(existingCycle.id);
      } else {
        // Créer un nouveau cycle
        const { data: newCycle, error: createError } = await supabase
          .from('production_cycles')
          .insert([{
            shop_id: shopId,
            product_id: productId,
            name: `Cycle de production: ${productName || 'Produit'}`
          }])
          .select()
          .single();
        
        if (createError) throw createError;
        setCycleId(newCycle.id);
      }
    } catch (err) {
      console.error("Erreur cycle:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cycleId) return toast.error("Le cycle n'a pas pu être initialisé.");
    
    setLoading(true);
    try {
      let media_url = null;
      if (mediaFile) {
        media_url = URL.createObjectURL(mediaFile); // Simulation
      }

      const { error } = await supabase
        .from('production_steps')
        .insert([{
          cycle_id: cycleId,
          step_type: formData.step_type,
          description: formData.description,
          action_date: formData.action_date,
          media_url: media_url
        }]);

      if (error) throw error;

      toast.success('Action ajoutée au carnet !');
      setIsOpen(false);
      setFormData({ step_type: 'semis', description: '', action_date: new Date().toISOString().split('T')[0] });
      setMediaFile(null);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full mt-2 flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 p-2 rounded-lg text-xs font-bold transition-colors border border-green-200"
      >
        <Plus className="w-4 h-4" />
        Carnet de Champ (Traçabilité)
      </button>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm relative mt-3 z-10">
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>
      
      <h3 className="font-bold text-gray-900 mb-3 text-sm">Ajouter une étape</h3>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type d'action</label>
          <div className="grid grid-cols-2 gap-2">
            {STEP_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, step_type: type.value })}
                className={`p-1.5 text-xs border rounded-md text-center transition-colors ${
                  formData.step_type === type.value 
                    ? 'border-green-500 bg-green-50 text-green-700 font-bold' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input 
              type="date"
              required
              className="w-full text-sm border-gray-300 rounded-md py-1"
              value={formData.action_date}
              onChange={(e) => setFormData({ ...formData, action_date: e.target.value })}
            />
          </div>
          <div>
             <label className="block text-xs font-medium text-gray-700 mb-1">Photo</label>
             <label className="flex items-center justify-center gap-1 border border-gray-300 rounded-md py-1 cursor-pointer bg-gray-50">
               <Camera className="w-4 h-4 text-gray-500" />
               <span className="text-xs text-gray-600 truncate max-w-[80px]">
                 {mediaFile ? mediaFile.name : 'Choisir'}
               </span>
               <input type="file" accept="image/*" className="hidden" onChange={(e) => setMediaFile(e.target.files[0])} />
             </label>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || !cycleId}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
        >
          {loading || !cycleId ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}
