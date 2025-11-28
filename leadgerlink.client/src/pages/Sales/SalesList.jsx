import { useState } from "react";
import { FaFileInvoice, FaPlus } from "react-icons/fa";
import PageHeader from "../../components/Listing/PageHeader";
import FilterSection from "../../components/Listing/FilterSection";
import FilterSelect from "../../components/Listing/FilterSelect";
import FilterDate from "../../components/Listing/FilterDate";
import SearchField from "../../components/Listing/SearchField";
import EntriesPerPageSelector from "../../components/Listing/EntriesPerPageSelector";
import EntityTable from "../../components/Listing/EntityTable";
import TableRowLink from "../../components/Listing/TableRowLink";
import PaginationSection from "../../components/Listing/PaginationSection";

const SalesListPage = () => {
    const [createdBy, setCreatedBy] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Sample static data
    const sales = [
        {
            id: 1,
            timestamp: "11:03:46 October 12, 2025",
            createdBy: "Healthcare",
            amount: "12.500 BHD",
            method: "support@bh",
        },
        {
            id: 2,
            timestamp: "11:03:46 October 12, 2025",
            createdBy: "Manufacturing",
            amount: "9.200 BHD",
            method: "info@acme",
        },
        {
            id: 3,
            timestamp: "11:03:46 October 12, 2025",
            createdBy: "Education",
            amount: "15.000 BHD",
            method: "hello@edu",
        },
    ];

    // Filtered and paginated rows
    const filteredSales = sales.filter((sale) =>
        sale.createdBy.toLowerCase().includes(createdBy.toLowerCase()) &&
        sale.timestamp.includes(selectedDate) &&
        (searchTerm === "" ||
            sale.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sale.method.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const paginatedSales = filteredSales.slice(
        (currentPage - 1) * entriesPerPage,
        currentPage * entriesPerPage
    );

    const tableRows = paginatedSales.map((sale) => [
        <TableRowLink key={sale.id} to={`/sales/${sale.id}`}>
            {sale.timestamp}
        </TableRowLink>,
        sale.createdBy,
        sale.amount,
        sale.method,
    ]);

    return (
        <div className="container py-5">
            {/* Header - new structure: icon, title, two description lines, and action buttons */}
            <PageHeader
                icon={<FaFileInvoice size={28} />}
                title="Sales"
                descriptionLines={[
                    "View and manage recorded sales. Use filters to narrow results.",
                    "Create new sales records or inspect existing transactions."
                ]}
                actions={[
                    {
                        icon: <FaPlus />,
                        title: "New Sale",
                        route: "/sales/new"
                    }
                ]}
            />

            {/* Filter Section */}
            <FilterSection>
                <div className="col-md-4">
                    <FilterSelect
                        label="Created By"
                        value={createdBy}
                        onChange={setCreatedBy}
                        options={[
                            { label: "All", value: "" },
                            { label: "Healthcare", value: "Healthcare" },
                            { label: "Manufacturing", value: "Manufacturing" },
                            { label: "Education", value: "Education" },
                        ]}
                    />
                </div>
                <div className="col-md-4">
                    <FilterDate label="Date" value={selectedDate} onChange={setSelectedDate} />
                </div>
                <div className="col-md-4">
                    <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Search sales..." />
                </div>
                <div className="col-md-4">
                    <EntriesPerPageSelector value={entriesPerPage} onChange={setEntriesPerPage} />
                </div>
            </FilterSection>

            {/* Table */}
            <EntityTable
                title="Sales Records"
                columns={["Timestamp", "Created By", "Total Amount", "Payment Method"]}
                rows={tableRows}
                emptyMessage="No sales found for the selected filters."
            />

            {/* Pagination */}
            <PaginationSection
                currentPage={currentPage}
                totalPages={Math.ceil(filteredSales.length / entriesPerPage)}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default SalesListPage;