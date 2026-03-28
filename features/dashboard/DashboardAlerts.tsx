import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, X } from 'lucide-react';
import { Loan, CapitalSource } from '../../types';
import { getDaysDiff } from '../../utils/dateHelpers';
import { motion, AnimatePresence } from 'framer-motion';

export const DashboardAlerts = ({ loans, sources }: { loans: Loan[]; sources?: CapitalSource[] }) => {
  const activeLoans = loans.filter((l) => !l.isArchived);
  const critical = activeLoans.filter((l) =>
    l.installments.some((i) => getDaysDiff(i.dueDate) > 30 && i.status !== 'PAID')
  ).length;

  // Alerta de Saldo Baixo (< R$ 100,00)
  const lowBalanceSources = (sources || []).filter((s) => s.balance < 100);

  // Lógica de Dispensa (24h)
  const [isDismissed, setIsDismissed] = useState(() => {
    const stored = localStorage.getItem('cm_alert_critical_dismissed');
    if (!stored) return false;
    const timestamp = Number(stored);
    const now = Date.now();
    return now - timestamp < 86400000;
  });

  const [isBalanceDismissed, setIsBalanceDismissed] = useState(() => {
    const stored = localStorage.getItem('cm_alert_balance_dismissed');
    if (!stored) return false;
    const timestamp = Number(stored);
    const now = Date.now();
    return now - timestamp < 86400000;
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('cm_alert_critical_dismissed', String(Date.now()));
  };

  const handleDismissBalance = () => {
    setIsBalanceDismissed(true);
    localStorage.setItem('cm_alert_balance_dismissed', String(Date.now()));
  };

  if ((critical === 0 || isDismissed) && (lowBalanceSources.length === 0 || isBalanceDismissed)) return null;

  const alerts = [];
  if (critical > 0 && !isDismissed) {
    alerts.push({
      id: 'critical',
      title: 'Atenção Necessária',
      message: `${critical} contratos com atraso crítico superior a 30 dias.`,
      color: 'rose',
      icon: <ShieldAlert size={24} />,
      onDismiss: handleDismiss,
      priority: 1
    });
  }
  if (lowBalanceSources.length > 0 && !isBalanceDismissed) {
    alerts.push({
      id: 'balance',
      title: 'Saldo Baixo',
      message: lowBalanceSources.length === 1
        ? `A fonte "${lowBalanceSources[0].name}" está quase zerada.`
        : `${lowBalanceSources.length} fontes estão com saldo crítico (< R$ 100).`,
      color: 'amber',
      icon: <AlertTriangle size={24} />,
      onDismiss: handleDismissBalance,
      priority: 2
    });
  }

  // Ordena por prioridade (menor número = mais importante = topo)
  const sortedAlerts = [...alerts].sort((a, b) => a.priority - b.priority);

  return (
    <div className="relative h-20 mb-6 mt-2">
      <AnimatePresence mode="popLayout">
        {sortedAlerts.length > 0 && (
          <motion.div
            key={sortedAlerts[0].id}
            initial={{ y: 10, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ x: 50, opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(e, { offset, velocity }) => {
              if (Math.abs(offset.x) > 100 || Math.abs(velocity.x) > 500) {
                sortedAlerts[0].onDismiss();
              }
            }}
            className="absolute inset-x-0 cursor-grab active:cursor-grabbing"
          >
            {/* Decorative Layer 2 (Back) - Purely decorative, no content */}
            <div 
              className={`absolute inset-0 rounded-2xl border pointer-events-none transition-transform duration-300 -z-20 
                translate-y-2 scale-[0.94] opacity-30
                ${sortedAlerts[0].color === 'rose' ? 'bg-rose-950 border-rose-500/30' : 'bg-amber-950 border-amber-500/30'}`} 
            />
            
            {/* Decorative Layer 1 (Middle) - Purely decorative, no content */}
            <div 
              className={`absolute inset-0 rounded-2xl border pointer-events-none transition-transform duration-300 -z-10 
                translate-y-1 scale-[0.97] opacity-60
                ${sortedAlerts[0].color === 'rose' ? 'bg-rose-900 border-rose-500/40' : 'bg-amber-900 border-amber-500/40'}`} 
            />

            {/* Main Content Card (Front) - Solid background for perfect readability */}
            <div className={`relative p-4 rounded-2xl flex items-center gap-4 border shadow-xl transition-colors duration-300 ${
              sortedAlerts[0].color === 'rose' 
                ? 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400 text-white shadow-rose-900/40' 
                : 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-300 text-black shadow-amber-900/40'
            }`}>
              {/* Close Button - Only on top layer */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sortedAlerts[0].onDismiss();
                }}
                className={`absolute top-3 right-3 transition-colors p-1.5 rounded-full ${
                  sortedAlerts[0].color === 'rose' 
                    ? 'text-rose-200 hover:text-white hover:bg-white/10' 
                    : 'text-amber-900/50 hover:text-black hover:bg-black/10'
                }`}
                title="Fechar por 24h"
              >
                <X size={16} />
              </button>

              {/* Icon Section */}
              <div className={`p-3 rounded-xl shadow-lg flex-shrink-0 ${
                sortedAlerts[0].color === 'rose' 
                  ? 'bg-rose-500 text-white shadow-rose-900/20 animate-pulse' 
                  : 'bg-amber-400 text-black shadow-amber-900/20'
              }`}>
                {sortedAlerts[0].icon}
              </div>

              {/* Text Content - Clear and readable */}
              <div className="flex-1 min-w-0 pr-6">
                <p className="font-black uppercase tracking-tight text-xs sm:text-sm truncate">
                  {sortedAlerts[0].title}
                </p>
                <p className={`text-[10px] sm:text-xs font-bold leading-tight line-clamp-2 ${
                  sortedAlerts[0].color === 'rose' ? 'text-rose-100' : 'text-amber-950/70'
                }`}>
                  {sortedAlerts[0].message}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};