// SLA escalation (time-based queries)
db.tickets.createIndex({
  createdAt: 1
});
