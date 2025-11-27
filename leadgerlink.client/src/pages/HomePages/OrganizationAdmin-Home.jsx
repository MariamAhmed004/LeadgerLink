import React, { useEffect, useState } from "react";
import WelcomeMessage from "../../components/homepages/WelcomeMessage";
import CardSection from "../../components/homepages/HomePageCardSection";
import HomePageTable from "../../components/homepages/HomePageTable";

const OrgAdminHomePage = () => {
    const [username, setUsername] = useState("OrgAdmin<User>");
    const [overviewCards, setOverviewCards] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [notifications, setNotifications] = useState([]);

    //  Placeholder: Fetch organization overview stats
    const fetchOverviewStats = async () => {
        // TODO: Replace with API call
        setOverviewCards([
            { title: "Total Stores", value: 12 },
            { title: "Total Organization Users", value: 45 },
            { title: "Active Users Today", value: 9 },
        ]);
    };

    //  Placeholder: Fetch recent activity logs
    const fetchActivityLogs = async () => {
        // TODO: Replace with API call
        setActivityLogs([
            ["22: John Doe", "11:23:04 October 12, 2025", "Logged out"],
            ["22: John Doe", "11:03:46 October 12, 2025", "Created a new branch employee user"],
            ["22: John Doe", "10:25:13 October 12, 2025", "Logged In to the system"],
        ]);
    };

    //  Placeholder: Fetch latest notifications
    const fetchNotifications = async () => {
        // TODO: Replace with API call
        setNotifications([
            ["11:23:04 October 12, 2025", "Logged out"],
            ["11:03:46 October 12, 2025", "Created a new branch employee user"],
            ["10:25:13 October 12, 2025", "Logged In to the system"],
        ]);
    };

    useEffect(() => {
        fetchOverviewStats();
        fetchActivityLogs();
        fetchNotifications();
    }, []);

    return (
        <div className="container py-5">
            {/* Welcome Message */}
            <WelcomeMessage username={username} />

            {/* Organization Overview Cards */}
            <CardSection title="Organization Overview" cards={overviewCards} />

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

export default OrgAdminHomePage;