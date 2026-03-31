import glsl from 'vite-plugin-glsl'
export default {
    base: '/threejs-glsl-no2-1/',  // GitHub Pages用など
    build: {
      outDir: 'docs',
    },
    plugins: [glsl()]
}
