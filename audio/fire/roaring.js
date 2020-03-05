import {Biquad} from './biquad.js';
import {map} from './index.mjs';

// TODO: ROARING WANTS MORE BASS, BUT IT IS CLIPPING, SO GO FIGURE...

export class Roaring
{
	constructor(sampleRate)
	{
		this.sampleRate = sampleRate;

		this.gain = 1;
		this.noiseSeed = 1;

		this.bandPass = new Biquad();
		this.lop = new Biquad();
		this.lop2 = new Biquad();
		// this.hip = new Biquad();
		this.notch = new Biquad();
		this.bassCut = new Biquad();

		this.bandPass.setBiquad("bandpass", 30 / this.sampleRate, 2, 1);
		this.lop.setBiquad("lowpass", 800 / this.sampleRate, 0.707, 2);
		this.lop2.setBiquad("lowpass", 2875 / this.sampleRate, 0.707, 2);
		// this.hip.setBiquad("highpass", 95 / this.sampleRate, 1);
		this.notch.setBiquad("peak", 157 / this.sampleRate, 4, -20);
		this.bassCut.setBiquad("highpass", 60 / this.sampleRate, 1);

		this.bassBoost = (()=>{ // https://www.musicdsp.org/en/latest/Filters/235-bass-booster.html#bass-booster
      let selectivity = 70.0; // frequency response of the LP (higher value gives a steeper one) [70.0 to 140.0 sounds good]
			// let ratio = 5.0; // how much of the filtered signal is mixed to the original
			let outGain = 0.5; // final output gain
			let gain1 = 0.0; // don't adjust
      let cap = 0.0; // don't adjust
      return (sample, ratio)=>{
        gain1 = 1.0/(selectivity + 1.0);
        cap = (sample + cap * selectivity) * gain1;
        sample = (sample + cap * ratio);
        return sample * outGain;
      }
    })();

		this.hum_hip = new Biquad();
		this.hum_lop = new Biquad();
		this.hum_hip.setBiquad("highpass", 100.0 / this.sampleRate, 0.3);
		this.hum_lop.setBiquad("lowpass", 300.0 / this.sampleRate, 1.3);

		this.noise = 0;
		this.noise1 = 0;
		this.noise2 = 0;
		this.hum = 0;

	}

	generate(size = 1) // generate one sample of data
  {
		// adjust to size
		this.gain = Math.min(Math.pow(size, 0.5), 1.0);
    this.boomAmount = map(size, 0.0, 1.0, 90.0, 50.0);
		// this.hip.setFreq(Math.max(this.boomAmount/this.sampleRate,30.0));
		this.bandPass.setFreq(this.boomAmount/this.sampleRate);
		this.lopFreq = map(size, 0.0, 1.0, 1.0, 1800.0);
		this.lop.setFreq(this.lopFreq/this.sampleRate);
		this.noiseSeed = map(size, 0.0, 1.0, 0.02, 1.0);
		let hum_freq = map(size, 0.0, 1.0, 1.0, 300.0);
		this.hum_hip.setFreq(hum_freq / this.sampleRate);
		this.hum_lop.setFreq(hum_freq / this.sampleRate);
		
		// noise1 wants to be EITHER +1 or -1
    this.noise1 = (Math.random() >= 0.5) * 1 - 0.5;
		this.noise = Math.random() * 1 - 0.5;
		this.noise2 =  this.noise;

    this.noise2 *= this.noiseSeed;

    this.noise2 = this.lop.process(this.noise2);

		this.noiseCombined = this.noise1 * this.noise2;
		// this.noiseCombined = this.hip.process(this.noiseCombined);
		this.noiseCombined = this.bandPass.process(this.noiseCombined) * 40;
		this.noiseCombined = this.bassBoost(this.noiseCombined, size * 2.75) - this.noiseCombined;
		this.noiseCombined = this.bassCut.process(this.noiseCombined);
		this.noiseCombined = this.lop2.process(this.noiseCombined);
		this.noiseCombined = this.notch.process(this.noiseCombined);

		this.hum = this.hum_hip.process(this.hum_lop.process(this.noise)) * (size * 0.5);

		this.noiseCombined += this.hum;

		return this.noiseCombined * this.gain;
	}
}
