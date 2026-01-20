import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermitAuth } from '../index';

// Mock jose module
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => vi.fn()),
  jwtVerify: vi.fn(),
  errors: {
    JWTExpired: class JWTExpired extends Error {
      code = 'ERR_JWT_EXPIRED';
    },
    JWTClaimValidationFailed: class JWTClaimValidationFailed extends Error {
      claim: string;
      constructor(message: string, claim: string) {
        super(message);
        this.claim = claim;
      }
    },
    JWSSignatureVerificationFailed: class JWSSignatureVerificationFailed extends Error {
      code = 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED';
    },
    JWSInvalid: class JWSInvalid extends Error {
      code = 'ERR_JWS_INVALID';
    },
    JWTInvalid: class JWTInvalid extends Error {
      code = 'ERR_JWT_INVALID';
    },
  },
}));

const { jwtVerify, errors } = await import('jose');

describe('PermitAuth', () => {
  const validConfig = {
    clientId: 'pk_test123',
    clientSecret: 'sk_secret456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if clientId is missing', () => {
      expect(() => new PermitAuth({ clientId: '', clientSecret: 'sk_test' }))
        .toThrow('clientId is required');
    });

    it('should throw error if clientSecret is missing', () => {
      expect(() => new PermitAuth({ clientId: 'pk_test', clientSecret: '' }))
        .toThrow('clientSecret is required');
    });

    it('should create instance with valid config', () => {
      const permit = new PermitAuth(validConfig);
      expect(permit).toBeInstanceOf(PermitAuth);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return user', async () => {
      const mockPayload = {
        iss: 'permit',
        sub: 'user-123',
        uid: 'user-123',
        email: 'test@example.com',
        pid: 'project-456',
        provider: 'email',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      vi.mocked(jwtVerify).mockResolvedValueOnce({
        payload: mockPayload,
        protectedHeader: { alg: 'RS256' },
      } as any);

      const permit = new PermitAuth(validConfig);
      const result = await permit.verifyToken('valid.jwt.token');

      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.userId).toBe('user-123');
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.appId).toBe('project-456');
      expect(result.user?.provider).toBe('email');
    });

    it('should reject expired token', async () => {
      vi.mocked(jwtVerify).mockRejectedValueOnce(new errors.JWTExpired('Token expired'));

      const permit = new PermitAuth(validConfig);
      const result = await permit.verifyToken('expired.jwt.token');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('TOKEN_EXPIRED');
      expect(result.error).toContain('expired');
    });

    it('should reject token with invalid signature', async () => {
      vi.mocked(jwtVerify).mockRejectedValueOnce(
        new errors.JWSSignatureVerificationFailed('Signature verification failed')
      );

      const permit = new PermitAuth(validConfig);
      const result = await permit.verifyToken('invalid.signature.token');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_SIGNATURE');
    });

    it('should reject malformed token', async () => {
      vi.mocked(jwtVerify).mockRejectedValueOnce(new errors.JWTInvalid('Invalid JWT'));

      const permit = new PermitAuth(validConfig);
      const result = await permit.verifyToken('malformed-token');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MALFORMED_TOKEN');
    });

    it('should return CREDENTIALS_REQUIRED when credentials missing', async () => {
      const permit = new PermitAuth(validConfig);
      // Create a new instance without proper setup
      const badPermit = Object.create(permit);
      badPermit['config'] = { clientId: '', clientSecret: '' };

      const result = await badPermit.verifyToken('some.token');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('CREDENTIALS_REQUIRED');
    });
  });
});
