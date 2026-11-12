import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedContent = ({ allowedRoles, children, fallback = null }) => {
  const { currentUser } = useAuth();

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return fallback;
  }

  return <>{children}</>;
};

export const HasPermission = ({ allowedRoles }) => {
    const { currentUser } = useAuth();
    return currentUser && allowedRoles.includes(currentUser.role);
}
