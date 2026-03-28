
import { Loan } from '../../types';
import { loanEngine } from '../loanEngine';
import { resolveLoanVisualClassification } from '../../utils/loanFilterResolver';

export const buildDashboardStats = (loans: Loan[], sources: any[] = []) => {
  // Classifica todos os empréstimos uma única vez
  const classifiedLoans = loans.map(l => ({
    loan: l,
    classification: resolveLoanVisualClassification(l)
  }));

  // Filtra empréstimos operacionais (Ativos)
  const activeLoans = classifiedLoans.filter(c => 
    ['EM_DIA', 'ATRASADO', 'CRITICO'].includes(c.classification)
  );
  
  // 1. CAPITAL NA RUA & CONTAGEM
  const totalLent = activeLoans.reduce((acc, c) => {
      const loanPrincipalRemaining = loanEngine.computeRemainingBalance(c.loan).principalRemaining;
      if (loanPrincipalRemaining < 0.10) return acc;
      return acc + loanPrincipalRemaining;
  }, 0);

  const activeCount = activeLoans.length;

  // 2. TOTAIS GERAIS (inclui todos para o histórico)
  const totalReceived = loans.reduce((acc, l) => {
      const receivedFromLedger = (l.ledger || []).reduce((sum, t) => {
          if (!String(t.type || '').includes('PAYMENT')) return sum;
          return sum + (Number(t.amount) || 0);
      }, 0);
      return acc + receivedFromLedger;
  }, 0);

  // 3. LUCRO PROJETADO (apenas de ativos)
  const expectedProfit = activeLoans.reduce((acc, c) => {
      const balance = loanEngine.computeRemainingBalance(c.loan);
      const loanInterest = balance.interestRemaining;
      const loanLateFee = balance.lateFeeRemaining;
      return acc + loanInterest + loanLateFee;
  }, 0);

  const roi = totalLent > 0 ? (expectedProfit / totalLent) * 100 : 0;

  const interestBalance = Array.isArray(sources) ? sources.reduce((acc, s) => {
      const n = (s.name || '').toLowerCase();
      if (n.includes('caixa livre') || n === 'lucro' || n.includes('lucro')) {
          return acc + (Number(s.balance) || 0);
      }
      return acc;
  }, 0) : 0;
  
  // Contagens para o gráfico de pizza
  const paidCount = classifiedLoans.filter(c => c.classification === 'QUITADO').length;
  const renegotiatedCount = classifiedLoans.filter(c => c.classification === 'RENEGOCIADO').length;
  const lateCount = classifiedLoans.filter(c => c.classification === 'ATRASADO' || c.classification === 'CRITICO').length;
  const onTimeCount = classifiedLoans.filter(c => c.classification === 'EM_DIA').length;
  
  const pieData = [
      { name: 'Em Dia', value: onTimeCount, color: '#3b82f6' }, 
      { name: 'Atrasados', value: lateCount, color: '#f43f5e' }, 
      { name: 'Quitados', value: paidCount, color: '#10b981' }
  ];
  if (renegotiatedCount > 0) {
      pieData.push({ name: 'Renegociados', value: renegotiatedCount, color: '#f97316' });
  }
  
  const monthlyDataMap: {[key: string]: {name: string, Entradas: number, Saidas: number}} = {};
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  let receivedThisMonth = 0;

  const monthsBack = 5;
  for (let i = monthsBack; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7); 
      const month = d.getMonth() + 1;
      const year = d.getFullYear().toString().slice(-2);
      monthlyDataMap[key] = { name: `${month.toString().padStart(2, '0')}/${year}`, Entradas: 0, Saidas: 0 };
  }
  
  loans.forEach(l => {
    (l.ledger || []).forEach(t => {
      if (!t.date || t.date.length < 7) return;
      const key = t.date.slice(0, 7);

      if (!monthlyDataMap[key]) return;
      
      if (key === currentMonthKey && t.type?.includes('PAYMENT')) {
          receivedThisMonth += t.amount;
      }

      if (t.type === 'LEND_MORE' || t.type === 'NEW_LOAN') {
        monthlyDataMap[key].Saidas += t.amount;
      } else if (t.type?.includes('PAYMENT')) {
        monthlyDataMap[key].Entradas += t.amount;
      }
    });
  });
  
  const lineChartData = Object.values(monthlyDataMap).sort((a,b) => {
    const [m1, y1] = a.name.split('/');
    const [m2, y2] = b.name.split('/');
    if (y1 !== y2) return y1.localeCompare(y2);
    return m1.localeCompare(m2);
  });
  
  return { 
      totalLent, 
      activeCount,
      totalReceived, 
      receivedThisMonth,
      expectedProfit, 
      roi,
      interestBalance, 
      pieData, 
      lineChartData 
  };
};
