import * as fs from 'fs';
import audioDecode from 'audio-decode';
import { AudioContext } from 'node-web-audio-api';
import FFT from 'fft.js';

// Adjust these constants as desired:
const AUDIO_FILE = './audiofile.wav'; // path to your audio file
const FFT_SIZE = 1024;       // must be a power of 2
const CHUNK_DELAY = 100;     // delay between chunks in milliseconds
const BAR_MAX_WIDTH = 50;    // maximum number of characters for each frequency bin

// Helper function to pause execution for a given delay (ms)
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVisualizer() {
  // Read the audio file into a buffer
  const fileBuffer = fs.readFileSync(AUDIO_FILE);

  // Decode the audio file using audio-decode.
  // The returned value is an AudioBuffer (similar to the Web Audio API)
  const audioBuffer = await audioDecode(fileBuffer);

  // Create an AudioContext from node-web-audio-api (for completeness)
  const audioContext = new AudioContext();
  // (Note: in this example we won’t route the audio for playback, only process the buffer.)

  // Get the first channel’s data (assume mono or use channel 0)
  const channelData = audioBuffer.getChannelData(0);
  const totalSamples = channelData.length;

  // Set up the FFT instance using fft.js
  const fft = new FFT(FFT_SIZE);
  // fft.js uses interleaved arrays for complex numbers:
  // For an array of N complex numbers, index 2*i is the real part and 2*i+1 is the imaginary part.
  const fftInput = fft.createComplexArray();  // length = 2*FFT_SIZE
  const fftOutput = fft.createComplexArray();

  // Process the audio in non-overlapping chunks of FFT_SIZE samples
  for (let i = 0; i < totalSamples - FFT_SIZE; i += FFT_SIZE) {
    // Fill fftInput with the next FFT_SIZE samples; set imaginary parts to 0
    for (let j = 0; j < FFT_SIZE; j++) {
      fftInput[2 * j] = channelData[i + j];    // real part
      fftInput[2 * j + 1] = 0;                   // imaginary part
    }
    
    // Perform the FFT transform
    fft.transform(fftOutput, fftInput);

    // Compute magnitudes for each frequency bin (only need first half)
    const magnitudes: number[] = [];
    const bins = FFT_SIZE / 2;
    for (let k = 0; k < bins; k++) {
      const real = fftOutput[2 * k];
      const imag = fftOutput[2 * k + 1];
      const mag = Math.sqrt(real * real + imag * imag);
      magnitudes.push(mag);
    }

    // Create a simple ASCII bar graph representation.
    // We scale the magnitude arbitrarily (here multiplied by 10) and cap the bar width.
    let line = '';
    for (const mag of magnitudes) {
      const barLength = Math.min(BAR_MAX_WIDTH, Math.floor(mag * 10));
      // Use a block character to represent the bar; pad with a space between bins.
      line += '█'.repeat(barLength) + ' ';
    }

    // Clear the console and print the line (this gives a moving “visualizer” effect)
    console.clear();
    console.log(line);

    // Wait a bit before processing the next chunk
    await sleep(CHUNK_DELAY);
  }

  // When finished, close the AudioContext (optional)
  await audioContext.close();
}

runVisualizer().catch(err => {
  console.error('Error running visualizer:', err);
});
