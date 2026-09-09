import { FastifyReply, FastifyRequest } from 'fastify';

export class IContext {
  req?: FastifyRequest | any;
  res?: FastifyReply | any;
}
