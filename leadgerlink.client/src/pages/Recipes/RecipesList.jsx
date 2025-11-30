import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa';

import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import EntityTable from "../../components/Listing/EntityTable";
import PaginationSection from "../../components/Listing/PaginationSection";

// Recipes Management Component
// This component displays:
// - A button for adding new recipes
// - Filtering options
// - A list of recipes (latest to oldest)
// All logic is mocked for future implementation.

const RecipesManagement = () => {
  // filter state (no logic yet)
  const [onSaleFilter, setOnSaleFilter] = useState("");

  // pagination placeholders
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // placeholder rows (wire real data later)
  const tableRows = [];

  const onSaleOptions = [
    { label: "All", value: "" },
    { label: "On Sale", value: "true" },
    { label: "Not On Sale", value: "false" },
  ];

  // Handler for adding a new recipe (to be implemented)
  const handleAddRecipe = () => {
    // TODO: Implement logic to add a new recipe
  };

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
        searchValue={""}
        onSearchChange={() => {}}
        searchPlaceholder=""
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
        emptyMessage="No recipes to display."
      />

      <PaginationSection
        currentPage={currentPage}
        totalPages={Math.ceil((tableRows.length || 0) / entriesPerPage)}
        onPageChange={setCurrentPage}
        entriesPerPage={entriesPerPage}
        totalEntries={tableRows.length}
      />
    </div>
  );
};

export default RecipesManagement;
