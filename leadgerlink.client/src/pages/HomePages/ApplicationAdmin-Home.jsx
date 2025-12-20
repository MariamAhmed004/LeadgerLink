
import React, { useEffect, useState } from "react";
import WelcomeMessage from "../../components/homepages/WelcomeMessage";
import CardSection from "../../components/homepages/HomePageCardSection";
import HomePageTable from "../../components/homepages/HomePageTable";

/*
  ApplicationAdmin-Home.jsx
  Summary:
  - Admin home page showing a welcome message, system overview cards, recent activity table,
    and a small logs overview. Data is fetched from audit/org/user endpoints on mount.
*/

// --------------------------------------------------
// STATE DECLARATIONS
// --------------------------------------------------
const AdminHomePage = () => {
    // Username shown in welcome component (placeholder by default)
    const [username, setUsername] = useState("Admin<User>");

    // Cards for system overview (organizations, users, active users)
    const [cards, setCards] = useState([]);

    // Table rows for recent activity (derived from audit overview)
    const [activityLogs, setActivityLogs] = useState([]);

    // Quick counts for logs (total today + exceptions)
    const [logOverview, setLogOverview] = useState({
        totalLogs: 0,
        exceptionsToday: 0,
    });

    // --------------------------------------------------
    // HELPERS
    // --------------------------------------------------
    // Helper to produce YYYY-MM-DD for today's date queries
    const getTodayString = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // --------------------------------------------------
    // EFFECTS: DATA FETCHING
    // --------------------------------------------------

    // Fetch dashboard stats including organization count, users count and active users today
    const fetchDashboardStats = async () => {
        try {
            // Fetch organization and user counts in parallel
            const [orgRes, usersRes] = await Promise.all([
                fetch("/api/organizations/count", { credentials: "include" }),
                fetch("/api/users/count", { credentials: "include" })
            ]);

            // Parse results with fallback to 0
            const orgCount = orgRes.ok ? await orgRes.json() : 0;
            const usersCount = usersRes.ok ? await usersRes.json() : 0;

            // audit counts for today
            const today = getTodayString();
            // Note: second fetch filters by actionType=login to count distinct or login events
            const [todayLogsRes, loginRes] = await Promise.all([
                fetch(`/api/auditlogs/count?from=${today}&to=${today}`, { credentials: "include" }),
                fetch(`/api/auditlogs/count?from=${today}&to=${today}&actionType=login`, { credentials: "include" })
            ]);

            // Parse audit counts with safe fallback
            const todayLogs = todayLogsRes.ok ? await todayLogsRes.json() : 0;
            const activeUsersToday = loginRes.ok ? await loginRes.json() : 0;

            // Update overview cards
            setCards([
                { title: "Total Organizations", value: orgCount },
                { title: "Total Users", value: usersCount },
                { title: "Active Users Today", value: activeUsersToday },
            ]);

            // update log overview values that were previously placeholders (preserve other keys)
            setLogOverview(prev => ({
                ...prev,
                totalLogs: todayLogs
            }));
        } catch (err) {
            // On any error, log and reset to safe defaults
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
            const res = await fetch("/api/auditlogs/overview?page=1&pageSize=5", { credentials: "include" });
            if (!res.ok) {
                // on non-ok response clear activity rows
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
            // network or parse error -> clear rows and log
            console.error("Failed to load activity logs", err);
            setActivityLogs([]);
        }
    };

    // Fetch log overview counts (total today and exceptions today)
    const fetchLogOverview = async () => {
        try {
            const today = getTodayString();
            // Count total logs and exceptions for today in parallel
            const [totalRes, exceptionsRes] = await Promise.all([
                fetch(`/api/auditlogs/count?from=${today}&to=${today}`, { credentials: "include" }),
                fetch(`/api/auditlogs/count?from=${today}&to=${today}&actionType=exception`, { credentials: "include" })
            ]);

            // Parse with fallbacks
            const total = totalRes.ok ? await totalRes.json() : 0;
            const exceptions = exceptionsRes.ok ? await exceptionsRes.json() : 0;

            // Update small overview counts
            setLogOverview({
                totalLogs: total,
                exceptionsToday: exceptions,
            });
        } catch (err) {
            // on failure reset to zeros
            console.error("Failed to load log overview", err);
            setLogOverview({ totalLogs: 0, exceptionsToday: 0 });
        }
    };

    // Run all initial fetches once on mount
    useEffect(() => {
        fetchDashboardStats();
        fetchActivityLogs();
        fetchLogOverview();
    }, []);

    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------
    return (
        <div className="container py-5">
            {/* Welcome header with username */}
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