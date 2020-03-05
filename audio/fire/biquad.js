//
//  Biquad.h
//
//  Created by Nigel Redmon on 11/24/12
//  EarLevel Engineering: earlevel.com
//  Copyright 2012 Nigel Redmon
//
//  For a complete explanation of the Biquad code:
//  https://www.earlevel.com/main/2012/11/26/biquad-c-source-code/
//
//  License:
//
//  This source code is provided as is, without warranty.
//  You may copy and distribute verbatim copies of this document.
//  You may modify and use this source code to create binary code
//  for your own purposes, free or commercial.
//

export class Biquad
{
  constructor(type = "lowpass")
  {
    this.type = type;
    this.a0 = 1.0;
    this.a1 = 0.0;
    this.a2 = 0.0;
    this.b1 = 0.0;
    this.b2 = 0.0;
    this.Fc = 0.50;
    this.Q = 0.707;
    this.peakGain = 0.0;
    this.z1 = 0.0;
    this.z2 = 0.0;
    this.calcBiquad();
}

setFreq(freq)
{
    this.Fc = freq;
    this.calcBiquad();
}

setBiquad(type, freq, Q, peakGainDB)
{
    this.type = type;
    this.Fc = freq;
    this.Q = Q;
    this.peakGain = peakGainDB;
    this.calcBiquad();
}

calcBiquad()
{
    this.norm;
    this.V = Math.pow(10, Math.abs(this.peakGain) / 20.0);
    this.K = Math.tan(Math.PI * this.Fc);
    switch (this.type) {
        case "lowpass":
        this.norm = 1 / (1 + this.K / this.Q + this.K * this.K);
        this.a0 = this.K * this.K * this.norm;
        this.a1 = 2 * this.a0;
        this.a2 = this.a0;
        this.b1 = 2 * (this.K * this.K - 1) * this.norm;
        this.b2 = (1 - this.K / this.Q + this.K * this.K) * this.norm;
        break;

        case "highpass":
        this.norm = 1 / (1 + this.K / this.Q + this.K * this.K);
        this.a0 = 1 * this.norm;
        this.a1 = -2 * this.a0;
        this.a2 = this.a0;
        this.b1 = 2 * (this.K * this.K - 1) * this.norm;
        this.b2 = (1 - this.K / this.Q + this.K * this.K) * this.norm;
        break;

        case "bandpass":
        this.norm = 1 / (1 + this.K / this.Q + this.K * this.K);
        this.a0 = this.K / this.Q * this.norm;
        this.a1 = 0;
        this.a2 = -this.a0;
        this.b1 = 2 * (this.K * this.K - 1) * this.norm;
        this.b2 = (1 - this.K / this.Q + this.K * this.K) * this.norm;
        break;

        case "notch":
        this.norm = 1 / (1 + this.K / this.Q + this.K * this.K);
        this.a0 = (1 + this.K * this.K) * this.norm;
        this.a1 = 2 * (this.K * this.K - 1) * this.norm;
        this.a2 = this.a0;
        this.b1 = this.a1;
        this.b2 = (1 - this.K / this.Q + this.K * this.K) * this.norm;
        break;

        case "peak":
            if (this.peakGain >= 0) {    // boost
                this.norm = 1 / (1 + 1/this.Q * this.K + this.K * this.K);
                this.a0 = (1 + this.V/this.Q * this.K + this.K * this.K) * this.norm;
                this.a1 = 2 * (this.K * this.K - 1) * this.norm;
                this.a2 = (1 - this.V/this.Q * this.K + this.K * this.K) * this.norm;
                this.b1 = this.a1;
                this.b2 = (1 - 1/this.Q * this.K + this.K * this.K) * this.norm;
            }
            else {    // cut
                this.norm = 1 / (1 + this.V/this.Q * this.K + this.K * this.K);
                this.a0 = (1 + 1/this.Q * this.K + this.K * this.K) * this.norm;
                this.a1 = 2 * (this.K * this.K - 1) * this.norm;
                this.a2 = (1 - 1/this.Q * this.K + this.K * this.K) * this.norm;
                this.b1 = this.a1;
                this.b2 = (1 - this.V/this.Q * this.K + this.K * this.K) * this.norm;
            }
            break;
            case "lowshelf":
            if (this.peakGain >= 0) {    // boost
                this.norm = 1 / (1 + Math.sqrt(2) * this.K + this.K * this.K);
                this.a0 = (1 + Math.sqrt(2*this.V) * this.K + this.V * this.K * this.K) * this.norm;
                this.a1 = 2 * (this.V * this.K * this.K - 1) * this.norm;
                this.a2 = (1 - Math.sqrt(2*this.V) * this.K + this.V * this.K * this.K) * this.norm;
                this.b1 = 2 * (this.K * this.K - 1) * this.norm;
                this.b2 = (1 - Math.sqrt(2) * this.K + this.K * this.K) * this.norm;
            }
            else {    // cut
                this.norm = 1 / (1 + Math.sqrt(2*this.V) * this.K + this.V * this.K * this.K);
                this.a0 = (1 + Math.sqrt(2) * this.K + this.K * this.K) * this.norm;
                this.a1 = 2 * (this.K * this.K - 1) * this.norm;
                this.a2 = (1 - Math.sqrt(2) * this.K + this.K * this.K) * this.norm;
                this.b1 = 2 * (this.V * this.K * this.K - 1) * this.norm;
                this.b2 = (1 - Math.sqrt(2*this.V) * this.K + this.V * this.K * this.K) * this.norm;
            }
            break;
            case "highshelf":
            if (this.peakGain >= 0) {    // boost
                this.norm = 1 / (1 + Math.sqrt(2) * this.K + this.K * this.K);
                this.a0 = (this.V + Math.sqrt(2*this.V) * this.K + this.K * this.K) * this.norm;
                this.a1 = 2 * (this.K * this.K - this.V) * this.norm;
                this.a2 = (this.V - Math.sqrt(2*this.V) * this.K + this.K * this.K) * this.norm;
                this.b1 = 2 * (this.K * this.K - 1) * this.norm;
                this.b2 = (1 - Math.sqrt(2) * this.K + this.K * this.K) * this.norm;
            }
            else {    // cut
                this.norm = 1 / (this.V + Math.sqrt(2*this.V) * this.K + this.K * this.K);
                this.a0 = (1 + Math.sqrt(2) * this.K + this.K * this.K) * this.norm;
                this.a1 = 2 * (this.K * this.K - 1) * this.norm;
                this.a2 = (1 - Math.sqrt(2) * this.K + this.K * this.K) * this.norm;
                this.b1 = 2 * (this.K * this.K - this.V) * this.norm;
                this.b2 = (this.V - Math.sqrt(2*this.V) * this.K + this.K * this.K) * this.norm;
            }
            break;
        }
    }

    process(inValue) {
        let outValue = inValue * this.a0 + this.z1;
        this.z1 = inValue * this.a1 + this.z2 - this.b1 * outValue;
        this.z2 = inValue * this.a2 - this.b2 * outValue;
        return outValue;
    }
}