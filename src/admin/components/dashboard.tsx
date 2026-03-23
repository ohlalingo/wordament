import React, { useEffect, useState } from "react"
import { ApiClient, useNotice } from "adminjs"

const api = new ApiClient()

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const addNotice = useNotice()

  useEffect(() => {
    api.getDashboard()
      .then((res) => setData(res.data))
      .catch(() => addNotice({ message: "Failed to load stats", type: "error" }))
  }, [])

  const statCard = (label: string, value: any) => (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "20px 24px",
        minWidth: 220,
        minHeight: 96,
        background: "#fff",
        boxShadow: "0 8px 18px rgba(17,24,39,0.06)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "#d60000", lineHeight: 1.1 }}>{value ?? "—"}</div>
    </div>
  )

  const last = data?.lastAttempt

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: "#111827" }}>Welcome to CyberWordament Warehouse</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>Live ops snapshot for puzzles and players.</p>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          marginBottom: 24,
        }}
      >
        {statCard("Attempts today", data?.counts?.attempts_today)}
        {statCard("Attempts this week", data?.counts?.attempts_week)}
        {statCard("Attempts all time", data?.counts?.attempts_all)}
        {statCard("Active users", data?.users?.active_users)}
        {statCard("Total users", data?.users?.total_users)}
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "20px 24px",
          minWidth: 220,
          minHeight: 96,
          background: "#fff",
          boxShadow: "0 8px 18px rgba(17,24,39,0.06)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>
          Last attempt
        </div>
        {last ? (
          <>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#d60000", lineHeight: 1.1 }}>
              {last.name || "Unknown"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
              {last.region ? `Region: ${last.region}` : "Region: —"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              {last.created_at ? `When: ${new Date(last.created_at).toLocaleString()}` : "When: —"}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#6b7280" }}>No attempts yet.</div>
        )}
      </div>
    </div>
  )
}
