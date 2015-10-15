(function () {
	var width = 100,
		height = 100;

	var floorPlanExamples = {};

	var radius = d3.scale.sqrt()
	    .range([0, 6]);

	// "normal" or "bond"
	// when this mode is "bond" and clicking a node, add bond between
	var selectMode = "normal";

	var selectionGlove = glow("selectionGlove").rgb("#0000A0").stdDeviation(7);
	var roomSelected;
	var roomJustBeforeSelected;
	var orgoShmorgoObj;

	// deselect node and bond when clicking other objects
	d3.select("#floorPlanDisplay").on("click", function(){
		if (roomSelected)
			roomSelected.style("filter", "");
		if (bondSelected)
			bondSelected.style("filter", "");
		roomSelected = null;
		bondSelected = null;
	});

	var roomClicked = function (dataPoint) {
		d3.event.stopPropagation(); // to avoid duplicating click events
		if (roomSelected)
			roomSelected.style("filter", "");

		roomSelected = d3.select(this)
							.select("circle")
							.style("filter", "url(#selectionGlove)");

		if ("bond" == selectMode) {
			orgoShmorgoObj.addNewBond();
		}
	};

	d3.selectAll(".btn_undisp").on("click", function () {
		var tr = d3.select(this.parentNode.parentNode);
			tr.style("display", "none");
	});

	var bondSelected;
	var bondClicked = function (dataPoint) {
		d3.event.stopPropagation(); // to avoid duplicating click events
		Messenger().post({
			message: 'New Bond Selected',
			type: 'info',
			hideAfter: 3,
			showCloseButton: true
		});

		if (bondSelected)
			bondSelected.style("filter", "");

		bondSelected = d3.select(this)
							.select("path")
							.style("filter", "url(#selectionGlove)");
	};

	var generateRandomID = function () {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	}

	var svg = d3.select("#floorPlanDisplay")
				.append("svg")
				.attr("width", width + '%')
				.attr("height", height + '%')
				.call(selectionGlove);

	var setArrowDefineToSVG = function (svg) {
		svg.append('svg:defs').append('svg:marker')
			.attr('id', 'end-arrow')
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', 6)
			.attr('markerWidth', 3)
			.attr('markerHeight', 3)
			.attr('orient', 'auto')
		  .append('svg:path')
			.attr('d', 'M0,-5L10,0L0,5')
			.attr('fill', '#000');

		svg.append('svg:defs').append('svg:marker')
			.attr('id', 'start-arrow')
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', 4)
			.attr('markerWidth', 3)
			.attr('markerHeight', 3)
			.attr('orient', 'auto')
		  .append('svg:path')
			.attr('d', 'M10,-5L0,0L10,5')
			.attr('fill', '#000');
	}

	// line displayed when dragging new nodes
	// var drag_line = svg.append('svg:path')
	  // .attr('class', 'link dragline hidden')
	  // .attr('d', 'M0,0L0,0');

	var getRandomInt = function (min, max) {
	  return Math.floor(Math.random() * (max - min + 1) + min);
	}

	var adjacencyListTxt2JSON = function (text) {
		if(typeof text === 'undefined') {
			text = null;
			return null;
		}
		// 最終的にfloors.jsonのような形のオブジェクトにする
		// {"nodes": [{}, {},...], "links": [{}, {},...]}
		var data_array = text.split(/\r\n|\r|\n/);  // 改行コードで分割
		var len = data_array.length;
		var nodes_arr = []; // nodesのオブジェクトをまとめておく配列
		var links_arr = []; // linksのオブジェクトをまとめておく配列
		for (var i = 0; i < len; i++) {
			// 文字列を空白で区切って配列にする
			line_arr = data_array[i].split(/[\s　]+/);
			// 配列末の不要な要素を削除
			if ("" == line_arr[line_arr.length-1]) {
				line_arr.splice(-1);
			}
			// 一行目
			if (0 == i) {
				// LDK R Ba => line_arr = ["LDK", "R", "Ba"]
				// 要素ごとをnodeとして配列に格納
				for (var j = 0; j < line_arr.length; j++) {
					var nodes_obj = {};
					nodes_obj["symbol"] = line_arr[j];
					nodes_obj["size"] = roomDB[line_arr[j]].size;
					nodes_obj["bonds"] = 1;
					nodes_obj["id"] = j;
					nodes_arr[nodes_arr.length] = nodes_obj;
				}
			} // if (0 == i)
			// 二行目以降
			else {
				// 各行はtargetを並べたもの
				// 6 7 => line_arr = ["6", "7"]
				// i-1 => source, line_arr[j] => target
				var source = i-1;
				for (var j = 0; j < line_arr.length; j++) {
					var links_obj = {};
					var target = Number(line_arr[j]);
					// target < source だったら，既にエッジとしてlinksに入っているはずなので，source < targetのときのみlinksにいれればよい
					if (source < target) {
						links_obj["source"] = source;
						links_obj["target"] = target;
						links_obj["bondType"] = 1;
						links_obj["id"] = source*10+target;
						links_arr[links_arr.length] = links_obj;
					}
				}
			}
		} // for (var i = 0; i < len; i++)
		var obj = {"nodes": nodes_arr, "links": links_arr};
		return obj;
	};

	// 隣接リストの形で読み込み．
	// Ba WC R LDK
	// 3
	// 3
	// 3
	// 0 1 2
	// の形
	window.loadFloorPlan = function () {
		vex.dialog.open({
				message: 'Copy your saved floor plan data:',
				input: "FloorPlan: <br/>\n<textarea id=\"floorPlan\" name=\"floorPlan\" value=\"\" style=\"height:150px\" placeholder=\"Saved FloorPlan Data\" required></textarea>",
				buttons: [
					$.extend({}, vex.dialog.buttons.YES, {
					text: 'Load'
				}), $.extend({}, vex.dialog.buttons.NO, {
					text: 'Cancel'
				})
				],
				callback: function(data) {
					if (data !== false) {
						var obj = adjacencyListTxt2JSON(data.floorPlan);
						newFloorPlanSimulation(obj);
					}
				}
			});
	};

	// JSON形式で読み込み
	// {"nodes": [{}, {},...], "links": [{}, {},...]}
	window.loadFloorPlanJSON = function () {
		vex.dialog.open({
				message: 'Copy your saved floor plan data:',
				input: "FloorPlan: <br/>\n<textarea id=\"floorPlan\" name=\"floorPlan\" value=\"\" style=\"height:150px\" placeholder=\"Saved FloorPlan Data\" required></textarea>",
				buttons: [
					$.extend({}, vex.dialog.buttons.YES, {
					text: 'Load'
				}), $.extend({}, vex.dialog.buttons.NO, {
					text: 'Cancel'
				})
				],
				callback: function(data) {
					if (data !== false) {
						newFloorPlanSimulation(JSON.parse(data.floorPlan));
					}
				}
			});
	};

	var newFloorPlanSimulation = function (newFloorPlan, example) {
		// Might be super dirty, but it works!
		$('#floorPlanDisplay').empty();
		svg = d3.select("#floorPlanDisplay").append("svg")
					.attr("width", width + '%')
					.attr("height", height + '%')
					.call(selectionGlove);

		setArrowDefineToSVG(svg);

		if (example)
			newFloorPlan = newFloorPlan[example];
		newFloorPlan = $.extend(true, {}, newFloorPlan);
		// ノードに色を付ける
		newFloorPlan['nodes'].forEach(function (data, i) {
			newFloorPlan['nodes'][i].color = roomDB[data.symbol].color;
		});
		orgoShmorgoObj = new orgoShmorgo(newFloorPlan);

		Messenger().post({
			message: 'New FloorPlan Loaded',
			type: 'success',
			showCloseButton: true,
			hideAfter: 2
		});
	};

	window.loadFloorPlanExample = function () {
		newFloorPlanSimulation (floorPlanExamples, $('#floorPlanExample').val().trim());

		// 主観的評価実験用
		// 「間取り読み込み」ボタンを押したら<input type="hidden" id="floorPlanExampleName">のvalueを更新
		$('#floorPlanExampleName').attr('value', $('#floorPlanExample').val());
	};

	$.getJSON("floors.json", function(json) {
		floorPlanExamples = json;
		// if (null == js_obj_graph_structure) {
			newFloorPlanSimulation (floorPlanExamples, '1LDK');
		// } else {
			// newFloorPlanSimulation (adjacencyListTxt2JSON(js_obj_graph_structure));
		// }
	});

	var orgoShmorgo = function(graph) {
		var nodesList, linksList;
		nodesList = graph.nodes;
		linksList = graph.links;


		var force = d3.layout.force()
						.nodes(nodesList)
						.links(linksList)
						.size([width*6, height*3.5])
						.charge(-1000)
						.linkStrength(function (d) { return d.bondType * 1;})
						.linkDistance(function(d) { return radius(d.source.size) + radius(d.target.size) + 20; })
						.on("tick", tick);

		var links = force.links(),
			nodes = force.nodes(),
			link = svg.selectAll(".link"),
			node = svg.selectAll(".node");

		buildFloorPlan();

		// 以下の1文主観的評価実験用
		// クエリグラフ送信フォームの<input type="hidden" id="floorPlanExampleName">のvalueを主観的評価実験用カラムのfloorPlanExampleNameのために最初は1LDKに設定.
		if ($('#floorPlanExampleName')) {
			// if (null == js_obj_floor_plan_example_name) {
				$('#floorPlanExampleName').attr('value', '1LDK');
			// } else {
				// $('#floorPlanExampleName').attr('value', js_obj_floor_plan_example_name);
			// }
		}

		// update g tag element of node
		function updateNodeGElement (g) {
			// Add node circle
			d3.select(g)
				.select("circle") // not append
				.attr("r", function(d) { return radius(d.size*2); })
				.style("fill", function(d) { return d.color; });

			// Add room symbol
			d3.select(g)
				.select("text")  // not append
				.attr("dy", ".35em")
				.attr("text-anchor", "middle")
				.text(function(d) { return d.symbol + d.size; });

			// 主観的評価実験用(changeRoomとchangeRoomSizeが起きたら)
			if ($('#floorPlanExampleName').val()) {
				$('#floorPlanExampleName').attr('value', '');
			}
		}; // function updateNodeGElement (g)

		function buildFloorPlan () {
			// 主観的評価実験用(NodeやBondに対するaddやremoveが起きたら)
			if ($('#floorPlanExampleName').val()) {
				$('#floorPlanExampleName').attr('value', '');
			}

			// Update link data
			link = link.data(links, function (d) {return d.id; });

			// Create new links
			link.enter().insert("g", ".node")
				.attr("class", "link")
				.each(function(d) {
					// this function is called only when the page is loaded for the first time
					// Add id
					d3.select(this).attr("id", "link_" + d.id);
					// Add bond line
					d3.select(this)
						.append("path")
						// .attr('class', 'link dragline hidden')
						.attr('class', 'link')
						.attr('d', 'M0,0L0,0');
						// .style("stroke-width", function(d) { return (d.bondType * 3 - 2) * 2 + "px"; });

					// // If double add second line
					// d3.select(this)
					// 	.filter(function(d) { return d.bondType >= 2; })
					// 	.append("line")
					// 	.style("stroke-width", function(d) { return (d.bondType * 2 - 2) * 2 + "px"; })
					// 	.attr("class", "double");

					// d3.select(this)
					// 	.filter(function(d) { return d.bondType === 3; })
					// 	.append("line")
					// 	.attr("class", "triple");

					// Give bond the power to be selected
					d3.select(this)
						.on("click", bondClicked);
				});

			// Delete removed links
			link.exit().remove();

			// Update node data
			node = node.data(nodes, function (d) {return d.id; });
			// Create new nodes
			node.enter().append("g")
				.attr("class", "node")
				.each(function(d) {
					// this function is called only when the page is loaded for the first time
					// Add id
					d3.select(this).attr("id", "node_" + d.id);
					// Add node circle
					d3.select(this)
						.append("circle")
						.attr("r", function(d) { return radius(d.size*2); })
						.style("fill", function(d) { return d.color; });

					// Add room symbol
					d3.select(this)
						.append("text")
						.attr("dy", ".35em")
						.attr("text-anchor", "middle")
						.text(function(d) { return d.symbol + d.size; });

					// Give room the power to be selected
					d3.select(this)
						.on("click", roomClicked);

					// Grant room the power of gravity
					d3.select(this)
						.call(force.drag);
				});

			// Delete removed nodes
			node.exit().remove();

			force.start();
		} // buildModule()

		window.saveFloorPlan = function () {
			console.log('hoge');
			var specialLinks = [], specialNodes = [], nodeIdArr = [];
			input_txt = "";
			edges_arr_for_input_txt = [];
			for (var i = 0; i < nodes.length; i++) {
				specialNodes.push({
						symbol: nodes[i].symbol,
						size: nodes[i].size,
						x: nodes[i].x,
						y: nodes[i].y,
						id: nodes[i].id,
						bonds: nodes[i].bonds
				});
				// nodeIdArr.push(nodes[i].id);
				// input_txt += nodes[i].symbol + " ";
				// 予めノード数分空の文字列配列をいれておく
				// edges_arr_for_input_txt[i] = "";
			}

			for (var i = 0; i < links.length; i++) {
				specialLinks.push({
						// source: nodeIdArr.indexOf(links[i].source.id),
						// target: nodeIdArr.indexOf(links[i].target.id),
						source: links[i].source.id,
						target: links[i].target.id,
						id: links[i].id,
						bondType: links[i].bondType
				});
				// ノードに対して存在するエッジをそれぞれ配列に格納
				// edges_arr_for_input_txt[nodeIdArr.indexOf(links[i].source.id)] += nodeIdArr.indexOf(links[i].target.id) + " ";
				// edges_arr_for_input_txt[nodeIdArr.indexOf(links[i].target.id)] += nodeIdArr.indexOf(links[i].source.id)  + " ";
			}
			// 配列edges_arr_for_input_txtを順に処理
			// $.each(edges_arr_for_input_txt,
			//   function(index, elem) {
			//   	input_txt += "\n" + elem;
			//   }
			// );
			floorPlan = {
				nodes: specialNodes,
				links: specialLinks
			};

			// ここまでで
			// input_txt =
			// B WC R LDK
			// 3
			// 3
			// 3
			// 0 1 2
			// のようになっている
			// d3.select("#floorPlanInput")
				// .text(input_txt);

			vex.dialog.open({
				message: 'To save your current floor plan, copy the data below. Next time you visit click on the load floor plan and input your saved data:',
				input: "FloorPlan: <br/>\n<textarea id=\"rooms\" name=\"rooms\" value=\"\" style=\"height:150px\" placeholder=\"FloorPlan Data\">" + JSON.stringify(floorPlan) + "</textarea>",
				buttons: [
					$.extend({}, vex.dialog.buttons.YES, {
						text: 'Ok'
					})
				],
				callback: function(data) {}
			});
		}; // window.saveFloorPlan = function ()

		window.changeRoom = function (roomType) {
			if (!roomType) {
				Messenger().post({
					message: 'Internal error :(',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			else if (!roomSelected) {
				Messenger().post({
					message: 'No Room Selected',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			else {
				var roomData = getRoomData(roomSelected);
				nodes[roomData.index].symbol = roomType;
				nodes[roomData.index].size = roomDB[roomType].size;
				updateNodeGElement("#node_"+roomData.id);
			}
		} // window.changeRoom

		window.changeRoomSize = function (sizeDiff) {
			if (!roomSelected) {
				Messenger().post({
					message: 'No Room Selected',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			var roomData = getRoomData(roomSelected);
			var changeRoomSizePossible = function (room) {
				return (0 < room.size + sizeDiff);
			};

			if (!sizeDiff || ( -1 != sizeDiff && 1 != sizeDiff)) {
				Messenger().post({
					message: 'Internal error :(',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			else if (!changeRoomSizePossible(roomData)) {
				Messenger().post({
					message: 'Room size cannot be 0 and less!',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			nodes[roomData.index].size += sizeDiff;
			updateNodeGElement("#node_"+roomData.id);
		}; // window.changeRoomSize = function (sizeDiff)

		window.addRoom = function (roomType) {
			if (!roomType) {
				Messenger().post({
					message: 'Internal error :(',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			else if (!roomSelected) {
				addNewRoom(roomType, roomDB[roomType], true);
			}
			else
				addNewRoom(roomType, roomDB[roomType]);
		}; // window.addRoom = function (roomType)

		window.Bond = function () {
			if (!roomSelected) {
				Messenger().post({
					message: 'No Room Selected',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			else {
				Messenger().post({
					message: 'Please select bond target.',
					type: 'info',
					hideAfter: 3,
					showCloseButton: true
				});
				selectMode = "bond";
				roomJustBeforeSelected = roomSelected;
			}
		}

		function getRoomData (d3Room) {
			return d3Room[0][0].parentNode.__data__;
		}

		function removeRoom (id) {
			var roomToRemove = retriveRoom(id);
			var bondsArr = getBonds(id);
			var roomsArr = [roomToRemove.id];

			for (var i = bondsArr.length - 1; i >= 0; i--) {
				// Give bonded room
				var bondedRoom = bondsArr[i].target.id !== id ? 'target' : 'source';

				bondsArr[i][bondedRoom].bonds -= bondsArr[i].bondType;
				// Convert room obj to id for later processing
				bondsArr[i] = bondsArr[i].id;
			} // for (var i = bondsArr.length - 1; i >= 0; i--)

			var spliceOut = function (arr, removeArr) {
				for (var i = arr.length - 1; i >= 0; i--) {
						if (removeArr.indexOf(arr[i].id) !== -1) {
							arr.splice(i, 1);
						}
				}
				return arr;
			};

			// Remove rooms marked
			nodes = spliceOut (nodes, roomsArr);

			// Remove bonds marked
			links = spliceOut (links, bondsArr);

		}; // function removeRoom (id)

		function removeBond (id) {
			for (var i = links.length - 1; i >= 0; i--) {
				if (links[i].id === id) {
					links.splice(i, 1);
				}
			}
		}; // function removeBond (id)

		var retriveRoom = function  (roomID) {
			for (var i = nodes.length - 1; i >= 0; i--) {
				if (nodes[i].id === roomID)
					return nodes[i];
			}
			return null;
		};

		function addNewRoom (roomType, roomDBObj, isSeparated) {
			isSeparated = (null == isSeparated) ? false: isSeparated;
			if (isSeparated) {
				var newRoom = {
							symbol: roomType,
							size: roomDBObj.size,
							x: width / 3 +'%',
							y: 10,
							bonds: 1,
							color: roomDBObj.color,
							id: generateRandomID () // Need to make sure is unique
						},

				n = nodes.push(newRoom);
			}
			else {
				var newRoom = {
							symbol: roomType,
							size: roomDBObj.size,
							x: getRoomData(roomSelected).x + getRandomInt (-15, 15),
							y: getRoomData(roomSelected).y + getRandomInt (-15, 15),
							bonds: 1,
							color: roomDBObj.color,
							id: generateRandomID (), // Need to make sure is unique
						},

				n = nodes.push(newRoom);

				getRoomData(roomSelected).bonds++; // Increment bond count on selected room

				links.push({
					source: getRoomData(roomSelected),
					target: newRoom,
					bondType: 1,
					id: generateRandomID()
				}); // Need to make sure is unique
			}

			buildFloorPlan();
		} // function addNewRoom (roomType, roomDBObj)

		this.addNewBond = function () {
			var roomJustBeforeSelected_id = getRoomData(roomJustBeforeSelected).id;
			var roomSelected_id = getRoomData(roomSelected).id;
			// if there have already been a bond
			for (var i = links.length - 1; i >= 0; i--) {
				var source_id = links[i].source.id;
				var target_id = links[i].target.id;
				if ((source_id === roomJustBeforeSelected_id && target_id === roomSelected_id) || (target_id === roomJustBeforeSelected_id && source_id === roomSelected_id)) {
						Messenger().post({
							message: 'There have already been a bond. Please push "Bond" button and try again.',
							type: 'error',
							hideAfter: 3,
							showCloseButton: true
						});
						roomJustBeforeSelected = null;
						selectMode = "normal";
						return;
				}
			}

			getRoomData(roomJustBeforeSelected).bonds++; // Increment bond count on selected room

			links.push({
				source: getRoomData(roomJustBeforeSelected),
				target: getRoomData(roomSelected),
				bondType: 1,
				id: generateRandomID()
			}); // Need to make sure is unique

			buildFloorPlan();
			roomJustBeforeSelected = null;
			selectMode = "normal";
		}

		var getBonds = function (roomID) {
			var arr = [];
			for (var i = links.length - 1; i >= 0; i--) {
				if (links[i].source.id === roomID || links[i].target.id === roomID)
					arr.push(links[i]);
			}
			return arr;
		}

		window.deleteRoom = function () {
			if (!roomSelected) {
				Messenger().post({
					message: 'No Room Selected',
					type: 'error',
					showCloseButton: true
				});
				return;
			}

			removeRoom(getRoomData(roomSelected).id);
			roomSelected = null;
			buildFloorPlan ();
		}; // window.deleteRoom = function ()

		window.deleteBond = function () {
			if (!bondSelected) {
				Messenger().post({
					message: 'No Bond Selected',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			removeBond(getRoomData(bondSelected).id);
			bondSelected = null;
			buildFloorPlan ();
		}; // window.deleteBond = function ()


		function tick() {
			//Update old and new elements
			// link.selectAll("line")
			// 	.attr("x1", function(d) { return d.source.x; })
			// 	.attr("y1", function(d) { return d.source.y; })
			// 	.attr("x2", function(d) { return d.target.x; })
			// 	.attr("y2", function(d) { return d.target.y; });
			link.selectAll("path")
				.style('marker-end', 'url(#end-arrow)')
				.attr('d', function(d) {
					var deltaX = d.target.x - d.source.x,
					deltaY = d.target.y - d.source.y,
					dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
					normX = deltaX / dist,
					normY = deltaY / dist,
					// sourcePadding = d.left ? 17 : 12,
					// targetPadding = d.right ? 17 : 12,
					sourcePadding = d.source.size*2 + 5,
					targetPadding = d.target.size*2 + 14,
					sourceX = d.source.x + (sourcePadding * normX),
					sourceY = d.source.y + (sourcePadding * normY),
					targetX = d.target.x - (targetPadding * normX),
					targetY = d.target.y - (targetPadding * normY);
					return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
				 });


			node.attr("transform", function(d) {return "translate(" + d.x + "," + d.y + ")"; });
		}
	}; // var orgoShmorgo = function(graph)
})();