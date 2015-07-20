

(function () {
	var width = 1160,
	    height = 600;

	var color = d3.scale.category20();

	var floorPlanExamples = {};

	var radius = d3.scale.sqrt()
	    .range([0, 6]);

	var selectionGlove = glow("selectionGlove").rgb("#0000A0").stdDeviation(7);
	var roomSelected;
	var roomClicked = function (dataPoint) {
		// if (dataPoint.symbol === "H")
		// return;

		if (roomSelected)
			roomSelected.style("filter", "");

		roomSelected = d3.select(this)
							.select("circle")
	 						.style("filter", "url(#selectionGlove)");
	};

	var bondSelected;
	var bondClicked = function (dataPoint) {
		Messenger().post({
			message: 'New Bond Selected',
			type: 'info',
			hideAfter: 3,
			showCloseButton: true
		});

		if (bondSelected)
			bondSelected.style("filter", "");

		bondSelected = d3.select(this)
							.select("line")
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
				.attr("width", width)
				.attr("height", height)
				.call(selectionGlove);

	var getRandomInt = function (min, max) {
	  return Math.floor(Math.random() * (max - min + 1) + min);
	}

	window.loadFloorPlan = function () {
		vex.dialog.open({
				message: 'Copy your saved floor plan data:',
				input: "FloorPlan: <br/>\n<textarea id=\"floor plan\" name=\"floor plan\" value=\"\" style=\"height:150px\" placeholder=\"Saved FloorPlan Data\" required></textarea>",
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
					.attr("width", width)
					.attr("height", height)
					.call(selectionGlove);
		if (example)
			newFloorPlan = newFloorPlan[example];
		newFloorPlan = $.extend(true, {}, newFloorPlan);
		orgoShmorgo(newFloorPlan);

		Messenger().post({
			message: 'New FloorPlan Loaded',
			type: 'success',
			showCloseButton: true,
			hideAfter: 2
		});
	};

	window.loadFloorPlanExample = function () {
		newFloorPlanSimulation (floorPlanExamples, $('#floorPlanExample').val().trim());
	};

	$.getJSON("floors.json", function(json) {
    floorPlanExamples = json;
    newFloorPlanSimulation (floorPlanExamples, '1LDK');
	});

	var orgoShmorgo = function(graph) {
		var nodesList, linksList;
		nodesList = graph.nodes;
		linksList = graph.links;


		var force = d3.layout.force()
						.nodes(nodesList)
						.links(linksList)
						.size([width, height])
						.charge(-400)
						.linkStrength(function (d) { return d.bondType * 1;})
						.linkDistance(function(d) { return radius(d.source.size) + radius(d.target.size) + 20; })
						.on("tick", tick);

		var links = force.links(),
			nodes = force.nodes(),
			link = svg.selectAll(".link"),
			node = svg.selectAll(".node");

		buildFloorPlan();

		// update g tag element of line
		function updateLineGElement (g) {
			// Add bond line
			d3.select(g)
				.append("line")
				.style("stroke-width", function(d) { return (d.bondType * 3 - 2) * 2 + "px"; });

			// If double add second line
			d3.select(g)
				.filter(function(d) { return d.bondType >= 2; })
				.append("line")
				.style("stroke-width", function(d) { return (d.bondType * 2 - 2) * 2 + "px"; })
				.attr("class", "double");

			d3.select(g)
				.filter(function(d) { return d.bondType === 3; }).append("line")
				.attr("class", "triple");

			// Give bond the power to be selected
			d3.select(g)
				.on("click", bondClicked);
		}; // function updateLineGElement (g)

		// update g tag element of node
		function updateNodeGElement (g) {
			// Add node circle
			d3.select(g)
				.append("circle")
				.attr("r", function(d) { return radius(d.size*2); })
				.style("fill", function(d) { return color(d.symbol); });

			// Add room symbol
			d3.select(g)
				.append("text")
				.attr("dy", ".35em")
				.attr("text-anchor", "middle")
				.text(function(d) { return d.symbol + d.size; });

			// Give room the power to be selected
			d3.select(g)
				.on("click", roomClicked);

			// Grant room the power of gravity
			d3.select(g)
				.call(force.drag);
		}; // function updateNodeGElement (g)

		function buildFloorPlan () {
			// Update link data
			link = link.data(links, function (d) {return d.id; });

			// Create new links
			link.enter().insert("g", ".node")
				.attr("class", "link")
				.each(function(d) {
					// this function is called only when the page is loaded for the first time
					// Add id
					d3.select(this).attr("id", "link_" + d.id);
					updateLineGElement(this);
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
					updateNodeGElement(this);
				});

			// Delete removed nodes
			node.exit().remove();

			force.start();
		} // buildModule()

		window.saveFloorPlan = function () {
			var specialLinks = [], specialNodes = [], nodeIdArr = [];
			for (var i = nodes.length - 1; i >=0; i--) {
				specialNodes.push({
						symbol: nodes[i].symbol,
						size: nodes[i].size,
						x: nodes[i].x,
						y: nodes[i].y,
						id: nodes[i].id,
						bonds: nodes[i].bonds
				});
				nodeIdArr.push(nodes[i].id);
			}
			for (var i = links.length - 1; i >=0; i--) {
				specialLinks.push({
						source: nodeIdArr.indexOf(links[i].source.id),
						target: nodeIdArr.indexOf(links[i].target.id),
						id: links[i].id,
						bondType: links[i].bondType
				});
			}
			floorPlan = {
				nodes: specialNodes,
				links: specialLinks
			};
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
			nodes[roomData.id - 1].size += sizeDiff;
			updateNodeGElement("#node_"+roomData.id);
			buildFloorPlan();
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
				Messenger().post({
					message: 'No Room Selected',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			else
				addNewRoom(roomType, roomDB[roomType].size);
		}; // window.addRoom = function (roomType)

		function getRoomData (d3Room) {
			return d3Room[0][0].parentNode.__data__;
		}

		function removeRoom (id) {
			var roomToRemove = retriveRoom(id);
			var bondsArr = getBonds(id);
			var roomsArr = [roomToRemove.id];

			for (var i = bondsArr.length - 1; i >= 0; i--) {
				// Add room that is a hydrogen
				if (bondsArr[i].source.symbol === 'H')
					roomsArr.push(bondsArr[i].source.id);
				else if (bondsArr[i].target.symbol === 'H')
					roomsArr.push(bondsArr[i].target.id);
				else {
						// Give non-hydrogen bonded room it's lone pairs back
						var nonHydrogenRoom = bondsArr[i].target.id !== id ? 'target' : 'source';

						bondsArr[i][nonHydrogenRoom].bonds -= bondsArr[i].bondType;
						// addHydrogens(bondsArr[i][nonHydrogenRoom], bondsArr[i].bondType);
				}
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

		var retriveRoom = function  (roomID) {
			for (var i = nodes.length - 1; i >= 0; i--) {
				if (nodes[i].id === roomID)
					return nodes[i];
			}
			return null;
		};

		function addNewRoom (roomType, roomSize) {
			var newRoom = {
						symbol: roomType,
						size: roomSize,
						x: getRoomData(roomSelected).x + getRandomInt (-15, 15),
						y: getRoomData(roomSelected).y + getRandomInt (-15, 15),
						id: generateRandomID (), // Need to make sure is unique
						bonds: 1
					},
			n = nodes.push(newRoom);

			getRoomData(roomSelected).bonds++; // Increment bond count on selected room

			links.push({
				source: newRoom,
				target: getRoomData(roomSelected),
				bondType: 1,
				id: generateRandomID()
			}); // Need to make sure is unique

			buildFloorPlan();
		} // function addNewRoom (roomType, roomSize)

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

		function tick() {
			//Update old and new elements
			link.selectAll("line")
				.attr("x1", function(d) { return d.source.x; })
				.attr("y1", function(d) { return d.source.y; })
				.attr("x2", function(d) { return d.target.x; })
				.attr("y2", function(d) { return d.target.y; });

			node.attr("transform", function(d) {return "translate(" + d.x + "," + d.y + ")"; });
		}
	}; // var orgoShmorgo = function(graph)
})();