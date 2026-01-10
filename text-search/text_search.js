// Native MongoDB text search
db.tickets.find(
  { $text: { $search: "refund delayed response" } },
  { score: { $meta: "textScore" } }
)
.sort({ score: { $meta: "textScore" } });

//output same as query2_after.json