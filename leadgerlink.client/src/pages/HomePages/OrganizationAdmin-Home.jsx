import React, { useEffect, useState } from "react";
import { useAuth } from "../../Context/AuthContext";
import WelcomeMessage from "../../components/homepages/WelcomeMessage";
import CardSection from "../../components/homepages/HomePageCardSection";
import HomePageTable from "../../components/homepages/HomePageTable";

const OrgAdminHomePage = () => {
    const { loggedInUser } = useAuth();
    const [username, setUsername] = useState("OrgAdmin<User>");
    const [overviewCards, setOverviewCards] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [orgId, setOrgId] = useState(null);

    const getTodayString = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Fetch organization overview stats (counts filtered by organization)
    const fetchOverviewStats = async () => {
        try {
            // prefer org id from auth context if present
            const authOrgId = loggedInUser?.orgId ?? loggedInUser?.OrgId ?? null;
            const userId = loggedInUser?.userId ?? loggedInUser?.UserId ?? null;

            if (!userId && !authOrgId) {
                setOverviewCards([
                    { title: "Total Stores", value: 0 },
                    { title: "Total Organization Users", value: 0 },
                    { title: "Active Users Today", value: 0 },
                ]);
                return null;
            }

            // If auth already provides orgId use it; otherwise fetch domain user to obtain OrgId
            let resolvedOrgId = authOrgId;
            if (!resolvedOrgId) {
                const userRes = await fetch(`/api/users/${userId}`, { credentials: "include" });
                if (!userRes.ok) {
                    setOverviewCards([
                        { title: "Total Stores", value: 0 },
                        { title: "Total Organization Users", value: 0 },
                        { title: "Active Users Today", value: 0 },
                    ]);
                    return null;
                }
                const domainUser = await userRes.json();
                resolvedOrgId = domainUser?.orgId ?? domainUser?.OrgId ?? null;
            }

            if (!resolvedOrgId) {
                setOverviewCards([
                    { title: "Total Stores", value: 0 },
                    { title: "Total Organization Users", value: 0 },
                    { title: "Active Users Today", value: 0 },
                ]);
                return null;
            }

            setOrgId(resolvedOrgId);

            // parallel fetch counts
            const today = getTodayString();
            const [storesRes, usersRes, activeUsersRes] = await Promise.all([
                fetch(`/api/stores/count?organizationId=${resolvedOrgId}`, { credentials: "include" }),
                fetch(`/api/users/count?orgId=${resolvedOrgId}`, { credentials: "include" }),
                fetch(`/api/auditlogs/count?from=${today}&to=${today}&actionType=Login&organizationId=${resolvedOrgId}`, { credentials: "include" })
            ]);

            const storesCount = storesRes.ok ? await storesRes.json() : 0;
            const usersCount = usersRes.ok ? await usersRes.json() : 0;
            const activeToday = activeUsersRes.ok ? await activeUsersRes.json() : 0;

            setOverviewCards([
                { title: "Total Stores", value: storesCount },
                { title: "Total Organization Users", value: usersCount },
                { title: "Active Users Today", value: activeToday },
            ]);

            return resolvedOrgId;
        } catch (err) {
            console.error("Failed to load overview stats", err);
            setOverviewCards([
                { title: "Total Stores", value: 0 },
                { title: "Total Organization Users", value: 0 },
                { title: "Active Users Today", value: 0 },
            ]);
            return null;
        }
    };

    // Fetch recent activity logs for the organization only
    const fetchActivityLogs = async (resolvedOrgId) => {
        try {
            const orgParam = resolvedOrgId ?? orgId;
            if (!orgParam) {
                setActivityLogs([]);
                return;
            }

            const res = await fetch(`/api/auditlogs/overview?organizationId=${orgParam}&page=1&pageSize=10`, { credentials: "include" });
            if (!res.ok) {
                setActivityLogs([]);
                return;
            }

            const items = await res.json();
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

    // Fetch latest notifications for the current logged-in user (up to 5)
    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications/latest?pageSize=5", { credentials: "include" });
            if (!res.ok) {
                setNotifications([]);
                return;
            }

            const items = await res.json();

            // Map Notification model properties (Notification has Subject, Message, CreatedAt)
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
        // set username from auth if available
        setUsername(loggedInUser?.fullName ?? loggedInUser?.userName ?? "OrgAdmin<User>");

        // load overview then activity logs and notifications (ensure orgId available for activity fetch)
        (async () => {
            const resolvedOrgId = await fetchOverviewStats();
            await fetchActivityLogs(resolvedOrgId ?? undefined);
            await fetchNotifications();
        })();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedInUser]);

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

export default OrgAdminHomePage;