"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { saveFile } from "./fileActions"

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !(session.user as any).id) {
    throw new Error("No autenticado")
  }

  const name = formData.get("name") as string
  const imageFile = formData.get("image") as File
  const userId = (session.user as any).id

  if (!name || name.trim().length === 0) return { error: "El nombre no puede estar vacío" }

  try {
    let imageUrl = null
    if (imageFile && imageFile.size > 0) {
      imageUrl = await saveFile(imageFile, "profiles")
    }

    await prisma.user.update({
      where: { id: userId },
      data: { 
        name: name.trim(),
        ...(imageUrl ? { image: imageUrl } : {})
      }
    })

    revalidatePath("/profile")
    revalidatePath("/directory")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error updating profile:", error)
    return { error: "Hubo un error al actualizar tu perfil." }
  }
}

export async function getAllUsers() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "TECHNOLOGY") {
    throw new Error("Acceso denegado")
  }

  return await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, image: true },
    orderBy: { name: "asc" }
  })
}

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "TECHNOLOGY") {
    return { error: "Acceso denegado. Solo Tecnología puede crear usuarios." }
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const role = formData.get("role") as string

  if (!name?.trim() || !email?.trim()) return { error: "Nombre y correo son obligatorios." }
  if (!email.endsWith("@telecomnetworks.org")) return { error: "El correo debe ser @telecomnetworks.org" }

  const validRoles = ["USER", "SUPERVISOR", "MANAGER", "HR", "TECHNOLOGY"]
  if (!validRoles.includes(role)) return { error: "Rol inválido." }

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (existing) return { error: "Ya existe un usuario con ese correo." }

    await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
      }
    })

    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Error creating user:", error)
    return { error: "Error al crear el usuario." }
  }
}

export async function updateUserAdmin(userId: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "TECHNOLOGY") {
    return { error: "Acceso denegado. Solo Tecnología puede gestionar usuarios." }
  }

  const email = formData.get("email") as string
  const role = formData.get("role") as string
  const name = formData.get("name") as string

  const validRoles = ["USER", "SUPERVISOR", "TECHNOLOGY", "HR", "MANAGER"]
  if (role && !validRoles.includes(role)) {
    return { error: "Rol inválido." }
  }

  try {
    // Check email uniqueness if being changed
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing && existing.id !== userId) {
        return { error: "Ese correo ya está en uso por otro usuario." }
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(email ? { email: email.trim().toLowerCase() } : {}),
        ...(role ? { role } : {})
      }
    })

    revalidatePath("/admin/users")
    revalidatePath("/directory")
    return { success: true }
  } catch (error) {
    console.error("Error updating user:", error)
    return { error: "Error al actualizar el usuario." }
  }
}

export async function deleteUser(userId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "TECHNOLOGY") {
    return { error: "Acceso denegado." }
  }

  // Prevent self-deletion
  if (userId === (session.user as any).id) {
    return { error: "No puedes eliminar tu propia cuenta." }
  }

  try {
    await prisma.user.delete({ where: { id: userId } })
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { error: "Error al eliminar el usuario." }
  }
}
