import React, { useEffect, useState } from "react";
import { useAuth } from "../../Context/AuthContext";
import WelcomeMessage from "../../components/homepages/WelcomeMessage";
import CardSection from "../../components/homepages/HomePageCardSection";
import HomePageTable from "../../components/homepages/HomePageTable";


const AccountantHomePage = () => {
    const { loggedInUser } = useAuth();
    const [username, setUsername] = useState("Accountant<User>");
    const [performanceCards, setPerformanceCards] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [notifications, setNotifications] = useState([]);

    const getTodayString = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Fetch today's performance metrics (Sales, Low Stock Alerts, Transfer Requests fetched from API)
    const fetchPerformanceStats = async () => {
        try {
            const orgId = loggedInUser?.orgId ?? loggedInUser?.OrgId ?? null;
            let salesValueLabel = "BHD 0.000";
            let lowStockCount = 0;
            let transferCount = 0;

            if (orgId) {
                const today = getTodayString();

                const [salesRes, lowStockRes, transfersRes] = await Promise.all([
                    fetch(`/api/sales/sum?organizationId=${orgId}&from=${today}&to=${today}`, { credentials: "include" }),
                    fetch(`/api/notifications/count?type=${encodeURIComponent("Low Stock Alert")}&from=${today}&to=${today}&organizationId=${orgId}`, { credentials: "include" }),
                    fetch(`/api/inventorytransfers/count?organizationId=${orgId}&from=${today}&to=${today}`, { credentials: "include" })
                ]);

                if (salesRes.ok) {
                    const total = await salesRes.json();
                    salesValueLabel = `BHD ${Number(total ?? 0).toFixed(3)}`;
                }

                if (lowStockRes.ok) {
                    lowStockCount = await lowStockRes.json();
                }

                if (transfersRes.ok) {
                    transferCount = await transfersRes.json();
                }
            }

            setPerformanceCards([
                { title: "Sales", value: salesValueLabel },
                { title: "Low Stock Alerts", value: lowStockCount },
                { title: "Transfer Requests", value: transferCount },
            ]);
        } catch (err) {
            console.error("Failed to load performance stats", err);
            setPerformanceCards([
                { title: "Sales", value: "BHD 0.000" },
                { title: "Low Stock Alerts", value: 0 },
                { title: "Transfer Requests", value: 0 },
            ]);
        }
    };

    // fetch recent activity via audit logs overview endpoint
    const fetchActivityLogs = async () => {
        try {
            const res = await fetch("/api/auditlogs/overview?page=1&pageSize=10", { credentials: "include" });
            if (!res.ok) {
                setActivityLogs([]);
                return;
            }

            const items = await res.json();
            const rows = (items || []).map((it) => [
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

    // fetch latest notifications for current user (up to 5)
    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications/latest?pageSize=5", { credentials: "include" });
            if (!res.ok) {
                setNotifications([]);
                return;
            }

            const items = await res.json();
            const rows = (items || []).map((n) => {
                const timestamp = n.createdAt ? new Date(n.createdAt).toLocaleString() : "";
                const message = n.message ?? n.subject ?? "";
                return [timestamp, message];
            });

            setNotifications(rows);
        } catch (err) {
            console.error("Failed to load notifications", err);
            setNotifications([]);
        }
    };

    useEffect(() => {
        setUsername(loggedInUser?.fullName ?? loggedInUser?.userName ?? "Accountant<User>");
        fetchPerformanceStats();
        fetchActivityLogs();
        fetchNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedInUser]);

    return (
        <div className="container py-5">
            <WelcomeMessage username={username} />

            {/* Today's Performance Cards */}
            <CardSection title="Today's Performance" cards={performanceCards} />

            {/* Recent Activity Table */}
            <HomePageTable
                title="Recent Activity"
                columns={["User", "Timestamp", "Log Details"]}
                rows={activityLogs}
                emptyMessage="There is no activity logged yet."
            />

            {/* Latest Notifications Table */}
            <HomePageTable
                title="Latest Notifications"
                columns={["Timestamp", "Notification"]}
                rows={notifications}
                emptyMessage="No notifications yet."
            />
        </div>
    );
};

export default AccountantHomePage;