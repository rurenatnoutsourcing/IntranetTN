"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createPost(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !(session.user as any).id) {
    throw new Error("No autenticado")
  }

  const content = formData.get("content") as string
  if (!content || content.trim().length === 0) return { error: "El contenido no puede estar vacío" }

  await prisma.post.create({
    data: {
      content: content.trim(),
      authorId: (session.user as any).id,
    }
  })

  revalidatePath("/")
  return { success: true }
}

export async function toggleLike(postId: string) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !(session.user as any).id) {
    throw new Error("No autenticado")
  }

  const userId = (session.user as any).id

  const existingLike = await prisma.like.findUnique({
    where: {
      authorId_postId: {
        authorId: userId,
        postId: postId
      }
    }
  })

  if (existingLike) {
    await prisma.like.delete({ where: { id: existingLike.id } })
  } else {
    await prisma.like.create({
      data: {
        authorId: userId,
        postId: postId
      }
    })
  }

  revalidatePath("/")
  return { success: true }
}

export async function addComment(postId: string, content: string) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !(session.user as any).id) {
    throw new Error("No autenticado")
  }

  if (!content || content.trim().length === 0) return { error: "El comentario no puede estar vacío" }

  await prisma.comment.create({
    data: {
      content: content.trim(),
      postId: postId,
      authorId: (session.user as any).id
    }
  })

  revalidatePath("/")
  return { success: true }
}
