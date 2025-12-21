import React, { useEffect, useState } from "react";
import { FaPencilAlt } from "react-icons/fa";
import { useParams, Link } from "react-router-dom";
import DetailViewWithImage from "../Templates/DetailViewWithImage";
import { FaBookBookmark } from "react-icons/fa6";

/*
  RecipeView
  Summary:
  - Fetches and displays details for a single recipe including its ingredients
    and related product information. Renders a detail pane with image, metadata
    and actions (edit/back).
*/

// --------------------------------------------------
// STATE / HOOKS
// --------------------------------------------------
const RecipeView = () => {
  const { id } = useParams();
  // loading indicator while fetch runs
  const [loading, setLoading] = useState(true);
  // error string shown when fetch fails
  const [error, setError] = useState("");
  // recipe DTO returned by API
  const [recipe, setRecipe] = useState(null);

  // --------------------------------------------------
  // EFFECT: load recipe with ingredients on mount / id change
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        setError("Missing recipe id");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/recipes/${encodeURIComponent(id)}/with-ingredients`,
          { credentials: "include" }
        );
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Server returned ${res.status}`);
        }

        const json = await res.json();
        if (!mounted) return;
        // Save fetched recipe DTO to state
        setRecipe(json);
      } catch (ex) {
        console.error("Failed to load recipe", ex);
        if (mounted) setError(ex?.message || "Failed to load recipe");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  // --------------------------------------------------
  // PREPARE HEADER / ACTIONS
  // --------------------------------------------------
  // Note: actions intentionally passed separately to the template
  const headerProps = {
    icon: <FaBookBookmark size={35} />,
    title: recipe ? `Recipe ${recipe.recipeId}` : "View Recipe",
    descriptionLines: [],
  };

  // Page actions shown in the detail view (Edit + Back)
  const actions = [
    {
      icon: <FaPencilAlt />,
      title: "Edit Recipe Record",
      route: `/recipes/edit/${id}`,
    },
    { icon: null, title: "Back to recipes", route: "/recipes" },
  ];

  // --------------------------------------------------
  // RENDER: loading / error / not found handling
  // --------------------------------------------------
  if (loading) {
    const detail = { title: "Loading...", rows: [] };
    return (
      <DetailViewWithImage
        headerProps={headerProps}
        detail={detail}
        metadataUnderImage={{ title: "", rows: [] }}
        actions={actions}
        image={null}
      />
    );
  }

  if (error) {
    const detail = {
      title: "Error",
      rows: [{ label: "Message", value: error }],
    };
    return (
      <DetailViewWithImage
        headerProps={headerProps}
        detail={detail}
        metadataUnderImage={{ title: "", rows: [] }}
        actions={actions}
        image={null}
      />
    );
  }

  if (!recipe) {
    const detail = { title: "Not found", rows: [] };
    return (
      <DetailViewWithImage
        headerProps={headerProps}
        detail={detail}
        metadataUnderImage={{ title: "", rows: [] }}
        actions={actions}
        image={null}
      />
    );
  }

  // --------------------------------------------------
  // DATA PROCESSING: build ingredients list and related product link
  // --------------------------------------------------
  // Render ingredients as an inline unordered list or a fallback message
  const ingredientsJsx =
    recipe.ingredients && recipe.ingredients.length ? (
      <ul className="text-start ps-3" style={{ margin: 0, listStylePosition: "inside" }}>
        {recipe.ingredients.map((it) => (
          <li key={it.recipeInventoryItemId}>
            {it.inventoryItemName ?? `Item ${it.inventoryItemId ?? ""}`} - {" "}
            {it.quantity ?? ""}
          </li>
        ))}
      </ul>
    ) : (
      "No ingredients"
    );

  // Link to related product if present
  const relatedProductValue = recipe.relatedProductId ? (
    // link to Product detail view using the product id returned from the API
    <Link to={`/products/${recipe.relatedProductId}`}>
      {`Product #${recipe.relatedProductId}`}
    </Link>
  ) : (
    "N/A"
  );

  // Main detail rows for the recipe
  const detail = {
    title: `ID ${recipe.recipeId}: ${recipe.recipeName}`,
    rows: [
      { label: "Ingredients", value: ingredientsJsx },
      { label: "Instruction", value: recipe.description ?? "" },
      { label: "Is On Sale", value: recipe.isOnSale ? "Yes" : "No" },
      { label: "Related Product", value: relatedProductValue },
    ],
  };

  // Metadata block under the image (timestamps and creator)
  const metadata = {
    title: "About This Recipe",
    rows: [
      {
        label: "Created At",
        value: recipe.createdAt
          ? new Date(recipe.createdAt).toLocaleString()
          : "",
      },
      { label: "Created By", value: recipe.createdByName ?? "" },
      {
        label: "Updated At",
        value: recipe.updatedAt
          ? new Date(recipe.updatedAt).toLocaleString()
          : "",
      },
    ],
  };

  // Image object used by the template
  const image = {
    url: recipe.image || "",
    alt: recipe.recipeName || `recipe ${recipe.recipeId}`,
  };

  // --------------------------------------------------
  // FINAL RENDER: detail view with image and metadata
  // --------------------------------------------------
  return (
    <DetailViewWithImage
      headerProps={headerProps}
      detail={detail}
      metadataUnderImage={metadata}
      actions={actions}
      image={image}
    />
  );
};

export default RecipeView;