"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export type RequestType = "VACATION" | "PERMISSION" | "EARLY_LEAVE"
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED"

export async function createTimeOffRequest(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    throw new Error("No autenticado")
  }

  const userId = (session.user as any).id
  if (!userId) throw new Error("ID de usuario no encontrado")

  const type = formData.get("type") as RequestType || "VACATION"
  const startDateStr = formData.get("startDate") as string
  const endDateStr = formData.get("endDate") as string
  const leaveTime = formData.get("leaveTime") as string // Para salida temprana

  let startDate = new Date(startDateStr)
  let endDate = new Date(endDateStr)

  if (type === "EARLY_LEAVE" && leaveTime) {
    // Si es salida temprana, usamos la fecha de inicio y le añadimos la hora
    const [hours, minutes] = leaveTime.split(":")
    startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    // Para salida temprana, el fin es el mismo momento
    endDate = new Date(startDate)
  }

  const reason = formData.get("reason") as string

  try {
    const request = await prisma.timeOffRequest.create({
      data: {
        userId,
        type,
        startDate,
        endDate,
        reason,
        status: "PENDING",
      },
    })

    revalidatePath("/vacations")
    return { success: true, id: request.id }
  } catch (error) {
    console.error("Error creating request:", error)
    return { success: false, error: "Error al crear la solicitud" }
  }
}

export async function getMyRequests() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return []

  const userId = (session.user as any).id
  
  return await prisma.timeOffRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
}

export async function getPendingRequests() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) throw new Error("No autorizado")

  const user = session.user as any
  const role = user.role

  // RRHH y TECHNOLOGY (Administrativos) ven todo
  if (role === "HR" || role === "TECHNOLOGY" || role === "MANAGER") {
    return await prisma.timeOffRequest.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            project: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    })
  }

  // Supervisores ven solo su proyecto
  if (role === "SUPERVISOR") {
    // Buscar proyectos que este usuario supervisa
    const supervisedProjects = await prisma.project.findMany({
      where: { supervisorId: user.id },
      select: { id: true }
    })
    
    const projectIds = supervisedProjects.map(p => p.id)

    return await prisma.timeOffRequest.findMany({
      where: {
        status: "PENDING",
        user: {
          projectId: { in: projectIds }
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            project: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    })
  }

  return []
}

export async function updateRequestStatus(requestId: string, status: RequestStatus, note?: string) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) throw new Error("No autorizado")

  const user = session.user as any
  
  // En una implementación real, verificaríamos permisos específicos antes de actualizar
  // Aquí permitiremos que cualquier rol no-USER pueda actualizar (simplificado)
  if (user.role === "USER") throw new Error("No tienes permisos")

  try {
    await prisma.timeOffRequest.update({
      where: { id: requestId },
      data: {
        status,
        supervisorNote: note,
        updatedAt: new Date(),
      },
    })

    revalidatePath("/dashboard")
    revalidatePath("/vacations")
    return { success: true }
  } catch (error) {
    console.error("Error updating request:", error)
    return { success: false, error: "Error al actualizar la solicitud" }
  }
}
