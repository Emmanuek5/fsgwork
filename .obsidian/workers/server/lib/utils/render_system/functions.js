let functions = {
  animate: {
    parameters: ["element", "duration"],
    code: `
      element.animate(
        [
          { transform: 'translateY(0px)' }, 
          { transform: 'translateY(100px)' }
        ],
        { 
          duration: duration,
          iterations: 1, // Play the animation just once
        }
      );
    `,
  },
  fadeIn: {
    parameters: ["element", "duration"],
    code: `
      element.style.opacity = 0;
      element.animate(
        [
          { opacity: 0 },
          { opacity: 1 }
        ],
        { 
          duration: duration,
          iterations: 1, // Play the animation just once
          fill: "forwards" // Keep the end state (opacity 1)
        }
      );
    `,
  },
  fadeOut: {
    parameters: ["element", "duration"],
    code: `
      element.style.opacity = 1;
      element.animate(
        [
          { opacity: 1 },
          { opacity: 0 }
        ],
        { 
          duration: duration,
          iterations: 1, // Play the animation just once
          fill: "forwards" // Keep the end state (opacity 0)
        }
      );
    `,
  },
  rotate: {
    parameters: ["element", "duration"],
    code: `
      element.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(360deg)' }
        ],
        { 
          duration: duration,
          iterations: 1, // Play the animation just once
        }
      );
    `,
  },
  scale: {
    parameters: ["element", "duration"],
    code: `
        element.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(2)' }
          ],
          { 
            duration: duration,
            iterations: 1, // Play the animation just once
          }
        );
      `,
  },
  slideDown: {
    parameters: ["element", "duration"],
    code: `
        element.style.height = "0px";
        element.animate(
          [
            { height: "0px" },
            { height: "100px" }
          ],
          { 
            duration: duration,
            iterations: 1, // Play the animation just once
            fill: "forwards" // Keep the end state (height 100px)
          }
        );
      `,
  },
  slideUp: {
    parameters: ["element", "duration"],
    code: `
        element.style.height = "100px";
        element.animate(
          [
            { height: "100px" },
            { height: "0px" }
          ],
          { 
            duration: duration,
            iterations: 1, // Play the animation just once
            fill: "forwards" // Keep the end state (height 0px)
          }
        );
      `,
  },
  slideLeft: {
    parameters: ["element", "duration"],
    code: `
        element.style.width = "0px";
        element.animate(
          [
            { width: "0px" },
            { width: "100px" }
          ],
          { 
            duration: duration,
            iterations: 1, // Play the animation just once
            fill: "forwards" // Keep the end state (width 100px)
          }
        );
      `,
  },
  slideRight: {
    parameters: ["element", "duration"],
    code: `
        element.style.width = "100px";
        element.animate(
          [
            { width: "100px" },
            { width: "0px" }
          ],
          { 
            duration: duration,
            iterations: 1, // Play the animation just once
            fill: "forwards" // Keep the end state (width 0px)
          }
        );
      `,
  },
  slideIn: {
    parameters: ["element", "duration"],
    code: `
        element.style.transform = "translateX(-100%)";
        element.animate(
          [
            { transform: "translateX(-100%)" },
            { transform: "translateX(0%)" }
          ],
          { 
            duration: duration,
            iterations: 1, // Play the animation just once
            fill: "forwards" // Keep the end state (width 0px)
          }
        );
      `,
  },
  slideOut: {
    parameters: ["element", "duration"],
    code: `
        element.style.transform = "translateX(0%)";
        element.animate(
          [
            { transform: "translateX(0%)" },
            { transform: "translateX(-100%)" }
          ],
          { 
            duration: duration,
            iterations: 1, // Play the animation just once
            fill: "forwards" // Keep the end state (width 0px)
          }
        );
      `,
  },
  pulse: {
    parameters: ["element", "duration"],
    code: `
        element.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.2)" },
            { transform: "scale(1)" }
          ],
          { 
            duration: duration,
            iterations: 1, // Play the animation just once
          }
        );
      `,
  },
  popOut: {
    parameters: ["element", "duration"],
    code: `
        element.animate(
          [
            { opacity: 0 },
            { opacity: 1 }
          ],
          { 
            duration: duration,
            iterations: 1, // Play the animation just once
            fill: "forwards" // Keep the end state (opacity 1)
          }
        );
      `,
  },
  popIn: {
    parameters: ["element", "duration"],
    code: `
        element.animate(
          [
            { opacity: 1 },
            { opacity: 0 }
          ],
          { 
            duration: duration,
            iterations: 1, // Play the animation just once
            fill: "forwards" // Keep the end state (opacity 0)
          }
        );
      `,
  },
  animate3d: {
    parameters: [
      "imageElement",
      "sceneContainer",
      "width",
      "height",
      "shapeType",
      "rotationStyle",
    ],
    modules: [
      "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.7.1/gsap.min.js",
    ],
    code: `
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true }); // Set alpha to true for a clear background
    renderer.setSize(width, height);
    sceneContainer.appendChild(renderer.domElement);
    
    // Get the specified image element
    const image = imageElement;
    
    // Adjust the cube dimensions based on width and height parameters
    let geometry;
    if (shapeType === "cube") {
      geometry = new THREE.BoxGeometry(1, 1, 1);
    } else if (shapeType === "rect") {
      geometry = new THREE.PlaneGeometry(1, 1);
    } else {
      console.error("Invalid shapeType. Supported values are 'cube' and 'rect'.");
      return;
    }

    const texture = new THREE.Texture(image);
    texture.needsUpdate = true; // Ensure the texture updates when the image changes

    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.5 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 5;

    // Apply rotation style
    let rotationAnimation;
    if (rotationStyle === "rotate") {
      rotationAnimation = { duration: 1, x: Math.PI * 2, y: Math.PI * 2, repeat: -1, ease: "power2.inOut" };
    } else if (rotationStyle === "scale") {
      rotationAnimation = { duration: 1, scale: 1.2, yoyo: true, repeat: -1, ease: "power2.inOut" };
    } else if (rotationStyle === "bounce") {
      rotationAnimation = { duration: 1, y: 1, yoyo: true, repeat: -1, ease: "power2.inOut" };
    } else {
      console.error("Invalid rotationStyle. Supported values are 'rotate', 'scale', and 'bounce'.");
      return;
    }

    // Make it interactive
    gsap.to(cube.rotation, rotationAnimation);

    // Add touch event listeners for interaction
    let touchStartX = 0;
    let touchStartY = 0;

    function onTouchStart(event) {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }

    function onTouchMove(event) {
      const touchX = event.touches[0].clientX;
      const touchY = event.touches[0].clientY;

      const deltaX = touchX - touchStartX;
      const deltaY = touchY - touchStartY;

      cube.rotation.y += deltaX * 0.01;
      cube.rotation.x += deltaY * 0.01;

      touchStartX = touchX;
      touchStartY = touchY;
    }

    sceneContainer.addEventListener("touchstart", onTouchStart, false);
    sceneContainer.addEventListener("touchmove", onTouchMove, false);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }

    animate();
  `,
  },
};

module.exports = functions;
