import React, { useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { FaBookBookmark } from "react-icons/fa6";
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
  const isOrgAdmin = Array.isArray(loggedInUser?.roles) && loggedInUser.roles.includes("Organization Admin");

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
        const isOrgAdmin = Array.isArray(loggedInUser?.roles) && loggedInUser.roles.includes("Organization Admin");
        let endpoint = "/api/recipes/for-current-store";
        if (isOrgAdmin) {
          const orgId = loggedInUser?.orgId ?? loggedInUser?.OrgId;
          endpoint = orgId ? `/api/recipes?orgId=${orgId}` : "/api/recipes";
        }

        const res = await fetch(endpoint, { credentials: "include" });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load recipes");
        }

        const data = await res.json();
        if (!mounted) return;

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
  // NOTE: do not inject <Link/> here — use EntityTable's rowLink prop and set linkColumnName to "Recipe Name"
  const tableRows = paginated.map((r) => {
    const inSale = !!(r.inSale ?? r.InSale);
    const price = r.sellingPrice ?? r.SellingPrice ?? null;
    const addedBy = r.createdByName ?? r.CreatedByName ?? "-";
    const recipeName = r.recipeName ?? r.RecipeName ?? "-";
    const storeName = r.storeName ?? r.StoreName ?? "-";

    const baseRow = [
      inSale ? <span className="badge bg-success">Yes</span> : <span className="badge bg-secondary">No</span>,
      recipeName,
      price != null ? `BHD ${Number(price).toFixed(3)}` : "-",
      addedBy
    ];
    if (isOrgAdmin) {
      baseRow.splice(1, 0, storeName); // Insert after "On Sale"
    }
    return baseRow;
  });

  const columns = isOrgAdmin
    ? ["On Sale", "Store Name", "Recipe Name", "Selling Price", "Added By"]
    : ["On Sale", "Recipe Name", "Selling Price", "Added By"];

  return (
    <div className="container py-5">
      <PageHeader
              icon={<FaBookBookmark size={35} />}
        title="Recipes"
        descriptionLines={[
          "Following are the Recipes added:",
          "Click on the recipe name to view its details, selling price is only for items on sale",
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
        columns={columns}
        rows={tableRows}
        emptyMessage={loading ? 'Loading...' : (error ? `Error: ${error}` : 'No recipes to display.')}
        linkColumnName="Recipe Name"
        // Use the current page's `paginated` array to resolve the underlying recipe id for the clicked row
        rowLink={(_, rowIndex) => {
          const item = paginated[rowIndex];
          const id = item?.recipeId ?? item?.RecipeId ?? "";
          return id ? `/recipes/${id}` : "/recipes";
        }}
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
