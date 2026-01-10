// Agent workload view
db.tickets.createIndex({
  agentId: 1,
  status: 1
});
