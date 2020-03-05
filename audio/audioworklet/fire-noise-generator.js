// TODO: HOW CAN THE AUDIO WORKLET BE AWARE OF SAMPLE RATE? currently using sampleRate, but not sure it knows what that is!
// TODO: SENDING ONLY FIRST INDEX OF PARAMETER ARRAY BECAUSE DON'T REALLY KNOW HOW TO IMPLEMENT IT! 

import {Roaring, Hissing} from '../fire/index.mjs';

class FireNoiseGenerator extends AudioWorkletProcessor
{
  constructor()
  {
    super();
    this.roaring = new Roaring(sampleRate);
    this.hissing = new Hissing(sampleRate);
}   

    static get parameterDescriptors()
    {
        return [{name: 'size', defaultValue: 1}];
    }


process(inputs, outputs, parameters) {
    // INFO: outputs[devices][channel][frame]

    // grab parameter data
    const size = parameters.size;

    // loop through every frame
    const length = outputs[0][0].length;
    for (let frame = 0; frame < length; ++frame)
    {
      // create mono
      let roar = this.roaring.generate(size[0]);
      let hiss = this.hissing.generate(size[0]);

      // write out data
      for (let channel = 0; channel < outputs[0].length; ++channel)
      {
        outputs[0][channel][frame] = roar + hiss;
    }
}
    // return true to keep alive
    return true;
}
}

registerProcessor('fire-noise-generator', FireNoiseGenerator);
