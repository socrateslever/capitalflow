
import React from 'react';
import { LayoutDashboard, Users, Wallet, LayoutGrid, Plus, Briefcase, PiggyBank, ChevronLeft, Calendar, Calculator, ArrowRightLeft, Megaphone } from 'lucide-react';
import { Tooltip } from '../components/ui/Tooltip';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenNav: () => void;
  onNewLoan: () => void;
  navOrder: string[];
  primaryColor?: string;
  isStaff?: boolean;
  onGoBack?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  activeTab, setActiveTab, onOpenNav, onNewLoan, navOrder, primaryColor = '#2563eb', isStaff, onGoBack
}) => {
  const getTabIcon = (tab: string, active: boolean) => {
    const size = 20;
    switch (tab) {
      case 'DASHBOARD': return <LayoutDashboard size={size} className={active ? 'text-blue-400' : ''}/>;
      case 'CLIENTS': return <Users size={size} className={active ? 'text-emerald-400' : ''}/>;
      case 'TEAM': return <Briefcase size={size} className={active ? 'text-indigo-400' : ''}/>;
      case 'SOURCES': return <Wallet size={size} className={active ? 'text-amber-400' : ''}/>;
      case 'PERSONAL_FINANCE': return <PiggyBank size={size} className={active ? 'text-pink-400' : ''}/>;
      case 'AGENDA': return <Calendar size={size} className={active ? 'text-violet-400' : ''}/>;
      case 'SIMULATOR': return <Calculator size={size} className={active ? 'text-cyan-400' : ''}/>;
      case 'FLOW': return <ArrowRightLeft size={size} className={active ? 'text-rose-400' : ''}/>;
      case 'ACQUISITION': return <Megaphone size={size} className={active ? 'text-orange-400' : ''}/>;
      default: return <LayoutGrid size={size} className={active ? 'text-slate-400' : ''}/>;
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'DASHBOARD': return 'Painel';
      case 'CLIENTS': return 'Clientes';
      case 'TEAM': return 'Equipe';
      case 'SOURCES': return 'Fundos';
      case 'PERSONAL_FINANCE': return 'Finanças';
      case 'AGENDA': return 'Agenda';
      case 'SIMULATOR': return 'Simulador';
      case 'FLOW': return 'Extrato';
      case 'ACQUISITION': return 'Captação';
      default: return tab;
    }
  };

  // Lista completa de abas para a barra de tarefas mobile
  const mobileTabs = ['DASHBOARD', 'AGENDA', 'SIMULATOR', 'PERSONAL_FINANCE', 'ACQUISITION', 'FLOW', 'CLIENTS', 'SOURCES'];
  if (!isStaff) {
      mobileTabs.push('TEAM');
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 z-50 flex items-center p-2 pb-safe overflow-x-auto hide-scrollbar gap-2 px-4">
       {mobileTabs.map(tab => (
           <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl transition-all shrink-0 ${activeTab === tab ? 'bg-slate-900/50' : 'text-slate-500'}`}
           >
               {getTabIcon(tab, activeTab === tab)}
               <span className={`text-[9px] font-bold uppercase truncate w-full text-center ${activeTab === tab ? 'text-white' : ''}`}>{getTabLabel(tab)}</span>
           </button>
       ))}
    </div>
  );
};
