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

    const getTodayString = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Fetch dashboard stats including organization count, users count and active users today
    const fetchDashboardStats = async () => {
        try {
            const [orgRes, usersRes] = await Promise.all([
                fetch("/api/organizations/count", { credentials: "include" }),
                fetch("/api/users/count", { credentials: "include" })
            ]);

            const orgCount = orgRes.ok ? await orgRes.json() : 0;
            const usersCount = usersRes.ok ? await usersRes.json() : 0;

            // audit counts for today
            const today = getTodayString();
            const [todayLogsRes, loginRes] = await Promise.all([
                fetch(`/api/auditlogs/count?from=${today}&to=${today}`, { credentials: "include" }),
                fetch(`/api/auditlogs/count?from=${today}&to=${today}&actionType=Login`, { credentials: "include" })
            ]);

            const todayLogs = todayLogsRes.ok ? await todayLogsRes.json() : 0;
            const activeUsersToday = loginRes.ok ? await loginRes.json() : 0;

            setCards([
                { title: "Total Organizations", value: orgCount },
                { title: "Total Users", value: usersCount },
                { title: "Active Users Today", value: activeUsersToday },
            ]);

            // update log overview values that were previously placeholders
            setLogOverview(prev => ({
                ...prev,
                totalLogs: todayLogs
            }));
        } catch (err) {
            console.error("Failed to load dashboard stats", err);
            setCards([
                { title: "Total Organizations", value: 0 },
                { title: "Total Users", value: 0 },
                { title: "Active Users Today", value: 0 },
            ]);
            setLogOverview({ totalLogs: 0, exceptionsToday: 0 });
        }
    };

    // Fetch recent activity logs for the main table using audit logs overview endpoint
    const fetchActivityLogs = async () => {
        try {
            const res = await fetch("/api/auditlogs/overview?page=1&pageSize=10", { credentials: "include" });
            if (!res.ok) {
                setActivityLogs([]);
                return;
            }
            const items = await res.json();
            // Convert overview DTOs into rows expected by HomePageTable
            const rows = items.map((it) => [
                it.userName ?? "System",
                new Date(it.timestamp).toLocaleString(),
                it.details ?? ""
            ]);
            setActivityLogs(rows);
        } catch (err) {
            console.error("Failed to load activity logs", err);
            setActivityLogs([]);
        }
    };

    // Fetch log overview counts (total today and exceptions today)
    const fetchLogOverview = async () => {
        try {
            const today = getTodayString();
            const [totalRes, exceptionsRes] = await Promise.all([
                fetch(`/api/auditlogs/count?from=${today}&to=${today}`, { credentials: "include" }),
                fetch(`/api/auditlogs/count?from=${today}&to=${today}&actionType=Exception`, { credentials: "include" })
            ]);

            const total = totalRes.ok ? await totalRes.json() : 0;
            const exceptions = exceptionsRes.ok ? await exceptionsRes.json() : 0;

            setLogOverview({
                totalLogs: total,
                exceptionsToday: exceptions,
            });
        } catch (err) {
            console.error("Failed to load log overview", err);
            setLogOverview({ totalLogs: 0, exceptionsToday: 0 });
        }
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
                emptyMessage="There is no activity logged yet."
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