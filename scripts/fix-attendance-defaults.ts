import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fetching classrooms...')
  const classrooms = await prisma.classroom.findMany()
  const classroomMap = new Map(classrooms.map(c => [c.id, c]))

  console.log('Fetching attendance records...')
  const records = await prisma.attendanceRecord.findMany()

  let updatedCount = 0

  for (const record of records) {
    const classroom = classroomMap.get(record.classroomId)
    if (!classroom) continue

    if (record.totalMale !== classroom.defaultMale || record.totalFemale !== classroom.defaultFemale) {
      console.log(`Fixing record ${record.id} for date ${record.date}, classroom ${classroom.code}: Male ${record.totalMale} -> ${classroom.defaultMale}, Female ${record.totalFemale} -> ${classroom.defaultFemale}`)
      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          totalMale: classroom.defaultMale,
          totalFemale: classroom.defaultFemale
        }
      })
      updatedCount++
    }
  }

  console.log(`Updated ${updatedCount} records.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
