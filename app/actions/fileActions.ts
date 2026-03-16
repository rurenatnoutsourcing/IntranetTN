"use server"

import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

export async function saveFile(file: File, folder: string) {
  if (!file) return null

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const extension = file.name.split(".").pop()
  const fileName = `${uuidv4()}.${extension}`
  
  const uploadDir = join(process.cwd(), "public", "uploads", folder)
  
  // Ensure directory exists
  try {
    await mkdir(uploadDir, { recursive: true })
  } catch (e) {}

  const filePath = join(uploadDir, fileName)
  await writeFile(filePath, buffer)
  
  return `/uploads/${folder}/${fileName}`
}
