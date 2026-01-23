import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AgentService } from '../services/agent-service';
import { AgentRequestSchema } from '../types';
import { z } from 'zod';

export async function agentRoutes(fastify: FastifyInstance) {
  let agentService: AgentService;
  try {
    agentService = new AgentService();
  } catch (error: any) {
    fastify.log.error('Failed to initialize AgentService:', error.message);
    // Don't throw - register route anyway, it will handle the error
    agentService = null as any;
  }

  fastify.post('/v1/agent', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!agentService) {
      return reply.status(500).send({
        error: 'Agent service not initialized',
        message: 'AgentService failed to initialize. Check environment variables and database connection.',
      });
    }
    try {
      // Rate limiting would be handled by middleware
      const body = AgentRequestSchema.parse(request.body);
      
      // Security check: marketing mode requires internal API key
      if (body.mode === 'marketing') {
        const apiKey = request.headers['x-api-key'] as string;
        const internalKey = process.env.INTERNAL_API_KEY || process.env.API_KEY;
        
        if (!apiKey || apiKey !== internalKey) {
          return reply.status(403).send({
            error: 'Marketing mode requires internal API key',
          });
        }
      }

      const response = await agentService.processRequest(body);
      
      return reply.send(response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid request',
          details: error.errors,
        });
      }
      
      fastify.log.error({
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      }, 'Agent route error');
      return reply.status(500).send({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  });

  fastify.get('/healthz', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });
}

