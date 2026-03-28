
import React, { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, Save, ShieldCheck, Zap } from 'lucide-react';
import { asaasService } from '../../../services/asaas.service';

interface AsaasConfigProps {
  profileId: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AsaasConfig: React.FC<AsaasConfigProps> = ({ profileId, showToast }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const config = await asaasService.getConfig(profileId);
        if (config?.asaas_api_key) {
          setApiKey(config.asaas_api_key);
        }
      } catch (err) {
        console.error('Erro ao carregar configurações Asaas:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (profileId) loadConfig();
  }, [profileId]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      showToast('A API Key é obrigatória.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await asaasService.saveConfig(profileId, apiKey.trim());
      showToast('Configurações Asaas salvas!', 'success');
    } catch (err: any) {
      showToast('Erro ao salvar: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-40 bg-slate-800 rounded-xl"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-blue-500">
        <Zap size={24} className="text-amber-500 fill-amber-500" />
        <h3 className="text-lg font-black uppercase">Asaas (Checkout Transparente)</h3>
      </div>

      <div className="bg-amber-900/10 border border-amber-900/30 p-4 rounded-xl flex gap-3">
        <ShieldCheck className="text-amber-500 shrink-0" size={20} />
        <div className="text-[10px] text-slate-400 leading-relaxed font-medium">
          <p className="text-amber-400 font-bold uppercase mb-1">Por que usar Asaas?</p>
          O Asaas permite o <span className="text-white">Checkout Transparente</span>, onde o cliente insere o cartão diretamente no portal sem redirecionamentos. Suporta Cartão de Crédito, Débito e PIX com taxas competitivas.
        </div>
      </div>

      <div className="space-y-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center justify-between mb-2">
            <span>Sua API Key Asaas (Produção)</span>
            <a 
              href="https://www.asaas.com/customer/config/apiTokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center gap-1 normal-case font-bold"
            >
              Criar Token API <ExternalLink size={10} />
            </a>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="$a..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white font-mono text-sm outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white rounded-xl font-bold uppercase text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={16} /> Salvar Credenciais Asaas
            </>
          )}
        </button>
      </div>
    </div>
  );
};
