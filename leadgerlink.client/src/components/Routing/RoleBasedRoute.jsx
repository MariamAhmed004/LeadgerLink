import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";

const RoleBasedRoute = ({ element, allowedRoles }) => {
    const { loggedInUser, loading } = useAuth();

    console.log("Current User:", loggedInUser, "Loading:", loading); // Debugging the user object and loading state

    // Wait until loading is complete
    if (loading) {
        return <div>Loading...</div>; // You can replace this with a spinner or skeleton loader
    }

    // If the user is not authenticated, redirect to the login page
    if (!loggedInUser) {
        return <Navigate to="/login" replace />;
    }

    // If the user is authenticated but not authorized, redirect to the "Not Found" page
    if (allowedRoles && !loggedInUser.roles.some((role) => allowedRoles.includes(role))) {
        return <Navigate to="/not-found" replace />;
    }

    // If the user is authorized, render the element
    return element;
};

export default RoleBasedRoute;