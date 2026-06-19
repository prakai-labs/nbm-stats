// Seed default classrooms for โรงเรียนบ้านหนองบัวโนนเมือง
import { db } from '../src/lib/db'

async function main() {
  const classrooms = [
    { code: 'อ.1', name: 'อนุบาลปีที่ 1', level: 'อนุบาล', sortOrder: 1 },
    { code: 'อ.2', name: 'อนุบาลปีที่ 2', level: 'อนุบาล', sortOrder: 2 },
    { code: 'อ.3', name: 'อนุบาลปีที่ 3', level: 'อนุบาล', sortOrder: 3 },
    { code: 'ป.1', name: 'ประถมศึกษาปีที่ 1', level: 'ประถม', sortOrder: 4 },
    { code: 'ป.2', name: 'ประถมศึกษาปีที่ 2', level: 'ประถม', sortOrder: 5 },
    { code: 'ป.3', name: 'ประถมศึกษาปีที่ 3', level: 'ประถม', sortOrder: 6 },
    { code: 'ป.4', name: 'ประถมศึกษาปีที่ 4', level: 'ประถม', sortOrder: 7 },
    { code: 'ป.5', name: 'ประถมศึกษาปีที่ 5', level: 'ประถม', sortOrder: 8 },
    { code: 'ป.6', name: 'ประถมศึกษาปีที่ 6', level: 'ประถม', sortOrder: 9 },
    { code: 'ม.1', name: 'มัธยมศึกษาปีที่ 1', level: 'มัธยมต้น', sortOrder: 10 },
    { code: 'ม.2', name: 'มัธยมศึกษาปีที่ 2', level: 'มัธยมต้น', sortOrder: 11 },
    { code: 'ม.3', name: 'มัธยมศึกษาปีที่ 3', level: 'มัธยมต้น', sortOrder: 12 },
  ]

  for (const c of classrooms) {
    await db.classroom.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    })
  }

  const count = await db.classroom.count()
  console.log(`Seeded ${count} classrooms`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
