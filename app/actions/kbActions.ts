"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { saveFile } from "./fileActions"

export async function getDocuments() {
  return await prisma.document.findMany({
    include: {
      author: {
        select: { name: true }
      }
    },
    orderBy: { createdAt: "desc" }
  })
}

export async function uploadDocument(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("No autorizado")

  const user = session.user as any
  // Solo Supervisores y Tecnología pueden subir
  if (user.role !== "SUPERVISOR" && user.role !== "TECHNOLOGY") {
    throw new Error("No tienes permisos para subir documentos")
  }

  const title = formData.get("title") as string
  const file = formData.get("file") as File
  const category = formData.get("category") as string || "GENERAL"

  try {
    const fileUrl = await saveFile(file, "documents")

    await prisma.document.create({
      data: {
        title,
        url: fileUrl!,
        category,
        authorId: user.id
      }
    })
    revalidatePath("/knowledge-base")
    return { success: true }
  } catch (error) {
    console.error("Error uploading document:", error)
    return { success: false, error: "Error al guardar el documento" }
  }
}

export async function deleteDocument(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("No autorizado")

  const user = session.user as any
  if (user.role !== "TECHNOLOGY") {
    throw new Error("Solo personal de Tecnología puede eliminar documentos")
  }

  try {
    await prisma.document.delete({ where: { id } })
    revalidatePath("/knowledge-base")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Error al eliminar" }
  }
}
