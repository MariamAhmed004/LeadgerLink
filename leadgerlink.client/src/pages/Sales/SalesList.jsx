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

  useEffect(() => {
    // load sales and users for current user's store (server resolves store from auth if no storeId is provided)
    const load = async () => {
      setLoading(true);
      try {
        // fetch sales
        const salesRes = await fetch("/api/sales", {
          credentials: "include",
        });
        if (salesRes.ok) {
          const salesData = await salesRes.json();
          setSales(salesData || []);
        } else {
          setSales([]);
        }

        // fetch users for store (populate Created By select)
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

    // only attempt to load if we at least know auth state (loggedInUser may be null during initial fetch)
    // loggedInUser object exists in context; load regardless — server will return empty if unauthenticated.
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

    // search across createdBy name and payment method
    const matchesSearch =
      searchTerm === "" ||
      (sale.createdByName &&
        sale.createdByName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sale.paymentMethodName &&
        sale.paymentMethodName.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCreatedBy && matchesDate && matchesSearch;
  });

  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  // rows must be arrays of cell values (EntityTable will turn the requested column into a link)
  const tableRows = paginatedSales.map((sale) => [
    // format timestamp for display; fallback to raw if not a valid date
    (() => {
      try {
        const d = new Date(sale.timestamp);
        return isNaN(d.getTime()) ? sale.timestamp : d.toLocaleString();
      } catch {
        return sale.timestamp;
      }
    })(),
    sale.createdByName ?? "",
    // format amount with 3 decimals to match existing UI sample
    sale.amount != null ? `${Number(sale.amount).toFixed(3)} BHD` : "",
    sale.paymentMethodName ?? "",
  ]);

  return (
    <div className="container py-5">
      <PageHeader
        icon={<FaFileInvoice size={28} />}
        title="Sales"
        descriptionLines={[
          "View and manage recorded sales. Use filters to narrow results.",
          "Create new sales records or inspect existing transactions.",
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
        columns={["Timestamp", "Created By", "Total Amount", "Payment Method"]}
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