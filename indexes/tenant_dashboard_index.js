// Open tickets dashboard (tenant-wise)
db.tickets.createIndex({
  tenantId: 1,
  status: 1,
  createdAt: -1
});
