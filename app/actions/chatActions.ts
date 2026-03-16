"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getConversations() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return []

  const userId = (session.user as any).id

  return await prisma.conversation.findMany({
    where: {
      OR: [
        { user1Id: userId },
        { user2Id: userId }
      ]
    },
    include: {
      user1: { select: { id: true, name: true, image: true, role: true } },
      user2: { select: { id: true, name: true, image: true, role: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  })
}

export async function getChatMessages(conversationId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return []

  return await prisma.chatMessage.findMany({
    where: { conversationId },
    include: {
      author: {
        select: { id: true, name: true, image: true }
      }
    },
    orderBy: { createdAt: "asc" }
  })
}

export async function sendMessage(conversationId: string, content: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("No autorizado")

  const userId = (session.user as any).id

  try {
    const message = await prisma.chatMessage.create({
      data: {
        content,
        authorId: userId,
        conversationId
      }
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })

    return { success: true, message }
  } catch (error) {
    console.error(error)
    return { success: false }
  }
}

export async function getAvailableContacts() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return []

  const currentUserId = (session.user as any).id

  // 1. Get all Supervisors and Managers (added by default)
  const autoContacts = await prisma.user.findMany({
    where: {
      OR: [
        { role: "SUPERVISOR" },
        { role: "MANAGER" },
        { role: "TECHNOLOGY" }
      ],
      NOT: { id: currentUserId }
    },
    select: { id: true, name: true, image: true, role: true }
  })

  // 2. Get manually added contacts
  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
    include: {
      contacts: {
        select: { id: true, name: true, image: true, role: true }
      }
    }
  })

  const manualContacts = user?.contacts || []

  // Combine and remove duplicates
  const allContacts = [...autoContacts, ...manualContacts]
  const uniqueContacts = Array.from(new Map(allContacts.map(c => [c.id, c])).values())

  return uniqueContacts
}

export async function startConversation(targetUserId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("No autorizado")

  const currentUserId = (session.user as any).id
  const [u1, u2] = [currentUserId, targetUserId].sort()

  console.log("Starting conversation between:", { u1, u2, currentUserId, targetUserId })

  try {
    const conversation = await prisma.conversation.upsert({
      where: {
        user1Id_user2Id: {
          user1Id: u1,
          user2Id: u2
        }
      },
      update: {},
      create: {
        user1Id: u1,
        user2Id: u2
      }
    })

    return conversation
  } catch (error) {
    console.error(error)
    throw new Error("No se pudo iniciar la conversación")
  }
}

export async function searchUsers(query: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return []

  return await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { email: { contains: query } }
      ],
      NOT: { id: (session.user as any).id }
    },
    select: { id: true, name: true, image: true, role: true },
    take: 10
  })
}

export async function addContact(contactId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return

  const userId = (session.user as any).id

  await prisma.user.update({
    where: { id: userId },
    data: {
      contacts: {
        connect: { id: contactId }
      }
    }
  })
}
