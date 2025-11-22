'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Customer } from '@/types/customer';
import { getCurrentCustomer } from '@/lib/woocommerce/customers';

interface AuthContextType {
  customer: Customer | null;
  customerId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (customerId: number) => Promise<void>;
  logout: () => void;
  refreshCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  customer: null,
  customerId: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  refreshCustomer: async () => {},
});

const CUSTOMER_ID_KEY = 'julinemart_customer_id';

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load customer on mount
  useEffect(() => {
    loadCustomer();
  }, []);

  const loadCustomer = async () => {
    try {
      setIsLoading(true);
      const storedId = localStorage.getItem(CUSTOMER_ID_KEY);
      
      if (storedId) {
        const id = parseInt(storedId);
        setCustomerId(id);
        
        const customerData = await getCurrentCustomer(id);
        if (customerData) {
          setCustomer(customerData);
        } else {
          // Invalid customer ID, clear it
          localStorage.removeItem(CUSTOMER_ID_KEY);
          setCustomerId(null);
        }
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (id: number) => {
    try {
      setIsLoading(true);
      localStorage.setItem(CUSTOMER_ID_KEY, id.toString());
      setCustomerId(id);
      
      const customerData = await getCurrentCustomer(id);
      if (customerData) {
        setCustomer(customerData);
      }
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(CUSTOMER_ID_KEY);
    setCustomer(null);
    setCustomerId(null);
  };

  const refreshCustomer = async () => {
    if (customerId) {
      try {
        const customerData = await getCurrentCustomer(customerId);
        if (customerData) {
          setCustomer(customerData);
        }
      } catch (error) {
        console.error('Error refreshing customer:', error);
      }
    }
  };

  const value = {
    customer,
    customerId,
    isAuthenticated: customer !== null,
    isLoading,
    login,
    logout,
    refreshCustomer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  }
  return context;
}