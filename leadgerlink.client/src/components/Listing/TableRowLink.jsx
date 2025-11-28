import { Link } from "react-router-dom";

const TableRowLink = ({ to, children }) => (
    <Link to={to} className="text-decoration-none text-primary fw-semibold">
        {children}
    </Link>
);

export default TableRowLink;