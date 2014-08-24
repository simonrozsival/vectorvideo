
var XmlDataProvider = (function(){

	// private variables
	var videoInfo, info, boardInfo;
	var running = false, reachedEnd = false;
	var currentState, lastState;
	var startTime;
	var timeout;

	function XmlDataProvider(fileName, board) {
		var _this = this;
		videoInfo = new XmlReader();
		videoInfo.loadFile({
			file: fileName,
			success: function() {
				rewind();
				info = getInfo();
				VideoEvents.trigger("data-ready", info);

				// init other things
				initEvents.call(_this)
				initBoard.call(_this, board);
			},
			error: function(msg) {
				// some other process will take care of the error and display it properly
				VideoEvents.trigger("error", msg);
			}
		});
		running = false;
	}

	var initEvents = function() {

		VideoEvents.on("start", function() {
			start();
		});

		VideoEvents.on("pause", function() {
			stop();
		});

		VideoEvents.on("rewind", function() {
			rewind();
		});

		var _this = this;
		VideoEvents.on("skip-to", function(e, progress) {
			var time = progress * info.length;
			if (time > currentState.time) {
				skipForward.call(_this, time);
			} else {
				skipBackwards.call(_this, time);
			}
		});

	};

	var initBoard = function(board) {
		var ratio = info.board.height / info.board.width;
		board.height(ratio * board.width());

		boardInfo = {
			width: board.width(),
			height: board.height()
		};

	};

	var getCurrentCursorState = function() {

		var next = videoInfo.getNext();
		while (next != undefined
				&& next.type != "cursor-movement") {

			switch(next.type) {
				case "color-change":
					console.log("Change color to ", next.color);
					VideoEvents.trigger("color-change", next.color);
					break;
				case "brush-size-change":
					VideoEvents.trigger("brush-size-change", next.size);
					break;
			}

			next = videoInfo.getNext();
		}

		if(next == undefined) {
			next = {
				time: getInfo().length,
				x: -1,
				y: -1,
				pressure: 0
			};

			reachedEnd = true;
			stop();
		}

		lastState = currentState;
		currentState = next;

		return correctCoords(currentState);
	};

	var correctCoords = function(state) {
		if(state == undefined) {
			console.log(state);
		}

		state.x = state.x / info.board.width * boardInfo.width;
		state.y = state.y / info.board.height * boardInfo.height;

		return state;
	};

	var getInfo = function() {
		return videoInfo.getInfo(); // this information is available only after the document is loaded!
	};

	var rewind = function() {
		lastState = { time: 0 };
		currentState = videoInfo.getNext();
		reachedEnd = false;
	};

	var start = function() {
		startTime = Date.now();
		console.log("start time: ", startTime);
		startTime -= lastState.time;	// I can start in the middle (when pausing in the middle)
										// -> I have to "shift" the start time into the past, so it works properly																									
		running = true;
		tick();
	};

	var skipForward = function(time) {
		tickUntil.call(this, time);
	};

	var skipBackwards = function(time) {
		VideoEvents.trigger("rewind");
		tickUntil.call(this, time);
	};

	var tickUntil = function(time) {
		while(currentState.time < time) {
			VideoEvents.trigger("new-state", currentState);
			getCurrentCursorState();
		}
	};

	var tick = function() {
		var state = getCurrentCursorState();
		if(running) {
			VideoEvents.trigger("next-state-peek", state);
			var timeGap = state.time - (Date.now() - startTime);			
			timeout = setTimeout(function() {
				//if(running) {					
					VideoEvents.trigger("new-state", state);
					tick();
				//}
			}, timeGap);
		}
	};

	var stop = function() {
		// if there is a timeout waiting, do not let it 
		clearTimeout(timeout);

		if(running == true) {
			running = false;

			if(reachedEnd == true) {
				VideoEvents.trigger("reached-end");
			}
		}
	};


	return XmlDataProvider;
})();