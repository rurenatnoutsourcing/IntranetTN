import { getServerSession } from "next-auth/next"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { getGroups, getAllUsersForGroups } from "@/app/actions/groupActions"
import { GroupManager } from "@/app/components/Admin/GroupManager"
import { Users } from "lucide-react"

export default async function AdminGroupsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/")

  const user = session.user as any
  if (user.role !== "TECHNOLOGY") redirect("/")

  const [groups, allUsers] = await Promise.all([getGroups(), getAllUsersForGroups()])

  return (
    <div className="container" style={{ padding: "2rem 1.5rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ padding: "0.6rem", borderRadius: "0.75rem", backgroundColor: "hsl(var(--primary)/0.15)" }}>
            <Users size={24} style={{ color: "hsl(var(--primary))" }} />
          </div>
          <h1 style={{ margin: 0, fontSize: "2rem" }}>Gestión de Grupos</h1>
        </div>
        <p style={{ color: "hsl(var(--muted-foreground))", margin: 0 }}>
          Crea grupos de trabajo y asigna supervisores y miembros.
          <span style={{ marginLeft: "0.5rem", padding: "0.15rem 0.5rem", borderRadius: "0.3rem", backgroundColor: "hsl(25 90% 55% / 0.1)", color: "hsl(25 90% 55%)", fontSize: "0.8rem", fontWeight: 700 }}>Solo Tecnología</span>
        </p>
      </header>

      <GroupManager groups={groups} allUsers={allUsers} />
    </div>
  )
}
