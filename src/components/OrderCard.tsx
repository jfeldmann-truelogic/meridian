import React from "react";
import { OrderSummary } from "../types";

interface OrderCardProps {
  order: OrderSummary;
  onRunCheck: (order: OrderSummary) => void;
  checkLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "#f3f4f6",
  processing: "#dbeafe",
  shipped:    "#fef9c3",
  delivered:  "#dcfce7",
  cancelled:  "#fee2e2",
};

export function OrderCard({ order, onRunCheck, checkLoading }: OrderCardProps) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{order.orderId}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            Customer: {order.customerId}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <span
            style={{
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: 12,
              background: STATUS_COLORS[order.status] ?? "#f3f4f6",
              textTransform: "capitalize",
            }}
          >
            {order.status}
          </span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            ${order.totalUsd.toFixed(2)}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {order.items.map((item) => (
          <span
            key={item.sku}
            style={{
              fontSize: 11,
              padding: "2px 8px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 4,
              color: "#374151",
            }}
          >
            {item.sku} × {item.quantity}
          </span>
        ))}
      </div>

      <button
        onClick={() => onRunCheck(order)}
        disabled={checkLoading}
        style={{
          marginTop: 12,
          padding: "7px 16px",
          fontSize: 13,
          fontWeight: 500,
          background: checkLoading ? "#e5e7eb" : "#1d4ed8",
          color: checkLoading ? "#9ca3af" : "#fff",
          border: "none",
          borderRadius: 6,
          cursor: checkLoading ? "not-allowed" : "pointer",
        }}
      >
        {checkLoading ? "Running…" : "Run Compliance Check"}
      </button>
    </div>
  );
}
