import React, { useEffect, useState } from "react";
import WelcomeMessage from "../../components/homepages/WelcomeMessage";
import CardSection from "../../components/homepages/HomePageCardSection";
import HomePageTable from "../../components/homepages/HomePageTable";


const AdminHomePage = () => {
    const [username, setUsername] = useState("Admin<User>");
    const [cards, setCards] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [logOverview, setLogOverview] = useState({
        totalLogs: 0,
        exceptionsToday: 0,
    });

    // Placeholder: Fetch dashboard stats
    const fetchDashboardStats = async () => {
        // TODO: Replace with actual API call
        setCards([
            {
                title: "Total Organizations",
                value: 32,
            },
            {
                title: "Total Users",
                value: 22,
            },
            {
                title: "Active Users Today",
                value: 11,
            },
        ]);
    };

    //  Placeholder: Fetch recent activity logs
    const fetchActivityLogs = async () => {
        // TODO: Replace with actual API call
        setActivityLogs([
            ["22: John Doe", "11:23:04 October 12, 2025", "Logged out"],
            ["22: John Doe", "11:03:46 October 12, 2025", "Created a new branch employee user"],
            ["22: John Doe", "10:25:13 October 12, 2025", "Logged In to the system"],
        ]);
    };

    //  Placeholder: Fetch log overview
    const fetchLogOverview = async () => {
        // TODO: Replace with actual API call
        setLogOverview({
            totalLogs: 12,
            exceptionsToday: 1,
        });
    };

    useEffect(() => {
        fetchDashboardStats();
        fetchActivityLogs();
        fetchLogOverview();
    }, []);

    return (
        <div className="container py-5">
            <WelcomeMessage username={username} />

            {/* System Overview Cards */}
            <CardSection title="System Overview" cards={cards} />

            {/* Recent Activity Table */}
            <HomePageTable
                title="Recent Activity"
                columns={["User", "Timestamp", "Log Details"]}
                rows={activityLogs}
            />

            {/* Logs Overview as two cards */}
            <CardSection
                title="Logs Overview"
                cards={[
                    { title: "Today's Log Entries", value: logOverview.totalLogs },
                    { title: "Exceptions Found Today", value: logOverview.exceptionsToday },
                ]}
            />
        </div>
    );
};

export default AdminHomePage;