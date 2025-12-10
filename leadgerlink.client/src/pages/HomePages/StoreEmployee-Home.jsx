import React, { useEffect, useState } from "react";
import WelcomeMessage from "../../components/homepages/WelcomeMessage";
import QuickAccessPanel from "../../components/homepages/HomePageQuickAccess";
import HomePageTable from "../../components/homepages/HomePageTable";
import { FaReceipt, FaBoxOpen, FaUtensils } from "react-icons/fa";

const StoreEmployeeHomePage = () => {
    const [username, setUsername] = useState("StoreEmployee<User>");
    const [notifications, setNotifications] = useState([]);
    const [pendingTransfers, setPendingTransfers] = useState([]);

    const quickActions = [
        { label: "New Sale", route: "/sales/new", icon: <FaReceipt /> },
        { label: "New Inventory Item", route: "/inventory/new", icon: <FaBoxOpen /> },
        { label: "New Recipe", route: "/recipes/new", icon: <FaUtensils /> },
    ];

    // Fetch latest notifications for current user (up to 5)
    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications/latest?pageSize=5", { credentials: "include" });
            if (!res.ok) {
                setNotifications([]);
                return;
            }

            const items = await res.json();
            const rows = (items || []).map((n) => {
                // Notification model: CreatedAt, Message, Subject
                const ts = n.createdAt ?? n.CreatedAt ?? null;
                const timestamp = ts ? new Date(ts).toLocaleString() : "";
                const message = n.message ?? n.Message ?? n.subject ?? n.Subject ?? "";
                return [timestamp, message];
            });

            setNotifications(rows);
        } catch (err) {
            console.error("Failed to load notifications", err);
            setNotifications([]);
        }
    };

    // Fetch pending inventory transfers for current store (show up to 5 latest with status 'Pending')
    const fetchPendingTransfers = async () => {
        try {
            const res = await fetch("/api/inventorytransfers/latest-for-current-store?pageSize=5", { credentials: "include" });
            if (!res.ok) {
                setPendingTransfers([]);
                return;
            }

            const items = await res.json();

            // Filter to pending status (case-insensitive), take top 5
            const pending = (items || [])
                .filter(t => (t.status ?? "").toString().toLowerCase() === "pending")
                .slice(0, 5);

            const rows = pending.map((t) => [
                t.requester ?? "System",
                t.fromStore ?? "",
                t.status ?? "",
                t.requestedAt ? new Date(t.requestedAt).toLocaleString() : ""
            ]);

            setPendingTransfers(rows);
        } catch (err) {
            console.error("Failed to load pending transfers", err);
            setPendingTransfers([]);
        }
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
                emptyMessage="No notifications yet."
            />

            {/* Pending Inventory Movements Table */}
            <HomePageTable
                title="Pending Inventory Movements"
                columns={["Requester", "Requested From", "Status", "Transfer Date"]}
                rows={pendingTransfers}
                emptyMessage="No pending inventory movements."
            />
        </div>
    );
};

export default StoreEmployeeHomePage;