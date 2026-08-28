import fs from "fs";
import mongoose from "mongoose";
const env = fs.readFileSync("C:/Projects/bijbelstudie/.env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
const users = await mongoose.connection.db.collection("users")
  .find({}, { projection: { email: 1, isAdmin: 1, subscribed: 1, storePremium: 1 } }).toArray();
console.log(users.map(u => `${u.email} isAdmin=${u.isAdmin} subscribed=${u.subscribed} store=${u.storePremium}`).join("\n"));
console.log("ADMIN_EMAILS env =", JSON.stringify(process.env.ADMIN_EMAILS ?? null));
await mongoose.disconnect();
