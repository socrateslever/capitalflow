import React, { useMemo } from 'react';
import { UnifiedChat } from '../../../components/chat/UnifiedChat';
import { createSupportAdapter } from '../../../components/chat/adapters/supportAdapter';
import { supabasePortal } from '../../../lib/supabasePortal';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

interface PortalChatDrawerProps {
  loan: any;
  isOpen: boolean;
  onClose: () => void;
}

export const PortalChatDrawer: React.FC<PortalChatDrawerProps> = ({ loan, isOpen, onClose }) => {
  const adapter = useMemo(() => createSupportAdapter('CLIENT', supabasePortal), []);

  // ✅ Busca ID de contrato de forma resiliente
  const loanId = useMemo(() => {
     return loan?.id || loan?.loan_id || loan?.loanId || loan?.contract_id || null;
  }, [loan]);

  // ✅ Busca ID de cliente de forma resiliente
  const clientId = useMemo(() => {
     return loan?.client_id || loan?.clientId || loan?.clientID || null;
  }, [loan]);

  if (!isOpen) return null;

  // ✅ Se não tiver um loanId (contrato), usamos o clientId para suporte global
  const isInvalid = !clientId;

  return (
    <div className="fixed inset-0 z-[250] flex justify-end overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" 
        onClick={onClose}
      ></motion.div>

      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full sm:max-w-lg bg-slate-900 h-full shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col border-l border-white/5"
      >
        {isInvalid ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-slate-950/50 backdrop-blur-3xl">
            <div className="w-20 h-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center text-rose-500 mb-6 shadow-2xl">
                <ShieldCheck size={40} />
            </div>
            <h3 className="text-white font-black text-xl uppercase tracking-tighter mb-4">Conexão Indisponível</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mb-8">
              Não conseguimos vincular sua sessão a um contrato ativo no momento. 
              Por favor, atualize a página ou entre em contato via WhatsApp.
            </p>
            <button
              onClick={onClose}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700 active:scale-95"
            >
              Entendido
            </button>
          </div>
        ) : (
          <UnifiedChat
            adapter={adapter}
            context={{ loanId: loanId || clientId, profileId: clientId, clientName: 'Suporte Oficial' }}
            role="CLIENT"
            userId={clientId}
            onClose={onClose}
            title="Atendimento Direto"
            subtitle="Canal Verificado CapitalFlow"
            chatTheme="dark"
          />
        )}

        <div className="bg-slate-950/80 backdrop-blur-md px-6 py-4 border-t border-white/5 shrink-0 flex items-center justify-between">
          <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">
            Sessão Criptografada SSL
          </p>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Servidor Online</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
