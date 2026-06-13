import axiomClient, { isAxiomConfigured } from '@/lib/axiom/axiom'
import { Logger, AxiomJSTransport, ConsoleTransport, type Transport } from '@axiomhq/logging'
import { createAxiomRouteHandler, nextJsFormatters } from '@axiomhq/nextjs'

const dataset = process.env.NEXT_PUBLIC_AXIOM_DATASET

const transports: [Transport, ...Transport[]] =
  isAxiomConfigured() && axiomClient && dataset
    ? [new AxiomJSTransport({ axiom: axiomClient, dataset })]
    : [new ConsoleTransport()]

/** Server-side logger for lib/db/*, Server Actions, and route handlers. */
export const logger = new Logger({
  transports,
  formatters: nextJsFormatters
})

export const withAxiom = createAxiomRouteHandler(logger)
