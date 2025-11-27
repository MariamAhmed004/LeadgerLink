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

    // Fetch dashboard stats including organization count and users count
    const fetchDashboardStats = async () => {
        try {
            const [orgRes, usersRes] = await Promise.all([
                fetch("/api/organizations/count", { credentials: "include" }),
                fetch("/api/users/count", { credentials: "include" })
            ]);

            const orgCount = orgRes.ok ? await orgRes.json() : 0;
            const usersCount = usersRes.ok ? await usersRes.json() : 0;

            setCards([
                { title: "Total Organizations", value: orgCount },
                { title: "Total Users", value: usersCount },
                { title: "Active Users Today", value: 11 }, // keep placeholder for now
            ]);
        } catch (err) {
            console.error("Failed to load dashboard stats", err);
            setCards([
                { title: "Total Organizations", value: 0 },
                { title: "Total Users", value: 0 },
                { title: "Active Users Today", value: 0 },
            ]);
        }
    };

    // Placeholder: Fetch recent activity logs
    const fetchActivityLogs = async () => {
        setActivityLogs([
            ["22: John Doe", "11:23:04 October 12, 2025", "Logged out"],
            ["22: John Doe", "11:03:46 October 12, 2025", "Created a new branch employee user"],
            ["22: John Doe", "10:25:13 October 12, 2025", "Logged In to the system"],
        ]);
    };

    // Placeholder: Fetch log overview
    const fetchLogOverview = async () => {
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