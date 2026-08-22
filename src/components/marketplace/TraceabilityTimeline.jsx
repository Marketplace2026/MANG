import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Leaf, 
  Droplets, 
  Sun, 
  ShieldCheck, 
  ShoppingBasket,
  CheckCircle2,
  Calendar,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const STEP_ICONS = {
  semis: <Leaf className="w-5 h-5 text-green-500" />,
  arrosage: <Droplets className="w-5 h-5 text-blue-500" />,
  desherbage: <Sun className="w-5 h-5 text-yellow-500" />,
  traitement_bio: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
  recolte: <ShoppingBasket className="w-5 h-5 text-orange-500" />,
  autre: <CheckCircle2 className="w-5 h-5 text-gray-500" />
};

const STEP_LABELS = {
  semis: 'Semis & Plantation',
  arrosage: 'Irrigation',
  desherbage: 'Entretien & Désherbage',
  traitement_bio: 'Traitement Bio',
  recolte: 'Récolte',
  autre: 'Autre action'
};

export default function TraceabilityTimeline({ productId }) {
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productId) loadTraceability();
  }, [productId]);

  const loadTraceability = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_cycles')
        .select('*, steps:production_steps(*)')
        .eq('product_id', productId)
        .order('action_date', { referencedTable: 'production_steps', ascending: true })
        .limit(1)
        .single();
      
      if (!error && data) {
        setCycle(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-6 bg-gray-50 rounded-xl">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }
  if (!cycle || !cycle.steps || cycle.steps.length === 0) {
    return (
      <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-100">
        <Leaf className="w-8 h-8 mx-auto text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm">
          Aucun itinéraire technique renseigné pour ce produit.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-green-100 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b border-green-50 pb-4">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            Traçabilité 100% Transparente
            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
              Certifié
            </span>
          </h3>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Culture démarrée le {format(new Date(cycle.start_date), 'dd MMMM yyyy', { locale: fr })}
          </p>
        </div>
      </div>

      <div className="relative border-l-2 border-green-100 ml-4 pl-6 space-y-8">
        {cycle.steps.map((step, index) => (
          <div key={step.id || index} className="relative">
            {/* Timeline dot */}
            <div className="absolute -left-[35px] top-1 w-8 h-8 bg-white rounded-full border-2 border-green-200 flex items-center justify-center shadow-sm">
              {STEP_ICONS[step.step_type] || STEP_ICONS.autre}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">
                  {STEP_LABELS[step.step_type] || step.step_type}
                </h4>
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100">
                  {format(new Date(step.action_date), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
              
              {step.description && (
                <p className="text-sm text-gray-600 mb-3">{step.description}</p>
              )}

              {step.media_url && (
                <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                  <img 
                    src={step.media_url} 
                    alt={STEP_LABELS[step.step_type]} 
                    className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              {step.audio_url && (
                <div className="mt-3 bg-white p-2 rounded-lg border border-gray-200">
                  <audio controls className="w-full h-8" src={step.audio_url}>
                    Votre navigateur ne supporte pas la lecture audio.
                  </audio>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
