// Mock external SDK dependencies before requiring the module under test
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: { text: () => '{"key": "value"}' },
      }),
    }),
  })),
}));

jest.mock('groq-sdk', () =>
  jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"groq": true}' } }],
        }),
      },
    },
  }))
);

const {
  cleanAIJsonText,
  parseAiJsonSafely,
  hasGeminiKey,
  hasGroqKey,
  hasXAIKey,
  prefersXAI,
} = require('../utils/ai');

// 

describe('cleanAIJsonText', () => {
  test('strips markdown JSON fence and extracts object', () => {
    const input = '```json\n{"key": "value"}\n```';
    const result = cleanAIJsonText(input);
    expect(JSON.parse(result)).toEqual({ key: 'value' });
  });

  test('strips plain code fence', () => {
    const input = '```\n{"foo": 1}\n```';
    const result = cleanAIJsonText(input);
    expect(JSON.parse(result)).toEqual({ foo: 1 });
  });

  test('returns clean JSON string unchanged', () => {
    const input = '{"hello": "world"}';
    expect(cleanAIJsonText(input)).toBe('{"hello": "world"}');
  });

  test('extracts JSON array from surrounding text', () => {
    const input = 'Here is the data: [1, 2, 3] end.';
    const result = cleanAIJsonText(input);
    expect(JSON.parse(result)).toEqual([1, 2, 3]);
  });

  test('extracts innermost valid JSON object when surrounded by prose', () => {
    const input = 'The answer is: {"score": 42} as computed.';
    const result = cleanAIJsonText(input);
    expect(JSON.parse(result)).toEqual({ score: 42 });
  });

  test('handles empty string', () => {
    const result = cleanAIJsonText('');
    expect(result).toBe('');
  });

  test('handles null gracefully', () => {
    const result = cleanAIJsonText(null);
    expect(typeof result).toBe('string');
  });

  test('prefers the object start over array start when object comes first', () => {
    const input = '{"a": [1,2,3]}';
    const result = cleanAIJsonText(input);
    expect(JSON.parse(result)).toEqual({ a: [1, 2, 3] });
  });
});

// 

describe('parseAiJsonSafely', () => {
  const fallback = { default: true };

  test('parses valid JSON string', () => {
    const result = parseAiJsonSafely('{"score": 9}', fallback);
    expect(result).toEqual({ score: 9 });
  });

  test('returns fallback for invalid JSON', () => {
    const result = parseAiJsonSafely('not json at all', fallback);
    expect(result).toEqual(fallback);
  });

  test('returns fallback for empty string', () => {
    const result = parseAiJsonSafely('', fallback);
    expect(result).toEqual(fallback);
  });

  test('returns fallback for null', () => {
    const result = parseAiJsonSafely(null, fallback);
    expect(result).toEqual(fallback);
  });

  test('returns fallback when parsed value is not an object (e.g. plain number)', () => {
    const result = parseAiJsonSafely('42', fallback);
    expect(result).toEqual(fallback);
  });

  test('correctly strips markdown fences before parsing', () => {
    const input = '```json\n{"ok": true}\n```';
    const result = parseAiJsonSafely(input, fallback);
    expect(result).toEqual({ ok: true });
  });
});

// 

describe('API key environment helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clone env before each test so we can restore it
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('hasGeminiKey', () => {
    test('returns false when GEMINI_API_KEY is undefined', () => {
      delete process.env.GEMINI_API_KEY;
      expect(hasGeminiKey()).toBe(false);
    });

    test('returns false for placeholder value', () => {
      process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';
      expect(hasGeminiKey()).toBe(false);
    });

    test('returns false for key shorter than 30 chars', () => {
      process.env.GEMINI_API_KEY = 'short_key';
      expect(hasGeminiKey()).toBe(false);
    });

    test('returns true for a valid-length key', () => {
      process.env.GEMINI_API_KEY = 'AIzaSy_this_is_a_valid_fake_key_for_testing_12345';
      expect(hasGeminiKey()).toBe(true);
    });
  });

  describe('hasGroqKey', () => {
    test('returns false when GROQ_API_KEY is not set', () => {
      delete process.env.GROQ_API_KEY;
      expect(hasGroqKey()).toBe(false);
    });

    test('returns false for placeholder', () => {
      process.env.GROQ_API_KEY = 'your_groq_api_key_here';
      expect(hasGroqKey()).toBe(false);
    });

    test('returns true for any non-placeholder value', () => {
      process.env.GROQ_API_KEY = 'gsk_realkey_abc123';
      expect(hasGroqKey()).toBe(true);
    });
  });

  describe('hasXAIKey', () => {
    test('returns false when XAI_API_KEY is not set', () => {
      delete process.env.XAI_API_KEY;
      expect(hasXAIKey()).toBe(false);
    });

    test('returns false for placeholder', () => {
      process.env.XAI_API_KEY = 'your_xai_api_key_here';
      expect(hasXAIKey()).toBe(false);
    });

    test('returns true for a real key', () => {
      process.env.XAI_API_KEY = 'xai-realkey-abc123';
      expect(hasXAIKey()).toBe(true);
    });
  });

  describe('prefersXAI', () => {
    test('returns false when AI_PROVIDER is not xai', () => {
      process.env.AI_PROVIDER = 'gemini';
      process.env.XAI_API_KEY = 'xai-realkey-abc123';
      expect(prefersXAI()).toBe(false);
    });

    test('returns false when AI_PROVIDER is xai but key is missing', () => {
      process.env.AI_PROVIDER = 'xai';
      delete process.env.XAI_API_KEY;
      expect(prefersXAI()).toBe(false);
    });

    test('returns true when AI_PROVIDER is xai and key is valid', () => {
      process.env.AI_PROVIDER = 'xai';
      process.env.XAI_API_KEY = 'xai-realkey-abc123';
      expect(prefersXAI()).toBe(true);
    });
  });
});
