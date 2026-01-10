// AFTER optimization (fast & scalable)
db.tickets.find(
  { $text: { $search: "refund delayed response" } },
  { score: { $meta: "textScore" } }
)
.sort({ score: { $meta: "textScore" } });