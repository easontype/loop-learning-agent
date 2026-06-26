// AudioWorklet processor: converts Float32 mic input to Int16 PCM and posts to main thread
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (!input || input.length === 0) return true
    const samples = input[0]
    const pcm16 = new Int16Array(samples.length)
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    this.port.postMessage(pcm16.buffer, [pcm16.buffer])
    return true
  }
}
registerProcessor('audio-processor', AudioProcessor)
