export const fireVertShaderString = `
precision highp float;
attribute vec3 position; // OLD: attribute vec2 a_vertPosition;
attribute vec2 uv; // OLD: attribute vec2 a_texCoord;
uniform float u_deltaTime;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

varying vec2 v_texCoord;
varying vec2 v_uv_anim;
varying vec2 v_uv_anim_2;
varying vec2 v_uv_anim_3;


void main()
{
  // "technically" should be using uv, but position gives me more interesting results!
  v_uv_anim.x = ((position.x + u_deltaTime * 0.025) * 0.25 + 0.65);
  v_uv_anim.y = ((position.y - u_deltaTime) * 0.25);

  // used to be modulated by a second independent speed
  v_uv_anim_2.x = ((position.x - (u_deltaTime * 0.125)) * 0.25 + 0.65);
  v_uv_anim_2.y = ((position.y - u_deltaTime) * 0.25 + 0.65);

  // used to be modulated by a third independent speed
  v_uv_anim_3.x = ((position.x + (u_deltaTime * 1.5669 * 0.125)) * 0.25 + 0.65);
  v_uv_anim_3.y = ((position.y - (u_deltaTime * 1.5669)) * 0.25 + 0.65);

  v_texCoord = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`