import { Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';

import { ConfigModule, ConfigService } from '../config';

@Module({
  imports: [
    NestJwtModule.registerAsync({
      useFactory: (config: ConfigService) => config.jwt.options,
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  exports: [NestJwtModule],
})
export class JwtModule {}
