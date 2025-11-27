import React from "react";
import { Link } from "react-router-dom";

const RecipeNew = () => {
  return (
    <div className="container py-5">
      <h1 className="display-6">Create Recipe (Placeholder)</h1>
      <p className="text-muted">
        This is a static placeholder page for the Create Recipe workflow. The real form will be implemented later.
      </p>
      <Link to="/recipes" className="btn btn-outline-primary mt-3">
        Back to Recipes
      </Link>
    </div>
  );
};

export default RecipeNew;