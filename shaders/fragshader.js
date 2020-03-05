var fragShaderString = `
precision lowp float; // high precision seems to fix snoise on some phones

uniform vec2 u_resolution;
uniform float u_deltaTime;

varying vec2 v_texCoord;
varying vec2 v_uv_anim;
varying vec2 v_uv_anim_2;
varying vec2 v_uv_anim_3;
uniform sampler2D u_texture;
uniform sampler2D u_texture2;

uniform float u_flame_speed;// = 0.5;
uniform float u_noise2_move_speed;// = 0.725;
uniform float noise3_distance_from_noise2;
uniform float u_distortion_amount;// = 1.0;
uniform float u_distortion_amount_2;// = 1.0;
uniform float u_flame_size;
uniform float u_octave;

uniform vec3 u_colour6;
uniform vec3 u_colour5;
uniform vec3 u_colour4;
uniform vec3 u_colour3;
uniform vec3 u_colour2;
uniform vec3 u_colour1;

const int COLOUR_ARRAY_LENGTH = 7;

//  Function from Iñigo Quiles, modified by Arif Driessen
//  www.iquilezles.org/www/articles/functions/functions.htm
float cubicPulse( float c, float w, float p, float x ){
    x = abs(x - c);
    x /= w;
    return max(0.0,1.0 - pow(x,p) * (3.0-2.0*x));
}

//  Function from Iñigo Quiles
//  www.iquilezles.org/www/articles/functions/functions.htm
float parabola( float x, float k ){
    return pow( 4.0*x*(1.0-x), k );
}

void main() {
  vec2 uv = gl_FragCoord.xy/u_resolution;

  // populate colourArray with the colours sent in
  vec3 colourArray[COLOUR_ARRAY_LENGTH];
  colourArray[0] = vec3(0.0, 0.0, 0.0);
  colourArray[1] = u_colour1;
  colourArray[2] = u_colour2;
  colourArray[3] = u_colour3;
  colourArray[4] = u_colour4;
  colourArray[5] = u_colour5;
  colourArray[6] = u_colour6;

  // modulate one noise by two others moving up at different speeds
  float mod1 = (texture2D(u_texture, v_uv_anim_2).b * 2.0 - 1.0) * u_distortion_amount;
  float mod2 = (texture2D(u_texture, v_uv_anim_3).b * 2.0 - 1.0) * u_distortion_amount;

  vec2 noiseCoords = vec2(v_uv_anim.y + mod1,
                          v_uv_anim.x - mod2);

  // create a final noise texture (by distorting noise with more layers of noise)
  float n = texture2D(u_texture, noiseCoords).b;
  //float n = smoothstep(0.1,0.9,texture2D(u_texture, noiseCoords).b);
  // side chain: take a thined out copy of noise, following a different gradient to add back in later as another layer of colour/detail on top.
  float sideChainNoise = smoothstep(0.8,1.0,n);

  // create gradient map
  float curveAtTop = pow(abs(uv.x - 0.5), 1.75);
  float fadeTheSides = cubicPulse(0.5, 0.5, 40.0, uv.x);
  float g = mix(0.0,-1.0, (uv.y - 0.2) + curveAtTop) - mix(1.0,0.0, fadeTheSides);
  // CURRENTLY EXPERIMENTING WITH USING A WEBCAM AS GRADIENT
  float input2 = texture2D(u_texture2, v_texCoord).r;
  // modulate the gradient which brings input2 INTO the fuel of the flames (not just infront or behind)
  // g *= g + (input2); // if colourising later at the end, disable this gradient modulation
  // don't like this because it has side effects on the gradient
  
  // create 2nd gradient for smoke effect
  float g2 = mix(1.0,0.0, uv.y) * parabola(uv.x, 1.0);

  // create 3rd gradient for spooky spirit
  //float g3 = g * g2 * cubicPulse(0.5, 0.5, 1.2, uv.y) * 2.0;

  // add noise to gradient. this is our fire, pre colour.
  float ng = n + g;
  
  // filter sideChainNoise by the gradient 
  sideChainNoise *= max(0.0, ng + (g + 0.25)) * 2.0;

  // now we have ng we want to colourise it based on its 'heat/intensity' (greyscale value)  
  // interpolating in a lookup table:
  // find out where we should be ideally. (floatily).
  float ngIndex = max(0.0, ng) * float(COLOUR_ARRAY_LENGTH);
  // get the int value, and what was the float
  int ngIndexInt = int(floor(ngIndex));
  float ngIndexFract = fract(ngIndex);

  // ABSOLUTELY stupid that we must create a loop and an if check, simply inplace of using the variable ngIndexLower, but WebGL1. indexing array must be loop or constant
  vec3 colour;
  for (int i = 0; i < COLOUR_ARRAY_LENGTH; ++i)
  {
    if (i == ngIndexInt)
      // interpolate the index with the next one, by the fract amount.
      colour = mix(colourArray[i], colourArray[i+1], vec3(ngIndexFract));

      // basic colour, simple table lookup (for cartoon effect)
      //colour = colourArray[i];
  }

  // because lookup table is in RGB 0 - 255, we need to normalise to 0 - 1.
  // this can be completely optimised out by pre-applying it to the lookup table, but for now, it's only one operation.
  // colour *= vec3(0.00392156862); // this is the equivalent of divide by 255.

  // create a 'spooky pirit' input by modulating webcam with gradient and noise
  // float spirit = input2 * ((ng * 20.0)) * ng * g2; 
  // colour += min(0.333,spirit);
  
  // finally add your sideChainNoise value back in, to bump up the brightness 
  colour += sideChainNoise;

  // smoke effect
  float smoke = ((mod1 * 2.0) * (mod2 * 2.0)) * (-2.0 * (g2 * g));

  colour += smoke;

  // debug: check where X pulls into the negative
  /////////////////////////////////////////////////
  // float X = g2;
  // colour = vec3(X);
  // if (X < 0.0) colour = vec3(-1.0 * X,0.0,0.0);
  /////////////////////////////////////////////

  // send to output buffer
  gl_FragColor = vec4(vec3(colour),1.0);
  //gl_FragColor = texture2D(u_texture, v_uv_anim);
}
`