
import { supabase } from '../lib/supabase';
import { supabasePortal } from '../lib/supabasePortal';

export type AsaasPaymentInput = {
  loan_id: string;
  installment_id: string;
  amount: number;
  payment_method: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
  credit_card?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  payer: {
    name: string;
    email: string;
    cpfCnpj: string;
  };
};

export const asaasService = {
  /**
   * Busca configuração Asaas do operador
   */
  async getConfig(profileId: string) {
    const { data, error } = await supabase
      .from('perfis_config_asaas')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  /**
   * Salva configuração Asaas
   */
  async saveConfig(profileId: string, apiKey: string) {
    const { error } = await supabase
      .from('perfis_config_asaas')
      .upsert({
        profile_id: profileId,
        asaas_api_key: apiKey,
        updated_at: new Date().toISOString()
      }, { onConflict: 'profile_id' });
    
    if (error) throw error;
    return true;
  },

  /**
   * Cria um pagamento no Asaas via Edge Function (Portal)
   */
  async createPaymentPortal(token: string, code: string, input: AsaasPaymentInput) {
    const { data, error } = await supabasePortal.functions.invoke('asaas-create-payment', {
      body: {
        ...input,
        portal_token: token,
        portal_code: code
      }
    });

    if (error) throw new Error(error.message || 'Falha ao processar pagamento Asaas');
    if (!data.ok) throw new Error(data.error || 'Erro no processamento Asaas');

    return data;
  }
};
