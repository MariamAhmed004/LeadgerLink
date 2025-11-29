import React, { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// Helper function to set authentication state
export const useAuth = () => useContext(AuthContext);