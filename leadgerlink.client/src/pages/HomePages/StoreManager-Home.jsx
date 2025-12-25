import React, { useEffect, useState } from "react";
import { useAuth } from "../../Context/AuthContext";
import WelcomeMessage from "../../components/homepages/WelcomeMessage";
import CardSection from "../../components/homepages/HomePageCardSection";
import HomePageTable from "../../components/homepages/HomePageTable";

const StoreManagerHomePage = () => {
    const { loggedInUser } = useAuth();
    const [username, setUsername] = useState("BM<User>");
    const [storeOverviewCards, setStoreOverviewCards] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [inventoryMovements, setInventoryMovements] = useState([]);

    // Fetch store overview metrics (current month sales from server, notifications for current user)
    const fetchStoreOverview = async () => {
        try {
            let salesLabel = "BHD 0.000";
            let bestRecipeLabel = "-";
            let lowStockCount = 0;

            // backend will resolve store from authenticated user
            const [salesRes, bestRes, lowStockRes] = await Promise.all([
                fetch("/api/sales/current-store-month", { credentials: "include" }),
                fetch("/api/sales/best-for-current-store", { credentials: "include" }),
                fetch("/api/inventoryitems/lowstock/current-store/count", { credentials: "include" })
            ]);

            if (salesRes.ok) {
                const total = await salesRes.json();
                salesLabel = `BHD ${Number(total ?? 0).toFixed(3)}`;
            }

            if (bestRes.ok) {
                const best = await bestRes.json();
                if (best && best.recipeName) bestRecipeLabel = best.recipeName;
            }

            if (lowStockRes.ok) {
                // API may return { count: X } or a raw number — handle both.
                try {
                    const lowJson = await lowStockRes.json();
                    if (lowJson == null) {
                        lowStockCount = 0;
                    } else if (typeof lowJson === "number") {
                        lowStockCount = lowJson;
                    } else if (typeof lowJson === "object") {
                        // common shapes: { count: X } or { totalCount: X }
                        lowStockCount = Number(lowJson.count ?? lowJson.value ?? 0) || 0;
                    } else {
                        lowStockCount = Number(lowJson) || 0;
                    }
                } catch {
                    lowStockCount = 0;
                }
            }

            // set cards
            setStoreOverviewCards([
                { title: "Current Month Sales", value: salesLabel },
                { title: "Best Selling Recipe", value: bestRecipeLabel },
                { title: "Low Stock Items", value: lowStockCount },
            ]);
        } catch (err) {
            console.error("Failed to load store overview", err);
            setStoreOverviewCards([
                { title: "Current Month Sales", value: "BHD 0.000" },
                { title: "Best Selling Recipe", value: "-" },
                { title: "Low Stock Items", value: 0 },
            ]);
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

    // fetch inventory movement overview for current store (up to 5)
    const fetchInventoryMovements = async () => {
        try {
            const res = await fetch("/api/inventorytransfers/latest-for-current-store?pageSize=5", { credentials: "include" });
            if (!res.ok) {
                setInventoryMovements([]);
                return;
            }

            const items = await res.json();
            const rows = (items || []).map((t) => [
                t.requester ?? "System",
                t.fromStore ?? "",
                t.status ?? "",
                t.requestedAt ? new Date(t.requestedAt).toLocaleString() : ""
            ]);
            setInventoryMovements(rows);
        } catch (err) {
            console.error("Failed to load inventory movements", err);
            setInventoryMovements([]);
        }
    };

    useEffect(() => {
        setUsername(loggedInUser?.fullName ?? loggedInUser?.userName ?? "BM<User>");
        fetchStoreOverview();
        fetchNotifications();
        fetchInventoryMovements();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedInUser]);

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
                emptyMessage="No notifications yet."
            />

            {/* Inventory Movements Table */}
            <HomePageTable
                title="Store Inventory Movements"
                columns={["Requester", "Requested From", "Status", "Transfer Date"]}
                rows={inventoryMovements}
                emptyMessage="No inventory movements."
            />
        </div>
    );
};

export default StoreManagerHomePage;