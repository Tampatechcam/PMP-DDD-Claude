import { Axiom } from '@axiomhq/js'

const token = process.env.NEXT_PUBLIC_AXIOM_TOKEN

/** Shared Axiom client — token is provisioned by the Vercel Marketplace integration. */
const axiomClient = token ? new Axiom({ token }) : null

export default axiomClient

export function isAxiomConfigured(): boolean {
  return Boolean(token && process.env.NEXT_PUBLIC_AXIOM_DATASET)
}
