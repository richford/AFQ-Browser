// Tell jslint that certain variables are global
/* global afqb, THREE, THREEx, dat, d3, d3_queue, Stats, $, Float32Array */

// =========== three js part

// Combine the init and animate function calls for use in d3.queue()
afqb.three.initAndAnimate = function (error) {
    "use strict";
    if (error) { throw error; }
    afqb.three.init(afqb.plots.initCheckboxes);
	afqb.three.animate();
};

afqb.three.stats = {};

if (afqb.three.settings.showStats) {
	afqb.three.stats = new Stats();
	afqb.three.container.appendChild(afqb.three.stats.dom);
}

afqb.three.init = function (callback) {
    "use strict";
    afqb.three.colorGroups = new THREE.Object3D();
    afqb.three.greyGroups = new THREE.Object3D();

    afqb.three.greyLineMaterial = new THREE.LineBasicMaterial({
        opacity: afqb.three.settings.fiberOpacity,
        linewidth: afqb.three.settings.fiberLineWidth,
        transparent: true,
        depthWrite: true
    });

    afqb.three.greyLineMaterial.color.setHex(0x444444);

    afqb.three.colorLineMaterial = new THREE.LineBasicMaterial({
        opacity: 0.0,
        linewidth: 0.000000000001,
        transparent: true,
        depthWrite: false
    });

	// We put the renderer inside a div with id #threejsbrain
	afqb.three.container = document.getElementById("threejsbrain");

    var width = afqb.three.container.clientWidth;
	var height = afqb.three.container.clientHeight;

    afqb.three.camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    afqb.three.camera.position.copy(new THREE.Vector3(
        afqb.three.settings.cameraPosition.x,
        afqb.three.settings.cameraPosition.y,
        afqb.three.settings.cameraPosition.z
    ));

	afqb.three.camera.up.set(0, 0, 1);

    // scene
    afqb.three.scene = new THREE.Scene();

    var ambient = new THREE.AmbientLight(0x111111);
    afqb.three.scene.add(ambient);

    afqb.three.directionalLight = new THREE.DirectionalLight(0xffeedd, 1);
    afqb.three.directionalLight.position.set(
		afqb.three.camera.position.x,
		afqb.three.camera.position.y,
		afqb.three.camera.position.z
    );
    afqb.three.scene.add(afqb.three.directionalLight);

    var manager = new THREE.LoadingManager();
    manager.onProgress = function (item, loaded, total) {
        // console.log(item, loaded, total);
    };

    // renderer
    afqb.three.renderer = new THREE.WebGLRenderer({ alpha: true });

    afqb.three.renderer.setSize(width, height);
    afqb.three.container.appendChild(afqb.three.renderer.domElement);

    afqb.three.renderer.domElement.addEventListener("mouseout", function () {
        afqb.three.colorGroups.traverse(function (child) {
            if (child instanceof THREE.LineSegments) {
                afqb.three.mouseoutBundle(child.name);
            }
        });
    });

    // dom event
    var domEvents = new THREEx.DomEvents(afqb.three.camera, afqb.three.renderer.domElement);

    // model
    // load brain surface
    var loader = new THREE.OBJLoader(manager);
    loader.load('data/freesurf.OBJ', function (object) {
        afqb.three.brain = object;
        afqb.three.rh = object.getObjectByName('rh.pial.asc');
        afqb.three.lh = object.getObjectByName('lh.pial.asc');

        object.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material.depthWrite = true;
                child.material.transparent = true;

				child.rotation.x = Math.PI / 2;
				child.scale.set(1.75, 1.75, 1.75);
				child.renderOrder = 3;
            }
        });
		afqb.three.lh.translateX(-0.05);
		afqb.three.rh.translateX(0.05);

        afqb.three.lh.material.opacity = afqb.three.settings.lHOpacity;
        afqb.three.rh.material.opacity = afqb.three.settings.rHOpacity;

		afqb.three.lh.material.color.setHex(0xe8e3d3);
		afqb.three.rh.material.color.setHex(0xe8e3d3);

        afqb.three.scene.add(object);
    });

	var ThreeGuiConfigObj = function () {
		this.lhOpacity = parseFloat(afqb.three.settings.lHOpacity);
		this.rhOpacity = parseFloat(afqb.three.settings.rHOpacity);
		this.fiberOpacity = parseFloat(afqb.three.settings.fiberOpacity);
		this.highlight = afqb.three.settings.mouseoverHighlight;
		this.fiberRepresentation = afqb.three.settings.fiberRepresentation;
	};

	afqb.three.gui = new dat.GUI({
		autoplace: false,
		width: 350,
		scrollable: false
	});

	afqb.global.controls.threeControlBox = new ThreeGuiConfigObj();

	var lhOpacityController = afqb.three.gui
		.add(afqb.global.controls.threeControlBox, 'lhOpacity')
		.min(0).max(1).step(0.01).name('Left Hemi Opacity');

	lhOpacityController.onChange(function (value) {
		afqb.three.lh.traverse(function (child) {
			if (child instanceof THREE.Mesh) {
				child.material.opacity = value;
			}
		});
	});

    lhOpacityController.onFinishChange(function(value) {
        // Update the query string
    	afqb.global.updateQueryString(
            {three: {lHOpacity: value.toString()}}
		);
    });

	var rhOpacityController = afqb.three.gui
		.add(afqb.global.controls.threeControlBox, 'rhOpacity')
		.min(0).max(1).step(0.01).name('Right Hemi Opacity');

	rhOpacityController.onChange(function (value) {
		afqb.three.rh.traverse(function (child) {
			if (child instanceof THREE.Mesh) {
				child.material.opacity = value;
			}
		});
	});

    rhOpacityController.onFinishChange(function(value) {
        // Update the query string
        afqb.global.updateQueryString(
            {three: {rHOpacity: value.toString()}}
        );
    });

	var fiberOpacityController = afqb.three.gui
		.add(afqb.global.controls.threeControlBox, 'fiberOpacity')
		.min(0).max(1).name('Fiber Opacity');

	fiberOpacityController.onChange(function (value) {
        afqb.three.greyGroups.traverse(function (child) {
			if (child instanceof THREE.LineSegments) {
                child.material.opacity = value;
				if (value === 0) {
					child.material.depthWrite = false;
				} else {
					child.material.depthWrite = true;
				}
			}
		});
	});

    fiberOpacityController.onFinishChange(function(value) {
        // Update the query string
        afqb.global.updateQueryString(
            {three: {fiberOpacity: value.toString()}}
        );
    });

    // Add highlight controller
	var mouseoverHighlightController = afqb.three.gui
		.add(afqb.global.controls.threeControlBox, 'highlight')
		.name('Mouseover Highlight');

	mouseoverHighlightController.onFinishChange(function(value) {
        // Update the query string
        afqb.global.updateQueryString(
            {three: {mouseoverHighlight: value.toString()}}
        );
	});

    // Add fiber representation controller
    afqb.three.gui
        .add(afqb.global.controls.threeControlBox, 'fiberRepresentation', ['all fibers', 'core fiber'])
        .name('Fiber Representation');

	var guiContainer = document.getElementById('three-gui-container');
	guiContainer.appendChild(afqb.three.gui.domElement);
	afqb.three.gui.close();

    // contain all bundles in this Group object
    // each bundle is represented by an Object3D
    // load fiber bundle using jQuery
	var greyGeometry = new THREE.Geometry();

    $.getJSON("data/afq_streamlines.json", function (json) {
        Object.keys(json).forEach(function (bundleKey) {
            var oneBundle = json[bundleKey];
            var nFibers = 0;

            // Retrieve the core fiber and then delete it from the bundle object
            var coreFiber = oneBundle['coreFiber'];
            delete oneBundle['coreFiber'];

            // fiberKeys correspond to individual fibers in each fiber bundle
            // They may not be consecutive keys depending on the
            // downsampling of the input data, hence the need for `nFibers`
            // and `iFiber`
            //
            // First loop simply counts the number of fibers in this bundle
            // and asserts that each individual fiber has been resampled to
            // the same size.
			var firstKey = Object.keys(oneBundle)[0];
            var referenceLength = oneBundle[firstKey].length;
            Object.keys(oneBundle).forEach(function (fiberKey) {
                ++nFibers;
                var oneFiber = oneBundle[fiberKey];
                if (oneFiber.length !== referenceLength) {
                    var errMessage = ('Streamlines have unexpected length. ' +
						'faPlotLength = ' + referenceLength + ', ' +
						'but oneFiber.length = ' + oneFiber.length);
                    if (typeof Error !== 'undefined') {
                        throw new Error(errMessage);
                    }
                    throw errMessage;
                }
            });

            // Positions will hold x,y,z vertices for each fiber
            var positions = new Float32Array(
                nFibers * (referenceLength - 1) * 3 * 2
            );

            // var corePositions = new Float32Array(
            	// (coreFiber.length - 1) * 3 * 2
			// );

            // Outer loop is along the length of each fiber.
            // Inner loop cycles through each fiber group.
            // This is counter-intuitive but we want spatial locality to
            // be preserved in index locality. This will make brushing
            // much easier in the end.
            Object.keys(oneBundle).forEach(function (fiberKey, iFiber) {
                for (var i = 0; i < referenceLength - 1; i++) {
                    var oneFiber = oneBundle[fiberKey];

                    // Vertices must be added in pairs. Later a
                    // line segment will be drawn in between each pair.
                    // This requires some repeat values to have a
                    // continuous line but will allow us to avoid
                    // having the beginning and end of the fiber
                    // connect.
                    var offset = i * nFibers * 6 + iFiber * 6;
                    positions.set(oneFiber[i].concat(oneFiber[i+1]), offset);
                }
            });

            // for (var i = 0; i < coreFiber.length - 1; i++) {
            //     var offset = 6 * i;
            //     corePositions.set(oneFiber[i].concat(oneFiber[i+1]), offset);
            // }

            // Create a buffered geometry and line segments from these
            // positions. Buffered Geometry is slightly more performant
            // and necessary to interact with d3 brushing later on.
            var bundleGeometry = new THREE.BufferGeometry();

            bundleGeometry.addAttribute(
            	'position', new THREE.BufferAttribute(positions, 3)
			);

            greyGeometry.merge(
                new THREE.Geometry().fromBufferGeometry(bundleGeometry)
			);

            // var coreBundleGeometry = new THREE.BufferGeometry();
            //
            // coreBundleGeometry.addAttribute(
            //     'position', new THREE.BufferAttribute(corePositions, 3)
            // );
            //
            // greyGeometry.merge(
            //     new THREE.Geometry().fromBufferGeometry(coreBundleGeometry)
            // );

            var colorBundleLine = new THREE.LineSegments(
            	bundleGeometry, afqb.three.colorLineMaterial
			);

            // Set scale to match the brain surface,
            // (determined by trial and error)
            colorBundleLine.scale.set(0.05,0.05,0.05);
            colorBundleLine.position.set(0, 0.8, -0.5);

            // Record some useful info for later
            colorBundleLine.name = bundleKey.toLowerCase().replace(/\s+/g, "-");
            colorBundleLine.nFibers = nFibers;

            afqb.three.colorGroups.add(colorBundleLine);

            // var coreColorBundleLine = new THREE.LineSegments(
            //     coreBundleGeometry, afqb.three.colorLineMaterial
            // );
            //
            // // Set scale to match the brain surface,
            // // (determined by trial and error)
            // coreColorBundleLine.scale.set(0.05,0.05,0.05);
            // coreColorBundleLine.position.set(0, 0.8, -0.5);
            //
            // // Record some useful info for later
            // coreColorBundleLine.name = bundleKey;
            // coreColorBundleLine.nFibers = 1;
            //
            // afqb.three.colorGroups.add(coreColorBundleLine);
        });

		// Set material properties for each fiber bundle
		// And add event listeners for mouseover, etc.
		afqb.three.colorGroups.traverse(function (child) {
			if (child instanceof THREE.LineSegments) {
				domEvents.addEventListener(child, 'mouseover', function() {
					if(!afqb.global.mouse.isDown) {
						afqb.three.mouseoverBundle(child.name);
						return afqb.three.renderer.render(afqb.three.scene, afqb.three.camera);
					}
				});
				domEvents.addEventListener(child, 'mousemove', function() {
					afqb.global.mouse.mouseMove = true;
				});
				domEvents.addEventListener(child, 'mousedown', function() {
					afqb.global.mouse.mouseMove = false;
				});
				domEvents.addEventListener(child, 'mouseup', function() {
					if(!afqb.global.mouse.mouseMove) {
                        var myBundle = d3.selectAll("input.tracts").filter(function (d) {
                            return d.toLowerCase().replace(/\s+/g, "-") === child.name;
                        })[0][0];
						myBundle.checked = !myBundle.checked;
						afqb.plots.settings.checkboxes[myBundle.name] = myBundle.checked;
						afqb.plots.showHideTractDetails(myBundle.checked, myBundle.name);
						afqb.three.highlightBundle(myBundle.checked, myBundle.name);

                        // Update the query string
                        var checkboxes = {};
                        checkboxes[myBundle.name] = myBundle.checked;
                        afqb.global.updateQueryString(
                            {plots: {checkboxes: checkboxes}}
                        );

						return afqb.three.renderer.render(afqb.three.scene, afqb.three.camera);
					} else {
						afqb.global.mouse.mouseMove = false;
					}
				});
				domEvents.addEventListener(child, 'mouseout', function() {
				    afqb.three.mouseoutBundle(child.name);
					return afqb.three.renderer.render(afqb.three.scene, afqb.three.camera);
				});
            }
        });

		var greyBundleLine = new THREE.LineSegments(
				greyGeometry, afqb.three.greyLineMaterial);
		greyBundleLine.scale.set(0.05,0.05,0.05);
        greyBundleLine.position.set(0, 0.8, -0.5);

		afqb.three.greyGroups.add(greyBundleLine);

		afqb.three.greyGroups.renderOrder = 1;
		afqb.three.colorGroups.renderOrder = 2;

		// Finally add fiber bundle group to the afqb.three.scene.
  		afqb.three.scene.add(afqb.three.colorGroups);
		afqb.three.scene.add(afqb.three.greyGroups);
        
        if (callback) { callback(null); }
    });

    window.addEventListener('resize', afqb.three.onWindowResize, false);
    afqb.three.orbitControls = new THREE.OrbitControls(afqb.three.camera, afqb.three.renderer.domElement);
    afqb.three.orbitControls.addEventListener('change', afqb.three.lightUpdate);
    afqb.three.orbitControls.enableKeys = false;

    afqb.three.renderer.domElement.addEventListener('click', function() {
		// Update the query string
		var cameraPosition = afqb.three.camera.position.clone();
        afqb.global.updateQueryString(
            {three: {cameraPosition: cameraPosition}}
        );
    }, false);
};

// Resize the three.js window on full window resize.
afqb.three.onWindowResize = function () {
    "use strict";
    var width = afqb.three.container.clientWidth;
	var height = afqb.three.container.clientHeight;

    afqb.three.camera.aspect = width / height;
    afqb.three.camera.updateProjectionMatrix();

    afqb.three.renderer.setSize(width, height);
};

afqb.three.animate = function () {
    "use strict";
    requestAnimationFrame(afqb.three.animate);
    afqb.three.renderer.render(afqb.three.scene, afqb.three.camera);
    afqb.three.orbitControls.update();
	if (afqb.three.settings.showStats) {
		afqb.three.stats.update();
    }

	// For each fiber bundle update the length of fiber to be plotted
	// based on the d3 brushes in the 2D plots
    afqb.three.colorGroups.children.forEach(function (element) {
        var lo = Math.floor(afqb.plots.settings.brushes[element.name].brushExtent[0]);
        var hi = Math.ceil(afqb.plots.settings.brushes[element.name].brushExtent[1]) - 1;

        // loIdx is the low index and count is the number of indices
        // This is a little sloppy and sometimes the count will be too high
        // but the visual offset should be minimal.
        // TODO: Positions come in pairs, with all vertices except the first
        // and last being repeated. Take this into account to make loIdx and
        // count correct (not just good enough).
        var loIdx = lo * element.nFibers * 2;
        var count = (hi - lo) * element.nFibers * 2;

        // Set the drawing range based on the brush extent.
        element.geometry.setDrawRange(loIdx, count);
	});
};

afqb.three.lightUpdate = function () {
    "use strict";
    afqb.three.directionalLight.position.copy(afqb.three.camera.position);
};

// Highlight specified bundle based on left panel checkboxes
afqb.three.highlightBundle = function (state, name) {
    "use strict";

	// Temporary line material for highlighted bundles
	var tmpLineMaterial = new THREE.LineBasicMaterial({
		opacity: afqb.three.settings.colorOpacity,
		linewidth: afqb.three.settings.colorLineWidth,
		transparent: true,
		depthWrite: true
	});

    var names = afqb.plots.tracts.map(function(name) {
        return name.toLowerCase().replace(/\s+/g, "-");
    });
    var index = names.indexOf(name);

    var bundle = afqb.three.colorGroups.children.filter(function (element) {
        return element.name === name;
    })[0];

	if (bundle !== undefined) {
		if (state === true) {
			tmpLineMaterial.color.setHex( afqb.global.colors[index] );
			bundle.material = tmpLineMaterial;
			return afqb.three.renderer.render(afqb.three.scene, afqb.three.camera);

		} else {
			bundle.material = afqb.three.colorLineMaterial;
			return afqb.three.renderer.render(afqb.three.scene, afqb.three.camera);
		}
	}
};

afqb.three.mouseoutBundle = function (name) {
    var myBundle = d3.selectAll("input.tracts").filter(function (d) {
    	return d.toLowerCase().replace(/\s+/g, "-") === name;
    })[0][0];
    afqb.three.highlightBundle(myBundle.checked, myBundle.name);
};

// Highlight specified bundle based on mouseover
afqb.three.mouseoverBundle = function (name) {
    "use strict";
	if (afqb.global.controls.threeControlBox.highlight) {
		// Temporary line material for moused-over bundles
		var tmpLineMaterial = new THREE.LineBasicMaterial({
			opacity: afqb.three.settings.highlightOpacity,
			linewidth: afqb.three.settings.highlightLineWidth,
			transparent: true
		});

		var bundle = afqb.three.colorGroups.children.filter(function (element) {
			return element.name === name;
        })[0];

		if (bundle !== undefined) {
			var tracts = afqb.plots.tracts.map(function (element) {
				return element.toLowerCase().replace(/\s+/g, "-");
			});
            var idx = tracts.indexOf(name);
			tmpLineMaterial.color.setHex( afqb.global.highlightColors[idx] );
			if (afqb.plots.settings.brushes[name].brushOn) {
				tmpLineMaterial.color.setHex( 0x000000 );
			}
			bundle.material = tmpLineMaterial;
			return afqb.three.renderer.render(afqb.three.scene, afqb.three.camera);
		}
	}
};

afqb.global.queues.threeQ = d3_queue.queue();
afqb.global.queues.threeQ.defer(afqb.global.initSettings);
afqb.global.queues.threeQ.await(afqb.three.initAndAnimate);


// var $window = $(window),
//    $stickyEl = $('#statcontent'),
//    elTop = $stickyEl.offset().top;

// $window.scroll(function() {
//     $stickyEl.toggleClass('sticky', $window.scrollTop() > elTop);
// });
