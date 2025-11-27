import React, { useEffect, useState } from "react";
import WelcomeMessage from "../../components/homepages/WelcomeMessage";
import CardSection from "../../components/homepages/HomePageCardSection";
import HomePageTable from "../../components/homepages/HomePageTable";


const AccountantHomePage = () => {
    const [username, setUsername] = useState("Accountant<User>");
    const [performanceCards, setPerformanceCards] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // 🔧 Placeholder: Fetch today's performance metrics
    const fetchPerformanceStats = async () => {
        // TODO: Replace with actual API call
        setPerformanceCards([
            { title: "Sales", value: "BHD 1,250" },
            { title: "Low Stock Alerts", value: 5 },
            { title: "Transfer Requests", value: 3 },
        ]);
    };

    // 🔧 Placeholder: Fetch recent activity logs
    const fetchActivityLogs = async () => {
        // TODO: Replace with actual API call
        setActivityLogs([
            ["22: John Doe", "11:23:04 October 12, 2025", "Logged out"],
            ["22: John Doe", "11:03:46 October 12, 2025", "Created a new branch employee user"],
            ["22: John Doe", "10:25:13 October 12, 2025", "Logged In to the system"],
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

    useEffect(() => {
        fetchPerformanceStats();
        fetchActivityLogs();
        fetchNotifications();
    }, []);

    return (
        <div className="container py-5">
            {/* Welcome Message */}
            <WelcomeMessage username={username} />

            {/* Today's Performance Cards */}
            <CardSection title="Today's Performance" cards={performanceCards} />

            {/* Recent Activity Table */}
            <HomePageTable
                title="Recent Activity"
                columns={["User", "Timestamp", "Log Details"]}
                rows={activityLogs}
            />

            {/* Latest Notifications Table */}
            <HomePageTable
                title="Latest Notifications"
                columns={["Timestamp", "Notification"]}
                rows={notifications}
            />
        </div>
    );
};

export default AccountantHomePage;