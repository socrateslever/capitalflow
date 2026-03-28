
/**
 * Utilitário para realizar fetch com retentativas automáticas e backoff exponencial.
 * Útil para mitigar erros de rede temporários e limites de quota (429).
 */

interface FetchRetryOptions extends RequestInit {
  maxRetries?: number;
  initialDelay?: number;
  retryOnStatusCodes?: number[];
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  options: FetchRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    retryOnStatusCodes = [429, 500, 502, 503, 504],
    ...fetchOptions
  } = options;

  let lastError: any;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(input, fetchOptions);

      if (response.ok) {
        return response;
      }

      if (retryOnStatusCodes.includes(response.status) && i < maxRetries) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Fetch falhou com status ${response.status}. Tentativa ${i + 1} de ${maxRetries}. Retentando em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error: any) {
      lastError = error;
      const isNetworkError = 
        error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError') ||
        error.name === 'TypeError'; // Fetch throws TypeError on network failure

      if (isNetworkError && i < maxRetries) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Erro de rede no fetch. Tentativa ${i + 1} de ${maxRetries}. Retentando em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
