import React, { useEffect, useState } from "react";
import WelcomeMessage from "../../components/homepages/WelcomeMessage";
import CardSection from "../../components/homepages/HomePageCardSection";
import HomePageTable from "../../components/homepages/HomePageTable";

const StoreManagerHomePage = () => {
    const [username, setUsername] = useState("BM<User>");
    const [storeOverviewCards, setStoreOverviewCards] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [inventoryMovements, setInventoryMovements] = useState([]);

    // 🔧 Placeholder: Fetch store overview metrics
    const fetchStoreOverview = async () => {
        // TODO: Replace with actual API call
        setStoreOverviewCards([
            { title: "Current Month Sales", value: "BHD 3,420" },
            { title: "Best Selling Recipe", value: "Chicken Machboos" },
            { title: "Low Stock Items", value: 7 },
        ]);
    };

    // 🔧 Placeholder: Fetch latest notifications
    const fetchNotifications = async () => {
        // TODO: Replace with actual API call
        setNotifications([
            ["11:23:04 October 12, 2025", "Logged out"],
            ["11:03:46 October 12, 2025", "Created a new branch employee user"],
            ["10:25:13 October 12, 2025", "Logged In to the system"],
        ]);
    };

    // 🔧 Placeholder: Fetch inventory movement logs
    const fetchInventoryMovements = async () => {
        // TODO: Replace with actual API call
        setInventoryMovements([
            ["XXX Store", "XXX Store", "Rejected", "12-10-2025"],
            ["XXX Store", "XXX Store", "Completed", "11-10-2025"],
            ["XXX Store", "XXX Store", "Out for delivery", "10-10-2025"],
        ]);
    };

    useEffect(() => {
        fetchStoreOverview();
        fetchNotifications();
        fetchInventoryMovements();
    }, []);

    return (
        <div className="container py-5">
            {/* Welcome Message */}
            <WelcomeMessage username={username} />

            {/* Store Overview Cards */}
            <CardSection title="Store Overview" cards={storeOverviewCards} />

            {/* Latest Notifications Table */}
            <HomePageTable
                title="Latest Notifications"
                columns={["Timestamp", "Notification"]}
                rows={notifications}
            />

            {/* Inventory Movements Table */}
            <HomePageTable
                title="Store Inventory Movements"
                columns={["Requester", "Requested From", "Status", "Transfer Date"]}
                rows={inventoryMovements}
            />
        </div>
    );
};

export default StoreManagerHomePage;