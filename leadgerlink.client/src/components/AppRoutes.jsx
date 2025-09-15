import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Import your page components here
import HomePage from "../pages/HomePage";
import SignupPage from "../pages/SignupPage";
import NotFound from "../pages/NotFound";
import Login from "../pages/Login";

const AppRoutes = () => {
  return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
  );
};

export default AppRoutes;