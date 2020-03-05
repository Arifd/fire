// A class to glide between values
// Using a one pole lowpass filter
//
// Taken from the OpenFrameworks Audio Tutorial youtube video: 
// https://www.youtube.com/watch?v=BdJRSqgEqPQ

// more of current input (input * b) less of old input (z* a) = more higher freuqncy
// less of current input (input *b)  and more of old input (z * a) = less high frequency

// When using Glide: *= the variable you want to use for example: signal = Glide.process(0);
// where 0 is the target value;
// Then call init() repeatedly to trigger again, as in PD [line~] object

import {TWO_PI} from './index.mjs';

export class Glide
{
	constructor()
	{
		this.a = 0.0;
		this.b = 0.0;
		this.z = 0.0;
	}

	init(startValue, glideTimeMS, sampleRate)
	{
		this.z = startValue;
		// set coefficients
		this.a = Math.exp(-TWO_PI / (glideTimeMS * 0.001 * sampleRate));
		this.b = 1.0 - this.a;
	} 

	process(targetValue)
	{
		this.z = (targetValue * this.b) + (this.z * this.a);
		return this.z;
	}
}