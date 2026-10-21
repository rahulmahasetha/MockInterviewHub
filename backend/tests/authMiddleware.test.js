const jwt = require('jsonwebtoken');
const { verifyToken, JWT_SECRET } = require('../middleware/authMiddleware');

// Helper to build mock req/res/next
const buildMocks = (authHeader) => {
  const req = { headers: { authorization: authHeader } };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

describe('verifyToken middleware', () => {
  // 

  test('responds 401 when Authorization header is absent', () => {
    const { req, res, next } = buildMocks(undefined);
    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('No token') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('responds 401 when Authorization header does not start with "Bearer "', () => {
    const { req, res, next } = buildMocks('Token abc123');
    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('responds 401 for a malformed/random Bearer token', () => {
    const { req, res, next } = buildMocks('Bearer notavalidjwt');
    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Invalid') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // 

  test('responds 401 for an expired JWT', () => {
    const expiredToken = jwt.sign(
      { userId: 'user_999' },
      JWT_SECRET,
      { expiresIn: -1 } // immediately expired
    );
    const { req, res, next } = buildMocks(`Bearer ${expiredToken}`);
    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // 

  test('calls next() and attaches decoded payload to req.user for a valid JWT', () => {
    const payload = { userId: 'user_123' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const { req, res, next } = buildMocks(`Bearer ${token}`);

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe('user_123');
    expect(res.status).not.toHaveBeenCalled();
  });

  test('attaches full payload to req.user', () => {
    const payload = { userId: 'u_abc', role: 'admin' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const { req, res, next } = buildMocks(`Bearer ${token}`);

    verifyToken(req, res, next);

    expect(req.user.userId).toBe('u_abc');
    expect(req.user.role).toBe('admin');
  });

  // 

  test('responds 401 when token is signed with a different secret', () => {
    const token = jwt.sign({ userId: 'u_1' }, 'wrong_secret', { expiresIn: '1h' });
    const { req, res, next } = buildMocks(`Bearer ${token}`);
    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
