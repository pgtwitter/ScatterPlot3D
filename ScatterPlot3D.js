(function() {
	const xyz = ['x', 'y', 'z'];
	const renderers = [];

	function normalize(v, range) {
		return ((v - range[0]) / (range[2])) - .5;
	}

	function Frame(self, axes, onesideFlag) {
		const frame = self.frame;
		const frameMat = new THREE.LineBasicMaterial({
			color: '#333',
		});
		const m = [
			[2, 1],
			[0, 2],
			[0, 1],
		];
		Array.prototype.forEach.call(xyz, function(key, i) {
			if (!onesideFlag[m[i][0]] && !onesideFlag[m[i][1]]) {
				const ary = [{
					x: axes[0][(i == 0) ? 0 : 3],
					y: axes[1][(i == 1) ? 0 : 3],
					z: axes[2][(i == 2) ? 0 : 3],
				}, {
					x: axes[0][(i == 0) ? 1 : 3],
					y: axes[1][(i == 1) ? 1 : 3],
					z: axes[2][(i == 2) ? 1 : 3],
				}];
				const geometry = new THREE.BufferGeometry().setFromPoints(ary);
				frame.add(new THREE.Line(geometry, frameMat));
			}
			if (onesideFlag[i]) return;
			
			const s = new THREE.LineSegments(
				new THREE.EdgesGeometry(new THREE.PlaneBufferGeometry(1, 1)), frameMat);
			Array.prototype.forEach.call(['x', 'y'], function(akey, j) {
				s.scale[akey] = axes[m[i][j]][2];
			});
			s.position[key] = axes[i][3];
			if (i == 0)
				s.rotation.y = -Math.PI / 2;
			else if (i == 1)
				s.rotation.x = -Math.PI / 2;
			frame.add(s);
		});
		const box = new THREE.LineSegments(
			new THREE.EdgesGeometry(new THREE.CubeGeometry()), frameMat);
		Array.prototype.forEach.call(xyz, function(key, i) {
			box.scale[key] = axes[i][2];
		})
		frame.add(box);
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
		renderers.push(renderer);
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
		Array.prototype.forEach.call(renderers, function(renderer) {
			renderer.render(renderer.scene, renderer.camera);
		});
	}

	function scale(datam) {
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

	function supportLine(d, data) {
		return d.supportLine !== void 0 ? d.supportLine : (data.supportLine !== void 0) ? data.supportLine : false;
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

	function materials(datam) {
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
		const styles0 = Object.keys(stylesDic);
		const styles = (styles0.length > 0) ? styles0 : [{
			style: '#111',
			lineWidth: 1
		}];
		const style2index = {};
		const spriteCanvasMaterials = [];
		const lineBasicMaterials = [];
		const PI2 = Math.PI * 2;
		styles.forEach(function(key, i) {
			style2index[key] = i;
			const styleObj = stylesDic[key];
			spriteCanvasMaterials.push(new THREE.SpriteCanvasMaterial({
				program: function(context) {
					context.fillStyle = styleObj.style;
					context.beginPath();
					context.arc(0, 0, 0.01, 0, PI2, true);
					context.fill();
				}
			}));
			lineBasicMaterials.push(new THREE.LineBasicMaterial({
				color: styleObj.style,
				linewidth: styleObj.lineWidth,
			}));
		});
		return [style2index, spriteCanvasMaterials, lineBasicMaterials];
	}

	function arrange(data, ranges, axes) {
		const arrangedData = xyz.map(function(key, i) {
			return (data.map(function(d) {
				return normalize(d[key], ranges[i]) * axes[i][2];
			}));
		});
		return arrangedData;
	}

	function plotPoints(data, arrangedData, axes, onesideFlag, _zSideFlag,
		style2index, spriteCanvasMaterials, lineBasicMaterials) {
		const points = new THREE.Object3D();
		const lines = new THREE.Object3D();
		Array.prototype.forEach.call(data.data, function(d, i) {
			const index = style2index[styleKey(d, data)];
			const point = new THREE.Sprite(spriteCanvasMaterials[index]);
			Array.prototype.forEach.call(xyz, function(key, j) {
				point.position[key] = arrangedData[j][i];
			});
			point.userInfo = d;
			points.add(point);
			if (!supportLine(d, data)) return;
			const p = Object.assign({}, point.position);
			p.z = axes[2][3];
			if (onesideFlag[2]) {
				p.z = (_zSideFlag ? axes[2][0] : axes[2][1]);
			}
			const ary = [point.position, p];
			const geometry = new THREE.BufferGeometry().setFromPoints(ary);
			lines.add(new THREE.Line(geometry, lineBasicMaterials[index]));
		});
		return [points, lines];
	}

	function plotLines(data, arrangedData, axes, style2index, lineBasicMaterials) {
		const lines = new THREE.Object3D();
		for (let i = 0; i < data.data.length - 1; i++) {
			const d = data.data[i];
			const index = style2index[styleKey(d, data)];
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
			const geometry = new THREE.BufferGeometry().setFromPoints([p0, p1]);
			lines.add(new THREE.Line(geometry, lineBasicMaterials[index]));
		}
		return lines;
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

	function ScatterPlot(self, datam) {
		datam = pre(datam);
		if (!datam) return;

		const [_ranges, _axes, _onesideFlag, _zSideFlag] = scale(datam);
		const [_style2index, _spriteCanvasMaterials, _lineBasicMaterials] = materials(datam);
		const points = self.points;
		const lines = self.lines;
		Array.prototype.forEach.call(datam, function(data) {
			const arrangedData = arrange(data.data, _ranges, _axes);
			switch (data.type) {
				case 1:
					{
						const _lines = plotLines(
							data, arrangedData, _axes,
							_style2index, _lineBasicMaterials);
						lines.add(_lines);
					}
					break;
				default:
					{
						const [_points, _lines] = plotPoints(
							data, arrangedData, _axes,
							_onesideFlag, _zSideFlag,
							_style2index, _spriteCanvasMaterials, _lineBasicMaterials);
						points.add(_points);
						lines.add(_lines);
					}
					break;
			}
		});
		Frame(self, _axes, _onesideFlag);
	}

	function ScatterPlot3D(_container, datam) {
		const self = {
			container: _container,
			frame: new THREE.Object3D(),
			points: new THREE.Object3D(),
			lines: new THREE.Object3D(),
			objects: new THREE.Object3D(),
		};
		self.objects.add(self.frame);
		self.objects.add(self.lines);
		self.objects.add(self.points);
		InitRenderer(self);
		ScatterPlot(self, datam);
		if (true) {
			self.objects.rotation.x = Math.PI / 2;
			self.objects.scale.y = -1;
		}
		Animate();
	}
	window.ScatterPlot3D = ScatterPlot3D;
})();
