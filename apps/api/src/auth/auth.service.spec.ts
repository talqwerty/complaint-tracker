import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('bcryptjs', () => ({ compare: jest.fn() }));
const mockedCompare = bcrypt.compare as jest.Mock;

const userRecord = {
  id: 1,
  email: 'admin@forth.com',
  password: 'hashed',
  name: 'Admin',
  role: 'admin',
};

describe('AuthService', () => {
  let service: AuthService;
  let users: { findByEmail: jest.Mock; findById: jest.Mock };
  let jwt: { signAsync: jest.Mock };

  beforeEach(async () => {
    users = { findByEmail: jest.fn(), findById: jest.fn() };
    jwt = { signAsync: jest.fn() };
    mockedCompare.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('validateUser', () => {
    it('returns the user when the password matches', async () => {
      users.findByEmail.mockResolvedValue(userRecord);
      mockedCompare.mockResolvedValue(true);

      const result = await service.validateUser('admin@forth.com', 'secret');

      expect(result).toBe(userRecord);
      expect(mockedCompare).toHaveBeenCalledWith('secret', 'hashed');
    });

    it('returns null when the user does not exist', async () => {
      users.findByEmail.mockResolvedValue(null);
      expect(await service.validateUser('x@y.com', 'secret')).toBeNull();
      expect(mockedCompare).not.toHaveBeenCalled();
    });

    it('returns null when the password is wrong', async () => {
      users.findByEmail.mockResolvedValue(userRecord);
      mockedCompare.mockResolvedValue(false);
      expect(await service.validateUser('admin@forth.com', 'bad')).toBeNull();
    });
  });

  describe('login', () => {
    it('signs a token and returns the safe user on success', async () => {
      users.findByEmail.mockResolvedValue(userRecord);
      mockedCompare.mockResolvedValue(true);
      jwt.signAsync.mockResolvedValue('signed.jwt.token');

      const result = await service.login({
        email: 'admin@forth.com',
        password: 'secret',
      });

      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 1,
        email: 'admin@forth.com',
        name: 'Admin',
        role: 'admin',
      });
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toEqual({
        id: 1,
        email: 'admin@forth.com',
        name: 'Admin',
        role: 'admin',
      });
      // never leak the password hash
      expect(JSON.stringify(result)).not.toContain('hashed');
    });

    it('throws UnauthorizedException on invalid credentials', async () => {
      users.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@y.com', password: 'secret' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });
  });
});
