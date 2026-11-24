// Stand-in for Kokoro in tests: returns a tiny valid WAV and records nothing from the network.
export default async function load() {
  return {
    async generate(text, { voice }) {
      const header = Buffer.from('RIFF$\0\0\0WAVEfmt ', 'binary');
      return { toWav: async () => Buffer.concat([header, Buffer.from(`|${voice}|${text}`)]) };
    },
  };
}
