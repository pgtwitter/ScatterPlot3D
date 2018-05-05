(function() {
	const xyz = ['x', 'y', 'z'];
	let isAnimated = false;
	const containerIdKey = 'data-scatterplot3d-id';
	const classes = {};
	const m = [
		[2, 1],
		[0, 2],
		[0, 1],
	];

	function normalize(v, range) {
		return ((v - range[0]) / (range[2])) - .5;
	}

	function arrangeObject(object, points) {
		const vX = new THREE.Vector3(1, 0, 0);
		const vA = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
		const vB = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
		const vAB = vB.sub(vA);
		object.scale.x = vAB.length();
		Array.prototype.forEach.call(xyz, function(key, j) {
			object.position[key] = (points[0][key] + points[1][key]) / 2.0;
		});
		const vABn = vAB.normalize();
		const vC = vX.cross(vABn).normalize();
		const ang = Math.acos(vABn.x);
		const quaternion = new THREE.Quaternion();
		quaternion.setFromAxisAngle(vC, (isNaN(ang) ? 0 : ang));
		object.setRotationFromQuaternion(quaternion);
	}

	function Frame_Line(self, key, i) {
		const name = 'axis_' + key;
		let line = self.frame.getObjectByName(name);
		if (line !== void 0) line.visible = false;
		if (!self.onesideFlag[m[i][0]] && !self.onesideFlag[m[i][1]]) {
			if (line === void 0) {
				line = new THREE.Line(self.lineGeom, self.frameMat);
				line.name = name;
				self.frame.add(line);
			}
			const ary = [{
				x: self.axes[0][(i == 0) ? 0 : 3],
				y: self.axes[1][(i == 1) ? 0 : 3],
				z: self.axes[2][(i == 2) ? 0 : 3],
			}, {
				x: self.axes[0][(i == 0) ? 1 : 3],
				y: self.axes[1][(i == 1) ? 1 : 3],
				z: self.axes[2][(i == 2) ? 1 : 3],
			}];
			arrangeObject(line, ary);
		}
	}

	function Frame_Plane(self, key, i) {
		const name = 'plane_' + key;
		let plane = self.frame.getObjectByName(name);
		if (plane === void 0) {
			plane = new THREE.LineSegments(self.squareWGeom, self.frameMat);
			plane.name = name;
			self.frame.add(plane);
			if (i == 0)
				plane.rotation.y = -Math.PI / 2;
			else if (i == 1)
				plane.rotation.x = -Math.PI / 2;
		}
		Array.prototype.forEach.call(['x', 'y'], function(akey, j) {
			plane.scale[akey] = self.axes[m[i][j]][2];
		});
		plane.position[key] = self.axes[i][3];
	}

	function Frame_Box(self) {
		const name = 'box';
		let box = self.frame.getObjectByName(name);
		if (box === void 0) {
			box = new THREE.LineSegments(self.cubeWGeom, self.frameMat);
			box.name = name;
			self.frame.add(box);
		}
		Array.prototype.forEach.call(xyz, function(key, i) {
			box.scale[key] = self.axes[i][2];
		});
	}

	function Frame(self) {
		Array.prototype.forEach.call(xyz, function(key, i) {
			Frame_Line(self, key, i);
			if (self.onesideFlag[i]) return;
			Frame_Plane(self, key, i);
		});
		Frame_Box(self);
	}

	function InitRenderer(self) {
		const WIDTH = self.container.clientWidth;
		const HEIGHT = self.container.clientHeight;
		const VIEW_ANGLE = 55;
		const ASPECT = WIDTH / HEIGHT;
		const NEAR = .1;
		const FAR = 500;
		const camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
		self.camera = camera;
		camera.position.z = 2;
		const scene = new THREE.Scene();
		self.scene = scene;
		scene.add(camera);
		scene.add(self.objects);

		const renderer = new THREE.CanvasRenderer({
			antialias: true,
		});
		self.renderer = renderer;
		renderer.scene = scene;
		renderer.camera = camera;
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(WIDTH, HEIGHT);
		renderer.setClearColor('#eff', 1);

		const cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
		self.cameraControls = cameraControls;
		cameraControls.target.set(0, 0, 0);
		cameraControls.maxDistance = 3;
		cameraControls.minDistance = 1;
		cameraControls.update();

		self.container.appendChild(renderer.domElement);
	}

	function Animate() {
		requestAnimationFrame(Animate);
		Array.prototype.forEach.call(Object.keys(classes), function(key) {
			const self = classes[key];
			self.renderer.render(self.scene, self.camera);
		});
	}

	function Resize() {
		Array.prototype.forEach.call(Object.keys(classes), function(key) {
			const self = classes[key];
			const WIDTH = self.container.clientWidth;
			const HEIGHT = self.container.clientHeight;
			self.renderer.setSize(WIDTH, HEIGHT);
			const ASPECT = WIDTH / HEIGHT;
			self.camera.aspect = ASPECT;
			self.camera.updateProjectionMatrix();
		});
	}

	function scale(self, datam) {
		const tmp = xyz.map(function(key) {
			const tmp1 = [];
			Array.prototype.forEach.call(datam, function(data, i) {
				Array.prototype.push.apply(tmp1, data.data.map(function(d) {
					return d[key];
				}));
			});
			return tmp1;
		});
		const ranges = tmp.map(function(d) {
			const minv = Math.min.apply(null, d);
			const maxv = Math.max.apply(null, d);
			return [minv, maxv, (maxv - minv)];
		});
		const maxLocalWidths = [ranges[0][2], ranges[1][2], ranges[2][2]];
		const maxWidth = Math.max.apply(null, maxLocalWidths);
		const onesideFlag = [
			(ranges[0][0] * ranges[0][1] > 0),
			(ranges[1][0] * ranges[1][1] > 0),
			(ranges[2][0] * ranges[2][1] > 0)
		];
		const zSideFlag = (ranges[2][0] > 0);
		const axes = ranges.map(function(range) {
			const ratio = range[2] / maxWidth;
			return [-0.5 * ratio, 0.5 * ratio, ratio,
				normalize(0, range) * ratio
			];
		});
		return [ranges, axes, onesideFlag, zSideFlag];
	}

	function altitudeLine(d, data) {
		return d.altitudeLine !== void 0 ? d.altitudeLine : (data.altitudeLine !== void 0) ? data.altitudeLine : false;
	}

	function style(d, data) {
		return d.style ? d.style : (data.style) ? data.style : '#111';
	}

	function lineWidth(d, data) {
		return d.lineWidth ? d.lineWidth : (data.lineWidth) ? data.lineWidth : 1;
	}

	function styleKey(d, data) {
		const s = style(d, data);
		const lw = lineWidth(d, data);
		return s + '::' + lw;
	}

	function materials(self, datam) {
		const stylesDic = {};
		Array.prototype.forEach.call(datam, function(data, i) {
			Array.prototype.forEach.call(data.data, function(d) {
				const key = styleKey(d, data);
				if (!key) return;
				stylesDic[key] = {
					style: style(d, data),
					lineWidth: lineWidth(d, data),
				};
			});
		});
		const styles = Object.keys(stylesDic);
		const PI2 = Math.PI * 2;
		Array.prototype.forEach.call(styles, function(key, i) {
			if (self.style2index[key] !== void 0) return;
			self.style2index[key] = self.spriteCanvasMaterials.length;
			const styleObj = stylesDic[key];
			self.spriteCanvasMaterials.push(new THREE.SpriteCanvasMaterial({
				program: function(context) {
					context.fillStyle = styleObj.style;
					context.beginPath();
					context.arc(0, 0, 0.01, 0, PI2, true);
					context.fill();
					context.strokeStyle = '#333';
					context.lineWidth = 0.001;
					context.stroke();
				}
			}));
			self.lineBasicMaterials.push(new THREE.LineBasicMaterial({
				color: styleObj.style,
				linewidth: styleObj.lineWidth,
			}));
		});
	}

	function arrange(data, ranges, axes) {
		const arrangedData = xyz.map(function(key, i) {
			return (data.map(function(d) {
				return normalize(d[key], ranges[i]) * axes[i][2];
			}));
		});
		return arrangedData;
	}

	function plotPoints(self, data, arrangedData) {
		const dataid = self.datam.indexOf(data);
		Array.prototype.forEach.call(data.data, function(d, i) {
			const index = self.style2index[styleKey(d, data)];
			const name0 = 'point_' + dataid + '_' + i;
			let point = self.points.getObjectByName(name0);
			if (point === void 0) {
				point = new THREE.Sprite(self.spriteCanvasMaterials[index]);
				point.name = name0;
				point.userInfo = d;
				self.points.add(point);
			}
			Array.prototype.forEach.call(xyz, function(key, j) {
				point.position[key] = arrangedData[j][i];
			});
			if (!altitudeLine(d, data)) return;

			const name1 = 'altitudeLine_' + dataid + '_' + i;
			let line = self.lines.getObjectByName(name1);
			if (line === void 0) {
				line = new THREE.Line(self.lineGeom, self.lineBasicMaterials[index]);
				line.name = name1;
				self.lines.add(line);
			}
			const p0 = Object.assign({}, point.position);
			const p1 = Object.assign({}, point.position);
			p1.z = self.axes[2][3];
			if (self.onesideFlag[2]) {
				p1.z = (self.zSideFlag ? self.axes[2][0] : self.axes[2][1]);
			}
			arrangeObject(line, [p0, p1]);
		});
	}

	function plotLines(self, data, arrangedData) {
		const dataid = self.datam.indexOf(data);
		for (let i = 0; i < data.data.length - 1; i++) {
			const name = 'line_' + dataid + '_' + i;
			let line = self.lines.getObjectByName(name);
			if (line === void 0) {
				const d = data.data[i];
				const index = self.style2index[styleKey(d, data)];
				line = new THREE.Line(self.lineGeom, self.lineBasicMaterials[index]);
				line.name = name;
				self.lines.add(line);
			}
			const p0 = {
				x: arrangedData[0][i],
				y: arrangedData[1][i],
				z: arrangedData[2][i],
			};
			const p1 = {
				x: arrangedData[0][i + 1],
				y: arrangedData[1][i + 1],
				z: arrangedData[2][i + 1],
			};
			arrangeObject(line, [p0, p1]);
		}
	}

	function pre(datam) {
		if ((datam instanceof Array && datam.length > 0) &&
			(datam[0] instanceof Array && datam[0].length == 3) &&
			(isFinite(datam[0][0]) && isFinite(datam[0][1]) && isFinite(datam[0][2]))) {
			const points = datam.map(function(data, i) {
				const p = {};
				Array.prototype.forEach.call(data, function(v, j) {
					p[xyz[j]] = v;
				});
				return p;
			});
			datam = {
				data: points,
			};
		}
		datam = (datam instanceof Object && datam['data']) ? [datam] : datam;
		datam = (datam instanceof Array && datam.length > 0 &&
			datam[0]['x'] && datam[0]['y'] && datam[0]['z']) ? [{
			data: datam
		}] : datam;
		if (!datam instanceof Array || datam.length == 0) {
			console.log('The datam did not match this program.');
			return;
		}
		Array.prototype.forEach.call(datam, function(data) {
			data.data = data.data.map(function(d, i) {
				d['z'] = -1.0 * d['z'];
				return d;
			})
		});
		return datam;
	}

	function contain(r1, r2) {
		let flag = false;
		for (let i = 0; i < 3; i++) {
			flag = (r1[i][0] < r2[i][0] || r2[i][1] < r1[i][1]) ? true : flag;
		}
		return !flag;
	}

	function ScatterPlot(self, datam) {
		materials(self, datam);
		const [ranges, axes, onesideFlag, zSideFlag] = scale(self, datam);
		let target = datam;
		if (!self.ranges || !contain(ranges, self.ranges)) {
			target = self.datam.concat(datam);
			const [ranges1, axes1, onesideFlag1, zSideFlag1] = scale(self, target);
			self.ranges = ranges1;
			self.axes = axes1;
			self.onesideFlag = onesideFlag1;
			self.zSideFlag = zSideFlag1;
			Frame(self);
		}
		if (self.ranges[0][2] == 0 && self.ranges[1][2] == 0 && self.ranges[2][2] == 0) return;
		Array.prototype.forEach.call(target, function(data) {
			const arrangedData = arrange(data.data, self.ranges, self.axes);
			switch (data.type) {
				case 1:
					plotLines(self, data, arrangedData);
					break;
				default:
					plotPoints(self, data, arrangedData);
					break;
			}
		});
	}

	function createContainerId() {
		return 'ScatterPlot3D-' + (new Date()).getTime();
	}

	function ScatterPlot3D(container, datam) {
		datam = pre(JSON.parse(JSON.stringify(datam)));
		if (!datam) return;
		const containerId = container.getAttribute(containerIdKey);
		let self = classes[containerId];
		if (!self) {
			const newContainerId = createContainerId();
			container.setAttribute(containerIdKey, newContainerId);
			classes[newContainerId] = {
				container: container,
				frame: new THREE.Object3D(),
				points: new THREE.Object3D(),
				lines: new THREE.Object3D(),
				objects: new THREE.Object3D(),
				style2index: {},
				spriteCanvasMaterials: [],
				lineBasicMaterials: [],
				datam: [],
			};
			self = classes[newContainerId];
			self.objects.add(self.frame);
			self.objects.add(self.lines);
			self.objects.add(self.points);
			self.frameMat = new THREE.LineBasicMaterial({
				color: '#333',
			});
			self.squareWGeom = new THREE.EdgesGeometry(new THREE.PlaneBufferGeometry(1, 1));
			self.cubeWGeom = new THREE.EdgesGeometry(new THREE.CubeGeometry(1, 1, 1));
			self.lineGeom = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)
			]);
			InitRenderer(self);
			if (true) {
				self.objects.rotation.x = Math.PI / 2;
				self.objects.scale.y = -1;
			}
			if (!isAnimated) {
				Animate();
				window.addEventListener('resize', function() {
					Resize();
				}, true);
				isAnimated = true;
			}
		}
		Array.prototype.push.apply(self.datam, datam);
		ScatterPlot(self, datam);
	}

	window.ScatterPlot3D = {
		plot: ScatterPlot3D,
	}
})();
