//////////////////////////////////////////////////////
// variables
let plane,
    sphere,
    sphereLight,

    planeCount = 0,
    planeCountIncrement = .06,

    cameraCount = 1, 
    cameraCountIncrement = Math.PI / 250,

    vert = [],
    initVerts = [],

    initAudio = false,
    audio = document.querySelector("audio"),
    analyser,
    frequencyData;


//////////////////////////////////////////////////////
// Set up dat.gui
const playlist = {
  "HOME - Resonance": "assets/music/HOME%20-%20Resonance.mp3",
  "憂鬱 - Sun": "assets/music/憂鬱%20-%20Sun.mp3"
};


const VizCtrl = function() {
  this.song = "";
  this.song = playlist["HOME - Resonance", "憂鬱 - Sun"];
  this.spread = 3;
  this.width = 40;
  this.sphereFrequency = 10;
  this.limit = 105;
  this.animSphere = true;
  this.animWave = true;
  this.animCrunch = true;
  this.resetPlane = () => {
    for (let x = 0; x < plane.geometry.vertices.length; x++) {
      let v = plane.geometry.vertices[x];
      v.x = initVerts[x];
      v.z = 0;
    }  
    plane.geometry.computeFaceNormals();	
    plane.geometry.normalsNeedUpdate = true;  
    plane.geometry.verticesNeedUpdate = true;
  }
};
const Viz = new VizCtrl();
const gui = new dat.GUI();

gui.add(Viz, "song", playlist).onChange(fetchSong);
gui.add(Viz, 'sphereFrequency', 0, 40).step(1)
gui.add(Viz, 'spread', 1, 10).step(.5)
gui.add(Viz, 'width', 10, 80).step(1)
gui.add(Viz, 'limit', 10, 200).step(1)
gui.add(Viz, 'animSphere')
gui.add(Viz, 'animWave')
gui.add(Viz, 'animCrunch')
gui.add(Viz, "resetPlane")
gui.close();


//////////////////////////////////////////////////////
// Set up three.js
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias:true });
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new THREE.OrbitControls(camera, renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild( renderer.domElement );

scene.add(camera);
camera.rotation.x = Math.PI/180 * 90;
buildScene()

function buildScene(){
  buildPlane();
  buildSphere();
  buildLight();
}

function buildPlane() {
  const g = new THREE.PlaneGeometry(200,200,40,40);
  const m = new THREE.MeshStandardMaterial({flatShading:1,
                                            wireframe:1,
                                            color:0x06414c,
                                            emissive: 0x03223d,
                                            emissiveIntensity:.8,
                                            metalness:.9,
                                            roughness:.5});
  plane = new THREE.Mesh(g,m);
  plane.rotation.x = Math.PI * 270 / 180;
  plane.position.y = -5;
  scene.add(plane);


  // Distort plane
  for (let x = 0; x < plane.geometry.vertices.length; x++) {
    let v = plane.geometry.vertices[x];
    let distanceFromCenterY = Math.abs(v.x)/100;

    v.z += distanceFromCenterY > .2 ? 
      (Math.random() * (20 - .15) + .15) * distanceFromCenterY * 2 : 
    (Math.random() * (.8 - .2) + .2)   + distanceFromCenterY;

    vert[x] = v;
    initVerts[x] = v.x;
  }

  //create separate wireframe
  const wireframe = plane.clone();
  wireframe.material = new THREE.MeshBasicMaterial({wireframe:true, color:0x00ffff});
  wireframe.scale.multiplyScalar(1.001);
  scene.add(wireframe)
}

function buildSphere() {
  const g = new THREE.SphereGeometry( 22, 20, 20 );
  const m = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe:false });
  sphere = new THREE.Mesh(g, m);
  sphere.position.z = -130;
  scene.add(sphere);

  camera.position.z = -20;
  controls.target.set(0,0,-100)
  controls.update();
}

function buildLight() {
  sphereLight = new THREE.SpotLight( 0xff00ff ,5,150,10,0,2);
  sphereLight.position.set( 0, 50, -130 );
  sphereLight.lookAt(sphere)
  scene.add(sphereLight)
  //   let l2 = new THREE.HemisphereLight( 0x000000, 0xffffff, 1 );
  //   let l3 = new THREE.PointLight( 0xff00ff,.6, 250 );
  //   l3.position.set(0, 50, -150 );
  //   scene.add( l2);
  //   scene.add(l3);
}

function visualize() {
  analyser.getByteFrequencyData(frequencyData);

  if (Viz.animSphere) {
    avg = frequencyData[Viz.sphereFrequency]/200;
    avg = (avg * avg) + .001;

    sphere.scale.set(avg, avg, avg)
    sphereLight.intensity = avg * avg * 20;
  }

  if (Viz.animWave || Viz.animCrunch) {
    planeSine = Math.sin(planeCount);
    planeCount += planeCountIncrement;

    for (let x = 0; x < plane.geometry.vertices.length; x++) {
      let v = plane.geometry.vertices[x];

      if (Viz.animWave) {
        v.z = 1 + Math.abs(Math.sin( (v.z) / Viz.width) * (frequencyData[Math.floor(x/Viz.spread)] * (vert[x].x/100) * 2 - 2)) / 3;
        v.z = clamp (v.z, 0, Viz.limit)
      }

      if (Viz.animCrunch)
        v.x += Math.sin(planeCount) * frequencyData[1] * .00005  * v.x;
    }  

    plane.geometry.computeFaceNormals();	
    plane.geometry.normalsNeedUpdate = true;  
    plane.geometry.verticesNeedUpdate = true;
  }
}


//////////////////////////////////////////////////////
// window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}


//////////////////////////////////////////////////////
// audio stuff

fetchSong(playlist["blackbird"])

// Update the fetchSong function to update the now playing section
function fetchSong(mp3 = Viz.song) {
  fetch(mp3)
    .then(response => {
      // Extract the URL from the response object
      const mp3Url = response.url;
      return response.blob();
    })
    .then(mp3 => {
      if (!initAudio) {
        initAudio = true;
        window.addEventListener("click", function allowAudio() {
          window.removeEventListener("click", allowAudio);
          playMusic(mp3);
          render();
          // Update the now playing section with the current song name (extracted filename)
          document.getElementById("current-song").textContent = "Now playing: " + extractFileName(mp3Url);
        });
      }
      else {
        playMusic(mp3);
        // Update the now playing section with the current song name (extracted filename)
        document.getElementById("current-song").textContent = "Now playing: " + extractFileName(mp3Url);
      }
    });
}


// Function to extract the filename from the path
function extractFileName(path) {
  // Split the path by '/' to get an array of parts
  const parts = path.split('/');
  // Get the last part, which is the filename
  const filename = parts[parts.length - 1];
  return filename;
}



function playMusic(mp3) {
  const audioContext = window.webkitAudioContext || window.AudioContext;
  const files = this.files;

  audio.src = URL.createObjectURL(mp3);
  audio.play();

  const context = new audioContext();
  const src = context.createMediaElementSource(audio);
  analyser = context.createAnalyser();

  src.connect(analyser);
  analyser.connect(context.destination);

  const bufferLength = analyser.frequencyBinCount;
  frequencyData = new Uint8Array(bufferLength);
}

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

file.onchange = function() {
  playMusic(this.files[0]);
}


//////////////////////////////////////////////////////
// Render called in fetchSong

function render() {
  camera.translateZ(Math.sin(cameraCount * .55) * .6);
  cameraCount += cameraCountIncrement;

  visualize()
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}
