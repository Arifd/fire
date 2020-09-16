import * as utils from '../js/utils.js';

const audioContext = new AudioContext();
let audioFireSize = 0; // we need a global scoped version because the step function doesn't have access to local
let pan = audioContext.createStereoPanner(); // we need a global scoped version because the postProcess function doesn't have access to 'this'
pan.panningModel = 'HRTF';

export class Audio
{
  constructor() {
    this.audioContext = audioContext;
    this.isPlaying = false;
    this.noiseGenerator;
    // Check compatibility
    // pureJS = 0, AudioWorklet = 1, ScriptProcessorNode = 2;
    this.mode = 0;
    if (utils.detectAudioWorklet()) this.mode = 1;
    else if (utils.detectScriptProcessorNode()) this.mode = 2;
  }

  get sampleRate() {return audioContext.sampleRate}

  set pan(value) {pan.pan.value = value}

  set fireSize(value) {
    audioFireSize = value;
    // set audioworklet
    if (this.mode === 1 && this.noiseGenerator) this.noiseGenerator.parameters.get('size').value = value;
  }

  async start() {
    if (this.isPlaying) return;
    
    // Prefer AudioWorklet
    if (this.mode === 1) {
      await audioContext.audioWorklet.addModule('audio/audioworklet/fire-noise-generator.js');
      this.noiseGenerator = new AudioWorkletNode(audioContext, 'fire-noise-generator');
      console.log('Audio using Audio Worklet');
      postProcess(this.noiseGenerator);
    }
    // Script Processor Node
    else if (this.mode === 2) {
      this.noiseGenerator = audioContext.createScriptProcessor(4096, 1, 1);
      const imported = await import('./fire/index.mjs');
      let roaring = new imported.Roaring(audioContext.sampleRate);
      let hissing = new imported.Hissing(audioContext.sampleRate);
      // Give the node a function to process audio events
      this.noiseGenerator.onaudioprocess = function(audioProcessingEvent) {
        // The output buffer contains the samples that will be modified and played
        let outputBuffer = audioProcessingEvent.outputBuffer;
        for (let frame = 0; frame < outputBuffer.length; frame++)
        {
          let roar = roaring.generate(audioFireSize);
          let hiss = hissing.generate(audioFireSize);

          for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++)
          {
            let data = outputBuffer.getChannelData(channel);
            data[frame] = roar + hiss;
          }
        }
      }
    console.log('Audio using Script Processor Node');
    postProcess(this.noiseGenerator);
    }
    // All else fails...
    // We are going create a loop that continuously schedules new buffers of 'fire' to be played, expectingly seemlessly, but without an audiocallback it's impossible to get perfect :( 
    else {
      const imported = await import('./fire/index.mjs');
  
      const bufferSize = Math.round(audioContext.sampleRate/6); // this is my own buffer, independent from WebAduio 
      console.log(`bufferSize = ${bufferSize}`);
      const bufferTime = bufferSize / audioContext.sampleRate;
  
      let roaring = new imported.Roaring(audioContext.sampleRate);
      let hissing = new imported.Hissing(audioContext.sampleRate);

      // periodically update the buffers in the sound sources
      let interval = bufferTime * 1000; // ms
      let expected = performance.now() + interval;
      setTimeout(step, interval);
      function step() {
        let drift = performance.now() - expected;

        // GENERATE A BLOCK OF AUDIO AND SCHEDULE IT
        this.noiseGenerator = audioContext.createBufferSource(audioContext.destination.channelCount, bufferSize, audioContext.sampleRate);
        let buffer = audioContext.createBuffer(audioContext.destination.channelCount, bufferSize, audioContext.sampleRate); 
        for (let frame = 0; frame < bufferSize; frame++)
        {
          let roar = roaring.generate(audioFireSize);
          let hiss = hissing.generate(audioFireSize);

          for (let channel = 0; channel < audioContext.destination.channelCount; channel++)
          {
            let data = buffer.getChannelData(channel);
            data[frame] = roar + hiss;
          }
        }

        this.noiseGenerator.buffer = buffer;
        this.noiseGenerator.start();
        console.log('Audio using pure JS fallback');
        postProcess(this.noiseGenerator);
  
        // setup the next loop
        expected += interval;
        setTimeout(step, Math.max(0, interval - drift)); // take into account drift
      }

    }
    this.isPlaying = true;
  }
}

// End of Audio Class
////////////////////////////////////////////////////////////

let postProcess = (()=>{ 
  let compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 0;
  compressor.ratio.value = 1.25;
  compressor.attack.value = 0.3;
  compressor.release.value = 0.24;
  let convolver = audioContext.createConvolver();
  convolver.buffer = createImpulseResponse(0.25, 0.6, false);

  // Gain
  let gain = audioContext.createGain();
  gain.gain.value = 6;

  // Haas Stereo Effect
  // let delayL = audioContext.createDelay(0.0205); // 2.05ms
  // let delayR = audioContext.createDelay(0.00212); // 2.12ms
  // let chMerger = audioContext.createChannelMerger(2);

  return (noiseGenerator)=>{
    noiseGenerator.connect(compressor).connect(pan).connect(audioContext.destination);
    noiseGenerator.connect(compressor).connect(gain).connect(audioContext.destination);
  }
})();

////////////////////////////////////////////////////////////

// create an artificial impulse response
function createImpulseResponse(duration, decay, reverse) {
  var sampleRate = audioContext.sampleRate;
  var length = sampleRate * duration;
  var impulse = audioContext.createBuffer(2, length, sampleRate);
  var impulseL = impulse.getChannelData(0);
  var impulseR = impulse.getChannelData(1);

  if (!decay)
    decay = 2.0;
  for (var i = 0; i < length; i++) {
    var n = reverse ? length - i : i;
    impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
  }
  return impulse;
}