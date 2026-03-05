import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'
import config from '@payload-config'
import { SidebarClient } from './SidebarClient'
import '../styles.css'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  if (!user) redirect('/login')

  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase()

  return (
    <div className="dashboard">
      <SidebarClient
        userEmail={user.email || ''}
        userName={user.name as string | undefined}
        userInitials={initials}
      />
      <div className="dashboard-main">
        {children}
      </div>
    </div>
  )
}
