(function() {
	function rgb2str(rgb) {
		return 'rgb(' + rgb.join(',') + ')';
	}

	function data(type, mean, sigma, colorFn) {
		function random(mean, sigma) {
			let sum = 0;
			for (let i = 0; i < 6; i++)
				sum += Math.random();
			return (sum / 6.0 - 0.5) * sigma - mean;
		}

		function curve(i, n, mean, sigma, shift) {
			return Math.cos(i / (n / 6) * 2 * Math.PI + shift) * sigma - mean;
		}
		const data = []
		const n = 300;
		for (let i = 0; i < n; i++) {
			const d = {
				x: type == 0 ? random(mean, sigma) : curve(i, n, mean, sigma, 0),
				y: type == 0 ? random(mean, sigma) : curve(i, n, mean, sigma, Math.PI / 2),
				z: type == 0 ? random(mean, 7) : (i - 150) / 100.0 - mean
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
		return [parseInt(255.0 * i / n), parseInt(125.0 * i / n), 0];
	}

	function colorFn1(i, n) {
		return [0, parseInt(255.0 * i / n), parseInt(125.0 * i / n)];
	}
	const d0 = data(0, -1, 20);
	d0.style = rgb2str([0, 200, 125]);
	d0.supportLine = true;
	const d1 = data(1, -1, 7, colorFn1);
	d1.lineWidth = 10;
	const d2 = data(0, 5, 10, colorFn2);
	d2.supportLine = false;
	const d3 = data(1, 5, 3)
	Array.forEach(d3.data, function(d, i) {
		d.style = rgb2str([200, 125, 0]);
		d.lineWidth = Math.sin(i / d3.data.length * Math.PI) * 20.0;
	});

	const datam = [d0, d1, d2, d3];
	ScatterPlot3D(document.getElementById('container'), datam)
})();
