// Local text-to-speech for Sage's voice: Kokoro (kokoro-js, q8, CPU), loaded lazily on the first
// request and kept in memory. The engine loader is injectable so tests never download a model.
export const MAX_TTS_CHARS = 400;
export const DEFAULT_VOICE = 'am_michael';
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';

/** Real engine: resolves to an object with generate(text, {voice}) -> {toWav()}. */
export async function loadKokoro() {
  const { KokoroTTS } = await import('kokoro-js');
  return KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'cpu' });
}

/** Returns the cleaned text, or throws an error carrying an HTTP status. */
export function validateTtsText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw Object.assign(new Error('Text required'), { status: 400 });
  if (text.length > MAX_TTS_CHARS) throw Object.assign(new Error(`Text is limited to ${MAX_TTS_CHARS} characters`), { status: 400 });
  return text;
}

export function createTts({ load = loadKokoro, voice = process.env.SAGE_VOICE || DEFAULT_VOICE } = {}) {
  let engine = null;
  let queue = Promise.resolve();
  const ready = () => {
    engine ??= load().catch((error) => { engine = null; throw error; }); // a failed load can be retried
    return engine;
  };
  return {
    /** @returns {Promise<Buffer>} a WAV file. Calls run one at a time. */
    synthesize(value) {
      const text = validateTtsText(value);
      const job = queue.then(async () => {
        const audio = await (await ready()).generate(text, { voice });
        return Buffer.from(await audio.toWav());
      });
      queue = job.catch(() => {});
      return job;
    },
  };
}
