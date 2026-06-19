import { db } from '../src/lib/db'

async function main() {
  const result = await db.attendanceRecord.deleteMany({})
  console.log(`Deleted ${result.count} attendance records`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
