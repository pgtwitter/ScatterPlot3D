(function() {
	const xyz = ['x', 'y', 'z'];
	let camera, scene, renderer;
	let cameraControls;
	let container, stats;
	const frame = new THREE.Object3D();
	const points = new THREE.Object3D();
	const lines = new THREE.Object3D();

	function normalize(v, range) {
		return ((v - range[0]) / (range[2])) - .5;
	}

	function Frame(axes, onesideFlag) {
		const frameMat = new THREE.LineBasicMaterial({
			color: '#333',
		});
		const m = [
			[2, 1],
			[0, 2],
			[0, 1],
		];
		Array.forEach(xyz, function(key, i) {
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

			if (onesideFlag[i]) return;
			const s = new THREE.LineSegments(
				new THREE.EdgesGeometry(new THREE.PlaneBufferGeometry(1, 1)), frameMat);
			Array.forEach(['x', 'y'], function(akey, j) {
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
		Array.forEach(xyz, function(key, i) {
			box.scale[key] = axes[i][2];
		})
		frame.add(box);
		frame.rotation.x = -Math.PI / 2;
		scene.add(frame);
	}

	function InitRenderer() {
		const WIDTH = container.clientWidth;
		const HEIGHT = container.clientHeight;
		const VIEW_ANGLE = 55;
		const ASPECT = WIDTH / HEIGHT;
		const NEAR = .1;
		const FAR = 500;
		camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
		camera.position.z = 2;
		// camera = new THREE.OrthographicCamera(
		// 	WIDTH * ASPECT / -2, HEIGHT * ASPECT / 2,
		// 	WIDTH / 2, HEIGHT / -2,
		// 	NEAR, FAR);
		scene = new THREE.Scene();
		scene.add(camera);
		renderer = new THREE.CanvasRenderer({
			antialias: true,
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(WIDTH, HEIGHT);
		renderer.setClearColor('#eff', 1);

		cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
		cameraControls.target.set(0, 0, 0);
		cameraControls.maxDistance = 3;
		cameraControls.minDistance = 1;
		cameraControls.update();

		container.appendChild(renderer.domElement);
		// stats = new Stats();
		// container.appendChild(stats.dom);
	}

	function Animate() {
		requestAnimationFrame(Animate);
		// UpdateMotion();
		renderer.render(scene, camera);
		// stats.update();
	}

	function UpdateMotion() {
		const time = Date.now() * 0.001;
		const delta = Math.sin(time);
		const v = Math.PI / 4 + 1.1 * delta;
		frame.rotation.z = v;
		points.rotation.z = v;
		lines.rotation.z = v;
	}

	function pre(data) {
		const tmp = [];
		Array.forEach(xyz, function(key) {
			tmp.push(data.map(function(d) {
				return d[key];
			}));
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
		return d.supportLine !== void 0 ? d.supportLine : (data.supportLine !== void 0) ? data.supportLine : true;
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
		Array.forEach(datam, function(data, i) {
			Array.forEach(data.data, function(d) {
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
		const tmp = [];
		Array.forEach(xyz, function(key) {
			tmp.push(data.map(function(d) {
				return d[key];
			}));
		});
		const arrangedData = tmp.map(function(xyzV, i) {
			return xyzV.map(function(v, j) {
				return normalize(v, ranges[i]) * axes[i][2];
			});
		});
		return arrangedData;
	}

	function plotPoints(data, arrangedData, axes, onesideFlag, _zSideFlag,
		style2index, spriteCanvasMaterials, lineBasicMaterials) {
		const points = new THREE.Object3D();
		const lines = new THREE.Object3D();
		Array.forEach(data.data, function(d, i) {
			const index = style2index[styleKey(d, data)];
			const point = new THREE.Sprite(spriteCanvasMaterials[index]);
			Array.forEach(xyz, function(key, j) {
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
		points.rotation.x = -Math.PI / 2;
		lines.rotation.x = -Math.PI / 2;
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
		lines.rotation.x = -Math.PI / 2;
		return lines;
	}

	function ScatterPlot(datam) {
		const whole = [];
		Array.forEach(datam, function(data) {
			Array.prototype.push.apply(whole, data.data);
		});
		const [_ranges, _axes, _onesideFlag, _zSideFlag] = pre(whole);
		const [_style2index, _spriteCanvasMaterials, _lineBasicMaterials] = materials(datam);

		Array.forEach(datam, function(data) {
			const arrangedData = arrange(data.data, _ranges, _axes);
			switch (data.type) {
				case 0:
					{
						const [_points, _lines] = plotPoints(
							data, arrangedData, _axes,
							_onesideFlag, _zSideFlag,
							_style2index, _spriteCanvasMaterials, _lineBasicMaterials);
						points.add(_points);
						lines.add(_lines);
					}
					break;
				case 1:
					{
						const _lines = plotLines(
							data, arrangedData, _axes,
							_style2index, _lineBasicMaterials);
						lines.add(_lines);
					}
					break;
			}
		});
		scene.add(lines);
		scene.add(points);
		Frame(_axes, _onesideFlag);
	}

	function ScatterPlot3D(_container, datam) {
		container = _container;
		InitRenderer();
		ScatterPlot(datam);
		Animate();
	}

	window.ScatterPlot3D = ScatterPlot3D;
})();
