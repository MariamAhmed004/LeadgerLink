import React, { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
    const [loggedInUser, setLoggedInUser] = useState({
        isAuthenticated: false,
        userName: null,
        roles: [],
        fullName: null,
        userId: null
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const res = await fetch("/api/auth/loggedInuser", {
                    credentials: "include" // ensures ASP.NET Identity cookie is sent
                });
                const data = await res.json();
                setLoggedInUser(data);
            } catch {
                setLoggedInUser({ isAuthenticated: false, userName: null, roles: [], fullName: null, userId: null });
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    return (
        <AuthContext.Provider value={{ loggedInUser, setLoggedInUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};