import {Renderer, Camera, Transform, Texture, Program, Mesh, Plane} from './ogl/index.mjs';
import {fireVertShaderString} from '../shaders/fire/vert.js';
import {fireFragShaderString} from '../shaders/fire/frag.js';
import * as utils from './utils.js';
import {Audio} from '../audio/audio.js';
import {Glide} from '../audio/fire/index.mjs';

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// STATS.JS STUFF
let stats = new Stats();
stats.domElement.height = '48px';
[].forEach.call(stats.domElement.children, (child) => (child.style.display = ''));
document.head.insertAdjacentHTML('afterbegin','<style type="text/css">.dg li.gui-stats:not(.folder) {height: auto;}</style>');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// DAT GUI STUFF
let guiChange = true; // flag to determine whether to update uniforms
let guiControls = new function() {
  this.distortion_amount = 0.4;

  this.allColours = 0.1;
  this.colour1 = [0.0, 0.0, 0.0];
  this.colour2 = [20.0, 12.0, 0.0];
  this.colour3 = [65.0, 3.0, 3.0];
  this.colour4 = [203.0, 30.0, 7.0];
  this.colour5 = [233.0, 201.0, 24.0];
  this.colour6 = [248.0, 240.0, 203.0];

  this.Audio = true;
  this.AudioEngine = utils.detectAudioWorklet()? 'AudioWorklet' : utils.detectScriptProcessorNode()? 'ScriptProcessorNode' : 'Pure JS fallback';

  // this.FREQ = 10;
  // this.Q = 1;
  // this.PEAK = 0.001;
}
let gui = new dat.GUI({width: 253});
let f1 = gui.addFolder('Shape');
f1.add(guiControls, 'distortion_amount', 0, 1).setValue(0.31).onChange(() => guiChange = true);
let f2 = gui.addFolder('Colour');
f2.add(guiControls, 'allColours', 0, 1).setValue(0).onChange(() => guiChange = true);
f2.addColor(guiControls, 'colour1').onChange(() => guiChange = true);
f2.addColor(guiControls, 'colour2').onChange(() => guiChange = true);
f2.addColor(guiControls, 'colour3').onChange(() => guiChange = true);
f2.addColor(guiControls, 'colour4').onChange(() => guiChange = true);
f2.addColor(guiControls, 'colour5').onChange(() => guiChange = true);
f2.addColor(guiControls, 'colour6').onChange(() => guiChange = true);
let f3 = gui.addFolder('Audio');
f3.add(guiControls, 'Audio').onChange(() => guiControls.Audio? audio.audioContext.resume() : audio.audioContext.suspend());
f3.add(guiControls, 'AudioEngine');
// hack to add stats.js into datGUI
let perfFolder = gui.addFolder("Performance");
let perfLi = document.createElement("li");
stats.domElement.style.position = "static";
perfLi.appendChild(stats.domElement);
perfLi.classList.add("gui-stats");
perfFolder.__ul.appendChild(perfLi);

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// RENDERER
const renderer = new Renderer({
  width: window.innerWidth,
  height: window.innerHeight,
  alpha: false,
  depth: false,
  webgl: 1
});

const gl = renderer.gl;
document.body.appendChild(gl.canvas);

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// CAMERA
const camera = new Camera(gl, {fov: 35});
camera.position.set(0, 0, 1);
camera.lookAt([0, 0, 0]);

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// MISC
function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.perspective({aspect: gl.canvas.width / gl.canvas.height});
};
resize();
window.addEventListener('resize', resize, false);

const width = gl.canvas.width;
const height = gl.canvas.height;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// SCENE
const scene = new Transform();

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// MESHES
let fire = createFireMesh();
function createFireMesh() {
  const geometry = new Plane(gl);

  // Upload empty texture while source loading
  const texture = new Texture(gl, {wrapS: gl.REPEAT, wrapT: gl.REPEAT});
  
  // update image value with source once loaded
  const img = new Image();
  img.src = 'assets/noise-composition.png';
  img.onload = () => texture.image = img;

  const program = new Program(gl, {
    transparent: true,
    vertex: fireVertShaderString,
    fragment: fireFragShaderString,
    uniforms: {
      u_deltaTime: {value: 0},
      u_resolution: {value: [window.innerWidth, window.innerHeight]},
      u_flame_speed: {value: guiControls.flame_speed},
      u_noise2_move_speed: {value: guiControls.noise2_move_speed},
      noise3_distance_from_noise2: {value: guiControls.noise3_distance_from_noise2},
      u_distortion_amount: {value: guiControls.distortion_amount},
      u_flame_size: {value: guiControls.flame_size},

      u_colour1: {value: guiControls.colour1.map(e => e / 255)},
      u_colour2: {value: guiControls.colour2.map(e => e / 255)},
      u_colour3: {value: guiControls.colour3.map(e => e / 255)},
      u_colour4: {value: guiControls.colour4.map(e => e / 255)},
      u_colour5: {value: guiControls.colour5.map(e => e / 255)},
      u_colour6: {value: guiControls.colour6.map(e => e / 255)},

      u_texture: {value: texture},
      u_texture2: {value: ""}
  }});

  const mesh = new Mesh(gl, {geometry, program});
  return mesh; 
}
scene.addChild(fire);

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// AUDIO
const audio = new Audio();
audio.start();

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// PROCESS PIXELS
// create an array that will be continuously updated in the render loop
const pixelDataNumPixels = width * height;
const pixelDataRGBChannelMaxValue = (255 * pixelDataNumPixels * 3) / 4; // *3 because we only care about RGB. /4 because we are actually averaging 1 in 4 pixels for speed
let pixelData = new Uint8Array(pixelDataNumPixels * 4);
// a glider to interpolate changing pan positions
let panGlide = new Glide();
panGlide.init(width/2, 200, 60);

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// RENDER LOOP
let frameCount = 0;
function renderLoop(dt) {
  stats.begin();
    requestAnimationFrame(renderLoop);

    // dt *= 0.0006;

    //..........................................................
    // set fire uniforms
    let program = fire.program;
    program.uniforms.u_deltaTime.value = ++frameCount * 0.012;
    if (guiChange) {
      program.uniforms.u_distortion_amount.value = guiControls.distortion_amount;            program.uniforms.u_flame_size.value = guiControls.flame_size;
    
      // adjust Colours
      let colourArray = [guiControls.colour1,
                         guiControls.colour2,
                         guiControls.colour3,
                         guiControls.colour4,
                         guiControls.colour5,
                         guiControls.colour6];
      for (let i = 0; i < colourArray.length; ++i)
      {
        // convert to HSL
        let hslArray = utils.rgbToHsl(colourArray[i][0],
                                colourArray[i][1],
                                colourArray[i][2]); 
        
        // adjust
        hslArray[0] = (hslArray[0] + guiControls.allColours) % 1;

        // convert back to RGB
        let outColour = utils.hslToRgb(hslArray[0],
                                  hslArray[1],
                                  hslArray[2]);

        // send out updated numbers to GPU
        program.uniforms[`u_colour${i+1}`].value = outColour.map(e => e / 255);
      }
      guiChange = false;
    }

    renderer.render({scene, camera});
    
    //..........................................................
    // Extract pixel information from canvas, smoothly interpolate and send to audio synthesizer
    if (frameCount & 1) {let fs = (processPixels() * 5) + 0.2; audio.fireSize = fs; /* console.log(fs); */}
    stats.end();
}

requestAnimationFrame(renderLoop);

function processPixels(){
  // this function looks at any given frame and extracts mean size and peak horizontal position
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
  let acc = 0; // accumulator
  let i = pixelData.length;
  let largest = 0;
  let peakColumn = 0;
  while (i>0) {
    let value = 0;
    let pixel = Math.floor(i / 4);
    let column = pixel % width;

    // value += pixelData[i-1]; // A (not using the alpha channel)
    value += pixelData[i-2]; // B
    value += pixelData[i-3]; // G
    value += pixelData[i-4]; // R

    acc += value;

    // bias value to pixels higher up in the screen
    value *= (width - Math.floor(pixel / width)) * 2;

    // update largest value and peak column
    if (value > largest) {largest = value; peakColumn = column;}

    i -= 16; // 16 = (RGBA * 4), because every 4th pixel is enough infer an average
  }

  let pan = panGlide.process(peakColumn);

  // drawPointer(pan);

  // update audio pan position
  audio.pan = (pan/width) * 2 - 1;

  return acc / pixelDataRGBChannelMaxValue;
}
