// ==UserScript==
// @name         S2 Check
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Find S2 properties
// @author       someone
// @require      https://fastcdn.org/FileSaver.js/1.1.20151003/FileSaver.min.js
// @match        https://gymhuntr.com/*
// @grant        none
// ==/UserScript==

/* eslint-env es6 */
/* eslint no-var: "error" */
/* globals saveAs */

(function () {

	'use strict';

	if (!document.querySelector('.controls'))
		return;

	window.pokestops = {};
	window.pokegyms = {};

	function analyzeData() {
		const response = window.prompt('Which level of S2 cell do you want to analyze? (6-20)', 14);
		if (!response)
			return;
		const level = parseInt(response, 10);
		if (isNaN(level) || (level < 6) || (level > 20)) {
			alert('Invalid value');
			return;
		}
		const cells = groupByCell(level);

		// Save data
		const filename = 'S2_' + level + '_' + new Date().getTime() + '.json';
		const blob = new Blob([JSON.stringify(cells)], {
			type: 'text/plain;charset=utf-8'
		});
		showCellSummary(cells);

		saveAs(blob, filename);
	}

	function showCellSummary(cells) {
		const keys = Object.keys(cells);
		const summary = [];
		summary.push('Total number of cells: ' + keys.length);
		let i = 1;
		keys.forEach(name => {
			const cell = cells[name];
			const gymSummary = cell.gyms.map(gym => gym.name.substr(0,15)).join(', ');
			summary.push(i + ': ' + cell.stops.length + ' stops & ' + cell.gyms.length + ' gyms (' + gymSummary + ').');
			i++;
		});
		alert(summary.join('\r\n'));
	}

	function groupByCell(level) {
		const cells = {};
		const pokegyms = window.pokegyms;
		Object.keys(pokegyms).forEach(guid => {
			const gym = pokegyms[guid];
			const cell = window.S2.S2Cell.FromLatLng(gym, level);
			const cellId = cell.toString();
			if (!cells[cellId]) {
				cells[cellId] = {
					gyms: [],
					stops: []
				};
			}
			cells[cellId].gyms.push(gym);
		});
		const pokestops = window.pokestops;
		Object.keys(pokestops).forEach(guid => {
			const pokestop = pokestops[guid];
			const cell = window.S2.S2Cell.FromLatLng(pokestop, level);
			const cellId = cell.toString();
			if (!cells[cellId]) {
				cells[cellId] = {
					gyms: [],
					stops: []
				};
			}
			cells[cellId].stops.push(pokestop);
		});
		return cells;
	}

	function showButton() {
		const button = document.createElement('button');
		button.className = 'button button-circle';
		button.innerHTML = '<span class="inner"><i class="fa fa-table"></i></span>';
		button.title = 'Find S2 distribution';

		document.querySelector('.controls').appendChild(button);
		button.addEventListener('click', analyzeData);
	}

	function showSaveButton() {
		const button = document.createElement('button');
		button.className = 'button button-circle';
		button.innerHTML = '<span class="inner"><i class="fa fa-save"></i></span>';
		button.title = 'Save Gyms and Portals';

		document.querySelector('.controls').appendChild(button);
		button.addEventListener('click', function () {
			const filename = 'gyms+stops_' + new Date().getTime() + '.json';
			const data = {gyms: window.pokegyms, pokestops: window.pokestops};
			const blob = new Blob([JSON.stringify(data)], {
				type: 'text/plain;charset=utf-8'
			});
			saveAs(blob, filename);
		});
	}

	(function () {

		const origOpen = XMLHttpRequest.prototype.open;
		// add our handler as a listener to every XMLHttpRequest
		XMLHttpRequest.prototype.open = function () {
			this.addEventListener('load', function (xhr) {
				let json;
				if (this.responseText.indexOf('gyms') > 0) {
					json = JSON.parse(this.responseText);
					const gyms = json.gyms;
					gyms.forEach(function (gym) {
						const pokegym = JSON.parse(gym);
						// coordinates seem reversed
						window.pokegyms[pokegym.gym_id] = {
							guid: pokegym.gym_id,
							name: pokegym.gym_name,
							lat: pokegym.longitude,
							lng: pokegym.latitude
						};
					});
				}
				if (this.responseText.indexOf('pokestops') > 0) {
					if (!json) {
						json = JSON.parse(this.responseText);
					}
					const stops = json.pokestops;
					stops.forEach(function (stop) {
						const pokestop = JSON.parse(stop);
						// coordinates seem reversed
						window.pokestops[pokestop.pokestop_id] = {
							guid: pokestop.gym_id,
							lat: pokestop.longitude,
							lng: pokestop.latitude
						};
					});
				}
			});
			origOpen.apply(this, arguments);
		};
		showButton();
		showSaveButton();
	})();
})();




// S2 extracted from Regions Plugin
// https://static.iitc.me/build/release/plugins/regions.user.js

/// S2 Geometry functions
// the regional scoreboard is based on a level 6 S2 Cell
// - https://docs.google.com/presentation/d/1Hl4KapfAENAOf4gv-pSngKwvS_jwNVHRPZTTDzXXn6Q/view?pli=1#slide=id.i22
// at the time of writing there's no actual API for the intel map to retrieve scoreboard data,
// but it's still useful to plot the score cells on the intel map


// the S2 geometry is based on projecting the earth sphere onto a cube, with some scaling of face coordinates to
// keep things close to approximate equal area for adjacent cells
// to convert a lat,lng into a cell id:
// - convert lat,lng to x,y,z
// - convert x,y,z into face,u,v
// - u,v scaled to s,t with quadratic formula
// - s,t converted to integer i,j offsets
// - i,j converted to a position along a Hubbert space-filling curve
// - combine face,position to get the cell id

//NOTE: compared to the google S2 geometry library, we vary from their code in the following ways
// - cell IDs: they combine face and the hilbert curve position into a single 64 bit number. this gives efficient space
//						 and speed. javascript doesn't have appropriate data types, and speed is not cricical, so we use
//						 as [face,[bitpair,bitpair,...]] instead
// - i,j: they always use 30 bits, adjusting as needed. we use 0 to (1<<level)-1 instead
//				(so GetSizeIJ for a cell is always 1)

(function () {

	const S2 = window.S2 = {};

	function LatLngToXYZ(latLng) {
		const d2r = Math.PI / 180.0;
		const phi = latLng.lat * d2r;
		const theta = latLng.lng * d2r;
		const cosphi = Math.cos(phi);

		return [Math.cos(theta) * cosphi, Math.sin(theta) * cosphi, Math.sin(phi)];
	}

	function XYZToLatLng(xyz) {
		const r2d = 180.0 / Math.PI;

		const lat = Math.atan2(xyz[2], Math.sqrt(xyz[0] * xyz[0] + xyz[1] * xyz[1]));
		const lng = Math.atan2(xyz[1], xyz[0]);

		return {lat: lat * r2d, lng: lng * r2d};
	}

	function largestAbsComponent(xyz) {
		const temp = [Math.abs(xyz[0]), Math.abs(xyz[1]), Math.abs(xyz[2])];

		if (temp[0] > temp[1]) {
			if (temp[0] > temp[2]) {
				return 0;
			}
			return 2;
		}

		if (temp[1] > temp[2]) {
			return 1;
		}

		return 2;
	}

	function faceXYZToUV(face,xyz) {
		let u, v;

		switch (face) {
			case 0: u =	xyz[1] / xyz[0]; v =	xyz[2] / xyz[0]; break;
			case 1: u = -xyz[0] / xyz[1]; v =	xyz[2] / xyz[1]; break;
			case 2: u = -xyz[0] / xyz[2]; v = -xyz[1] / xyz[2]; break;
			case 3: u =	xyz[2] / xyz[0]; v =	xyz[1] / xyz[0]; break;
			case 4: u =	xyz[2] / xyz[1]; v = -xyz[0] / xyz[1]; break;
			case 5: u = -xyz[1] / xyz[2]; v = -xyz[0] / xyz[2]; break;
			default: throw {error: 'Invalid face'};
		}

		return [u,v];
	}

	function XYZToFaceUV(xyz) {
		let face = largestAbsComponent(xyz);

		if (xyz[face] < 0) {
			face += 3;
		}

		const uv = faceXYZToUV(face, xyz);

		return [face, uv];
	}

	function FaceUVToXYZ(face, uv) {
		const u = uv[0];
		const v = uv[1];

		switch (face) {
			case 0: return [1, u, v];
			case 1: return [-u, 1, v];
			case 2: return [-u,-v, 1];
			case 3: return [-1,-v,-u];
			case 4: return [v,-1,-u];
			case 5: return [v, u,-1];
			default: throw {error: 'Invalid face'};
		}
	}

	function STToUV(st) {
		const singleSTtoUV = function (st) {
			if (st >= 0.5) {
				return (1 / 3.0) * (4 * st * st - 1);
			}
			return (1 / 3.0) * (1 - (4 * (1 - st) * (1 - st)));

		};

		return [singleSTtoUV(st[0]), singleSTtoUV(st[1])];
	}

	function UVToST(uv) {
		const singleUVtoST = function (uv) {
			if (uv >= 0) {
				return 0.5 * Math.sqrt (1 + 3 * uv);
			}
			return 1 - 0.5 * Math.sqrt (1 - 3 * uv);

		};

		return [singleUVtoST(uv[0]), singleUVtoST(uv[1])];
	}

	function STToIJ(st,order) {
		const maxSize = 1 << order;

		const singleSTtoIJ = function (st) {
			const ij = Math.floor(st * maxSize);
			return Math.max(0, Math.min(maxSize - 1, ij));
		};

		return [singleSTtoIJ(st[0]), singleSTtoIJ(st[1])];
	}

	function IJToST(ij,order,offsets) {
		const maxSize = 1 << order;

		return [
			(ij[0] + offsets[0]) / maxSize,
			(ij[1] + offsets[1]) / maxSize
		];
	}

	// hilbert space-filling curve
	// based on http://blog.notdot.net/2009/11/Damn-Cool-Algorithms-Spatial-indexing-with-Quadtrees-and-Hilbert-Curves
	// note: rather then calculating the final integer hilbert position, we just return the list of quads
	// this ensures no precision issues whth large orders (S3 cell IDs use up to 30), and is more
	// convenient for pulling out the individual bits as needed later
	function pointToHilbertQuadList(x,y,order) {
		const hilbertMap = {
			'a': [[0,'d'], [1,'a'], [3,'b'], [2,'a']],
			'b': [[2,'b'], [1,'b'], [3,'a'], [0,'c']],
			'c': [[2,'c'], [3,'d'], [1,'c'], [0,'b']],
			'd': [[0,'a'], [3,'c'], [1,'d'], [2,'d']]
		};

		let currentSquare = 'a';
		const positions = [];

		for (let i = order - 1; i >= 0; i--) {

			const mask = 1 << i;

			const quad_x = x & mask ? 1 : 0;
			const quad_y = y & mask ? 1 : 0;
			const t = hilbertMap[currentSquare][quad_x * 2 + quad_y];

			positions.push(t[0]);

			currentSquare = t[1];
		}

		return positions;
	}

	// S2Cell class
	S2.S2Cell = function () {};

	//static method to construct
	S2.S2Cell.FromLatLng = function (latLng, level) {
		const xyz = LatLngToXYZ(latLng);
		const faceuv = XYZToFaceUV(xyz);
		const st = UVToST(faceuv[1]);
		const ij = STToIJ(st,level);

		return S2.S2Cell.FromFaceIJ(faceuv[0], ij, level);
	};

	S2.S2Cell.FromFaceIJ = function (face, ij, level) {
		const cell = new S2.S2Cell();
		cell.face = face;
		cell.ij = ij;
		cell.level = level;

		return cell;
	};

	S2.S2Cell.prototype.toString = function () {
		return 'F' + this.face + 'ij[' + this.ij[0] + ',' + this.ij[1] + ']@' + this.level;
	};

	/*
	S2.S2Cell.prototype.getLatLng = function() {
		var st = IJToST(this.ij,this.level, [0.5,0.5]);
		var uv = STToUV(st);
		var xyz = FaceUVToXYZ(this.face, uv);

		return XYZToLatLng(xyz);
	};
	*/

	S2.S2Cell.prototype.getCornerLatLngs = function () {
		const offsets = [
			[0.0, 0.0],
			[0.0, 1.0],
			[1.0, 1.0],
			[1.0, 0.0]
		];

		return offsets.map(offset => {
			const st = IJToST(this.ij, this.level, offset);
			const uv = STToUV(st);
			const xyz = FaceUVToXYZ(this.face, uv);

			return XYZToLatLng(xyz);
		});
	};

	S2.S2Cell.prototype.getFaceAndQuads = function () {
		const quads = pointToHilbertQuadList(this.ij[0], this.ij[1], this.level);

		return [this.face, quads];
	};

	S2.S2Cell.prototype.getNeighbors = function (deltas) {

		const fromFaceIJWrap = function (face,ij,level) {
			const maxSize = 1 << level;
			if (ij[0] >= 0 && ij[1] >= 0 && ij[0] < maxSize && ij[1] < maxSize) {
				// no wrapping out of bounds
				return S2.S2Cell.FromFaceIJ(face,ij,level);
			}
			// the new i,j are out of range.
			// with the assumption that they're only a little past the borders we can just take the points as
			// just beyond the cube face, project to XYZ, then re-create FaceUV from the XYZ vector

			let st = IJToST(ij,level,[0.5, 0.5]);
			let uv = STToUV(st);
			let xyz = FaceUVToXYZ(face, uv);
			const faceuv = XYZToFaceUV(xyz);
			face = faceuv[0];
			uv = faceuv[1];
			st = UVToST(uv);
			ij = STToIJ(st,level);
			return S2.S2Cell.FromFaceIJ(face, ij, level);
		};

		const face = this.face;
		const i = this.ij[0];
		const j = this.ij[1];
		const level = this.level;

		if (!deltas) {
			deltas = [
				{a: -1, b: 0},
				{a: 0, b: -1},
				{a: 1, b: 0},
				{a: 0, b: 1}
			];
		}
		return deltas.map(function (values) {
			return fromFaceIJWrap(face, [i + values.a, j + values.b], level);
		});
		/*
		return [
			fromFaceIJWrap(face, [i - 1, j], level),
			fromFaceIJWrap(face, [i, j - 1], level),
			fromFaceIJWrap(face, [i + 1, j], level),
			fromFaceIJWrap(face, [i, j + 1], level)
		];
		*/
	};

})();

