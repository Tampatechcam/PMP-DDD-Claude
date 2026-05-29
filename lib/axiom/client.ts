'use client'

import axiomClient, { isAxiomConfigured } from '@/lib/axiom/axiom'
import { Logger, AxiomJSTransport, ConsoleTransport, type Transport } from '@axiomhq/logging'
import { createUseLogger, createWebVitalsComponent } from '@axiomhq/react'
import { nextJsFormatters } from '@axiomhq/nextjs/client'

const dataset = process.env.NEXT_PUBLIC_AXIOM_DATASET

const transports: [Transport, ...Transport[]] =
  isAxiomConfigured() && axiomClient && dataset
    ? [new AxiomJSTransport({ axiom: axiomClient, dataset })]
    : [new ConsoleTransport()]

export const logger = new Logger({
  transports,
  formatters: nextJsFormatters
})

export const useLogger = createUseLogger(logger)
export const WebVitals = createWebVitalsComponent(logger)
