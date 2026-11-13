// GET /v1/connect (spec B5 «El kit de conexión»): the ways to connect each agent to this installation.
// Any key may ask: the kit holds addresses and placeholders, never a secret.
import { invalid } from '../../core/errors.ts'
import { inBrain } from '../../domain/context.ts'
import { installation } from '../../domain/installation.ts'
import { AGENT_IDS, type AgentId, connectKit } from '../../mcp/kit.ts'
import { type Route, route } from '../router.ts'
import { ctxOf } from './brains.ts'

export const connectRoutes: Route[] = [
  route('GET /v1/connect', async (r) => {
    const agent = r.query.get('agent') || undefined
    if (agent !== undefined && !(AGENT_IDS as readonly string[]).includes(agent)) {
      throw invalid(`No hay kit para el agente "${agent}".`, `Usa uno de: ${AGENT_IDS.join(', ')}.`)
    }
    const slug = r.query.get('brain') || null
    // A brain the key cannot see is not found, like everywhere else.
    if (slug) await inBrain(ctxOf(r), { slug })
    const pub = (await installation(r.db)).publicUrl
    if (!pub) {
      throw invalid(
        'Esta instalación todavía no tiene dirección pública.',
        'Un administrador la configura en los ajustes de la instalación.',
      )
    }
    const mcpUrl = `${pub.replace(/\/+$/, '')}/mcp`
    return { body: connectKit({ mcpUrl, brain: slug, ...(agent ? { agent: agent as AgentId } : {}) }) }
  }),
]
