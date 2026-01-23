import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AgentService } from '../services/agent-service';
import { AgentRequestSchema } from '../types';
import { z } from 'zod';

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/agent', async (request: FastifyRequest, reply: FastifyReply) => {
    let agentService: AgentService;
    try {
      agentService = new AgentService();
    } catch (initError: any) {
      fastify.log.error(`Failed to initialize AgentService: ${initError.message}`);
      if (initError.stack) {
        fastify.log.error(initError.stack);
      }
      return reply.status(500).send({
        error: 'Agent service initialization failed',
        message: initError.message || 'Check environment variables and database connection',
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
      
      // Return more helpful error messages
      let errorMessage = 'Internal server error';
      if (error.message?.includes('GRADIENT_API_KEY')) {
        errorMessage = 'GRADIENT_API_KEY is not configured';
      } else if (error.message?.includes('GRADIENT_MODEL')) {
        errorMessage = 'GRADIENT_MODEL is not configured';
      } else if (error.message?.includes('DATABASE_URL')) {
        errorMessage = 'DATABASE_URL is not configured';
      } else if (error.message?.includes('schema not initialized')) {
        errorMessage = 'Database schema not initialized. Run Prisma migrations.';
      } else if (error.message?.includes('Database connection failed')) {
        errorMessage = 'Database connection failed. Check DATABASE_URL.';
      } else if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
        errorMessage = error.message || 'Internal server error';
      }
      
      // Always return error message for initialization and configuration errors
      const shouldShowDetails = 
        process.env.NODE_ENV === 'development' || 
        process.env.LOG_LEVEL === 'debug' ||
        errorMessage !== 'Internal server error';
      
      return reply.status(500).send({
        error: errorMessage,
        message: shouldShowDetails ? error.message : undefined,
        details: (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') ? {
          stack: error.stack,
          name: error.name,
          code: error.code,
        } : undefined,
      });
    }
  });

  fastify.get('/healthz', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });
}

