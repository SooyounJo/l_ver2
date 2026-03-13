import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let sheetsClientPromise = null;

function getImageNumberFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    const idParam = u.searchParams.get('id');
    if (idParam) return idParam;
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    const base = last.split(/[?#]/)[0];
    return base || url;
  } catch (_) {
    const tail = url.split('/').filter(Boolean).pop() || url;
    return tail.split(/[?#]/)[0];
  }
}

async function getSheetsClient() {
  if (sheetsClientPromise) return sheetsClientPromise;

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SHEETS_SERVICE_EMAIL;
  const rawKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!spreadsheetId || !clientEmail || !rawKey) {
    sheetsClientPromise = Promise.resolve(null);
    return sheetsClientPromise;
  }

  const privateKey = rawKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT(clientEmail, undefined, privateKey, SCOPES);

  sheetsClientPromise = auth
    .authorize()
    .then(() => google.sheets({ version: 'v4', auth }))
    .catch(() => null);

  return sheetsClientPromise;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body && typeof req.body === 'object' ? req.body : {};

  const rawText = typeof payload.text === 'string' ? payload.text : '';
  const rawUrl = typeof payload.imageUrl === 'string' ? payload.imageUrl : '';

  const text = rawText.trim();
  const imageUrl = rawUrl.trim();

  if (!text && !imageUrl) {
    return res.status(200).json({ ok: false, skipped: true });
  }

  const sheets = await getSheetsClient();
  if (!sheets) {
    // Sheets 연동이 설정되지 않은 경우에도 앱은 정상 동작해야 하므로 200 반환
    return res.status(200).json({ ok: false, disabled: true });
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_LIST_SHEET || 'list';

  const imgNumber = getImageNumberFromUrl(imageUrl);
  const now = new Date();
  const iso = now.toISOString();

  const values = [[null, imgNumber || '', text || '', iso]];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:D`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    // Sheets 오류는 전체 플로우를 막지 말고 로그만 남긴다.
    // eslint-disable-next-line no-console
    console.error('[log-interaction] sheets append error', e);
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}

