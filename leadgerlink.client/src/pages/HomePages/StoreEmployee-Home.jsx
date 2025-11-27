import React, { useEffect, useState } from "react";
import WelcomeMessage from "../../components/homepages/WelcomeMessage";
import QuickAccessPanel from "../../components/homepages/HomePageQuickAccess";
import HomePageTable from "../../components/homepages/HomePageTable";
import { FaReceipt, FaBoxOpen, FaUtensils } from "react-icons/fa";

const StoreEmployeeHomePage = () => {
    const [username, setUsername] = useState("StoreEmployee<User>");
    const [notifications, setNotifications] = useState([]);
    const [pendingTransfers, setPendingTransfers] = useState([]);

    // 🔗 Quick Access Routes
    

    const quickActions = [
        { label: "New Sale", route: "/sales/new", icon: <FaReceipt /> },
        { label: "New Inventory Item", route: "/inventory/new", icon: <FaBoxOpen /> },
        { label: "New Recipe", route: "/recipes/new", icon: <FaUtensils /> },
    ];

    // 🔧 Placeholder: Fetch latest notifications
    const fetchNotifications = async () => {
        // TODO: Replace with actual API call
        setNotifications([
            ["11:23:04 October 12, 2025", "Branch Manager has added a transfer request to be filled"],
            ["11:03:46 October 12, 2025", "Created a new branch employee user"],
            ["10:25:13 October 12, 2025", "Logged In to the system"],
        ]);
    };

    // 🔧 Placeholder: Fetch pending inventory movements
    const fetchPendingTransfers = async () => {
        // TODO: Replace with actual API call
        setPendingTransfers([
            ["XXX Store", "XXX Store", "Rejected", "12-10-2025"],
            ["XXX Store", "XXX Store", "Completed", "11-10-2025"],
            ["XXX Store", "XXX Store", "Out for delivery", "10-10-2025"],
        ]);
    };

    useEffect(() => {
        fetchNotifications();
        fetchPendingTransfers();
    }, []);

    return (
        <div className="container py-5">
            {/* Welcome Message */}
            <WelcomeMessage username={username} />

            {/* Quick Access Buttons */}
            <QuickAccessPanel actions={quickActions} />

            {/* Latest Notifications Table */}
            <HomePageTable
                title="Latest Notifications"
                columns={["Timestamp", "Notification"]}
                rows={notifications}
            />

            {/* Pending Inventory Movements Table */}
            <HomePageTable
                title="Pending Inventory Movements"
                columns={["Requester", "Requested From", "Status", "Transfer Date"]}
                rows={pendingTransfers}
            />
        </div>
    );
};

export default StoreEmployeeHomePage;