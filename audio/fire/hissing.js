import {Biquad} from './biquad.js';
import {map} from './index.mjs';

export class Hissing
{
	constructor(sampleRate)
	{
		this.sampleRate = sampleRate;
	
		this.gain = 1;
		
		this.noiseSeed = 1;

		this.lop = new Biquad();
		this.bandPass = new Biquad();

		this.lop.setBiquad("lowpass", 100 / this.sampleRate, 2, 2);
		this.bandPass.setBiquad("bandpass", 1650 / this.sampleRate, 1.5, 2);
			
		this.noise1 = 0;
		this.noise2 = 0;
	}

	generate(size = 1) // generate one sample of hiss
  {
			// adjust to size
			this.gain = size * 0.25;
			this.lopFreq = (size * 20) + 100;
			this.lop.setFreq(this.lopFreq / this.sampleRate);
			this.shelfFreq = map(size, 0.0, 1.0, 10000, 100);
			this.noiseSeed = map(size, 0.0, 1.0, 0.0002, 1.0); // was 0.02 - 0.8

      // noise2 wants to be EITHER +1 or -1
      this.noise1 = Math.random() * 2 - 1;			;
      this.noise2 = (Math.random() >= 0.5) * 2 - 1;

      this.noise2 *= this.noiseSeed;

      // filter noise2
			this.noise2 = this.lop.process(this.noise2);

			// create some variance
			let randomBandPassFreq = Math.random() * 12500 + 3750.0;
			this.bandPass.setFreq(randomBandPassFreq / this.sampleRate);
			this.noise2 = this.bandPass.process(this.noise2);

			this.noise2 * this.noise2 * this.noise2 * this.noise2;

			// multiply and set final volume
			return (this.noise1 * this.noise2) * 2 * this.gain;
	}
}