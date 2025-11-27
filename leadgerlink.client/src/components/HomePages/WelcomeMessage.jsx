import { useAuth } from "../../Context/AuthContext";
import { RiRobot2Fill } from "react-icons/ri";

const WelcomeMessage = () => {
    const { loggedInUser, loading } = useAuth();

    const displayName = loading
        ? "Loading..."
        : loggedInUser?.fullName ?? loggedInUser?.userName ?? "Guest";

    return (
        <div className="mb-4 text-start">
            <div className="d-flex align-items-center mb-2">
                <RiRobot2Fill size={36} className="me-3 fs-3" />
                <h2 className="fw-bold mb-0">Welcome, {displayName}!</h2>
            </div>
            <hr />
        </div>
    );
};

export default WelcomeMessage;