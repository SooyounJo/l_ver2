import { buildNormalizeTextSystemPrompt } from '../../components/prompts/normalizeTextPrompt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });

  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const input = text.trim();
  if (!input) return res.status(200).json({ output: '' });

  const minLen = 75;
  const maxLen = 87;

  const system = buildNormalizeTextSystemPrompt({ minLen, maxLen });

  async function callOpenAI(userMessage) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error?.message || 'OpenAI request failed';
      throw new Error(msg);
    }
    const out = data?.choices?.[0]?.message?.content;
    return typeof out === 'string' ? out : '';
  }

  function cleanOneLine(s) {
    return s.replace(/\s+/g, ' ').replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '').trim();
  }

  function countOccurrences(haystack, needle) {
    if (!haystack || !needle) return 0;
    let count = 0;
    let i = 0;
    while (true) {
      const at = haystack.indexOf(needle, i);
      if (at === -1) break;
      count += 1;
      i = at + needle.length;
    }
    return count;
  }

  function hasBadRepetition(s) {
    const t = cleanOneLine(s);
    if (!t) return false;
    if (countOccurrences(t, '그렇게 느꼈') >= 2) return true;
    if (countOccurrences(t, '그렇게') >= 4) return true;
    if (countOccurrences(t, '느꼈다') >= 3) return true;
    return false;
  }

  function enforceLen(s) {
    let out = cleanOneLine(s);
    if (!out) return out;
    if (out.length > maxLen) out = out.slice(0, maxLen).trimEnd();
    if (out.length < minLen) {
      const tails = [
        ' 그래서 더 오래 마음에 남았다.',
        ' 한참을 곱씹게 되는 장면이었다.',
        ' 낯설면서도 이상하게 따뜻했다.',
        ' 조용히 생각이 이어졌다.',
        ' 작은 여운이 길게 남았다.',
        ' 그런 기분이 오래 지속됐다.',
        ' 그 감정이 쉽게 사라지지 않았다.',
      ];

      for (let i = 0; i < tails.length; i += 1) {
        if (out.length >= minLen) break;
        const t = tails[i];
        if (out.includes(t.trim())) continue;
        if (out.length + t.length <= maxLen) out += t;
      }

      if (out.length < minLen) {
        const last = ' 여운이 남았다.';
        if (out.length + last.length <= maxLen && !out.includes(last.trim())) out += last;
        out = out.slice(0, maxLen).trimEnd();
      }
    }
    return out;
  }

  try {
    let output = '';
    const attempts = [
      `원문: ${input}\n\n조건에 맞게 1문장으로 다듬어줘.`,
      (prev) => `이전 결과(${prev.length}자): ${prev}\n\n공백 포함 ${minLen}~${maxLen}자 1문장으로 길이를 정확히 맞춰 다시 써줘.`,
    ];

    for (let i = 0; i < 2; i += 1) {
      const msg = i === 0 ? attempts[0] : attempts[1](output || input);
      output = cleanOneLine(await callOpenAI(msg));
      if (output.length >= minLen && output.length <= maxLen) break;
    }

    if (output.length >= minLen && output.length <= maxLen && hasBadRepetition(output)) {
      const msg = `결과: ${output}\n\n반복되는 표현(예: '그렇게 느꼈')을 제거하고, 같은 구절/어미로 채우지 말고, 공백 포함 ${minLen}~${maxLen}자 한국어 1문장으로 다시 써줘.`;
      output = cleanOneLine(await callOpenAI(msg));
    }

    output = enforceLen(output);
    return res.status(200).json({ output });
  } catch (e) {
    // API 실패 시, 최소한 원문을 안전하게 잘라서 반환
    const safe = enforceLen(input.replace(/[\r\n]+/g, ' '));
    return res.status(200).json({ output: safe, warning: String(e?.message || e) });
  }
}

