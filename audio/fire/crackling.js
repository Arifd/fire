import {Biquad} from './biquad.js';
import {Glide} from './glide.js';
import {map} from './index.mjs';

export class Crackling
{
	constructor(sampleRate)
	{
		this.sampleRate = sampleRate;

		this.gain = 1;
		this.crackleAmount = 0.99975;
		this.env = new Glide();
		this.bandPass = new Biquad();
		this.lop = new Biquad();

		this.bandPass.setBiquad("bandpass", 1650 / this.sampleRate, 1.5, 2);
		this.lop.setBiquad("lowpass", 1150 / this.sampleRate, 0.45, 0);

		this.noise = 0;
	}

	generate(size = 1) // generate one sample of crackle
  {
    // THIS WILL GENERATE MONO CRACKLES, BUT REALLY WE WANT TO THINK ABOUT MAKING LIKE A PARTICLE GENERATOR CLASS
    // THAT SPITS OUT A RANDOM CRACKLE IN A RANDOM PAN POSITION AT A RANDOM TIME

        // adjust to size
        // this.crackleAmount = map(Math.pow(size, 1.5), 0.0, 1.0, 1.0, 0.75);
        this.gain = Math.pow(size, 1.24);

        // calc per sample noise
        this.noise = Math.random() * 0.1 - 0.05;

        // if (this.noise > this.crackleAmount)
        {
          this.randomEnvTime = Math.min(Math.random() + (size * 10), 30);
          this.randomBandPassFreq = Math.random() * 14000;
          this.bandPass.setFreq(this.randomBandPassFreq / this.sampleRate);
          this.env.init(size, 0.1, this.sampleRate);
      }

      this.noise = this.bandPass.process(this.noise);

      // take the high end off, to make it not sound like rain splatter
      this.noise = this.lop.process(this.noise);

      this.noise *= this.env.process(0);

        return this.noise * this.gain;
    }
}