(function () {
	var width = 1160,
	    height = 600;

	var color = d3.scale.category20();

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

		// update g tag element of node
		function updateNodeGElement (g) {
			// Add node circle
			d3.select(g)
				.select("circle") // not append
				.attr("r", function(d) { return radius(d.size*2); })
				.style("fill", function(d) { return color(d.symbol); });

			// Add room symbol
			d3.select(g)
				.select("text")  // not append
				.attr("dy", ".35em")
				.attr("text-anchor", "middle")
				.text(function(d) { return d.symbol + d.size; });
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
					// Add bond line
					d3.select(this)
						.append("line")
						.style("stroke-width", function(d) { return (d.bondType * 3 - 2) * 2 + "px"; });

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
						.style("fill", function(d) { return color(d.symbol); });

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
				addNewRoom(roomType, roomDB[roomType].size, true);
			}
			else
				addNewRoom(roomType, roomDB[roomType].size);
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

		function addNewRoom (roomType, roomSize, isSeparated) {
			isSeparated = (null == isSeparated) ? false: isSeparated;
			if (isSeparated) {
				var newRoom = {
							symbol: roomType,
							size: roomSize,
							x: width / 3,
							y: 10,
							id: generateRandomID (), // Need to make sure is unique
							bonds: 1
						},

				n = nodes.push(newRoom);
			}
			else {
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
			}

			buildFloorPlan();
		} // function addNewRoom (roomType, roomSize)

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
			link.selectAll("line")
				.attr("x1", function(d) { return d.source.x; })
				.attr("y1", function(d) { return d.source.y; })
				.attr("x2", function(d) { return d.target.x; })
				.attr("y2", function(d) { return d.target.y; });

			node.attr("transform", function(d) {return "translate(" + d.x + "," + d.y + ")"; });
		}
	}; // var orgoShmorgo = function(graph)
})();