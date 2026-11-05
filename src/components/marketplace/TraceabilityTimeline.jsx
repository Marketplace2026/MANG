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
  semis: <Leaf className="w-5 h-5 text-emerald-500" />,
  arrosage: <Droplets className="w-5 h-5 text-blue-500" />,
  desherbage: <Sun className="w-5 h-5 text-amber-500" />,
  traitement_bio: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
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
      <div className="flex justify-center p-6 bg-surface-50 dark:bg-[#242526] rounded-2xl border border-surface-200 dark:border-[#3a3b3c]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!cycle || !cycle.steps || cycle.steps.length === 0) {
    return (
      <div className="p-6 text-center bg-surface-50 dark:bg-[#242526] rounded-2xl border border-surface-200 dark:border-[#3a3b3c]">
        <Leaf className="w-8 h-8 mx-auto text-emerald-600/40 mb-2" />
        <p className="text-dark-500 dark:text-[#b0b3b8] text-xs font-semibold">
          Itinéraire technique traçable en cours de renseignement par le producteur.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#242526] rounded-3xl border border-surface-150 dark:border-[#3a3b3c] p-4 sm:p-6 shadow-card transition-colors">
      <div className="flex items-center gap-3 mb-6 border-b border-surface-100 dark:border-[#3a3b3c] pb-4">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="font-bold text-dark-900 dark:text-white flex items-center gap-2 text-sm">
            Traçabilité Transparente
            <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">
              Vérifié
            </span>
          </h3>
          <p className="text-xs text-dark-500 dark:text-[#b0b3b8] mt-0.5 flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            Culture démarrée le {format(new Date(cycle.start_date), 'dd MMMM yyyy', { locale: fr })}
          </p>
        </div>
      </div>

      <div className="relative border-l-2 border-emerald-200 dark:border-emerald-900/60 ml-4 pl-6 space-y-6">
        {cycle.steps.map((step, index) => (
          <div key={step.id || index} className="relative">
            {/* Timeline dot */}
            <div className="absolute -left-[35px] top-1 w-8 h-8 bg-white dark:bg-[#18191a] rounded-full border-2 border-emerald-400 dark:border-emerald-600 flex items-center justify-center shadow-xs">
              {STEP_ICONS[step.step_type] || STEP_ICONS.autre}
            </div>

            <div className="bg-surface-50 dark:bg-[#18191a] rounded-2xl p-4 border border-surface-200 dark:border-[#3a3b3c]">
              <div className="flex justify-between items-start mb-2 gap-2">
                <h4 className="font-bold text-dark-900 dark:text-white text-xs">
                  {STEP_LABELS[step.step_type] || step.step_type}
                </h4>
                <span className="text-[10px] font-bold text-dark-500 dark:text-[#b0b3b8] bg-white dark:bg-[#242526] px-2 py-0.5 rounded-lg border border-surface-200 dark:border-[#3a3b3c] shrink-0">
                  {format(new Date(step.action_date), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
              
              {step.description && (
                <p className="text-xs text-dark-700 dark:text-gray-300 mb-2 leading-relaxed">{step.description}</p>
              )}

              {step.media_url && (
                <div className="mt-2 rounded-xl overflow-hidden border border-surface-200 dark:border-[#3a3b3c]">
                  <img 
                    loading="lazy" src={step.media_url} 
                    alt={STEP_LABELS[step.step_type]} 
                    className="w-full h-40 object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              {step.audio_url && (
                <div className="mt-2 bg-white dark:bg-[#242526] p-2 rounded-xl border border-surface-200 dark:border-[#3a3b3c]">
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
