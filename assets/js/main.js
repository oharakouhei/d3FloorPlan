(function () {
	var width = 100,
		height = 100;

	var cookingProcedureExamples = {};

	var radius = d3.scale.sqrt()
	    .range([0, 6]);

	// "normal" or "bond"
	// when this mode is "bond" and clicking a node, add bond between
	var selectMode = "normal";

	var selectionGlove = glow("selectionGlove").rgb("#0000A0").stdDeviation(7);
	var vertexSelected;
	var vertexJustBeforeSelected;
	var graphOperationObj;

	$("#selectAddFood").select2({
	  ajax: {
		url: "searchFood.php",
	    dataType: 'json',
	    delay: 250,
	    data: function (params) {
	      return {
	        q: params.term, // search term
	        page: params.page
	      };
	    },
	    processResults: function (data, page) {
	      // parse the results into the format expected by Select2.
	      // since we are using custom formatting functions we do not need to
	      // alter the remote JSON data
	      return {
	        results: data
	      };
	    },
	    cache: true
	  },
	  escapeMarkup: function (markup) { return markup; }, // let our custom formatter work
	  minimumInputLength: 1,
	  // templateResult: formatRepo, // omitted for brevity, see the source of this page
	  // templateSelection: formatRepoSelection // omitted for brevity, see the source of this page
	}).on("change", function () {
		var txtSelected = $("#select2-selectAddFood-container").get(0).innerText;
		$("#btnAddFood").on("click", addVertex(txtSelected));
	});

	// deselect node and bond when clicking other objects
	d3.select("#cookingProcedureDisplay").on("click", function(){
		if (vertexSelected)
			vertexSelected.style("filter", "");
		if (bondSelected)
			bondSelected.style("filter", "");
		vertexSelected = null;
		bondSelected = null;
	});

	var vertexClicked = function (dataPoint) {
		d3.event.stopPropagation(); // to avoid duplicating click events
		if (vertexSelected)
			vertexSelected.style("filter", "");

		vertexSelected = d3.select(this);
		vertexSelected.select("ellipse")
						.select("rect")
						.select("polygon");
		vertexSelected.style("filter", "url(#selectionGlove)");

		if ("bond" == selectMode) {
			graphOperationObj.addNewBond();
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

	var svg = d3.select("#cookingProcedureDisplay")
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
		// 最終的にcookingProcedureExample.jsonのような形のオブジェクトにする
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
					nodes_obj["size"] = vertexDB[line_arr[j]].size;
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
	window.loadCookingProcedure = function () {
		vex.dialog.open({
				message: 'Copy your saved cooking procedure data:',
				input: "CookingProcedure: <br/>\n<textarea id=\"cookingProcedure\" name=\"cookingProcedure\" value=\"\" style=\"height:150px\" placeholder=\"Saved CookingProcedure Data\" required></textarea>",
				buttons: [
					$.extend({}, vex.dialog.buttons.YES, {
					text: 'Load'
				}), $.extend({}, vex.dialog.buttons.NO, {
					text: 'Cancel'
				})
				],
				callback: function(data) {
					if (data !== false) {
						var obj = adjacencyListTxt2JSON(data.cookingProcedure);
						newCookingProcedureSimulation(obj);
					}
				}
			});
	};

	// JSON形式で読み込み
	// {"nodes": [{}, {},...], "links": [{}, {},...]}
	window.loadCookingProcedureJSON = function () {
		vex.dialog.open({
				message: 'Copy your saved cooking procedure data:',
				input: "CookingProcedure: <br/>\n<textarea id=\"cookingProcedure\" name=\"cookingProcedure\" value=\"\" style=\"height:150px\" placeholder=\"Saved CookingProcedure Data\" required></textarea>",
				buttons: [
					$.extend({}, vex.dialog.buttons.YES, {
					text: 'Load'
				}), $.extend({}, vex.dialog.buttons.NO, {
					text: 'Cancel'
				})
				],
				callback: function(data) {
					if (data !== false) {
						newCookingProcedureSimulation(JSON.parse(data.cookingProcedure));
					}
				}
			});
	};

	var newCookingProcedureSimulation = function (newCookingProcedure, example) {
		// Might be super dirty, but it works!
		$('#cookingProcedureDisplay').empty();
		svg = d3.select("#cookingProcedureDisplay")
					.append("svg")
					.attr("width", width + '%')
					.attr("height", height + '%')
					.call(selectionGlove);

		setArrowDefineToSVG(svg);

		if (example)
			newCookingProcedure = newCookingProcedure[example];
		newCookingProcedure = $.extend(true, {}, newCookingProcedure);
		// ノードに色を付ける
		newCookingProcedure['nodes'].forEach(function (data, i) {
			newCookingProcedure['nodes'][i].color = vertexDB[data.symbol].color;
		});
		graphOperationObj = new graphOperation(newCookingProcedure);

		Messenger().post({
			message: 'New CookingProcedure Loaded',
			type: 'success',
			showCloseButton: true,
			hideAfter: 2
		});
	};

	window.loadCookingProcedureExample = function () {
		newCookingProcedureSimulation (cookingProcedureExamples, $('#cookingProcedureExample').val().trim());

		// 主観的評価実験用
		// loadCookingProcedureExampleをクリックイベントにしているボタンを押したら<input type="hidden" id="cookingProcedureExampleName">のvalueを更新
		$('#cookingProcedureExampleName').attr('value', $('#cookingProcedureExample').val());
	};

	$.getJSON("cookingProcedureExample.json", function(json) {
		cookingProcedureExamples = json;
		// if (null == js_obj_graph_structure) {
			newCookingProcedureSimulation (cookingProcedureExamples, 'itame');
		// } else {
			// newCookingProcedureSimulation (adjacencyListTxt2JSON(js_obj_graph_structure));
		// }
	});

	var graphOperation = function(graph) {
		var nodesList, linksList;
		nodesList = graph.nodes;
		linksList = graph.links;

		var force = d3.layout.force()
						.nodes(nodesList)
						.links(linksList)
						.size([svg[0][0].clientWidth, svg[0][0].clientHeight]) // svg領域の横幅・縦幅を入れる
						.charge(-1000)
						.linkStrength(function (d) { return d.bondType * 1;})
						.linkDistance(function(d) { return radius(d.source.size) + radius(d.target.size) + 20; })
						.on("tick", tick);

		var links = force.links(),
			nodes = force.nodes(),
			link = svg.selectAll(".link"),
			node = svg.selectAll(".node");

		buildCookingProcedure();

		// 以下の1文主観的評価実験用
		// クエリグラフ送信フォームの<input type="hidden" id="cookingProcedureExampleName">のvalueを主観的評価実験用カラムのcookingProcedureExampleNameのために最初はitameに設定.
		if ($('#cookingProcedureExampleName')) {
			// if (null == js_obj_floor_plan_example_name) {
				$('#cookingProcedureExampleName').attr('value', 'itame');
			// } else {
				// $('#cookingProcedureExampleName').attr('value', js_obj_floor_plan_example_name);
			// }
		}

		// update g tag element of node
		function updateNodeGElement (g) {
			// Add node circle
			d3.select(g)
				// .select("circle") // not append
				// .attr("r", function(d) { return radius(d.size*2); })
				.select("rect") // not append
				.attr({
					x: function(d) { return -d.size*2.5 },
					y: function(d) { return -d.size*2.5 },
					width: function(d) { return d.size*5; },
					height: function(d) { return d.size*5; }
				})
				.select("ellipse")
				.attr("rx", function(d) { return radius(d.size*4); })
				.attr("ry", function(d) { return radius(d.size*2); })
				.select("polygon")
				.attr("points", function (d) { return "0,-"+ d.size*3 +" -"+ d.size*5 +",0 0,"+ d.size*3 +" "+ d.size*5 +",0"; } )
				.style("fill", function(d) { return d.color; });


			// Add vertex symbol
			d3.select(g)
				.select("text")  // not append
				.attr("dy", ".35em")
				.attr("text-anchor", "middle")
				.text(function(d) { return d.symbol; });

			// 主観的評価実験用(changeVertexとchangeVertexSizeが起きたら)
			if ($('#cookingProcedureExampleName').val()) {
				$('#cookingProcedureExampleName').attr('value', '');
			}
		}; // function updateNodeGElement (g)

		function buildCookingProcedure () {
			// 主観的評価実験用(NodeやBondに対するaddやremoveが起きたら)
			if ($('#cookingProcedureExampleName').val()) {
				$('#cookingProcedureExampleName').attr('value', '');
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

					var node_shape = d3.select(this);
					if ("food" == d.type) {
						node_shape.append("ellipse")
								.attr("rx", function(d) { return radius(d.size*4); })
								.attr("ry", function(d) { return radius(d.size*2); })
								.style("fill", function(d) { return d.color; });
					} else if ("process" == d.type) {
						node_shape.append("rect") // not append
								.attr({
									x: function(d) { return -d.size*3 },
									y: function(d) { return -d.size*3 },
									width: function(d) { return d.size*6; },
									height: function(d) { return d.size*6; }
								})
								.style("fill", function(d) { return d.color; });
					} else if ("cookware" == d.type) {
						node_shape.append("polygon")
								.attr("points", function (d) { return "0,-"+ d.size*3 +" -"+ d.size*5 +",0 0,"+ d.size*3 +" "+ d.size*5 +",0"; } )
								.style("fill", function(d) { return d.color; });
					}

					// Add vertex symbol
					d3.select(this)
						.append("text")
						.attr("dy", ".35em")
						.attr("text-anchor", "middle")
						.text(function(d) { return d.symbol; });

					// Give vertex the power to be selected
					d3.select(this)
						.on("click", vertexClicked);

					// Grant vertex the power of gravity
					d3.select(this)
						.call(force.drag);
				});

			// Delete removed nodes
			node.exit().remove();

			force.start();
		} // buildModule()

		window.saveCookingProcedure = function () {
			var specialLinks = [], specialNodes = [], nodeIdArr = [];
			input_txt = "";
			input_txt += nodes.length + "\n"; // 一行目にノード数
			edges_arr_for_input_txt = [];
			var bl_getParentNodeAndChildrenNodesSuccess = true;
			for (var i = 0; i < nodes.length; i++) {
				specialNodes.push({
						symbol: nodes[i].symbol,
						size: nodes[i].size,
						// x: nodes[i].x,
						// y: nodes[i].y,
						id: nodes[i].id,
						bonds: nodes[i].bonds
				});
				// nodeIdArr.push(nodes[i].id);

				var arrParentNodeAndChildrenNodes = getParentNodeAndChildrenNodes(nodes[i]);
				if (-1 == arrParentNodeAndChildrenNodes) {
					bl_getParentNodeAndChildrenNodesSuccess = false;
					break;
				}
				var objParentNode = arrParentNodeAndChildrenNodes[0];
				var strParentNodeId = objParentNode ? String(objParentNode.id) : "null"; // 親ノードのid
				var arrChildrenNodes = arrParentNodeAndChildrenNodes[1];
				var intChildrenNodesLength = arrChildrenNodes.length; // 子ノードの数
				var strChildrenIdList = "["; // 子ノードのidリスト
				for (var j=0; j < intChildrenNodesLength; j++) {
					strChildrenIdList += arrChildrenNodes[j].id + ",";
				}
				if (1 <= intChildrenNodesLength) {
					// 子ノードが存在していれば、[id,id,...,id]の形にするため最後の,を削除
					strChildrenIdList = strChildrenIdList.slice(0, -1);
				}
				strChildrenIdList += "]";
				input_txt += nodes[i].id +","+ nodes[i].symbol +","+ nodes[i].type +","+ strParentNodeId +","+ intChildrenNodesLength +","+ strChildrenIdList +"\n";
				// 予めノード数分空の文字列配列をいれておく
				// edges_arr_for_input_txt[i] = "";
			}

			// ノードの親数が正しければ
			if(bl_getParentNodeAndChildrenNodesSuccess) {
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
				cookingProcedure = {
					nodes: specialNodes,
					links: specialLinks
				};

				d3.select("#cookingProcedureInput")
					// .text(JSON.stringify(cookingProcedure));
					.text(input_txt);

				// vex.dialog.open({
				// 	message: 'To save your current cooking procedure, copy the data below. Next time you visit click on the load cooking procedure and input your saved data:',
				// 	input: "CookingProcedure: <br/>\n<textarea id=\"vertexs\" name=\"vertexs\" value=\"\" style=\"height:150px\" placeholder=\"CookingProcedure Data\">" + JSON.stringify(cookingProcedure) + "</textarea>",
				// 	buttons: [
				// 		$.extend({}, vex.dialog.buttons.YES, {
				// 			text: 'Ok'
				// 		})
				// 	],
				// 	callback: function(data) {}
				// });
			}
		}; // window.saveCookingProcedure = function ()

		window.changeVertex = function (vertexName) {
			if (!vertexName) {
				Messenger().post({
					message: 'Internal error :(',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			else if (!vertexSelected) {
				Messenger().post({
					message: 'No Vertex Selected',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			else {
				var vertexData = getVertexData(vertexSelected);
				nodes[vertexData.index].symbol = vertexName;
				nodes[vertexData.index].size = vertexDB[vertexName].size;
				updateNodeGElement("#node_"+vertexData.id);
			}
		} // window.changeVertex

		window.changeVertexSize = function (sizeDiff) {
			if (!vertexSelected) {
				Messenger().post({
					message: 'No Vertex Selected',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			var vertexData = getVertexData(vertexSelected);
			var changeVertexSizePossible = function (vertex) {
				return (0 < vertex.size + sizeDiff);
			};

			if (!sizeDiff || ( -1 != sizeDiff && 1 != sizeDiff)) {
				Messenger().post({
					message: 'Internal error :(',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			else if (!changeVertexSizePossible(vertexData)) {
				Messenger().post({
					message: 'Vertex size cannot be 0 and less!',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			nodes[vertexData.index].size += sizeDiff;
			updateNodeGElement("#node_"+vertexData.id);
		}; // window.changeVertexSize = function (sizeDiff)

		window.addVertex = function (vertexName) {
			if (!vertexName) {
				Messenger().post({
					message: 'Internal error :(',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			else if (!vertexSelected) {
				addNewVertex(vertexName, vertexDB[vertexName], true);
			}
			else
				addNewVertex(vertexName, vertexDB[vertexName]);
		}; // window.addVertex = function (vertexName)

		window.Bond = function () {
			if (!vertexSelected) {
				Messenger().post({
					message: 'No Vertex Selected',
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
				vertexJustBeforeSelected = vertexSelected;
			}
		}

		function getVertexData (d3Vertex) {
			return d3Vertex[0][0].parentNode.__data__;
		}

		function removeVertex (id) {
			var vertexToRemove = retriveVertex(id);
			var bondsArr = getBonds(id);
			var vertexsArr = [vertexToRemove.id];

			for (var i = bondsArr.length - 1; i >= 0; i--) {
				// Give bonded vertex
				var bondedVertex = bondsArr[i].target.id !== id ? 'target' : 'source';

				bondsArr[i][bondedVertex].bonds -= bondsArr[i].bondType;
				// Convert vertex obj to id for later processing
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

			// Remove vertexs marked
			nodes = spliceOut (nodes, vertexsArr);

			// Remove bonds marked
			links = spliceOut (links, bondsArr);

		}; // function removeVertex (id)

		function removeBond (id) {
			for (var i = links.length - 1; i >= 0; i--) {
				if (links[i].id === id) {
					links.splice(i, 1);
				}
			}
		}; // function removeBond (id)

		var retriveVertex = function  (vertexID) {
			for (var i = nodes.length - 1; i >= 0; i--) {
				if (nodes[i].id === vertexID)
					return nodes[i];
			}
			return null;
		};

		function addNewVertex (vertexName, vertexDBObj, isSeparated) {
			isSeparated = (null == isSeparated) ? false: isSeparated;
			if (isSeparated) {
				var newVertex = {
							symbol: vertexName,
							size: vertexDBObj.size,
							type: vertexDBObj.type,
							x: width / 3 +'%',
							y: 10,
							bonds: 1,
							color: vertexDBObj.color,
							id: nodes.length // Need to make sure is unique
						},

				n = nodes.push(newVertex);
			}
			else {
				var newVertex = {
							symbol: vertexName,
							size: vertexDBObj.size,
							type: vertexDBObj.type,
							x: getVertexData(vertexSelected).x + getRandomInt (-15, 15),
							y: getVertexData(vertexSelected).y + getRandomInt (-15, 15),
							bonds: 1,
							color: vertexDBObj.color,
							id: nodes.length, // Need to make sure is unique
						},

				n = nodes.push(newVertex);

				getVertexData(vertexSelected).bonds++; // Increment bond count on selected vertex

				links.push({
					source: newVertex,
					target: getVertexData(vertexSelected),
					bondType: 1,
					id: generateRandomID()
				}); // Need to make sure is unique
			}

			buildCookingProcedure();
		} // function addNewVertex (vertexName, vertexDBObj)

		this.addNewBond = function () {
			var vertexJustBeforeSelected_id = getVertexData(vertexJustBeforeSelected).id;
			var vertexSelected_id = getVertexData(vertexSelected).id;
			// if there have already been a bond
			for (var i = links.length - 1; i >= 0; i--) {
				var source_id = links[i].source.id;
				var target_id = links[i].target.id;
				if ((source_id === vertexJustBeforeSelected_id && target_id === vertexSelected_id) || (target_id === vertexJustBeforeSelected_id && source_id === vertexSelected_id)) {
						Messenger().post({
							message: 'There have already been a bond. Please push "Bond" button and try again.',
							type: 'error',
							hideAfter: 3,
							showCloseButton: true
						});
						vertexJustBeforeSelected = null;
						selectMode = "normal";
						return;
				}
			}

			getVertexData(vertexJustBeforeSelected).bonds++; // Increment bond count on selected vertex

			links.push({
				source: getVertexData(vertexJustBeforeSelected),
				target: getVertexData(vertexSelected),
				bondType: 1,
				id: generateRandomID()
			}); // Need to make sure is unique

			buildCookingProcedure();
			vertexJustBeforeSelected = null;
			selectMode = "normal";
		}

		var getBonds = function (vertexID) {
			var arr = [];
			for (var i = links.length - 1; i >= 0; i--) {
				if (links[i].source.id === vertexID || links[i].target.id === vertexID)
					arr.push(links[i]);
			}
			return arr;
		}

		window.deleteVertex = function () {
			if (!vertexSelected) {
				Messenger().post({
					message: 'No Vertex Selected',
					type: 'error',
					showCloseButton: true
				});
				return;
			}

			removeVertex(getVertexData(vertexSelected).id);
			vertexSelected = null;
			buildCookingProcedure ();
		}; // window.deleteVertex = function ()

		window.deleteBond = function () {
			if (!bondSelected) {
				Messenger().post({
					message: 'No Bond Selected',
					type: 'error',
					showCloseButton: true
				});
				return;
			}
			removeBond(getVertexData(bondSelected).id);
			bondSelected = null;
			buildCookingProcedure ();
		}; // window.deleteBond = function ()

		function getParentNodeAndChildrenNodes(objNode) {
			var intCountParent = 0; // 親が複数存在していたらアラートを出す
			var objParentNode = null; // 親がいないのがデフォルト
			var arrChildrenNodes = []; // 子供がいないのがデフォルト
			var len = links.length;
			for (var i = 0; i < len; i++) {
				if (objNode == links[i].source) {
					intCountParent++;
					if (2 <= intCountParent) {
						alert("error:「"+ objNode.symbol +"」ノードに複数の親(矢印の先)が存在します");
						return -1;
					}
					objParentNode = links[i].target;
				} else if (objNode == links[i].target) {
					arrChildrenNodes[arrChildrenNodes.length] = links[i].source;
				}
			}
			var arr = [objParentNode, arrChildrenNodes];
			return arr;
		};

		function tick(e) {
			// Push sources up and targets down to form a weak tree.
			var k = 6*e.alpha;
			//Update old and new elements
			// link.selectAll("line")
			// 	.attr("x1", function(d) { return d.source.x; })
			// 	.attr("y1", function(d) { return d.source.y; })
			// 	.attr("x2", function(d) { return d.target.x; })
			// 	.attr("y2", function(d) { return d.target.y; });
			links.forEach(function (d, i) {
				d.source.y -= k;
				d.target.y += k;
			});
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
	}; // var graphOperation = function(graph)
})();