import { Link } from "react-router-dom";
import "./listing.css";

const TableRowLink = ({ to, children }) => (
    <Link to={to} className="table-row-link text-decoration-underline fw-semibold">
        {children}
    </Link>
);

export default TableRowLink;