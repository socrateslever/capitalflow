import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, LoanStatus, CapitalSource } from '../types';
import { loanEngine, isLegallyActionable } from '../domain/loanEngine';
import { getDaysDiff, isValidDate } from '../utils/dateHelpers';
import { notificationService } from '../services/notification.service';
import { getInstallmentStatusLogic } from '../domain/finance/calculations';
import { playNotificationSound } from '../utils/notificationSound';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  createdAt: number;
  isPersistent?: boolean;
  onClick?: () => void;
  action_url?: string;
  item_type?: string;
  item_id?: string;
  metadata?: any;
}

interface NotificationProps {
  loans: Loan[];
  sources: CapitalSource[];
  activeUser: any;
  showToast: any;
  setActiveTab: (tab: any) => void;
  setSelectedLoanId: (id: string | null) => void;
  disabled?: boolean;
}

const MAX_VISIBLE_NOTIFICATIONS = 40;
const CRITICAL_NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const NON_CRITICAL_NOTIFICATION_COOLDOWN_MS = 48 * 60 * 60 * 1000;
const DISMISSED_NOTIFICATIONS_KEY = 'cm_dismissed_notifications';
const NOTIFIED_NOTIFICATIONS_KEY = 'cm_notified_notifications';

const readNotificationMap = (storageKey: string) => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
};

const isCriticalNotification = (
  notif: Pick<InAppNotification, 'type' | 'isPersistent'>,
) => notif.type === 'error' || Boolean(notif.isPersistent);

const getNotificationCooldownMs = (
  notif: Pick<InAppNotification, 'type' | 'isPersistent'>,
) => (isCriticalNotification(notif) ? CRITICAL_NOTIFICATION_COOLDOWN_MS : NON_CRITICAL_NOTIFICATION_COOLDOWN_MS);

export const useAppNotifications = ({
  loans,
  sources,
  activeUser,
  showToast,
  setActiveTab,
  setSelectedLoanId,
  disabled,
}: NotificationProps) => {
  const checkTimer = useRef<any>(null);
  const permissionAsked = useRef(false);
  const notifiedDueLoans = useRef<Set<string>>(new Set());
  const notifiedUnsignedLegal = useRef<Set<string>>(new Set());
  const lastUserId = useRef<string | null>(null);
  const notificationsRef = useRef<InAppNotification[]>([]);
  const queueRef = useRef<Omit<InAppNotification, 'id' | 'createdAt'>[]>([]);
  const queueTimer = useRef<any>(null);
  const isQueueRunning = useRef(false);
  const [dismissedMap, setDismissedMap] = useState<Record<string, number>>(
    () => readNotificationMap(DISMISSED_NOTIFICATIONS_KEY),
  );
  const [notifiedMap, setNotifiedMap] = useState<Record<string, number>>(
    () => readNotificationMap(NOTIFIED_NOTIFICATIONS_KEY),
  );
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const buildFingerprint = (
    notif: Pick<InAppNotification, 'title' | 'message' | 'item_type' | 'item_id'>,
  ) => [notif.item_type || 'none', notif.item_id || 'none', notif.title, notif.message].join('::');

  const buildStorageKey = (type?: string, id?: string) => {
    if (!type || !id) return null;
    return `${type}_${id}`;
  };

  const shouldSuppressNotification = useCallback((
    notif: Pick<InAppNotification, 'type' | 'isPersistent' | 'item_type' | 'item_id'>,
  ) => {
    const key = buildStorageKey(notif.item_type, notif.item_id);
    if (!key) return false;

    const lastDismissedAt = dismissedMap[key] || 0;
    const lastNotifiedAt = notifiedMap[key] || 0;
    const lastInteractionAt = Math.max(lastDismissedAt, lastNotifiedAt);
    if (!lastInteractionAt) return false;

    return Date.now() - lastInteractionAt < getNotificationCooldownMs(notif);
  }, [dismissedMap, notifiedMap]);

  const persistNotificationTimestamp = useCallback((
    storageKey: string,
    setter: Dispatch<SetStateAction<Record<string, number>>>,
    notif: Pick<InAppNotification, 'item_type' | 'item_id'>,
  ) => {
    const key = buildStorageKey(notif.item_type, notif.item_id);
    if (!key) return;

    const now = Date.now();
    setter((prev) => {
      const next = { ...prev, [key]: now };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, []);

  const flushQueue = useCallback(() => {
    if (isQueueRunning.current) return;
    isQueueRunning.current = true;

    const step = () => {
      const next = queueRef.current.shift();
      if (!next) {
        isQueueRunning.current = false;
        return;
      }

      const fingerprint = buildFingerprint(next);
      const existsInState = notificationsRef.current.some(
        (n) => buildFingerprint(n) === fingerprint,
      );

      if (!existsInState) {
        const createdAt = Date.now();
        setNotifications((prev) => [
          {
            ...next,
            id: `${createdAt}-${Math.random().toString(36).slice(2, 9)}`,
            createdAt,
          },
          ...prev,
        ].slice(0, MAX_VISIBLE_NOTIFICATIONS));
        playNotificationSound();
      }

      queueTimer.current = setTimeout(step, 650);
    };

    step();
  }, []);

  const addNotification = useCallback((notif: Omit<InAppNotification, 'id' | 'createdAt'>) => {
    if (shouldSuppressNotification(notif)) return false;

    const fingerprint = buildFingerprint(notif);
    const cooldown = getNotificationCooldownMs(notif);
    const duplicateInState = notificationsRef.current.some(
      (n) => buildFingerprint(n) === fingerprint && Date.now() - n.createdAt < cooldown,
    );
    if (duplicateInState) return false;

    const duplicateInQueue = queueRef.current.some((n) => buildFingerprint(n) === fingerprint);
    if (duplicateInQueue) return false;

    persistNotificationTimestamp(NOTIFIED_NOTIFICATIONS_KEY, setNotifiedMap, notif);
    queueRef.current.push(notif);
    flushQueue();
    return true;
  }, [flushQueue, persistNotificationTimestamp, shouldSuppressNotification]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target?.item_type && target?.item_id) {
        persistNotificationTimestamp(DISMISSED_NOTIFICATIONS_KEY, setDismissedMap, target);
      }
      return prev.filter((n) => n.id !== id);
    });
  }, [persistNotificationTimestamp]);

  const resetNotifiedCaches = () => {
    notifiedDueLoans.current = new Set();
    notifiedUnsignedLegal.current = new Set();
  };

  const loansRef = useRef<Loan[]>(loans);
  useEffect(() => {
    loansRef.current = loans;
  }, [loans]);

  useEffect(() => {
    if (!activeUser || disabled) return;

    const channel = supabase
      .channel('global-urgent-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_intents',
          filter: `profile_id=eq.${activeUser.id}`,
        },
        (payload) => {
          if (payload.new.status === 'PENDENTE') {
            const onClick = () => {
              setActiveTab('CONTRACT_DETAILS');
              setSelectedLoanId(payload.new.loan_id);
            };

            const wasAdded = addNotification({
              title: 'Intenção de Pagamento Recebida!',
              message: 'Um cliente enviou uma intenção de pagamento.',
              type: 'success',
              item_type: 'pagamento',
              item_id: payload.new.id,
              metadata: { loan_id: payload.new.loan_id },
            });

            if (wasAdded) {
              notificationService.notify(
                'Intenção de Pagamento Recebida!',
                'Um cliente enviou uma intenção de pagamento.',
                onClick,
              );
              showToast('Nova intenção de pagamento recebida!', 'success');
            }
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parcelas',
          filter: `profile_id=eq.${activeUser.id}`,
        },
        (payload) => {
          const loan = loansRef.current.find((l) => l.id === payload.new.loan_id);
          if (
            loan &&
            loanEngine.computeLoanStatus(loan) === 'OVERDUE' &&
            !loan.activeAgreement
          ) {
            const onClick = () => {
              setActiveTab('LEGAL');
              setSelectedLoanId(loan.id);
            };

            const wasAdded = addNotification({
              title: 'Ação Jurídica Necessária',
              message: `Contrato de ${loan.debtorName} está VENCIDO e sem assinatura.`,
              type: 'warning',
              item_type: 'documento',
              item_id: loan.id,
              metadata: { loan_id: loan.id },
            });

            if (wasAdded) {
              notificationService.notify(
                'Ação Jurídica Necessária',
                `Contrato de ${loan.debtorName} está VENCIDO e sem assinatura.`,
                onClick,
              );
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser, addNotification, disabled, setActiveTab, setSelectedLoanId, showToast]);

  const runScan = async () => {
    if (disabled || !activeUser) return;

    if (!permissionAsked.current) {
      permissionAsked.current = true;
      notificationService.requestPermission();
    }

    if (loans?.length) {
      loans.forEach((loan) => {
        if (!loan || (loan as any).isArchived) return;

        const installments = (loan as any).installments || [];
        installments.forEach((inst: any) => {
          if (!inst?.id || !inst?.dueDate || !isValidDate(inst.dueDate)) return;

          const status = getInstallmentStatusLogic(inst);
          if (status === LoanStatus.PAID) return;

          const diff = getDaysDiff(inst.dueDate);
          if (diff === 0 && !notifiedDueLoans.current.has(inst.id)) {
            notifiedDueLoans.current.add(inst.id);
            const onClick = () => {
              setActiveTab('CONTRACT_DETAILS');
              setSelectedLoanId(loan.id);
            };

            const wasAdded = addNotification({
              title: 'Cobrança do Dia',
              message: `O contrato de ${loan.debtorName} vence hoje. Fique atento!`,
              type: 'info',
              item_type: 'parcela',
              item_id: inst.id,
              metadata: { loan_id: loan.id },
            });

            if (wasAdded) {
              notificationService.notify(
                'Cobrança do Dia',
                `O contrato de ${loan.debtorName} vence hoje. Fique atento!`,
                onClick,
              );
            }
          }
        });
      });
    }

    if (loans?.length) {
      loans.forEach((loan) => {
        if (
          isLegallyActionable(loan) &&
          !(loan as any).activeAgreement &&
          !notifiedUnsignedLegal.current.has(loan.id)
        ) {
          notifiedUnsignedLegal.current.add(loan.id);
          const onClick = () => {
            setActiveTab('LEGAL');
            setSelectedLoanId(loan.id);
          };

          const wasAdded = addNotification({
            title: 'Ação Jurídica Necessária',
            message: `Contrato de ${loan.debtorName} está VENCIDO e sem confissão de dívida assinada.`,
            type: 'warning',
            item_type: 'documento',
            item_id: loan.id,
            metadata: { loan_id: loan.id },
          });

          if (wasAdded) {
            notificationService.notify(
              'Ação Jurídica Necessária',
              `Contrato de ${loan.debtorName} está VENCIDO e sem confissão de dívida assinada.`,
              onClick,
            );
          }
        }
      });
    }

    (sources || []).forEach((source: any) => {
      if (!source?.id) return;
      const balance = Number(source.balance || 0);

      if (balance < 50 && balance > -1000) {
        const shouldSuppress = shouldSuppressNotification({
          type: 'error',
          isPersistent: true,
          item_type: 'carteira',
          item_id: source.id,
        });
        if (shouldSuppress) return;

        addNotification({
          title: 'Saldo Crítico',
          message: `A fonte de capital "${source.name}" está com saldo muito baixo (${balance.toFixed(2)}).`,
          type: 'error',
          isPersistent: true,
          item_type: 'carteira',
          item_id: source.id,
        });
      }
    });
  };

  useEffect(() => {
    if (!activeUser || disabled) return;

    const currentId = String(activeUser?.id || '');
    if (lastUserId.current !== currentId) {
      lastUserId.current = currentId;
      resetNotifiedCaches();
      permissionAsked.current = false;
    }

    const delay = setTimeout(runScan, 5000);
    checkTimer.current = setInterval(runScan, 600000);

    return () => {
      clearTimeout(delay);
      if (checkTimer.current) clearInterval(checkTimer.current);
    };
  }, [activeUser, addNotification, disabled, loans.length]);

  useEffect(() => {
    return () => {
      if (queueTimer.current) {
        clearTimeout(queueTimer.current);
      }
    };
  }, []);

  return { manualCheck: runScan, notifications, removeNotification, addNotification };
};
