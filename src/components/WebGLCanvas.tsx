import React, { useEffect, useRef, useState } from 'react';

const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  varying vec2 v_texcoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texcoord = vec2(a_texcoord.x, 1.0 - a_texcoord.y);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  varying vec2 v_texcoord;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform int u_film_type;
  uniform float u_grain_amount;
  uniform float u_grain_size;
  uniform float u_time;
  uniform float u_contrast;
  
  // Light & Color adjustments
  uniform float u_exposure;
  uniform float u_highlights;
  uniform float u_shadows;
  uniform float u_temperature;
  uniform float u_tint;
  uniform float u_saturation;
  uniform float u_vibrance;
  uniform float u_target_hue;
  uniform float u_color_range;
  
  uniform int u_show_original;
  uniform float u_halation;
  uniform float u_vignette;

  // Simplex 2D noise for organic crystal structure
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Algorithmic film grain mimicking silver halide crystals
  float filmGrain(vec2 pos, float time) {
      float g1 = snoise(pos + time);
      float g2 = snoise(pos * 1.5 - time * 1.2);
      float g3 = snoise(pos * 2.0 + time * 0.8);
      return (g1 * 0.5 + g2 * 0.3 + g3 * 0.2);
  }

  vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  vec3 adjustContrast(vec3 color, float value) {
    return 0.5 + value * (color - 0.5);
  }

  void main() {
      vec4 color = texture2D(u_image, v_texcoord);
      
      if (u_show_original == 1) {
          gl_FragColor = color;
          return;
      }

      vec3 rgb = color.rgb;

      // 1. Basic Light Adjustments
      // Exposure (stops)
      rgb *= pow(2.0, u_exposure);

      // Shadows & Highlights
      float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
      float shadowZone = 1.0 - smoothstep(0.0, 0.5, luma);
      float highlightZone = smoothstep(0.5, 1.0, luma);
      rgb += shadowZone * u_shadows * 0.5;
      rgb += highlightZone * u_highlights * 0.5;

      // 2. White Balance (Temperature & Tint)
      rgb.r += u_temperature * 0.1 - u_tint * 0.05;
      rgb.g += u_tint * 0.1;
      rgb.b -= u_temperature * 0.1 + u_tint * 0.05;

      rgb = clamp(rgb, 0.0, 1.0);

      // 2.5 Saturation & Vibrance
      vec3 hsv = rgb2hsv(rgb);
      float hueDist = abs(hsv.x - u_target_hue);
      hueDist = min(hueDist, 1.0 - hueDist);
      
      float mask = 1.0;
      if (u_color_range < 1.0) {
          mask = 1.0 - smoothstep(u_color_range * 0.4, u_color_range * 0.5 + 0.001, hueDist);
      }
      
      float v_amt = u_vibrance * mask;
      if (v_amt > 0.0) {
          hsv.y += v_amt * (1.0 - hsv.y);
      } else {
          hsv.y += v_amt * hsv.y;
      }
      
      hsv.y += u_saturation * mask;
      hsv.y = clamp(hsv.y, 0.0, 1.0);
      
      rgb = hsv2rgb(hsv);

      // 3. Halation (Red glow around highlights)
      if (u_halation > 0.0 && u_film_type != 2 && u_film_type != 3 && u_film_type != 8) {
          vec2 texel = 1.0 / u_resolution;
          vec3 hBlur = vec3(0.0);
          float totalWeight = 0.0;
          
          // Use a 16-tap golden angle spiral for a smooth, natural blur
          for(int i = 1; i <= 16; i++) {
              float fi = float(i);
              float angle = fi * 2.39996; // Golden angle
              float radius = sqrt(fi) * 5.0 * u_halation;
              
              vec2 offset = vec2(cos(angle), sin(angle)) * texel * radius;
              vec3 s = texture2D(u_image, v_texcoord + offset).rgb;
              
              // Isolate highlights smoothly
              float l = dot(s, vec3(0.299, 0.587, 0.114));
              float w = smoothstep(0.6, 1.0, l);
              
              // Weight by distance from center for smooth falloff
              float distWeight = 1.0 - (sqrt(fi) / 4.5);
              
              hBlur += s * w * distWeight;
              totalWeight += distWeight;
          }
          
          hBlur /= totalWeight;
          // Add the red/orange glow
          rgb += hBlur * vec3(1.0, 0.15, 0.0) * u_halation * 2.5;
      }

      // 4. Contrast
      rgb = adjustContrast(rgb, u_contrast);

      // 5. Color Grading Profiles
      if (u_film_type == 0) {
          // Kodak Portra 400
          rgb.r = smoothstep(0.02, 0.98, rgb.r);
          rgb.g = smoothstep(0.0, 1.0, rgb.g);
          rgb.b = smoothstep(0.05, 0.95, rgb.b);
          rgb = mix(rgb, vec3(1.0, 0.9, 0.8) * rgb, 0.15);
      } else if (u_film_type == 1) {
          // Fuji Superia 400
          rgb.r = smoothstep(0.0, 1.0, rgb.r);
          rgb.g = smoothstep(0.02, 0.98, rgb.g) * 1.05;
          rgb.b = smoothstep(0.0, 0.95, rgb.b);
          rgb = mix(rgb, vec3(0.9, 1.0, 0.95) * rgb, 0.1);
      } else if (u_film_type == 2) {
          // Ilford HP5 Plus (B&W)
          float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
          lum = smoothstep(0.05, 0.95, lum);
          rgb = vec3(lum);
      } else if (u_film_type == 3) {
          // Kodak Tri-X 400 (B&W, High Contrast)
          float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
          lum = smoothstep(0.1, 0.9, lum);
          rgb = vec3(lum);
      } else if (u_film_type == 4) {
          // Cinestill 800T (Tungsten balanced, teal/orange push)
          rgb.r = smoothstep(0.0, 0.95, rgb.r);
          rgb.g = smoothstep(0.05, 1.0, rgb.g);
          rgb.b = smoothstep(0.1, 1.0, rgb.b);
          rgb = mix(rgb, vec3(0.8, 0.95, 1.0) * rgb, 0.2); // Cool shadows
      } else if (u_film_type == 5) {
          // Fuji Velvia 50 (High saturation, crushed blacks)
          rgb = adjustContrast(rgb, 1.15);
          float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
          rgb = mix(vec3(lum), rgb, 1.3);
          rgb.g = smoothstep(0.0, 0.95, rgb.g); // Vivid greens
      } else if (u_film_type == 6) {
          // Kodak Gold 200 (Warm, nostalgic)
          rgb.r = smoothstep(0.0, 1.0, rgb.r) * 1.05;
          rgb.b = smoothstep(0.05, 0.95, rgb.b);
          rgb = mix(rgb, vec3(1.0, 0.85, 0.7) * rgb, 0.2);
      } else if (u_film_type == 7) {
          // Agfa Vista 200 (Punchy reds, magenta tint)
          rgb.r = smoothstep(0.0, 0.95, rgb.r) * 1.1;
          rgb.g = smoothstep(0.05, 1.0, rgb.g);
          rgb = mix(rgb, vec3(1.0, 0.9, 0.95) * rgb, 0.15);
      } else if (u_film_type == 8) {
          // Ilford Delta 3200 (Low contrast B&W, lifted blacks)
          float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
          lum = smoothstep(0.0, 1.0, lum);
          lum = mix(0.1, 0.9, lum); // Lift blacks, mute whites
          rgb = vec3(lum);
      } else if (u_film_type == 9) {
          // Kodak Ektar 100 (High contrast, high saturation)
          rgb = adjustContrast(rgb, 1.1);
          float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
          rgb = mix(vec3(lum), rgb, 1.25);
          rgb.r = smoothstep(0.0, 0.95, rgb.r);
          rgb.b = smoothstep(0.0, 0.95, rgb.b);
      }

      // 6. Grain
      vec2 pos = v_texcoord * u_resolution / u_grain_size;
      float g = filmGrain(pos, u_time);

      float finalLuma = dot(rgb, vec3(0.299, 0.587, 0.114));
      float grainWeight = mix(0.4, 1.0, 1.0 - abs(finalLuma - 0.5) * 2.0);

      if (u_film_type == 2 || u_film_type == 3 || u_film_type == 8) {
          rgb += g * u_grain_amount * grainWeight;
      } else {
          float gR = filmGrain(pos, u_time + 12.3);
          float gG = filmGrain(pos, u_time + 45.6);
          float gB = filmGrain(pos, u_time + 78.9);
          vec3 colorGrain = vec3(gR, gG, gB);
          vec3 finalGrain = mix(vec3(g), colorGrain, 0.6);
          rgb += finalGrain * u_grain_amount * grainWeight;
      }

      // 7. Vignette
      vec2 center = v_texcoord - 0.5;
      float dist = length(center);
      float vig = smoothstep(1.0 - u_vignette * 0.5, 0.2, dist);
      rgb *= mix(1.0 - u_vignette, 1.0, vig);

      gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

interface WebGLCanvasProps {
  image: HTMLImageElement | null;
  filmType: number;
  
  // Light
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  
  // Color
  temperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
  targetHue: number;
  colorRange: number;
  
  // Grain
  grainAmount: number;
  grainSize: number;
  
  // Effects
  showOriginal: boolean;
  halation: number;
  vignette: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const WebGLCanvas: React.FC<WebGLCanvasProps> = ({
  image,
  filmType,
  exposure,
  contrast,
  highlights,
  shadows,
  temperature,
  tint,
  saturation,
  vibrance,
  targetHue,
  colorRange,
  grainAmount,
  grainSize,
  showOriginal,
  halation,
  vignette,
  canvasRef
}) => {
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const texcoordBufferRef = useRef<WebGLBuffer | null>(null);
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;
    programRef.current = program;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );
    positionBufferRef.current = positionBuffer;

    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
      ]),
      gl.STATIC_DRAW
    );
    texcoordBufferRef.current = texcoordBuffer;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;

    return () => {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(texcoordBuffer);
      gl.deleteTexture(texture);
    };
  }, [canvasRef]);

  useEffect(() => {
    const gl = glRef.current;
    const texture = textureRef.current;
    if (!gl || !texture || !image) return;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }, [image]);

  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;
    if (!gl || !program || !canvas || !image) return;

    const container = canvas.parentElement;
    if (container) {
      const containerAspect = container.clientWidth / container.clientHeight;
      const imageAspect = image.width / image.height;
      
      let drawWidth, drawHeight;
      if (imageAspect > containerAspect) {
        drawWidth = container.clientWidth;
        drawHeight = container.clientWidth / imageAspect;
      } else {
        drawHeight = container.clientHeight;
        drawWidth = container.clientHeight * imageAspect;
      }
      
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.style.width = `${drawWidth}px`;
      canvas.style.height = `${drawHeight}px`;
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texcoordLocation = gl.getAttribLocation(program, "a_texcoord");
    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBufferRef.current);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

    const filmTypeLocation = gl.getUniformLocation(program, "u_film_type");
    gl.uniform1i(filmTypeLocation, filmType);

    const grainAmountLocation = gl.getUniformLocation(program, "u_grain_amount");
    gl.uniform1f(grainAmountLocation, grainAmount);

    const grainSizeLocation = gl.getUniformLocation(program, "u_grain_size");
    gl.uniform1f(grainSizeLocation, grainSize);

    const timeLocation = gl.getUniformLocation(program, "u_time");
    gl.uniform1f(timeLocation, Math.random() * 100.0);

    // Light
    gl.uniform1f(gl.getUniformLocation(program, "u_exposure"), exposure);
    gl.uniform1f(gl.getUniformLocation(program, "u_contrast"), contrast);
    gl.uniform1f(gl.getUniformLocation(program, "u_highlights"), highlights);
    gl.uniform1f(gl.getUniformLocation(program, "u_shadows"), shadows);

    // Color
    gl.uniform1f(gl.getUniformLocation(program, "u_temperature"), temperature);
    gl.uniform1f(gl.getUniformLocation(program, "u_tint"), tint);
    gl.uniform1f(gl.getUniformLocation(program, "u_saturation"), saturation);
    gl.uniform1f(gl.getUniformLocation(program, "u_vibrance"), vibrance);
    gl.uniform1f(gl.getUniformLocation(program, "u_target_hue"), targetHue / 360.0);
    gl.uniform1f(gl.getUniformLocation(program, "u_color_range"), colorRange);

    // Grain
    gl.uniform1f(gl.getUniformLocation(program, "u_grain_amount"), grainAmount);
    gl.uniform1f(gl.getUniformLocation(program, "u_grain_size"), grainSize);

    // Effects
    gl.uniform1i(gl.getUniformLocation(program, "u_show_original"), showOriginal ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, "u_halation"), halation);
    gl.uniform1f(gl.getUniformLocation(program, "u_vignette"), vignette);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }, [
    image, filmType, exposure, contrast, highlights, shadows, 
    temperature, tint, saturation, vibrance, targetHue, colorRange,
    grainAmount, grainSize, halation, vignette, 
    showOriginal, windowSize, canvasRef
  ]);

  return null;
};

