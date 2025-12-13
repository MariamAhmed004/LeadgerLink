import { useState, useEffect } from "react";
import { FaFileInvoice, FaPlus } from "react-icons/fa";
import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import FilterDate from "../../components/Listing/FilterDate";
import EntityTable from "../../components/Listing/EntityTable";
import PaginationSection from "../../components/Listing/PaginationSection";
import { useAuth } from "../../Context/AuthContext";

const SalesListPage = () => {
  const { loggedInUser } = useAuth();

  const [createdBy, setCreatedBy] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // determine org admin once (used for column visibility)
  const roles = Array.isArray(loggedInUser?.roles) ? loggedInUser.roles : [];
  const isOrgAdmin = roles.includes("Organization Admin") ;

  useEffect(() => {
    // load sales and users for current user's store (server resolves store from auth if no storeId is provided)
    const load = async () => {
      setLoading(true);
      try {
        // decide sales endpoint: organization-level for org admins, otherwise store-level
        const rolesLocal = Array.isArray(loggedInUser?.roles) ? loggedInUser.roles : [];
        const isOrgAdminLocal = rolesLocal.includes("Organization Admin");

        // try to read organization id from common properties
        const orgId = loggedInUser?.orgId ?? null;

        // prefer explicit storeId for non-admin users so backend returns store-scoped sales
        const userStoreId = loggedInUser?.storeId ?? null;

        const salesUrl = isOrgAdminLocal && orgId
          ? `/api/sales/by-organization?organizationId=${encodeURIComponent(orgId)}`
          : userStoreId
            ? `/api/sales?storeId=${encodeURIComponent(userStoreId)}`
            : "/api/sales";

        // fetch sales
        const salesRes = await fetch(salesUrl, {
          credentials: "include",
        });
        if (salesRes.ok) {
          const salesData = await salesRes.json();
          setSales(salesData || []);
        } else {
          setSales([]);
        }

        // fetch users for store (populate Created By select) - unchanged
        const usersRes = await fetch("/api/sales/store-users", {
          credentials: "include",
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData || []);
        } else {
          setUsers([]);
        }
      } catch (err) {
        console.error("Failed to load sales or users", err);
        setSales([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    // load whenever auth changes (role/org context may change)
    load();
  }, [loggedInUser]);

  // build filter select options from users
  const createdByOptions = [
    { label: "All", value: "" },
    ...users.map((u) => ({
      label: u.fullName ?? u.email ?? `User ${u.userId}`,
      value: String(u.userId),
    })),
  ];

  // Filtered and paginated rows
  const filteredSales = sales.filter((sale) => {
    // createdBy filter: empty = all, otherwise compare by user id
    const matchesCreatedBy =
      createdBy === "" || String(sale.createdById) === String(createdBy);

    // date filter - simple substring match against timestamp string
    const matchesDate =
      selectedDate === "" ||
      (sale.timestamp && sale.timestamp.toString().includes(selectedDate));

    // search across createdBy name and payment method (and store name when present)
    const matchesSearch =
      searchTerm === "" ||
      (sale.createdByName &&
        sale.createdByName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sale.paymentMethodName &&
        sale.paymentMethodName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sale.storeName &&
        sale.storeName.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCreatedBy && matchesDate && matchesSearch;
  });

  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  // Columns: include Store only for org admins
  const columns = isOrgAdmin
    ? ["Timestamp", "Created By", "Store", "Total Amount", "Payment Method"]
    : ["Timestamp", "Created By", "Total Amount", "Payment Method"];

  // rows must be arrays of cell values (EntityTable will turn the requested column into a link)
  const tableRows = paginatedSales.map((sale) => {
    const timestampCell = (() => {
      try {
        const d = new Date(sale.timestamp);
        return isNaN(d.getTime()) ? sale.timestamp : d.toLocaleString();
      } catch {
        return sale.timestamp;
      }
    })();

    const baseCells = [
      timestampCell,
      sale.createdByName ?? "",
    ];

    if (isOrgAdmin) {
      baseCells.push(sale.storeName ?? "");
    }

    baseCells.push(sale.amount != null ? `${Number(sale.amount).toFixed(3)} BHD` : "");
    baseCells.push(sale.paymentMethodName ?? "");

    return baseCells;
  });

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaFileInvoice size={55} />}
        title="Sales"
        descriptionLines={[
          "Following sales are made in from newest to oldest:",
          "Click on the sale timestamp to view its details",
        ]}
        actions={[
          {
            icon: <FaPlus />,
            title: "New Sale",
            route: "/sales/new",
          },
        ]}
      />

      <FilterSection
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search sales..."
        entriesValue={entriesPerPage}
        onEntriesChange={setEntriesPerPage}
      >
        <div className="col-md-4">
          <FilterSelect
            label="Created By"
            value={createdBy}
            onChange={setCreatedBy}
            options={createdByOptions}
          />
        </div>
        <div className="col-md-4">
          <FilterDate label="Date" value={selectedDate} onChange={setSelectedDate} />
        </div>
      </FilterSection>

      <EntityTable
        title="Sales Records"
        columns={columns}
        rows={tableRows}
        emptyMessage={loading ? "Loading..." : "No sales found for the selected filters."}
        // which header name should be rendered as a link
        linkColumnName="Timestamp"
        // build the url using the paginatedSales index
        rowLink={(_, rowIndex) => `/sales/${paginatedSales[rowIndex].id}`}
      />

      <PaginationSection
        currentPage={currentPage}
        totalPages={Math.ceil(filteredSales.length / entriesPerPage)}
        onPageChange={setCurrentPage}
        entriesPerPage={entriesPerPage}
        totalEntries={filteredSales.length}
      />
    </div>
  );
};

export default SalesListPage;