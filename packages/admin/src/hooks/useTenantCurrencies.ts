import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../store/auth';

export interface TenantCurrency {
  id: string;
  currencyId: string;
  isDefault: boolean;
  isActive: boolean;
  currency: { code: string; name: string; symbol: string; type: string };
}

export function useTenantCurrencies() {
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<TenantCurrency[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.tenantId) return;
    setLoading(true);
    api
      .get<TenantCurrency[]>(`/tenants/${user.tenantId}/currencies`)
      .then((res) => setCurrencies(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.tenantId]);

  return { currencies, loading };
}
