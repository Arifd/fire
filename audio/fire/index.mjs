export {Crackling} from './crackling.js';
export {Hissing} from './hissing.js';
export {Roaring} from './roaring.js';
export {Glide} from './glide.js';
export const map = (value, in_min, in_max, out_min, out_max) => (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
export const TWO_PI = 6.28318530717958647693;