import React, { useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import EntityTable from "../../components/Listing/EntityTable";
import PaginationSection from "../../components/Listing/PaginationSection";
import { useAuth } from "../../Context/AuthContext";

// Recipes Management Component
// Fetches recipes for current store for non-Organization Admin users,
// or all recipes when the logged-in user has the Organization Admin role.
const RecipesManagement = () => {
  const { loggedInUser } = useAuth();

  // filters / search
  const [onSaleFilter, setOnSaleFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // pagination
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // data
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSaleOptions = [
    { label: "All", value: "" },
    { label: "On Sale", value: "true" },
    { label: "Not On Sale", value: "false" },
  ];

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const isOrgAdmin = loggedInUser?.roles?.includes("Organization Admin");
        const endpoint = isOrgAdmin ? "/api/recipes" : "/api/recipes/for-current-store";

        const res = await fetch(endpoint, { credentials: "include" });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load recipes");
        }

        const data = await res.json();
        if (!mounted) return;

        // normalize to array
        setRecipes(Array.isArray(data) ? data : (data.items || []));
        setCurrentPage(1);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || "Failed to load recipes");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [loggedInUser]);

  // client-side filtering (onSale + search)
  const filtered = recipes.filter((r) => {
    // onSale filter
    if (onSaleFilter === "true" && !r.inSale && !r.InSale) return false;
    if (onSaleFilter === "false" && (r.inSale === true || r.InSale === true)) return false;

    // search (recipe name / createdBy)
    if (searchTerm && searchTerm.trim() !== "") {
      const s = searchTerm.trim().toLowerCase();
      const name = (r.recipeName ?? r.RecipeName ?? "").toString().toLowerCase();
      const creator = (r.createdByName ?? r.CreatedByName ?? "").toString().toLowerCase();
      return name.includes(s) || creator.includes(s);
    }

    return true;
  });

  const totalEntries = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  // build rows expected by EntityTable
  const tableRows = paginated.map((r) => {
    const inSale = !!(r.inSale ?? r.InSale);
    const price = r.sellingPrice ?? r.SellingPrice ?? null; // DTO may not provide price yet
    const addedBy = r.createdByName ?? r.CreatedByName ?? "-";

    return [
      inSale ? <span className="badge bg-success">Yes</span> : <span className="badge bg-secondary">No</span>,
      <Link key={r.recipeId ?? r.RecipeId} to={`/recipes/${r.recipeId ?? r.RecipeId}`}>{r.recipeName ?? r.RecipeName ?? "-"}</Link>,
      price != null ? `BHD ${Number(price).toFixed(3)}` : "-",
      addedBy
    ];
  });

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaPlus size={28} />}
        title="Recipes"
        descriptionLines={[
          "Manage recipes and their sale status.",
          "Use the filter to show only recipes that are on sale or not.",
        ]}
        actions={[
          {
            icon: <FaPlus />,
            title: "New Recipe",
            route: "/recipes/new",
          },
        ]}
      />

      <FilterSection
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search recipes..."
        entriesValue={entriesPerPage}
        onEntriesChange={setEntriesPerPage}
      >
        <div className="col-md-4">
          <FilterSelect
            label="On Sale"
            value={onSaleFilter}
            onChange={setOnSaleFilter}
            options={onSaleOptions}
          />
        </div>
      </FilterSection>

      <EntityTable
        title="Recipe List"
        columns={["On Sale", "Recipe Name", "Selling Price", "Added By"]}
        rows={tableRows}
        emptyMessage={loading ? 'Loading...' : (error ? `Error: ${error}` : 'No recipes to display.')}
        linkColumnName="Recipe Name"
      />

      <PaginationSection
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        entriesPerPage={entriesPerPage}
        totalEntries={totalEntries}
      />
    </div>
  );
};

export default RecipesManagement;
