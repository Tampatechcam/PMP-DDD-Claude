import { redirect } from 'next/navigation'

export default function ClientHome() {
  // Home = orders list. Bounce so the URL never lingers as /.
  redirect('/orders')
}
