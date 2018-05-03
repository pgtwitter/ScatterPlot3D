(function() {
	function rgb2str(rgb) {
		return 'rgb(' + rgb.join(',') + ')';
	}

	function data(type, micro, sigma, colorFn) {
		function random(micro, sigma) {
			let sum = 0;
			for (let i = 0; i < 6; i++)
				sum += Math.random();
			return (sum / 6.0 - 0.5) * sigma + micro;
		}

		function curve(i, n, micro, sigma, shift) {
			return Math.cos(i / (n / 6) * 2 * Math.PI + shift) * sigma + micro;
		}
		const data = []
		const n = 300;
		for (let i = 0; i < n; i++) {
			const d = {
				x: type == 0 ? random(micro, sigma) : curve(i, n, micro, sigma, 0),
				y: type == 0 ? random(micro, sigma) : curve(i, n, micro, sigma, Math.PI / 2),
				z: type == 0 ? random(micro, sigma) : (i - 150) / 50.0 + micro
			};
			if (colorFn)
				d.style = rgb2str(colorFn(i, n));
			data.push(d);
		}
		const obj = {
			'data': data,
			'type': type,
		};
		return obj;
	}

	function colorFn2(i, n) {
		const v = i / n;
		return [parseInt(255.0 * v), parseInt(125.0 * v), 0];
	}

	function colorFn1(i, n) {
		const v = 1.0 - i / n;
		return [0, parseInt(255.0 * v), parseInt(125.0 * v)];
	}
	const d0 = data(0, -1, 21);
	d0.style = rgb2str([0, 200, 125]);
	const d1 = data(1, -1, 7, colorFn1);
	d1.lineWidth = 10;

	const d2 = data(0, 5, 6, colorFn2);
	const d3 = data(1, 5, 2)
	Array.prototype.forEach.call(d3.data, function(d, i) {
		d.style = rgb2str([200, 125, 0]);
		d.lineWidth = Math.sin(i / d3.data.length * Math.PI) * 20.0;
	});

	const datam = [d0, d1, d2, d3];
	ScatterPlot3D.plot(document.getElementById('container'), datam)
})();
