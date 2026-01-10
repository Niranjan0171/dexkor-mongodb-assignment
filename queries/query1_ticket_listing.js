// BEFORE optimization
db.tickets.find({
  tenantId: "tenant_1",
  status: "open",
  createdAt: { $gte: ISODate("2024-01-01") }
})
.sort({ createdAt: -1 })
.limit(20);

// AFTER optimization (same query, index applied)