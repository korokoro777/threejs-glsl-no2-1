import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import testVertexShader from './vertex.glsl'
import testFragmentShader from './fragment.glsl'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass.js'
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import flagImage from './1.png'

const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')
// Scene
const scene = new THREE.Scene()
//Textures
const textureLoader = new THREE.TextureLoader()
const flagTexture = textureLoader.load(flagImage)
// Geometry
const geometry = new THREE.PlaneGeometry(1, 1)

// Material
const material = new THREE.MeshBasicMaterial({
    map: flagTexture // テクスチャをマップとして設定
});

/*
カスタムシェーダーの実装
変位が頂点シェーダーで計算、その結果がフラグメントシェーダーで色の変更に使用
ジオメトリの形状自体と、その形状に基づく色の変更が同時
*/
// const material = new THREE.ShaderMaterial({
//     vertexShader: testVertexShader,
//     fragmentShader: testFragmentShader,
//     uniforms:{
//         uFrequency: { value: new THREE.Vector2(10, 5) },
//         uTime: { value: 0 },
//         uTexture: { value: flagTexture }
//     }
// })


// Mesh
const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

//Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
     // EffectComposerの更新
    effectComposer.setSize(window.innerWidth, window.innerHeight);
    effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
})

// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 1)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

//Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
//ポストプロセシング
const effectComposer = new EffectComposer(renderer)
effectComposer.setSize(sizes.width, sizes.height)
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const renderPass = new RenderPass(scene, camera)
effectComposer.addPass(renderPass)

const dotScreenPass = new DotScreenPass()
dotScreenPass.enabled = false
effectComposer.addPass(dotScreenPass)

const glitchPass = new GlitchPass()
//glitchPass.goWild = true //ノンストップ
glitchPass.enabled = false
effectComposer.addPass(glitchPass)

const unrealBloomPass = new UnrealBloomPass()
unrealBloomPass.strength = 0.3
unrealBloomPass.radius = 0.5
unrealBloomPass.threshold = 0.2
unrealBloomPass.enabled = false
effectComposer.addPass(unrealBloomPass)

const renderPixelatedPass = new RenderPixelatedPass( 10, scene, camera );
renderPixelatedPass.enabled = false
effectComposer.addPass( renderPixelatedPass )

const rgbShiftPass = new ShaderPass(RGBShiftShader)
rgbShiftPass.enabled = false
effectComposer.addPass(rgbShiftPass)

const TintShader = {
     uniforms:{
      tDiffuse: { value: null },
      uTint: { value: null }
    },
    vertexShader: `
        varying vec2 vUv;

        void main(){
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

            vUv = uv;
        }
    `,
   fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec3 uTint;

        varying vec2 vUv;

        void main()
        {
            vec4 color = texture2D(tDiffuse, vUv);
            color.rgb += uTint;

            gl_FragColor = color;
        }
    `
}

const tintPass = new ShaderPass(TintShader)
tintPass.material.uniforms.uTint.value = new THREE.Vector3(-0.5,0.5,0)
tintPass.enabled = false
effectComposer.addPass(tintPass)


//色の補正
const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
gammaCorrectionPass.enabled = false
effectComposer.addPass(gammaCorrectionPass);

//変位エフェクト
const DisplacementShader = {
    uniforms:
    {
        tDiffuse: { value: null },
        uTime: { value: null }
    },
    vertexShader: `
        varying vec2 vUv;

        void main(){
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vUv = uv;
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        varying vec2 vUv;

        void main(){

           vec2 newUv = vec2(
                vUv.x,
                vUv.y + sin(vUv.x * 10.0 + uTime) * 0.05
            );
            vec4 color = texture2D(tDiffuse, newUv);

            gl_FragColor = color;
        }
    `
}

const displacementPass = new ShaderPass(DisplacementShader)
displacementPass.enabled = false
effectComposer.addPass(displacementPass)

//変位エフェクト
const NormalMapDisplacementShader = {
    uniforms:
    {
        tDiffuse: { value: null },
        uNormalMap: { value: null }
    },
    vertexShader: `
        varying vec2 vUv;

        void main(){
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vUv = uv;
        }
    `,
     fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform sampler2D uNormalMap;

        varying vec2 vUv;

        void main()
        {
            vec3 normalColor = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
            vec2 newUv = vUv + normalColor.xy * 0.1;
            vec4 color = texture2D(tDiffuse, newUv);

            vec3 lightDirection = normalize(vec3(- 1.0, 1.0, 0.0));
            float lightness = clamp(dot(normalColor, lightDirection), 0.0, 1.0);
            color.rgb += lightness * 2.0;

            gl_FragColor = color;
        }
    `
}

const normalMapdisplacementPass = new ShaderPass(NormalMapDisplacementShader )
normalMapdisplacementPass.material.uniforms.uNormalMap.value = textureLoader.load('https://cdn.glitch.global/85d9d5ac-59a4-40d8-ae9f-6917ec5339a7/NormalMap.png?v=1704568562398')
normalMapdisplacementPass.enabled = false
effectComposer.addPass(normalMapdisplacementPass)


//アンチエイリアシング
const smaaPass = new SMAAPass()
smaaPass.enabled = false
effectComposer.addPass(smaaPass)

gui.add(dotScreenPass, 'enabled').name('Dot Screen');
gui.add(glitchPass, 'enabled').name('Glitch');
gui.add(unrealBloomPass, 'enabled').name('Unreal Bloom');
gui.add(renderPixelatedPass, 'enabled').name('Render Pixelated');
gui.add(rgbShiftPass, 'enabled').name('Rgb Shift');
gui.add(tintPass, 'enabled').name('Tint Pass');
gui.add(displacementPass, 'enabled').name('Displacement');
gui.add(normalMapdisplacementPass, 'enabled').name('NormalMap');
gui.add(gammaCorrectionPass, 'enabled').name('色補正');
gui.add(smaaPass, 'enabled').name('アンチエイリアシング');

//Animate
const clock = new THREE.Clock()
const tick = () =>{
    const elapsedTime = clock.getElapsedTime()
    //カスタムシェーデーでのuTime更新
    // material.uniforms.uTime.value = elapsedTime

    // 変位エフェクト用のUpdate passes
    //displacementPass.material.uniforms.uTime.value = elapsedTime

    controls.update()
   // renderer.render(scene, camera)
    effectComposer.render()
    window.requestAnimationFrame(tick)
}
tick()
