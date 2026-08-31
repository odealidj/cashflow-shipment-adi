'use client';

import { useState, useEffect } from 'react';

const PIN_STORAGE_KEY = 'transio_user_pin';
const PIN_AUTH_SESSION_KEY = 'transio_pin_authenticated';
const DEFAULT_PIN = '123456';

export function usePinAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [hasPinSet, setHasPinSet] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if PIN exists in local storage, otherwise set default
    const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
    if (!storedPin) {
      localStorage.setItem(PIN_STORAGE_KEY, DEFAULT_PIN);
    }
    
    // Check if currently authenticated in this session
    const sessionAuth = sessionStorage.getItem(PIN_AUTH_SESSION_KEY);
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const verifyPin = (inputPin: string): boolean => {
    const currentPin = localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
    if (inputPin === currentPin) {
      sessionStorage.setItem(PIN_AUTH_SESSION_KEY, 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const updatePin = (newPin: string): boolean => {
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      return false;
    }
    localStorage.setItem(PIN_STORAGE_KEY, newPin);
    return true;
  };

  const resetPinToDefault = (): void => {
    localStorage.setItem(PIN_STORAGE_KEY, DEFAULT_PIN);
  };

  const logout = (): void => {
    sessionStorage.removeItem(PIN_AUTH_SESSION_KEY);
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    hasPinSet,
    isLoading,
    verifyPin,
    updatePin,
    resetPinToDefault,
    logout
  };
}
