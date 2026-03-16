"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

async function assertTechnology() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "TECHNOLOGY") {
    throw new Error("Acceso denegado. Solo Tecnología puede gestionar grupos.")
  }
  return session
}

export async function getGroups() {
  await assertTechnology()
  return await prisma.project.findMany({
    include: {
      supervisor: { select: { id: true, name: true, email: true, role: true, image: true } },
      members: { select: { id: true, name: true, email: true, role: true, image: true } }
    },
    orderBy: { createdAt: "desc" }
  })
}

export async function createGroup(formData: FormData) {
  await assertTechnology()

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const supervisorId = formData.get("supervisorId") as string

  if (!name?.trim()) return { error: "El nombre del grupo es obligatorio." }
  if (!supervisorId) return { error: "Debes asignar un supervisor al grupo." }

  try {
    await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        supervisorId,
      }
    })
    revalidatePath("/admin/groups")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "Error al crear el grupo." }
  }
}

export async function updateGroup(groupId: string, formData: FormData) {
  await assertTechnology()

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const supervisorId = formData.get("supervisorId") as string

  try {
    await prisma.project.update({
      where: { id: groupId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        description: description?.trim() || null,
        ...(supervisorId ? { supervisorId } : {})
      }
    })
    revalidatePath("/admin/groups")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "Error al actualizar el grupo." }
  }
}

export async function deleteGroup(groupId: string) {
  await assertTechnology()
  try {
    // Remove all members first (set projectId to null)
    await prisma.user.updateMany({
      where: { projectId: groupId },
      data: { projectId: null }
    })
    await prisma.project.delete({ where: { id: groupId } })
    revalidatePath("/admin/groups")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "Error al eliminar el grupo." }
  }
}

export async function addMemberToGroup(groupId: string, userId: string) {
  await assertTechnology()
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { projectId: groupId }
    })
    revalidatePath("/admin/groups")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "Error al agregar el miembro." }
  }
}

export async function removeMemberFromGroup(userId: string) {
  await assertTechnology()
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { projectId: null }
    })
    revalidatePath("/admin/groups")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "Error al remover el miembro." }
  }
}

export async function getAllUsersForGroups() {
  await assertTechnology()
  return await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, image: true, projectId: true },
    orderBy: { name: "asc" }
  })
}
