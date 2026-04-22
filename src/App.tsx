import React, { useState, useEffect } from "react";
import { OrderCard } from "./components/OrderCard";
import { CompliancePanel } from "./components/CompliancePanel";
import { useAgentCheck } from "./hooks/useAgentCheck";
import { getAxonHealth } from "./services/axonClient";
import { OrderSummary } from "./types";

// Static fixture data simulating a customer's order queue
const MOCK_ORDERS: OrderSummary[] = [
  {
    orderId: "ORD-20240891",
    customerId: "CUST-4412",
    status: "processing",
    totalUsd: 4820.00,
    createdAt: "2024-07-14T09:23:00Z",
    items: [
      { sku: "INDUST-VALVE-6IN", quantity: 4, unitPriceUsd: 980.00, description: "6-inch industrial valve" },
      { sku: "SEAL-KIT-STD",      quantity: 8, unitPriceUsd: 85.00,  description: "Standard seal kit" },
    ],
  },
  {
    orderId: "ORD-20240904",
    customerId: "CUST-0089",
    status: "pending",
    totalUsd: 1250.50,
    createdAt: "2024-07-15T14:05:00Z",
    items: [
      { sku: "PUMP-CTRL-240V", quantity: 1, unitPriceUsd: 1250.50, description: "240V pump controller" },
    ],
  },
];

export default function App() {
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [platformOk, setPlatformOk] = useState<boolean | null>(null);
  const { loading, result, error, triggerCheck } = useAgentCheck();

  useEffect(() => {
    getAxonHealth().then(({ ok }) => setPlatformOk(ok));
  }, []);

  function handleRunCheck(order: OrderSummary) {
    setSelectedOrder(order);
    triggerCheck(order);
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 860, margin: "0 auto", padding: 24 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          paddingBottom: 16,
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>
            Meridian Operations Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
            Order compliance review · Powered by Axon AI Platform
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              display: "inline-block",
              background:
                platformOk === null ? "#d1d5db" : platformOk ? "#22c55e" : "#ef4444",
            }}
          />
          <span style={{ color: "#6b7280" }}>
            {platformOk === null ? "Checking Axon…" : platformOk ? "Axon connected" : "Axon unreachable"}
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Order list */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Pending Review
          </h2>
          {MOCK_ORDERS.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              onRunCheck={handleRunCheck}
              checkLoading={loading && selectedOrder?.orderId === order.orderId}
            />
          ))}
        </div>

        {/* Compliance panel */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Agent Check Result
          </h2>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", minHeight: 180 }}>
            <CompliancePanel result={result} loading={loading} error={error} />
          </div>

          {selectedOrder && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
              Last checked: {selectedOrder.orderId}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
