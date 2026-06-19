import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface OnlineUser {
  id: string        // socket id
  name: string      // คุณครูผู้บันทึก
  joinedAt: number
}

interface EditingSlot {
  userId: string
  userName: string
  date: string
  classroomId: string
  startedAt: number
}

const users = new Map<string, OnlineUser>()
const editingSlots = new Map<string, EditingSlot>() // key = `${date}::${classroomId}`

const slotKey = (date: string, classroomId: string) => `${date}::${classroomId}`

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`)

  socket.on('user:join', (data: { name: string }) => {
    const user: OnlineUser = {
      id: socket.id,
      name: data.name?.trim() || 'คุณครู',
      joinedAt: Date.now(),
    }
    users.set(socket.id, user)

    // ส่งรายชื่อผู้ใช้ออนไลน์ปัจจุบันให้ผู้เข้าใหม่
    socket.emit('users:list', { users: Array.from(users.values()) })
    // ส่งสถานะการแก้ไขปัจจุบันให้ผู้เข้าใหม่
    socket.emit('editing:list', { slots: Array.from(editingSlots.values()) })

    // แจ้งคนอื่นว่ามีผู้ใช้ใหม่เข้ามา
    socket.broadcast.emit('users:joined', { user })
    console.log(`[socket] ${user.name} joined. Online: ${users.size}`)
  })

  // เริ่มแก้ไขห้องเรียนวันที่หนึ่ง (ส่งสัญญาณว่ากำลังพิมพ์)
  socket.on('editing:start', (data: { date: string; classroomId: string }) => {
    const user = users.get(socket.id)
    if (!user) return
    const key = slotKey(data.date, data.classroomId)
    const existing = editingSlots.get(key)
    if (existing && existing.userId !== socket.id) {
      // มีคนอื่นกำลังแก้อยู่ ปฏิเสธ
      socket.emit('editing:rejected', { slot: existing })
      return
    }
    editingSlots.set(key, {
      userId: socket.id,
      userName: user.name,
      date: data.date,
      classroomId: data.classroomId,
      startedAt: Date.now(),
    })
    io.emit('editing:started', { slot: editingSlots.get(key) })
  })

  socket.on('editing:stop', (data: { date: string; classroomId: string }) => {
    const key = slotKey(data.date, data.classroomId)
    const slot = editingSlots.get(key)
    if (slot && slot.userId === socket.id) {
      editingSlots.delete(key)
      io.emit('editing:stopped', { date: data.date, classroomId: data.classroomId })
    }
  })

  // มีการบันทึกข้อมูล ให้ broadcast ไปทุก client ให้ดึงข้อมูลใหม่
  socket.on('attendance:saved', (data: { date: string; classroomId: string }) => {
    const user = users.get(socket.id)
    io.emit('attendance:updated', {
      date: data.date,
      classroomId: data.classroomId,
      by: user?.name ?? 'unknown',
      at: Date.now(),
    })
    // ปลดล็อกการแก้ไข
    const key = slotKey(data.date, data.classroomId)
    if (editingSlots.get(key)?.userId === socket.id) {
      editingSlots.delete(key)
      io.emit('editing:stopped', { date: data.date, classroomId: data.classroomId })
    }
  })

  socket.on('attendance:deleted', (data: { date: string; classroomId: string }) => {
    const user = users.get(socket.id)
    io.emit('attendance:updated', {
      date: data.date,
      classroomId: data.classroomId,
      by: user?.name ?? 'unknown',
      at: Date.now(),
    })
  })

  socket.on('disconnect', () => {
    const user = users.get(socket.id)
    if (user) {
      users.delete(socket.id)
      // ลบการแก้ไขที่ user นี้ครองไว้ทั้งหมด
      for (const [key, slot] of editingSlots.entries()) {
        if (slot.userId === socket.id) {
          editingSlots.delete(key)
          io.emit('editing:stopped', { date: slot.date, classroomId: slot.classroomId })
        }
      }
      socket.broadcast.emit('users:left', { user })
      console.log(`[socket] ${user.name} left. Online: ${users.size}`)
    }
  })

  socket.on('error', (error) => {
    console.error(`[socket] error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[attendance-sync] WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
