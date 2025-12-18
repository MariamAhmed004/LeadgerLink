import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";

const RoleBasedRoute = ({ element, allowedRoles }) => {
    const { loggedInUser, loading } = useAuth();

    // Wait until loading is complete
    if (loading) {
        return <div>Loading...</div>; // You can replace this with a spinner or skeleton loader
    }

    // If the user is not authenticated, redirect to the login page
    if (!loggedInUser?.isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If allowedRoles is provided and the user does not have any of the allowed roles, redirect to the "Not Found" page
    if (allowedRoles?.length > 0 && !loggedInUser.roles.some((role) => allowedRoles.includes(role))) {
        console.log("access denied");
        return <Navigate to="/not-found" replace />;
    }

    // If the user is authorized (or no roles are required), render the element
    return element;
};

export default RoleBasedRoute;