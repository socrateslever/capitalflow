
import { Loan, LoanStatus, SortOption, LoanStatusFilter } from '../../types';
import { onlyDigits } from '../../utils/formatters';
import { getInstallmentStatusLogic } from '../../domain/finance/calculations';
import { getDaysDiff, parseDateOnlyUTC } from '../../utils/dateHelpers';

// Função auxiliar para determinar se um contrato está "efetivamente pago"
const isLoanFullyPaid = (l: Loan): boolean => {
    // Se não tem parcelas, não pode estar pago (evita esconder contratos novos ou em carregamento)
    if (!l.installments || l.installments.length === 0) return false;

    // 1. Verificação Padrão: Todas as parcelas marcadas como PAID
    const allPaidStatus = l.installments.every(i => i.status === LoanStatus.PAID);
    if (allPaidStatus) return true;

    // 2. Verificação de Prazo Fixo Finalizado (Sem dívida)
    if (l.billingCycle === 'DAILY_FIXED_TERM') {
        const totalDebt = l.installments.reduce((acc, i) => acc + (i.principalRemaining || 0) + (i.interestRemaining || 0), 0);
        
        // Se o saldo devedor for zero ou desprezível, considera pago
        if (totalDebt < 0.10) return true;
    }

    // 3. Verificação de Resíduo Geral (Tolerância de R$ 0.10)
    const totalRemaining = l.installments.reduce((acc, i) => acc + (i.principalRemaining || 0) + (i.interestRemaining || 0), 0);
    if (totalRemaining < 0.10) return true;

    return false;
};

// HELPER DE ORDENAÇÃO
const sortLoans = (loans: Loan[], sortOption: SortOption): Loan[] => {
    return [...loans].sort((a, b) => {
        switch (sortOption) {
            case 'NAME_ASC':
                return (a.debtorName || '').localeCompare(b.debtorName || '');
            
            case 'CREATED_DESC': // Entrada Mais Recente
                return new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime();
            
            case 'UPDATED_DESC': // Alterado Mais Recente (Baseado em Last Payment ou Update)
                const lastA = a.ledger && a.ledger.length > 0 ? new Date(a.ledger[a.ledger.length-1].date).getTime() : new Date(a.createdAt || a.startDate).getTime();
                const lastB = b.ledger && b.ledger.length > 0 ? new Date(b.ledger[b.ledger.length-1].date).getTime() : new Date(b.createdAt || b.startDate).getTime();
                return lastB - lastA;

            case 'DUE_DATE_ASC': // Vencimento Mais Próximo
            default:
                const nextA = a.installments.find(i => i.status !== 'PAID')?.dueDate || '9999-12-31';
                const nextB = b.installments.find(i => i.status !== 'PAID')?.dueDate || '9999-12-31';
                return new Date(nextA).getTime() - new Date(nextB).getTime();
        }
    });
};

export const filterLoans = (
  loans: Loan[],
  searchTerm: string,
  statusFilter: LoanStatusFilter,
  sortOption: SortOption = 'DUE_DATE_ASC'
): Loan[] => {
  let result = loans;
  
  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    result = result.filter(l =>
      (l.debtorName || '').toLowerCase().includes(lower) ||
      String(l.debtorDocument || '').toLowerCase().includes(lower) ||
      String(l.debtorPhone || '').toLowerCase().includes(lower) ||
      String((l as any).debtorEmail || '').toLowerCase().includes(lower) ||
      String((l as any).debtorCode || '').toLowerCase().includes(lower) ||
      String((l as any).debtorClientNumber || '').toLowerCase().includes(lower) ||
      (onlyDigits(lower) && (
        onlyDigits(String(l.debtorDocument || '')).includes(onlyDigits(lower)) ||
        onlyDigits(String(l.debtorPhone || '')).includes(onlyDigits(lower)) ||
        onlyDigits(String((l as any).debtorCode || '')).includes(onlyDigits(lower)) ||
        onlyDigits(String((l as any).debtorClientNumber || '')).includes(onlyDigits(lower))
      ))
    );
  }

  // Lógica Rigorosa de Status
  if (statusFilter === 'TODOS') {
      // Exclui arquivados E exclui quem está efetivamente pago
      result = result.filter(l => !l.isArchived && !isLoanFullyPaid(l));
  } else if (statusFilter === 'ATRASADOS') {
    result = result.filter(l => l.installments.some(i => getInstallmentStatusLogic(i) === LoanStatus.LATE) && !l.isArchived && !isLoanFullyPaid(l));
  } else if (statusFilter === 'ATRASO_CRITICO') {
    result = result.filter(l => l.installments.some(i => getDaysDiff(i.dueDate) > 30 && i.status !== LoanStatus.PAID) && !l.isArchived);
  } else if (statusFilter === 'EM_DIA') {
    result = result.filter(l => l.installments.every(i => getInstallmentStatusLogic(i) !== LoanStatus.LATE) && !isLoanFullyPaid(l) && !l.isArchived);
  } else if (statusFilter === 'PAGOS') {
    // Inclui quem tem status PAID ou quem tem dívida zerada (resíduo) ou Prazo Fixo finalizado
    result = result.filter(l => isLoanFullyPaid(l));
  } else if (statusFilter === 'ARQUIVADOS') {
    result = result.filter(l => l.isArchived);
  }
  
  // Aplica ordenação ao final
  return sortLoans(result, sortOption);
};
