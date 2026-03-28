
import { supabase } from '../lib/supabase';

export const paymentConfigService = {
  /**
   * Busca as configurações do Mercado Pago para um perfil específico
   */
  async getConfig(profileId: string) {
    if (!profileId) return null;
    const { data, error } = await supabase
      .from('perfis_config_mp')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    
    if (error) {
      console.error('Erro ao buscar config MP:', error);
      return null;
    }
    return data;
  },

  /**
   * Salva ou atualiza as configurações do Mercado Pago
   */
  async saveConfig(profileId: string, accessToken: string) {
    if (!profileId) throw new Error('ID do perfil não informado.');

    // Upsert na tabela perfis_config_mp
    const { error } = await supabase
      .from('perfis_config_mp')
      .upsert({
        profile_id: profileId,
        mp_access_token: accessToken,
        updated_at: new Date().toISOString()
      }, { onConflict: 'profile_id' });

    if (error) throw error;
    return true;
  }
};
