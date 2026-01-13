import React, { createContext, useContext, ReactNode } from "react";
import { useUserRole, UserRole } from "@/hooks/useUserRole";

interface RoleContextType {
  role: UserRole;
  loading: boolean;
  refreshRole: () => Promise<void>;
  isProfessional: boolean;
  isClient: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { role, loading, refreshRole } = useUserRole();

  const value: RoleContextType = {
    role,
    loading,
    refreshRole,
    isProfessional: role === "professional",
    isClient: role === "client",
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
