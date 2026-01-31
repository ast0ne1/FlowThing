export class AudioProcessor {
  private fftSize = 256;
  private numBins = 128;

  // FFT implementation (Cooley-Tukey radix-2 DIT)
  private fft(real: Float32Array, imag: Float32Array): void {
    const n = real.length;
    
    // Bit-reversal permutation
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
      
      let k = n / 2;
      while (k <= j) {
        j -= k;
        k /= 2;
      }
      j += k;
    }
    
    // Cooley-Tukey FFT
    for (let size = 2; size <= n; size *= 2) {
      const halfSize = size / 2;
      const tableStep = Math.PI / halfSize;
      
      for (let i = 0; i < n; i += size) {
        for (let j = i, k = 0; j < i + halfSize; j++, k++) {
          const angle = k * tableStep;
          const tpre = real[j + halfSize] * Math.cos(angle) + imag[j + halfSize] * Math.sin(angle);
          const tpim = -real[j + halfSize] * Math.sin(angle) + imag[j + halfSize] * Math.cos(angle);
          
          real[j + halfSize] = real[j] - tpre;
          imag[j + halfSize] = imag[j] - tpim;
          real[j] += tpre;
          imag[j] += tpim;
        }
      }
    }
  }

  // Process audio data using FFT
  public processAudioDataFFT(float32Array: Float32Array): number[] {
    // Take the first fftSize samples (or pad if needed)
    const inputData = new Float32Array(this.fftSize);
    for (let i = 0; i < this.fftSize; i++) {
      inputData[i] = i < float32Array.length ? float32Array[i] : 0;
    }

    // Apply Hanning window to reduce spectral leakage
    for (let i = 0; i < this.fftSize; i++) {
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / this.fftSize));
      inputData[i] *= windowValue;
    }

    // Perform FFT
    const real = new Float32Array(inputData);
    const imag = new Float32Array(this.fftSize).fill(0);
    
    this.fft(real, imag);

    // Calculate magnitude spectrum
    const bins: number[] = [];
    const magnitudes = new Float32Array(this.fftSize / 2);
    
    for (let i = 0; i < this.fftSize / 2; i++) {
      magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }

    // Group FFT bins into visualization bins (logarithmic spacing)
    const maxFreqBin = this.fftSize / 2;
    
    for (let i = 0; i < this.numBins; i++) {
      const binStart = Math.floor(Math.pow(i / this.numBins, 2) * maxFreqBin);
      const binEnd = Math.floor(Math.pow((i + 1) / this.numBins, 2) * maxFreqBin);
      
      let sum = 0;
      let count = 0;
      for (let j = binStart; j < binEnd && j < maxFreqBin; j++) {
        sum += magnitudes[j];
        count++;
      }
      
      const average = count > 0 ? sum / count : 0;
      const normalized = Math.min(1, average * 4);
      bins.push(normalized);
    }

    return bins;
  }

  // Process audio data using RMS
  public processAudioDataRMS(float32Array: Float32Array): number[] {
    const samplesPerBin = Math.floor(float32Array.length / this.numBins);
    const bins: number[] = [];

    for (let i = 0; i < this.numBins; i++) {
      const startIdx = i * samplesPerBin;
      const endIdx = Math.min(startIdx + samplesPerBin, float32Array.length);
      
      // Calculate RMS (root mean square) for this bin
      let sum = 0;
      for (let j = startIdx; j < endIdx; j++) {
        sum += float32Array[j] * float32Array[j];
      }
      const rms = Math.sqrt(sum / (endIdx - startIdx));
      
      // Normalize to 0-1 range (multiply by 2 for more visible amplitude)
      bins.push(Math.min(1, rms * 2));
    }

    return bins;
  }

  // Process audio data from WebSocket
  public processAudioData(audioStreamData: { data: number[] }, analysisMethod: 'fft' | 'rms' = 'fft'): number[] {
    if (!audioStreamData.data || audioStreamData.data.length === 0) {
      console.warn('[FlowThing] No audio data to process');
      return [];
    }

    console.log(`[FlowThing] Processing ${audioStreamData.data.length} bytes of audio data`);

    // Convert data to Float32Array (32-bit float audio)
    const buffer = new ArrayBuffer(audioStreamData.data.length);
    const view = new Uint8Array(buffer);
    audioStreamData.data.forEach((byte, i) => (view[i] = byte));
    const float32Array = new Float32Array(buffer);

    console.log(`[FlowThing] Float32Array has ${float32Array.length} samples`);
    console.log(`[FlowThing] Using ${analysisMethod.toUpperCase()} analysis method`);
    
    const bins = analysisMethod === 'fft' 
      ? this.processAudioDataFFT(float32Array)
      : this.processAudioDataRMS(float32Array);

    return bins;
  }
}