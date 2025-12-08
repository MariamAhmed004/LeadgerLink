import React, { useEffect, useState } from "react";
import { FaPencilAlt } from "react-icons/fa";
import { useParams, Link } from "react-router-dom";
import DetailViewWithImage from "../Templates/DetailViewWithImage";
import { FaBookBookmark } from "react-icons/fa6";

/*
  Recipe view
  - Fetches recipe detail including ingredients and product relation
  - Shows "Is on sale" and related product id when available (linked to product view)
  - Keeps actions out of headerProps and passes them via the actions prop
*/

const RecipeView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState(null);

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

  // Note: actions are intentionally NOT set on headerProps; they are provided
  // separately to DetailViewWithImage as requested.
  const headerProps = {
    icon: <FaBookBookmark size={35} />,
    title: recipe ? `Recipe ${recipe.recipeId}` : "View Recipe",
    descriptionLines: [],
  };

  // Page actions (Edit / Back) are passed to the DetailView component via 'actions'
  const actions = [
    {
      icon: <FaPencilAlt />,
      title: "Edit Recipe Record",
      route: `/recipes/edit/${id}`,
    },
    { icon: null, title: "Back to recipes", route: "/recipes" },
  ];

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

  const relatedProductValue = recipe.relatedProductId ? (
    // link to Product detail view using the product id returned from the API
    <Link to={`/products/${recipe.relatedProductId}`}>
      {`Product #${recipe.relatedProductId}`}
    </Link>
  ) : (
    "N/A"
  );

  const detail = {
    title: `ID ${recipe.recipeId}: ${recipe.recipeName}`,
    rows: [
      { label: "Ingredients", value: ingredientsJsx },
      { label: "Instruction", value: recipe.description ?? "" },
      { label: "Is On Sale", value: recipe.isOnSale ? "Yes" : "No" },
      { label: "Related Product", value: relatedProductValue },
    ],
  };

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

    const image = {
        url: recipe.image || "",
        alt: recipe.recipeName || `recipe ${recipe.recipeId}`
    };

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