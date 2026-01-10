// BEFORE optimization (slow)
db.tickets.find({
  description: { $regex: "refund", $options: "i" }
});